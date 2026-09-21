/**
 * Phase 9: Secure Server Endpoint Handler for Groq Insights
 * 
 * Invoked via Vite dev/preview server middleware (POST /api/insights).
 * Reads GROQ_API_KEY and GROQ_MODEL from process.env.
 * Ensures the API key is never exposed to the client bundle.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  GROQ_STRUCTURED_OUTPUT_FORMAT
} from '../src/domain/ai/buildInsightPrompt';

export async function handleInsightsEndpoint(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      if (!body) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Empty request body' }));
        return;
      }

      const parsed = JSON.parse(body);
      const { facts } = parsed;

      if (!facts || typeof facts !== 'object' || typeof facts.totalSpent !== 'number') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid or missing structured facts payload' }));
        return;
      }

      const apiKey = process.env.GROQ_API_KEY;
      const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

      if (!apiKey) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: 'GROQ_API_KEY is not configured on the server. Falling back to local insights.'
          })
        );
        return;
      }

      // Call Groq OpenAI-compatible Chat Completions endpoint
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: buildUserPrompt(facts)
            }
          ],
          response_format: GROQ_STRUCTURED_OUTPUT_FORMAT,
          temperature: 0.1
        })
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        res.statusCode = groqResponse.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: `Groq API responded with status ${groqResponse.status}: ${errorText}`
          })
        );
        return;
      }

      const groqData = await groqResponse.json();
      const content = groqData.choices?.[0]?.message?.content;

      if (!content) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Empty content returned by Groq' }));
        return;
      }

      const parsedContent = JSON.parse(content);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(parsedContent));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: message }));
    }
  });
}

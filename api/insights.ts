import type { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { handleInsightsEndpoint } from './_lib/insightsHandler';

export interface VercelCompatibleRequest extends IncomingMessage {
  body?: unknown;
}

/**
 * Vercel Serverless Function Adapter for Groq Insights
 * 
 * Bridges Vercel's pre-parsed request environment and Node's streaming request
 * environment to the authoritative handler in server/insightsHandler.ts.
 * Guarantees that the Serverless Function lifecycle waits until res.end() completes.
 */
export default async function handler(
  req: VercelCompatibleRequest,
  res: ServerResponse
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Intercept res.end to guarantee the serverless function does not terminate prematurely
    const originalEnd = res.end.bind(res);
    res.end = function (...args: any[]): ServerResponse {
      const result = (originalEnd as any)(...args);
      resolve();
      return result || res;
    };

    // 1. Method verification: delegate directly if not POST so handler returns 405 Method Not Allowed
    if (req.method !== 'POST') {
      handleInsightsEndpoint(req, res).catch(reject);
      return;
    }

    // 2. Request body normalization: Vercel provides req.body pre-parsed
    if (req.body !== undefined && req.body !== null) {
      let payloadStr: string;

      if (Buffer.isBuffer(req.body)) {
        payloadStr = req.body.toString('utf-8');
      } else if (typeof req.body === 'string') {
        if (req.body.trim()) {
          try {
            JSON.parse(req.body);
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Malformed JSON in request body' }));
            return;
          }
        }
        payloadStr = req.body;
      } else if (typeof req.body === 'object') {
        payloadStr = JSON.stringify(req.body);
      } else {
        payloadStr = String(req.body);
      }

      // Wrap payload into a fresh Readable stream for the authoritative handler
      const wrappedReq = Object.assign(Readable.from([payloadStr]), {
        method: req.method,
        headers: req.headers,
        url: req.url
      }) as unknown as IncomingMessage;

      handleInsightsEndpoint(wrappedReq, res).catch(reject);
      return;
    }

    // 3. Fallback: native unconsumed stream (e.g. local dev / test runner)
    handleInsightsEndpoint(req, res).catch(reject);
  });
}

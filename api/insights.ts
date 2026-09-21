import type { IncomingMessage, ServerResponse } from 'http';
import { handleInsightsEndpoint } from '../server/insightsHandler.ts';

/**
 * Vercel Serverless Function Adapter for Groq Insights
 * 
 * Exposes POST /api/insights on Vercel.
 * Delegates directly to the existing server/insightsHandler.ts.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  return handleInsightsEndpoint(req, res);
}

/**
 * Phase 9: Secure Server Endpoint Handler for Groq Insights
 * 
 * Re-exports the authoritative implementation from api/_lib/insightsHandler.
 * Preserves server/insightsHandler.ts as the entrypoint for local Vite dev middleware and tests.
 */

export { handleInsightsEndpoint } from '../api/_lib/insightsHandler.ts';


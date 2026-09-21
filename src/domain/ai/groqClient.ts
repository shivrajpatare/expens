/**
 * Phase 9: Groq Client (Browser-to-Server Gateway)
 * 
 * Invokes the secure local server endpoint (/api/insights).
 * Enforces a 5-second timeout and guarantees graceful fallback to Tier 1.
 */

import type { InsightClaim, InsightFacts } from '../insights/types.ts';
import { validateGroqResponse } from './validateGroqResponse.ts';

export interface GroqFetchResult {
  success: boolean;
  claims: InsightClaim[];
  tier: 'local' | 'groq';
  fallbackNotice?: string;
  error?: string;
}

const TIMEOUT_MS = 5000;

/**
 * Dispatches an insight generation request to the secure server endpoint.
 * Returns validated Groq claims or flags fallback to Tier 1.
 */
export async function fetchGroqInsights(facts: InsightFacts): Promise<GroqFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ facts }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const status = response.status;
      let errorMsg = `Server returned status ${status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) errorMsg = errJson.error;
      } catch {
        // Ignore JSON parse error on non-200
      }

      return {
        success: false,
        claims: [],
        tier: 'local',
        fallbackNotice: 'Groq insight unavailable · Showing local insights instead.',
        error: errorMsg
      };
    }

    const data = await response.json();
    const validation = validateGroqResponse(data, facts);

    if (!validation.isValid) {
      return {
        success: false,
        claims: [],
        tier: 'local',
        fallbackNotice: 'Groq insight unavailable · Showing local insights instead.',
        error: `Validation failed: ${validation.reason}`
      };
    }

    return {
      success: true,
      claims: validation.claims,
      tier: 'groq'
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const errorMsg = isTimeout ? 'Request timed out after 5s' : (err instanceof Error ? err.message : 'Unknown error');

    return {
      success: false,
      claims: [],
      tier: 'local',
      fallbackNotice: 'Groq insight unavailable · Showing local insights instead.',
      error: errorMsg
    };
  }
}

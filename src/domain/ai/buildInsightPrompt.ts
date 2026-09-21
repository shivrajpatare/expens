/**
 * Phase 9: Groq Prompt Contract & Builder
 * 
 * Re-exports prompt contract, schemas, and builder from api/_lib/buildInsightPrompt.
 * Preserves src/domain/ai/buildInsightPrompt.ts as single source of truth for frontend/tests.
 */

export {
  SYSTEM_PROMPT,
  buildUserPrompt,
  GROQ_STRUCTURED_OUTPUT_FORMAT,
  GROQ_INSIGHTS_SCHEMA
} from '../../../api/_lib/buildInsightPrompt.ts';


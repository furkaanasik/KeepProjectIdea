import { z } from 'zod';
import { buildViabilityPrompt } from '../prompts/viabilityPrompt.js';
import {
  runClaude,
  type RunClaudeOptions,
  type RunClaudeResult,
} from './claudeService.js';
import { extractJsonObject, AnalyzerValidationError } from './analyzerService.js';
import type { DevelopmentSuggestion } from '../types/analysis.js';

export type RunClaudeFn = (opts: RunClaudeOptions) => Promise<RunClaudeResult>;

export interface RecalculateViabilityOptions {
  runClaudeImpl?: RunClaudeFn;
}

const ViabilityResultSchema = z.object({
  viability: z.object({
    score: z.number().int().min(0).max(100),
    status: z.string().min(1),
    reasoning: z.string().min(10),
  }),
});

export type ViabilityResult = z.infer<typeof ViabilityResultSchema>['viability'];

export async function recalculateViability(
  idea: string,
  analysis: unknown,
  selectedSuggestions: DevelopmentSuggestion[],
  options: RecalculateViabilityOptions = {},
): Promise<ViabilityResult> {
  const runner = options.runClaudeImpl ?? runClaude;
  const prompt = buildViabilityPrompt(idea, analysis, selectedSuggestions);

  const { result } = await runner({ prompt, outputFormat: 'json' });

  const jsonText = extractJsonObject(result);
  if (jsonText === null) {
    throw new AnalyzerValidationError('no JSON object found in claude result');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new AnalyzerValidationError('extracted JSON object is not valid JSON', [], err);
  }

  const validated = ViabilityResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AnalyzerValidationError(
      'viability result failed schema validation',
      validated.error.issues,
    );
  }

  return validated.data.viability;
}

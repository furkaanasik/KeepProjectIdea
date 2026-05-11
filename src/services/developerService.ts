import { z } from 'zod';
import {
  DevelopmentPlanSchema,
  type DevelopmentSuggestion,
} from '../types/analysis.js';
import { buildDeveloperPrompt } from '../prompts/developerPrompt.js';
import {
  runClaude,
  type RunClaudeOptions,
  type RunClaudeResult,
} from './claudeService.js';
import {
  extractJsonObject,
  AnalyzerValidationError,
} from './analyzerService.js';

export type RunClaudeFn = (opts: RunClaudeOptions) => Promise<RunClaudeResult>;

export interface DevelopIdeaOptions {
  runClaudeImpl?: RunClaudeFn;
}

export async function developIdea(
  idea: string,
  analysis: unknown,
  options: DevelopIdeaOptions = {},
): Promise<DevelopmentSuggestion[]> {
  const runner = options.runClaudeImpl ?? runClaude;
  const prompt = buildDeveloperPrompt(idea, analysis);

  const { result } = await runner({ prompt, outputFormat: 'json' });

  const jsonText = extractJsonObject(result);
  if (jsonText === null) {
    throw new AnalyzerValidationError('no JSON object found in claude result');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new AnalyzerValidationError(
      'extracted JSON object is not valid JSON',
      [],
      err,
    );
  }

  const validated = DevelopmentPlanSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AnalyzerValidationError(
      'development plan failed schema validation',
      validated.error.issues,
    );
  }

  return validated.data.suggestions;
}

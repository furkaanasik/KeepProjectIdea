import {
  AnalysisResultSchema,
  type AnalysisResult,
  type DevelopmentSuggestion,
} from '../types/analysis.js';
import { buildReanalyzePrompt } from '../prompts/reanalyzePrompt.js';
import {
  runClaude,
  type RunClaudeOptions,
  type RunClaudeResult,
} from './claudeService.js';
import { extractJsonObject, AnalyzerValidationError } from './analyzerService.js';

export type RunClaudeFn = (opts: RunClaudeOptions) => Promise<RunClaudeResult>;

export interface ReanalyzeOptions {
  runClaudeImpl?: RunClaudeFn;
}

export async function reanalyzeProject(
  idea: string,
  analysis: unknown,
  selectedSuggestions: DevelopmentSuggestion[],
  options: ReanalyzeOptions = {},
): Promise<AnalysisResult> {
  const runner = options.runClaudeImpl ?? runClaude;
  const prompt = buildReanalyzePrompt(idea, analysis, selectedSuggestions);

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

  const validated = AnalysisResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AnalyzerValidationError(
      'reanalysis result failed schema validation',
      validated.error.issues,
    );
  }

  const data = validated.data;
  const s = data.vc_scores;
  const avg = (s.market_fit + s.feasibility + s.moat + s.scalability) / 4;
  data.decision = avg >= 7 ? 'KEEP' : 'DROP';
  data.viability = { ...data.viability, score: Math.round(avg * 10) };
  return data;
}

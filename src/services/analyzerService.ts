import { z } from 'zod';
import {
  AnalysisResultSchema,
  type AnalysisResult,
} from '../types/analysis.js';
import { buildStrategistPrompt } from '../prompts/strategistPrompt.js';
import { runClaude, type RunClaudeOptions, type RunClaudeResult } from './claudeService.js';

export type RunClaudeFn = (opts: RunClaudeOptions) => Promise<RunClaudeResult>;

export interface AnalyzeIdeaOptions {
  runClaudeImpl?: RunClaudeFn;
}

export class AnalyzerValidationError extends Error {
  readonly issues: z.ZodIssue[];
  readonly cause?: unknown;

  constructor(message: string, issues: z.ZodIssue[] = [], cause?: unknown) {
    super(message);
    this.name = 'AnalyzerValidationError';
    this.issues = issues;
    if (cause !== undefined) this.cause = cause;
  }
}

export function extractJsonObject(text: string): string | null {
  let largest: string | null = null;
  let i = 0;
  const n = text.length;

  while (i < n) {
    if (text[i] !== '{') {
      i++;
      continue;
    }

    let depth = 0;
    let inString = false;
    let escape = false;
    let closedAt = -1;

    for (let j = i; j < n; j++) {
      const ch = text[j];
      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (ch === '\\') {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          closedAt = j;
          break;
        }
      }
    }

    if (closedAt >= 0) {
      const candidate = text.slice(i, closedAt + 1);
      if (largest === null || candidate.length > largest.length) {
        largest = candidate;
      }
      i = closedAt + 1;
    } else {
      i++;
    }
  }

  return largest;
}

export async function analyzeIdea(
  idea: string,
  options: AnalyzeIdeaOptions = {},
): Promise<AnalysisResult> {
  const runner = options.runClaudeImpl ?? runClaude;
  const prompt = buildStrategistPrompt(idea);

  const { result } = await runner({ prompt, outputFormat: 'json' });

  const jsonText = extractJsonObject(result);
  if (jsonText === null) {
    throw new AnalyzerValidationError(
      'no JSON object found in claude result',
    );
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

  const validated = AnalysisResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AnalyzerValidationError(
      'analysis result failed schema validation',
      validated.error.issues,
    );
  }
  return validated.data;
}

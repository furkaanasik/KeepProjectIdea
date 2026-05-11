import { Router } from 'express';
import { z } from 'zod';
import type { DevelopmentSuggestion } from '../types/analysis.js';
import {
  developIdea,
  type DevelopIdeaOptions,
} from '../services/developerService.js';
import {
  AnalyzerValidationError,
} from '../services/analyzerService.js';
import { ClaudeRunError } from '../services/claudeService.js';

const DevelopInputSchema = z
  .object({
    idea: z.string().min(10).max(6000),
    analysis: z.record(z.unknown()),
  })
  .strict();

export type DevelopIdeaFn = (
  idea: string,
  analysis: unknown,
) => Promise<DevelopmentSuggestion[]>;

export interface CreateDevelopRouterOptions extends DevelopIdeaOptions {
  developIdeaImpl?: DevelopIdeaFn;
}

export function createDevelopRouter(
  options: CreateDevelopRouterOptions = {},
): Router {
  const router = Router();
  const impl: DevelopIdeaFn =
    options.developIdeaImpl ??
    ((idea, analysis) => developIdea(idea, analysis, { runClaudeImpl: options.runClaudeImpl }));

  router.post('/', async (req, res, next) => {
    const parsed = DevelopInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'invalid_input',
        issues: parsed.error.issues,
      });
      return;
    }

    try {
      const suggestions = await impl(parsed.data.idea, parsed.data.analysis);
      res.status(200).json({ suggestions });
    } catch (err) {
      if (err instanceof AnalyzerValidationError) {
        console.error('[developer] validation error:', err.message, err.issues);
        res.status(502).json({ error: 'developer_invalid_output' });
        return;
      }
      if (err instanceof ClaudeRunError) {
        console.error('[developer] claude run error:', err.message, err.details);
        res.status(502).json({ error: 'developer_unavailable' });
        return;
      }
      next(err);
    }
  });

  return router;
}

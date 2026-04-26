import { Router } from 'express';
import {
  ProjectIdeaInputSchema,
  type AnalysisResult,
} from '../types/analysis.js';
import {
  analyzeIdea,
  AnalyzerValidationError,
} from '../services/analyzerService.js';
import { ClaudeRunError } from '../services/claudeService.js';
import type { AnalysesRepo } from '../services/analysesRepo.js';

export type AnalyzeIdeaFn = (idea: string) => Promise<AnalysisResult>;

export interface CreateAnalyzeRouterOptions {
  analyzeIdeaImpl?: AnalyzeIdeaFn;
  analysesRepo?: AnalysesRepo;
}

export function createAnalyzeRouter(
  options: CreateAnalyzeRouterOptions = {},
): Router {
  const router = Router();
  const impl: AnalyzeIdeaFn =
    options.analyzeIdeaImpl ?? ((idea) => analyzeIdea(idea));
  const repo = options.analysesRepo;

  router.post('/', async (req, res, next) => {
    const parsed = ProjectIdeaInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'invalid_input',
        issues: parsed.error.issues,
      });
      return;
    }

    try {
      const result = await impl(parsed.data.idea);
      if (repo) {
        try {
          repo.insert(parsed.data.idea, result);
        } catch (err) {
          console.error('failed to persist analysis:', err);
        }
      }
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof AnalyzerValidationError) {
        res.status(502).json({ error: 'analyzer_invalid_output' });
        return;
      }
      if (err instanceof ClaudeRunError) {
        res.status(502).json({ error: 'analyzer_unavailable' });
        return;
      }
      next(err);
    }
  });

  return router;
}

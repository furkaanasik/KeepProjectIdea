import { Router } from 'express';
import { SaveSuggestionsInputSchema, type AnalysisResult, type DevelopmentSuggestion } from '../types/analysis.js';
import type { AnalysesRepo } from '../services/analysesRepo.js';
import {
  recalculateViability,
  type ViabilityResult,
} from '../services/viabilityService.js';
import { reanalyzeProject } from '../services/reanalyzeService.js';
import { AnalyzerValidationError } from '../services/analyzerService.js';
import { ClaudeRunError } from '../services/claudeService.js';

export type RecalculateViabilityFn = (
  idea: string,
  analysis: unknown,
  selectedSuggestions: unknown[],
) => Promise<ViabilityResult>;

export type ReanalyzeIdeaFn = (
  idea: string,
  analysis: unknown,
  selectedSuggestions: DevelopmentSuggestion[],
) => Promise<AnalysisResult>;

export interface CreateAnalysesRouterOptions {
  analysesRepo?: AnalysesRepo;
  recalculateViabilityImpl?: RecalculateViabilityFn;
  reanalyzeIdeaImpl?: ReanalyzeIdeaFn;
}

export function createAnalysesRouter(
  options: CreateAnalysesRouterOptions = {},
): Router {
  const router = Router();
  const repo = options.analysesRepo;
  const recalcImpl: RecalculateViabilityFn =
    options.recalculateViabilityImpl ??
    ((idea, analysis, suggestions) =>
      recalculateViability(idea, analysis, suggestions as Parameters<typeof recalculateViability>[2], {}));
  const reanalyzeImpl: ReanalyzeIdeaFn =
    options.reanalyzeIdeaImpl ??
    ((idea, analysis, suggestions) => reanalyzeProject(idea, analysis, suggestions));

  router.get('/', (_req, res) => {
    if (!repo) {
      res.status(200).json([]);
      return;
    }
    const records = repo.listRecent();
    res.status(200).json(records);
  });

  router.patch('/:id/suggestions', (req, res) => {
    if (!repo) {
      res.status(503).json({ error: 'repo_unavailable' });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }

    const parsed = SaveSuggestionsInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input', issues: parsed.error.issues });
      return;
    }

    const saved = repo.saveSuggestions(id, parsed.data.suggestions);
    if (!saved) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.status(200).json({ ok: true });
  });

  router.post('/:id/recalculate', async (req, res, next) => {
    if (!repo) {
      res.status(503).json({ error: 'repo_unavailable' });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }

    const record = repo.getById(id);
    if (!record) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const selectedSuggestions = record.result.selected_suggestions;
    if (!selectedSuggestions || selectedSuggestions.length === 0) {
      res.status(422).json({ error: 'no_selected_suggestions' });
      return;
    }

    try {
      const viability = await recalcImpl(record.idea, record.result, selectedSuggestions);
      repo.saveViability(id, viability);
      res.status(200).json({ viability });
    } catch (err) {
      if (err instanceof AnalyzerValidationError) {
        console.error('[viability] validation error:', err.message, err.issues);
        res.status(502).json({ error: 'viability_invalid_output' });
        return;
      }
      if (err instanceof ClaudeRunError) {
        console.error('[viability] claude run error:', err.message, err.details);
        res.status(502).json({ error: 'viability_unavailable' });
        return;
      }
      next(err);
    }
  });

  router.post('/:id/reanalyze', async (req, res, next) => {
    if (!repo) {
      res.status(503).json({ error: 'repo_unavailable' });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }

    const record = repo.getById(id);
    if (!record) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const selectedSuggestions = record.result.selected_suggestions;
    if (!selectedSuggestions || selectedSuggestions.length === 0) {
      res.status(422).json({ error: 'no_selected_suggestions' });
      return;
    }

    try {
      const newAnalysis = await reanalyzeImpl(record.idea, record.result, selectedSuggestions);
      repo.saveFullResult(id, newAnalysis);
      res.status(200).json(newAnalysis);
    } catch (err) {
      if (err instanceof AnalyzerValidationError) {
        console.error('[reanalyze] validation error:', err.message, err.issues);
        res.status(502).json({ error: 'reanalyze_invalid_output' });
        return;
      }
      if (err instanceof ClaudeRunError) {
        console.error('[reanalyze] claude run error:', err.message, err.details);
        res.status(502).json({ error: 'reanalyze_unavailable' });
        return;
      }
      next(err);
    }
  });

  return router;
}

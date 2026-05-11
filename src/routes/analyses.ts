import { Router } from 'express';
import { SaveSuggestionsInputSchema } from '../types/analysis.js';
import type { AnalysesRepo } from '../services/analysesRepo.js';

export interface CreateAnalysesRouterOptions {
  analysesRepo?: AnalysesRepo;
}

export function createAnalysesRouter(
  options: CreateAnalysesRouterOptions = {},
): Router {
  const router = Router();
  const repo = options.analysesRepo;

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

  return router;
}

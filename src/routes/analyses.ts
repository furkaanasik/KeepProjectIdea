import { Router } from 'express';
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

  return router;
}

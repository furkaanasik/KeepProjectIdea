import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import {
  createAnalyzeRouter,
  type CreateAnalyzeRouterOptions,
} from './routes/analyze.js';
import { createAnalysesRouter } from './routes/analyses.js';
import type { AnalysesRepo } from './services/analysesRepo.js';

export interface CreateAppOptions extends CreateAnalyzeRouterOptions {
  analysesRepo?: AnalysesRepo;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.use(express.json({ limit: '64kb' }));
  app.use(express.static('public'));

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(
    '/api/analyze',
    createAnalyzeRouter({
      analyzeIdeaImpl: options.analyzeIdeaImpl,
      analysesRepo: options.analysesRepo,
    }),
  );
  app.use(
    '/api/analyses',
    createAnalysesRouter({ analysesRepo: options.analysesRepo }),
  );

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const message =
        err instanceof Error ? err.message : 'unexpected error';
      res.status(500).json({ error: 'internal_error', message });
    },
  );

  return app;
}

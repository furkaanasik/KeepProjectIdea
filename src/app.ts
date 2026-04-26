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

export type CreateAppOptions = CreateAnalyzeRouterOptions;

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.use(express.json({ limit: '64kb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use('/api/analyze', createAnalyzeRouter(options));

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const message =
        err instanceof Error ? err.message : 'unexpected error';
      res.status(500).json({ error: 'internal_error', message });
    },
  );

  return app;
}

import { Router } from 'express';
import { z } from 'zod';
import { AnalysisResultSchema } from '../types/analysis.js';
import {
  buildAnalysisPdf,
  buildExportFilename,
} from '../services/pdfExporter.js';

const ExportPdfBodySchema = z
  .object({
    idea: z.string().max(6000).optional(),
    result: AnalysisResultSchema,
  })
  .strict();

export function createExportRouter(): Router {
  const router = Router();

  router.post('/pdf', async (req, res, next) => {
    const parsed = ExportPdfBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'invalid_input', issues: parsed.error.issues });
      return;
    }

    try {
      const generatedAt = new Date();
      const pdf = await buildAnalysisPdf(parsed.data.result, {
        idea: parsed.data.idea,
        generatedAt,
      });
      const filename = buildExportFilename(parsed.data.idea, generatedAt);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Content-Length', String(pdf.length));
      res.status(200).end(pdf);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

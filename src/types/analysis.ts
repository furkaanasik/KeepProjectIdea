import { z } from 'zod';

const CompetitorSchema = z
  .object({
    name: z.string(),
    key_features: z.string(),
    weakness: z.string(),
  })
  .strict();

const MarketAnalysisSchema = z
  .object({
    trends: z.string(),
    target_audience: z.string(),
  })
  .strict();

const ViabilitySchema = z
  .object({
    score: z.number().int().min(0).max(100),
    status: z.string(),
    reasoning: z.string(),
  })
  .strict();

const VcScoresSchema = z.object({
  market_fit: z.number().int().min(1).max(10),
  feasibility: z.number().int().min(1).max(10),
  moat: z.number().int().min(1).max(10),
  scalability: z.number().int().min(1).max(10),
});

export const AnalysisResultSchema = z
  .object({
    project_summary: z.string().min(10),
    competitors: z.array(CompetitorSchema).min(3).max(5),
    market_analysis: MarketAnalysisSchema,
    viability: ViabilitySchema,
    differentiation_points: z.array(z.string()).length(3),
    master_prompt: z.string().min(200),
    vc_scores: VcScoresSchema,
    pain_points: z.array(z.string()).length(3),
    revenue_model: z.string().min(50),
    decision: z.enum(['KEEP', 'DROP']),
  })
  .strict();

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const ProjectIdeaInputSchema = z
  .object({
    idea: z.string().min(10).max(6000),
  })
  .strict();

export type ProjectIdeaInput = z.infer<typeof ProjectIdeaInputSchema>;

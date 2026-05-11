import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db/index.js';
import { createAnalysesRepo } from '../src/services/analysesRepo.js';
import type { AnalysisResult } from '../src/types/analysis.js';
import type { ViabilityResult } from '../src/services/viabilityService.js';

const validAnalysis: AnalysisResult = {
  project_summary: 'A concise yet sufficiently long project summary.',
  competitors: [
    { name: 'Comp A', key_features: 'fast', weakness: 'expensive' },
    { name: 'Comp B', key_features: 'cheap', weakness: 'slow' },
    { name: 'Comp C', key_features: 'pretty', weakness: 'buggy' },
  ],
  market_analysis: {
    trends: 'Growing demand for AI tools.',
    target_audience: 'Indie founders and PMs.',
  },
  viability: {
    score: 70,
    status: 'Potansiyelli',
    reasoning: 'Decent demand, some competition.',
  },
  differentiation_points: ['First', 'Second', 'Third'],
  master_prompt: 'X'.repeat(250),
  vc_scores: { market_fit: 7, feasibility: 7, moat: 6, scalability: 7 },
  pain_points: ['Pain 1', 'Pain 2', 'Pain 3'],
  revenue_model: 'SaaS model with monthly subscription tiers for individuals and teams.',
  decision: 'KEEP',
};

const sampleSuggestions = [
  {
    id: 'suggestion_1',
    category: 'feature' as const,
    title: 'Real-time collaboration',
    description: 'Allow multiple users to edit the same project simultaneously.',
    priority: 'high' as const,
  },
];

const updatedViability: ViabilityResult = {
  score: 88,
  status: 'Yapmaya Değer',
  reasoning: 'Seçilen öneriler projenin rekabet avantajını önemli ölçüde artırıyor.',
};

function makeApp(overrides: Partial<Parameters<typeof createApp>[0]> = {}) {
  return createApp(overrides as Parameters<typeof createApp>[0]);
}

describe('POST /api/analyses/:id/recalculate', () => {
  const originalEnv = process.env.DB_PATH;
  beforeEach(() => { process.env.DB_PATH = ':memory:'; });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = originalEnv;
  });

  it('returns 503 when repo is unavailable', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/analyses/1/recalculate');
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('repo_unavailable');
  });

  it('returns 400 for non-integer id', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = makeApp({ analysesRepo: repo });
    const res = await request(app).post('/api/analyses/abc/recalculate');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_id');
  });

  it('returns 404 for non-existent id', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = makeApp({
      analysesRepo: repo,
      recalculateViabilityImpl: async () => updatedViability,
    });
    const res = await request(app).post('/api/analyses/9999/recalculate');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('returns 422 when analysis has no selected suggestions', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = makeApp({
      analyzeIdeaImpl: async () => validAnalysis,
      analysesRepo: repo,
      recalculateViabilityImpl: async () => updatedViability,
    });

    const insertRes = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });
    expect(insertRes.status).toBe(200);
    const id = insertRes.body.id;

    const res = await request(app).post(`/api/analyses/${id}/recalculate`);
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('no_selected_suggestions');
  });

  it('returns 200 with updated viability and persists to DB', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = makeApp({
      analyzeIdeaImpl: async () => validAnalysis,
      analysesRepo: repo,
      recalculateViabilityImpl: async () => updatedViability,
    });

    const insertRes = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });
    expect(insertRes.status).toBe(200);
    const id = insertRes.body.id;

    await request(app)
      .patch(`/api/analyses/${id}/suggestions`)
      .send({ suggestions: sampleSuggestions });

    const res = await request(app).post(`/api/analyses/${id}/recalculate`);
    expect(res.status).toBe(200);
    expect(res.body.viability).toEqual(updatedViability);

    const record = repo.getById(id);
    expect(record).not.toBeNull();
    expect(record!.result.viability.score).toBe(88);
    expect(record!.result.viability.status).toBe('Yapmaya Değer');
  });

  it('returns 502 when claude service is unavailable', async () => {
    const { ClaudeRunError } = await import('../src/services/claudeService.js');
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = makeApp({
      analyzeIdeaImpl: async () => validAnalysis,
      analysesRepo: repo,
      recalculateViabilityImpl: async () => {
        throw new ClaudeRunError('spawn failed', {});
      },
    });

    const insertRes = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });
    const id = insertRes.body.id;

    await request(app)
      .patch(`/api/analyses/${id}/suggestions`)
      .send({ suggestions: sampleSuggestions });

    const res = await request(app).post(`/api/analyses/${id}/recalculate`);
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('viability_unavailable');
  });
});

describe('AnalysesRepo.saveViability', () => {
  it('updates viability in the DB record', () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const { id } = repo.insert('test idea', validAnalysis);

    const saved = repo.saveViability(id, updatedViability);
    expect(saved).toBe(true);

    const record = repo.getById(id);
    expect(record!.result.viability.score).toBe(88);
    expect(record!.result.viability.status).toBe('Yapmaya Değer');
  });

  it('returns false for non-existent id', () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    expect(repo.saveViability(9999, updatedViability)).toBe(false);
  });
});

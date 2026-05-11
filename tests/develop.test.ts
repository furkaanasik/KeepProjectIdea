import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db/index.js';
import { createAnalysesRepo } from '../src/services/analysesRepo.js';
import type { DevelopmentSuggestion, AnalysisResult } from '../src/types/analysis.js';

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
    score: 85,
    status: 'Yapmaya Değer',
    reasoning: 'Strong demand, modest competition.',
  },
  differentiation_points: ['First', 'Second', 'Third'],
  master_prompt: 'X'.repeat(250),
  vc_scores: { market_fit: 8, feasibility: 7, moat: 6, scalability: 8 },
  pain_points: ['Pain 1', 'Pain 2', 'Pain 3'],
  revenue_model: 'SaaS model with monthly subscription tiers for individuals and teams.',
  decision: 'KEEP',
};

const sampleSuggestions: DevelopmentSuggestion[] = [
  {
    id: 'suggestion_1',
    category: 'feature',
    title: 'Real-time collaboration',
    description: 'Allow multiple users to edit the same project simultaneously.',
    priority: 'high',
  },
  {
    id: 'suggestion_2',
    category: 'tech_stack',
    title: 'Use PostgreSQL',
    description: 'Migrate from SQLite to PostgreSQL for better concurrency at scale.',
    priority: 'medium',
  },
];

function makeApp(overrides: Partial<Parameters<typeof createApp>[0]> = {}) {
  return createApp(overrides as Parameters<typeof createApp>[0]);
}

describe('POST /api/develop', () => {
  it('returns 400 for missing idea field', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/develop')
      .send({ analysis: validAnalysis });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_input');
  });

  it('returns 400 for idea shorter than 10 chars', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/develop')
      .send({ idea: 'short', analysis: validAnalysis });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing analysis field', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/develop')
      .send({ idea: 'A meaningful project idea text here' });
    expect(res.status).toBe(400);
  });

  it('returns 200 with suggestions array when impl succeeds', async () => {
    const app = makeApp({ developIdeaImpl: async () => sampleSuggestions });
    const res = await request(app)
      .post('/api/develop')
      .send({ idea: 'A meaningful project idea text', analysis: validAnalysis });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.suggestions).toHaveLength(2);
    expect(res.body.suggestions[0].id).toBe('suggestion_1');
  });

  it('returns 502 when claude service is unavailable', async () => {
    const { ClaudeRunError } = await import('../src/services/claudeService.js');
    const app = makeApp({
      developIdeaImpl: async () => {
        throw new ClaudeRunError('spawn failed', {});
      },
    });
    const res = await request(app)
      .post('/api/develop')
      .send({ idea: 'A meaningful project idea text', analysis: validAnalysis });
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('developer_unavailable');
  });
});

describe('PATCH /api/analyses/:id/suggestions', () => {
  const originalEnv = process.env.DB_PATH;
  beforeEach(() => { process.env.DB_PATH = ':memory:'; });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = originalEnv;
  });

  it('returns 404 for non-existent id', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = makeApp({ analysesRepo: repo });
    const res = await request(app)
      .patch('/api/analyses/9999/suggestions')
      .send({ suggestions: sampleSuggestions });
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-integer id', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = makeApp({ analysesRepo: repo });
    const res = await request(app)
      .patch('/api/analyses/abc/suggestions')
      .send({ suggestions: sampleSuggestions });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_id');
  });

  it('returns 400 for malformed suggestions (invalid category)', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = makeApp({ analyzeIdeaImpl: async () => validAnalysis, analysesRepo: repo });
    const insertRes = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });
    expect(insertRes.status).toBe(200);
    const id = insertRes.body.id;

    const res = await request(app)
      .patch(`/api/analyses/${id}/suggestions`)
      .send({
        suggestions: [{ id: 's1', category: 'invalid_cat', title: 'X', description: 'Y', priority: 'high' }],
      });
    expect(res.status).toBe(400);
  });

  it('saves suggestions and persists them in DB', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = makeApp({ analyzeIdeaImpl: async () => validAnalysis, analysesRepo: repo });

    const insertRes = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });
    expect(insertRes.status).toBe(200);
    const id = insertRes.body.id;
    expect(typeof id).toBe('number');

    const patchRes = await request(app)
      .patch(`/api/analyses/${id}/suggestions`)
      .send({ suggestions: sampleSuggestions });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.ok).toBe(true);

    const record = repo.getById(id);
    expect(record).not.toBeNull();
    expect(record!.result.selected_suggestions).toHaveLength(2);
    expect(record!.result.selected_suggestions![0].id).toBe('suggestion_1');
  });
});

describe('POST /api/analyze — returns id when repo present', () => {
  const originalEnv = process.env.DB_PATH;
  beforeEach(() => { process.env.DB_PATH = ':memory:'; });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = originalEnv;
  });

  it('includes id and created_at alongside analysis fields', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = makeApp({ analyzeIdeaImpl: async () => validAnalysis, analysesRepo: repo });

    const res = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });
    expect(res.status).toBe(200);
    expect(typeof res.body.id).toBe('number');
    expect(typeof res.body.created_at).toBe('string');
    expect(res.body.project_summary).toBe(validAnalysis.project_summary);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db/index.js';
import {
  createAnalysesRepo,
  type AnalysesRepo,
} from '../src/services/analysesRepo.js';
import type { AnalysisResult } from '../src/types/analysis.js';

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
};

describe('analyses persistence + GET /api/analyses', () => {
  const originalEnv = process.env.DB_PATH;
  beforeEach(() => {
    process.env.DB_PATH = ':memory:';
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = originalEnv;
  });

  it('after POST /api/analyze, row exists in analyses with matching idea', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = createApp({
      analyzeIdeaImpl: async () => validAnalysis,
      analysesRepo: repo,
    });

    const idea = 'A meaningful project idea text';
    const res = await request(app).post('/api/analyze').send({ idea });
    expect(res.status).toBe(200);

    const row = db
      .prepare('SELECT idea, result_json FROM analyses')
      .all() as Array<{ idea: string; result_json: string }>;
    expect(row).toHaveLength(1);
    expect(row[0].idea).toBe(idea);
    expect(JSON.parse(row[0].result_json)).toEqual(validAnalysis);
  });

  it('GET /api/analyses returns most-recent-first with parsed result objects', async () => {
    const db = openDb(':memory:');
    const repo = createAnalysesRepo(db);
    const app = createApp({
      analyzeIdeaImpl: async () => validAnalysis,
      analysesRepo: repo,
    });

    await request(app)
      .post('/api/analyze')
      .send({ idea: 'first idea here please' });
    await request(app)
      .post('/api/analyze')
      .send({ idea: 'second idea here please' });
    await request(app)
      .post('/api/analyze')
      .send({ idea: 'third idea here please' });

    const res = await request(app).get('/api/analyses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);

    expect(res.body.map((r: { idea: string }) => r.idea)).toEqual([
      'third idea here please',
      'second idea here please',
      'first idea here please',
    ]);

    for (const record of res.body) {
      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('created_at');
      expect(record).toHaveProperty('idea');
      expect(record).toHaveProperty('result');
      expect(record.result).toEqual(validAnalysis);
      expect(typeof record.result).toBe('object');
    }
  });

  it('DB write failure does not 500 the analyze response (logged only)', async () => {
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const flakyRepo: AnalysesRepo = {
      insert: () => {
        throw new Error('disk full');
      },
      listRecent: () => [],
    };

    const app = createApp({
      analyzeIdeaImpl: async () => validAnalysis,
      analysesRepo: flakyRepo,
    });

    const res = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(validAnalysis);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('vitest can use an in-memory sqlite db via env override', () => {
    process.env.DB_PATH = ':memory:';
    const db = openDb();
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='analyses'",
      )
      .get() as { name: string } | undefined;
    expect(row?.name).toBe('analyses');
    db.close();
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
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

describe('analyze rate limiter', () => {
  const prevMax = process.env.ANALYZE_RATE_MAX;

  beforeEach(() => {
    process.env.ANALYZE_RATE_MAX = '5';
  });

  afterEach(() => {
    if (prevMax === undefined) {
      delete process.env.ANALYZE_RATE_MAX;
    } else {
      process.env.ANALYZE_RATE_MAX = prevMax;
    }
  });

  it('returns 429 with rate_limited body on the 6th POST within 60s from the same IP', async () => {
    const app = createApp({ analyzeIdeaImpl: async () => validAnalysis });

    for (let i = 0; i < 5; i++) {
      const r = await request(app)
        .post('/api/analyze')
        .send({ idea: 'A meaningful project idea text' });
      expect(r.status).toBe(200);
    }

    const sixth = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });

    expect(sixth.status).toBe(429);
    expect(sixth.body).toEqual({ error: 'rate_limited' });
  });

  it('includes RateLimit-* standard headers on the analyze response', async () => {
    const app = createApp({ analyzeIdeaImpl: async () => validAnalysis });

    const r = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });

    expect(r.status).toBe(200);
    expect(r.headers['ratelimit-limit']).toBeDefined();
    expect(r.headers['ratelimit-remaining']).toBeDefined();
    expect(r.headers['ratelimit-reset']).toBeDefined();
    expect(r.headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('does not rate limit /api/analyses or /health beyond the configured max', async () => {
    const app = createApp({ analyzeIdeaImpl: async () => validAnalysis });

    for (let i = 0; i < 10; i++) {
      const h = await request(app).get('/health');
      expect(h.status).toBe(200);
      expect(h.headers['ratelimit-limit']).toBeUndefined();
    }

    for (let i = 0; i < 10; i++) {
      const a = await request(app).get('/api/analyses');
      expect(a.status).toBe(200);
      expect(a.headers['ratelimit-limit']).toBeUndefined();
    }
  });

  it('respects ANALYZE_RATE_MAX env override (high value lets many requests through)', async () => {
    process.env.ANALYZE_RATE_MAX = '1000000';
    const app = createApp({ analyzeIdeaImpl: async () => validAnalysis });

    for (let i = 0; i < 12; i++) {
      const r = await request(app)
        .post('/api/analyze')
        .send({ idea: 'A meaningful project idea text' });
      expect(r.status).toBe(200);
    }
  });
});

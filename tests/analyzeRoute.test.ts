import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AnalyzerValidationError } from '../src/services/analyzerService.js';
import { ClaudeRunError } from '../src/services/claudeService.js';
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

describe('POST /api/analyze', () => {
  it('returns 200 with parsed result for a valid body and stubbed analyzer', async () => {
    const app = createApp({
      analyzeIdeaImpl: async (idea) => {
        expect(idea).toBe('A meaningful project idea text');
        return validAnalysis;
      },
    });
    const res = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(validAnalysis);
  });

  it('returns 400 with zod issues when idea length is below 10', async () => {
    const app = createApp({
      analyzeIdeaImpl: async () => validAnalysis,
    });
    const res = await request(app)
      .post('/api/analyze')
      .send({ idea: 'short' });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
    expect(res.body.issues[0]).toHaveProperty('path');
    expect(res.body.issues[0]).toHaveProperty('message');
  });

  it('returns 502 analyzer_invalid_output when analyzer throws AnalyzerValidationError', async () => {
    const app = createApp({
      analyzeIdeaImpl: async () => {
        throw new AnalyzerValidationError('schema invalid');
      },
    });
    const res = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'analyzer_invalid_output' });
  });

  it('returns 502 analyzer_unavailable when analyzer throws ClaudeRunError', async () => {
    const app = createApp({
      analyzeIdeaImpl: async () => {
        throw new ClaudeRunError('claude not found');
      },
    });
    const res = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'analyzer_unavailable' });
  });

  it('returns 500 via central error handler for unexpected errors', async () => {
    const app = createApp({
      analyzeIdeaImpl: async () => {
        throw new Error('something else broke');
      },
    });
    const res = await request(app)
      .post('/api/analyze')
      .send({ idea: 'A meaningful project idea text' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
  });
});

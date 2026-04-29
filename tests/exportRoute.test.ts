import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { AnalysisResult } from '../src/types/analysis.js';

const validResult: AnalysisResult = {
  project_summary: 'A concise but sufficiently long project summary.',
  competitors: [
    { name: 'Comp A', key_features: 'fast', weakness: 'expensive' },
    { name: 'Comp B', key_features: 'cheap', weakness: 'slow' },
    { name: 'Comp C', key_features: 'pretty', weakness: 'buggy' },
  ],
  market_analysis: {
    trends: 'Growing AI tooling demand.',
    target_audience: 'Indie founders and PMs.',
  },
  viability: {
    score: 80,
    status: 'Yapmaya Değer',
    reasoning: 'Strong demand and modest competition.',
  },
  differentiation_points: ['First diff', 'Second diff', 'Third diff'],
  master_prompt:
    'You are a senior strategist. Follow these instructions to build the project described above. '.repeat(
      6,
    ),
};

describe('POST /api/export/pdf', () => {
  it('returns a PDF response with content-disposition attachment', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/export/pdf')
      .send({ idea: 'A meaningful idea description', result: validResult })
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment;\s*filename=/);
    expect(res.headers['content-disposition']).toMatch(/\.pdf"/);

    const body = res.body as Buffer;
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(body.length).toBeGreaterThan(500);
    expect(body.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('returns 400 when the result body fails schema validation', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/export/pdf')
      .send({ idea: 'short idea text', result: { project_summary: 'x' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_input');
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it('returns 400 when no body is provided', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/export/pdf')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_input');
  });

  it('accepts a request without the optional idea field', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/export/pdf')
      .send({ result: validResult })
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect((res.body as Buffer).subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});

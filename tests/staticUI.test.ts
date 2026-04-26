import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Static UI serving', () => {
  it('GET / returns the HTML form page', async () => {
    const app = createApp();
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('id="analyze-form"');
    expect(res.text).toContain('id="idea"');
    expect(res.text).toContain('maxlength="6000"');
    expect(res.text).toContain('id="submit-btn"');
    expect(res.text).toContain('id="results"');
  });

  it('GET /app.js returns the client script', async () => {
    const app = createApp();
    const res = await request(app).get('/app.js');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
    expect(res.text).toContain('submitIdea');
    expect(res.text).toContain('renderResult');
  });
});

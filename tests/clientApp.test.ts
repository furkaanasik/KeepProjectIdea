// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderResult,
  renderError,
  extractErrorMessage,
  submitIdea,
  wireForm,
} from '../public/app.js';

const sampleResult = {
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
  differentiation_points: ['First diff', 'Second diff', 'Third diff'],
  master_prompt: 'MASTER PROMPT BODY '.repeat(20),
};

function setupDOM() {
  document.body.innerHTML = `
    <form id="analyze-form">
      <textarea id="idea" name="idea" maxlength="6000"></textarea>
      <button id="submit-btn" type="submit">Analyze</button>
    </form>
    <div id="status" class="loading hidden"></div>
    <div id="error" class="error hidden"></div>
    <div id="results"></div>
  `;
}

describe('renderResult', () => {
  beforeEach(() => setupDOM());

  it('renders all 6 sections from the API response', () => {
    const container = document.getElementById('results') as HTMLElement;
    renderResult(container, sampleResult);

    const sections = container.querySelectorAll('section[data-section]');
    expect(sections.length).toBe(6);

    const sectionNames = Array.from(sections).map(
      (s) => (s as HTMLElement).dataset.section,
    );
    expect(sectionNames).toEqual([
      'summary',
      'competitors',
      'market',
      'viability',
      'differentiation',
      'master-prompt',
    ]);

    expect(container.textContent).toContain(sampleResult.project_summary);
    expect(container.textContent).toContain('Comp A');
    expect(container.textContent).toContain('Comp B');
    expect(container.textContent).toContain('Comp C');
    expect(container.textContent).toContain('Growing demand for AI tools.');
    expect(container.textContent).toContain('Indie founders and PMs.');

    const score = container.querySelector('[data-testid="viability-score"]');
    const status = container.querySelector('[data-testid="viability-status"]');
    expect(score?.textContent).toContain('85');
    expect(status?.textContent).toContain('Yapmaya Değer');

    const lis = container.querySelectorAll('section[data-section="differentiation"] li');
    expect(lis.length).toBe(3);
    expect(lis[0].textContent).toContain('First diff');
    expect(lis[1].textContent).toContain('Second diff');
    expect(lis[2].textContent).toContain('Third diff');

    const pre = container.querySelector('[data-testid="master-prompt"]');
    expect(pre?.tagName).toBe('PRE');
    expect(pre?.textContent).toContain('MASTER PROMPT BODY');
  });

  it('escapes HTML in user-provided fields', () => {
    const container = document.getElementById('results') as HTMLElement;
    renderResult(container, {
      ...sampleResult,
      project_summary: '<script>alert(1)</script>',
    });
    expect(container.innerHTML).not.toContain('<script>alert(1)</script>');
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('copy button writes master_prompt to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const container = document.getElementById('results') as HTMLElement;
    renderResult(container, sampleResult);

    const btn = container.querySelector(
      '[data-testid="copy-btn"]',
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(sampleResult.master_prompt);
  });
});

describe('renderError', () => {
  beforeEach(() => setupDOM());

  it('shows the error inline (removes hidden class) with the message text', () => {
    const errorEl = document.getElementById('error') as HTMLElement;
    expect(errorEl.classList.contains('hidden')).toBe(true);
    renderError(errorEl, 'invalid_input: idea — String must contain at least 10 characters');
    expect(errorEl.classList.contains('hidden')).toBe(false);
    expect(errorEl.textContent).toContain('invalid_input');
    expect(errorEl.textContent).toContain('idea');
  });
});

describe('extractErrorMessage', () => {
  it('produces a readable message from a 400 zod-style payload', () => {
    const msg = extractErrorMessage({
      error: 'invalid_input',
      issues: [
        {
          path: ['idea'],
          message: 'String must contain at least 10 character(s)',
        },
      ],
    });
    expect(msg).toContain('invalid_input');
    expect(msg).toContain('idea');
    expect(msg).toContain('String must contain at least 10');
  });

  it('falls back to error string when no issues present', () => {
    expect(extractErrorMessage({ error: 'analyzer_unavailable' })).toBe(
      'analyzer_unavailable',
    );
  });

  it('returns generic message for unknown payloads', () => {
    expect(extractErrorMessage(null)).toBe('Request failed');
    expect(extractErrorMessage({})).toBe('Request failed');
  });
});

describe('submitIdea', () => {
  it('POSTs JSON to /api/analyze with the idea field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleResult,
    });

    const result = await submitIdea('A meaningful project idea text', fetchMock as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/analyze');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ idea: 'A meaningful project idea text' });
    expect(result.ok).toBe(true);
    expect(result.body).toEqual(sampleResult);
  });
});

describe('wireForm — form submission flow', () => {
  beforeEach(() => setupDOM());

  it('disables submit while pending and renders results on success', async () => {
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                json: async () => sampleResult,
              }),
              0,
          ),
        ),
    );
    (globalThis as any).fetch = fetchMock;

    wireForm(document);

    const textarea = document.getElementById('idea') as HTMLTextAreaElement;
    const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    const form = document.getElementById('analyze-form') as HTMLFormElement;
    const results = document.getElementById('results') as HTMLElement;

    textarea.value = 'A meaningful project idea text';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    expect(submitBtn.disabled).toBe(true);

    await new Promise((r) => setTimeout(r, 5));

    expect(submitBtn.disabled).toBe(false);
    expect(results.querySelectorAll('section[data-section]').length).toBe(6);
  });

  it('shows inline error on 400 instead of swallowing it', async () => {
    const errorPayload = {
      error: 'invalid_input',
      issues: [
        {
          path: ['idea'],
          message: 'String must contain at least 10 character(s)',
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => errorPayload,
    });
    (globalThis as any).fetch = fetchMock;

    wireForm(document);

    const textarea = document.getElementById('idea') as HTMLTextAreaElement;
    const form = document.getElementById('analyze-form') as HTMLFormElement;
    const errorEl = document.getElementById('error') as HTMLElement;
    const results = document.getElementById('results') as HTMLElement;

    textarea.value = 'short';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    await new Promise((r) => setTimeout(r, 5));

    expect(errorEl.classList.contains('hidden')).toBe(false);
    expect(errorEl.textContent).toContain('invalid_input');
    expect(errorEl.textContent).toContain('idea');
    expect(results.children.length).toBe(0);
  });

  it('shows inline error on 5xx using server error field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'analyzer_unavailable' }),
    });
    (globalThis as any).fetch = fetchMock;

    wireForm(document);

    const textarea = document.getElementById('idea') as HTMLTextAreaElement;
    const form = document.getElementById('analyze-form') as HTMLFormElement;
    const errorEl = document.getElementById('error') as HTMLElement;

    textarea.value = 'A meaningful project idea text';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    await new Promise((r) => setTimeout(r, 5));

    expect(errorEl.classList.contains('hidden')).toBe(false);
    expect(errorEl.textContent).toBe('analyzer_unavailable');
  });
});

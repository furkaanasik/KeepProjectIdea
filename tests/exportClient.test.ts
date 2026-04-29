// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderResult,
  exportAnalysisPdf,
  buildExportFilename,
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
  document.body.innerHTML = `<div id="results"></div>`;
}

describe('renderResult — export PDF button', () => {
  beforeEach(() => setupDOM());

  it('renders the export PDF button alongside copy', () => {
    const container = document.getElementById('results') as HTMLElement;
    renderResult(container, sampleResult, { idea: 'sample idea text' });
    const btn = container.querySelector('[data-testid="export-pdf-btn"]');
    expect(btn).toBeTruthy();
    expect(btn?.textContent).toContain('Export PDF');
  });

  it('clicking export-pdf-btn POSTs to /api/export/pdf and triggers a download', async () => {
    const blob = new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => blob,
    });
    (globalThis as any).fetch = fetchMock;

    const createObjectURL = vi.fn().mockReturnValue('blob:fake-url');
    const revokeObjectURL = vi.fn();
    (globalThis as any).URL.createObjectURL = createObjectURL;
    (globalThis as any).URL.revokeObjectURL = revokeObjectURL;

    const container = document.getElementById('results') as HTMLElement;
    renderResult(container, sampleResult, { idea: 'sample idea text' });

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const btn = container.querySelector(
      '[data-testid="export-pdf-btn"]',
    ) as HTMLButtonElement;
    btn.click();

    await new Promise((r) => setTimeout(r, 5));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/export/pdf');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.idea).toBe('sample idea text');
    expect(body.result).toEqual(sampleResult);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');

    clickSpy.mockRestore();
  });
});

describe('exportAnalysisPdf', () => {
  it('throws when the server responds with non-ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      blob: async () => new Blob([]),
    });
    const fakeDoc = {
      createElement: () => ({ click: () => {} }) as any,
      body: { appendChild: () => {}, removeChild: () => {} } as any,
    };
    const fakeURL = {
      createObjectURL: () => 'blob:x',
      revokeObjectURL: () => {},
    };

    await expect(
      exportAnalysisPdf(sampleResult, 'idea', {
        fetchImpl,
        document: fakeDoc as any,
        URL: fakeURL as any,
      }),
    ).rejects.toThrow(/export_failed_500/);
  });

  it('returns the generated filename on success', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => blob,
    });
    const click = vi.fn();
    const anchor: any = { click };
    const fakeDoc = {
      createElement: vi.fn().mockReturnValue(anchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };
    const fakeURL = {
      createObjectURL: vi.fn().mockReturnValue('blob:url'),
      revokeObjectURL: vi.fn(),
    };

    const result = await exportAnalysisPdf(sampleResult, 'My Idea', {
      fetchImpl,
      document: fakeDoc as any,
      URL: fakeURL as any,
    });

    expect(result.filename).toMatch(/^my-idea-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.pdf$/);
    expect(anchor.href).toBe('blob:url');
    expect(anchor.download).toBe(result.filename);
    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe('buildExportFilename (client)', () => {
  it('slugifies and timestamps consistently with the server', () => {
    const name = buildExportFilename(
      'AI Co-pilot for Founders!!',
      new Date('2026-04-29T12:34:56.000Z'),
    );
    expect(name).toBe('ai-co-pilot-for-founders-2026-04-29T12-34-56.pdf');
  });

  it('falls back to "analysis" when idea is empty', () => {
    const name = buildExportFilename('', new Date('2026-04-29T12:34:56.000Z'));
    expect(name).toBe('analysis-2026-04-29T12-34-56.pdf');
  });
});

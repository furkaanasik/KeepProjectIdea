import { describe, it, expect } from 'vitest';
import {
  buildAnalysisPdf,
  buildExportFilename,
} from '../src/services/pdfExporter.js';
import type { AnalysisResult } from '../src/types/analysis.js';

const sampleResult: AnalysisResult = {
  project_summary: 'A concise but sufficiently long project summary.',
  competitors: [
    { name: 'Competitor Alpha', key_features: 'fast', weakness: 'expensive' },
    { name: 'Competitor Beta', key_features: 'cheap', weakness: 'slow' },
    { name: 'Competitor Gamma', key_features: 'pretty', weakness: 'buggy' },
  ],
  market_analysis: {
    trends: 'Strong AI tooling tailwind across SMB segments.',
    target_audience: 'Indie founders, product managers, and solo builders.',
  },
  viability: {
    score: 82,
    status: 'Yapmaya Değer',
    reasoning: 'Demand exists, defensibility achievable through workflow lock-in.',
  },
  differentiation_points: [
    'Co-pilot turns voice memos into validated specs',
    'Built-in competitor scraping pipeline',
    'One-click export to ready-to-ship master prompt',
  ],
  master_prompt:
    'You are a senior strategist. Build the project described above following these constraints: '.repeat(
      8,
    ),
};

describe('buildAnalysisPdf', () => {
  it('produces a valid PDF buffer with PDF magic header', async () => {
    const pdf = await buildAnalysisPdf(sampleResult, {
      idea: 'AI co-pilot for founders',
      generatedAt: new Date('2026-04-29T12:00:00.000Z'),
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    const tail = pdf.subarray(pdf.length - 32).toString('ascii');
    expect(tail).toContain('%%EOF');
  });

  it('grows in size as more content is added (proves content stream is written)', async () => {
    const small = await buildAnalysisPdf(
      { ...sampleResult, master_prompt: 'short prompt body '.repeat(20) },
      { generatedAt: new Date('2026-04-29T12:00:00.000Z') },
    );
    const large = await buildAnalysisPdf(
      { ...sampleResult, master_prompt: 'long prompt body '.repeat(2000) },
      { generatedAt: new Date('2026-04-29T12:00:00.000Z') },
    );
    expect(large.length).toBeGreaterThan(small.length * 2);
  });

  it('uses Helvetica font family in the rendered PDF', async () => {
    const pdf = await buildAnalysisPdf(sampleResult, {
      generatedAt: new Date('2026-04-29T12:00:00.000Z'),
    });
    const ascii = pdf.toString('latin1');
    expect(ascii).toContain('/BaseFont /Helvetica');
  });

  it('does not throw when idea is omitted', async () => {
    const pdf = await buildAnalysisPdf(sampleResult);
    expect(pdf.length).toBeGreaterThan(500);
  });
});

describe('buildExportFilename', () => {
  it('slugifies the idea and appends a timestamp', () => {
    const name = buildExportFilename(
      'My Awesome SaaS Idea!',
      new Date('2026-04-29T12:34:56.000Z'),
    );
    expect(name).toBe('my-awesome-saas-idea-2026-04-29T12-34-56.pdf');
  });

  it('falls back to "analysis" when idea is empty', () => {
    const name = buildExportFilename(
      undefined,
      new Date('2026-04-29T12:34:56.000Z'),
    );
    expect(name).toBe('analysis-2026-04-29T12-34-56.pdf');
  });
});

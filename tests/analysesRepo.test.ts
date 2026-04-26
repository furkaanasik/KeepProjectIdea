import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/index.js';
import { createAnalysesRepo } from '../src/services/analysesRepo.js';
import type { AnalysisResult } from '../src/types/analysis.js';

const buildResult = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
  project_summary: 'A concise yet sufficiently long project summary.',
  competitors: [
    { name: 'A', key_features: 'fast', weakness: 'expensive' },
    { name: 'B', key_features: 'cheap', weakness: 'slow' },
    { name: 'C', key_features: 'pretty', weakness: 'buggy' },
  ],
  market_analysis: { trends: 't', target_audience: 'a' },
  viability: { score: 80, status: 'good', reasoning: 'because' },
  differentiation_points: ['one', 'two', 'three'],
  master_prompt: 'M'.repeat(220),
  ...overrides,
});

describe('analysesRepo', () => {
  let repo: ReturnType<typeof createAnalysesRepo>;

  beforeEach(() => {
    const db = openDb(':memory:');
    repo = createAnalysesRepo(db);
  });

  it('insert persists a row with matching idea and returns id + created_at', () => {
    const result = buildResult();
    const inserted = repo.insert('My idea text', result);

    expect(inserted.id).toBeGreaterThan(0);
    expect(typeof inserted.created_at).toBe('string');
    expect(() => new Date(inserted.created_at).toISOString()).not.toThrow();

    const records = repo.listRecent();
    expect(records).toHaveLength(1);
    expect(records[0].idea).toBe('My idea text');
    expect(records[0].result).toEqual(result);
  });

  it('listRecent returns parsed AnalysisResult objects (not raw JSON strings)', () => {
    const result = buildResult({ project_summary: 'unique summary marker text' });
    repo.insert('idea', result);
    const records = repo.listRecent();
    expect(typeof records[0].result).toBe('object');
    expect(records[0].result.project_summary).toBe('unique summary marker text');
    expect(records[0].result.competitors).toHaveLength(3);
  });

  it('listRecent orders by most-recent-first', () => {
    repo.insert('first', buildResult({ project_summary: 'first summary text long' }));
    repo.insert('second', buildResult({ project_summary: 'second summary text long' }));
    repo.insert('third', buildResult({ project_summary: 'third summary text long' }));

    const records = repo.listRecent();
    expect(records.map((r) => r.idea)).toEqual(['third', 'second', 'first']);
  });

  it('listRecent respects limit (default 20)', () => {
    for (let i = 0; i < 25; i++) {
      repo.insert(`idea ${i}`, buildResult());
    }
    expect(repo.listRecent()).toHaveLength(20);
    expect(repo.listRecent(5)).toHaveLength(5);
  });
});

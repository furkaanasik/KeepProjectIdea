import { describe, it, expect } from 'vitest';
import {
  AnalysisResultSchema,
  ProjectIdeaInputSchema,
} from '../src/types/analysis.js';

const validFixture = {
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
  master_prompt: 'X'.repeat(200),
  vc_scores: { market_fit: 8, feasibility: 7, moat: 6, scalability: 9 },
  pain_points: ['Truth one', 'Truth two', 'Truth three'],
  revenue_model: 'S'.repeat(50),
  decision: 'KEEP' as const,
};

describe('AnalysisResultSchema', () => {
  it('parses a valid fixture', () => {
    expect(() => AnalysisResultSchema.parse(validFixture)).not.toThrow();
  });

  it('rejects when competitors length < 3', () => {
    const bad = {
      ...validFixture,
      competitors: validFixture.competitors.slice(0, 2),
    };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });

  it('rejects when competitors length > 5', () => {
    const extra = { name: 'X', key_features: 'y', weakness: 'z' };
    const bad = {
      ...validFixture,
      competitors: [
        ...validFixture.competitors,
        extra,
        extra,
        extra,
      ],
    };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });

  it('rejects when viability.score is below 0', () => {
    const bad = {
      ...validFixture,
      viability: { ...validFixture.viability, score: -1 },
    };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });

  it('rejects when viability.score is above 100', () => {
    const bad = {
      ...validFixture,
      viability: { ...validFixture.viability, score: 101 },
    };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });

  it('rejects when viability.score is non-integer', () => {
    const bad = {
      ...validFixture,
      viability: { ...validFixture.viability, score: 50.5 },
    };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });
});

describe('VcScores', () => {
  it('rejects vc_scores value below 1', () => {
    const bad = { ...validFixture, vc_scores: { ...validFixture.vc_scores, market_fit: 0 } };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });

  it('rejects vc_scores value above 10', () => {
    const bad = { ...validFixture, vc_scores: { ...validFixture.vc_scores, moat: 11 } };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });

  it('rejects non-integer vc_scores', () => {
    const bad = { ...validFixture, vc_scores: { ...validFixture.vc_scores, scalability: 7.5 } };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });
});

describe('pain_points', () => {
  it('rejects fewer than 3 pain_points', () => {
    const bad = { ...validFixture, pain_points: ['Only one', 'Only two'] };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });

  it('rejects more than 3 pain_points', () => {
    const bad = { ...validFixture, pain_points: ['A', 'B', 'C', 'D'] };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });
});

describe('revenue_model', () => {
  it('rejects revenue_model shorter than 50 chars', () => {
    const bad = { ...validFixture, revenue_model: 'too short' };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });

  it('accepts revenue_model of exactly 50 chars', () => {
    const ok = { ...validFixture, revenue_model: 'X'.repeat(50) };
    expect(() => AnalysisResultSchema.parse(ok)).not.toThrow();
  });
});

describe('decision', () => {
  it('accepts KEEP', () => {
    expect(() => AnalysisResultSchema.parse({ ...validFixture, decision: 'KEEP' })).not.toThrow();
  });

  it('accepts DROP', () => {
    expect(() => AnalysisResultSchema.parse({ ...validFixture, decision: 'DROP' })).not.toThrow();
  });

  it('rejects unknown decision value', () => {
    const bad = { ...validFixture, decision: 'MAYBE' };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });
});

describe('ProjectIdeaInputSchema', () => {
  it('accepts an idea between 10 and 6000 chars', () => {
    expect(() =>
      ProjectIdeaInputSchema.parse({ idea: 'A'.repeat(50) }),
    ).not.toThrow();
  });

  it('rejects ideas shorter than 10 chars', () => {
    expect(() =>
      ProjectIdeaInputSchema.parse({ idea: 'too short' }),
    ).toThrow();
  });

  it('rejects ideas longer than 6000 chars', () => {
    expect(() =>
      ProjectIdeaInputSchema.parse({ idea: 'A'.repeat(6001) }),
    ).toThrow();
  });
});

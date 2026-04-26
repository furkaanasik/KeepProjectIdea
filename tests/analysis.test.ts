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

import { describe, it, expect } from 'vitest';
import {
  analyzeIdea,
  extractJsonObject,
  AnalyzerValidationError,
  type RunClaudeFn,
} from '../src/services/analyzerService.js';
import { buildStrategistPrompt } from '../src/prompts/strategistPrompt.js';

const validAnalysis = {
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
    score: 75,
    status: 'Yapmaya Değer',
    reasoning: 'Strong demand, modest competition.',
  },
  differentiation_points: ['First', 'Second', 'Third'],
  master_prompt: 'X'.repeat(250),
  vc_scores: { market_fit: 8, feasibility: 7, moat: 6, scalability: 9 },
  pain_points: ['Truth one', 'Truth two', 'Truth three'],
  revenue_model: 'S'.repeat(50),
  decision: 'KEEP' as const,
};

function fakeRunClaude(result: string): RunClaudeFn {
  return async () => ({ result, raw: { result } });
}

describe('extractJsonObject', () => {
  it('returns null when there is no opening brace', () => {
    expect(extractJsonObject('hello world, no braces here')).toBeNull();
  });

  it('extracts a clean JSON object', () => {
    const obj = '{"a":1,"b":[1,2,3]}';
    expect(extractJsonObject(obj)).toBe(obj);
  });

  it('extracts a JSON object embedded in prose', () => {
    const obj = '{"a":1,"b":"hi"}';
    const text = `Here is the data:\n${obj}\nThanks.`;
    expect(extractJsonObject(text)).toBe(obj);
  });

  it('respects strings that contain braces and quotes', () => {
    const obj = '{"a":"a string with } and { inside","b":"\\"escaped\\""}';
    expect(extractJsonObject(`prefix ${obj} suffix`)).toBe(obj);
  });

  it('handles nested objects', () => {
    const obj = '{"a":{"b":{"c":1}},"d":2}';
    expect(extractJsonObject(`noise ${obj} noise`)).toBe(obj);
  });

  it('extracts the object even with trailing truncation after the closing brace', () => {
    const obj = '{"foo":"bar","baz":[1,2,3]}';
    const truncated = `${obj} <-- model was cut off here \n {"incomp`;
    const got = extractJsonObject(truncated);
    expect(got).toBe(obj);
    expect(JSON.parse(got!)).toEqual({ foo: 'bar', baz: [1, 2, 3] });
  });

  it('returns the largest among multiple complete top-level objects', () => {
    const small = '{"a":1}';
    const big = '{"a":1,"b":{"c":2,"d":[1,2,3,4,5]}}';
    const text = `${small} then ${big}`;
    expect(extractJsonObject(text)).toBe(big);
  });
});

describe('buildStrategistPrompt', () => {
  it('interpolates the user idea and removes the placeholder token', () => {
    const prompt = buildStrategistPrompt('an interesting idea');
    expect(prompt).toContain('an interesting idea');
    expect(prompt).not.toContain('{user_project_idea}');
  });

  it('escapes backticks and braces in user-supplied input', () => {
    const prompt = buildStrategistPrompt('evil `}` {payload} input');
    expect(prompt).toContain('evil \\`\\}\\` \\{payload\\} input');
  });
});

describe('analyzeIdea', () => {
  it('resolves to a typed AnalysisResult when claude returns valid JSON in prose', async () => {
    const wrapped = `Sure, here you go:\n\n${JSON.stringify(validAnalysis)}\n\nLet me know if you need adjustments.`;
    const out = await analyzeIdea('A solid idea', {
      runClaudeImpl: fakeRunClaude(wrapped),
    });
    expect(out).toEqual(validAnalysis);
    expect(out.viability.score).toBe(75);
  });

  it('handles JSON with trailing truncation after the closing brace', async () => {
    const result = `${JSON.stringify(validAnalysis)} ...stream cut off mid-sentence`;
    const out = await analyzeIdea('A solid idea', {
      runClaudeImpl: fakeRunClaude(result),
    });
    expect(out.competitors).toHaveLength(3);
  });

  it('throws AnalyzerValidationError when no JSON object is present', async () => {
    let caught: unknown;
    try {
      await analyzeIdea('A solid idea', {
        runClaudeImpl: fakeRunClaude('no json here at all'),
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AnalyzerValidationError);
  });

  it('throws AnalyzerValidationError when extracted JSON fails schema', async () => {
    const bad = { ...validAnalysis, competitors: [validAnalysis.competitors[0]] };
    let caught: unknown;
    try {
      await analyzeIdea('A solid idea', {
        runClaudeImpl: fakeRunClaude(JSON.stringify(bad)),
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AnalyzerValidationError);
    expect((caught as AnalyzerValidationError).issues.length).toBeGreaterThan(0);
  });

  it('throws AnalyzerValidationError when extracted text is not valid JSON', async () => {
    const result = 'preamble {not: "json", trailing,} suffix';
    let caught: unknown;
    try {
      await analyzeIdea('A solid idea', {
        runClaudeImpl: fakeRunClaude(result),
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AnalyzerValidationError);
  });

  it('passes the built prompt and json output format to the runner', async () => {
    const calls: Array<{ prompt: string; outputFormat?: string }> = [];
    const runner: RunClaudeFn = async (opts) => {
      calls.push({ prompt: opts.prompt, outputFormat: opts.outputFormat });
      return { result: JSON.stringify(validAnalysis), raw: {} };
    };
    await analyzeIdea('A solid idea', { runClaudeImpl: runner });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.outputFormat).toBe('json');
    expect(calls[0]!.prompt).toContain('A solid idea');
    expect(calls[0]!.prompt).toContain('Rakip Analizi');
  });

  it('sets decision=KEEP when vc_scores avg >= 7', async () => {
    // market_fit:8, feasibility:7, moat:6, scalability:9 → avg=7.5
    const out = await analyzeIdea('A solid idea', {
      runClaudeImpl: fakeRunClaude(JSON.stringify(validAnalysis)),
    });
    expect(out.decision).toBe('KEEP');
  });

  it('sets decision=DROP when vc_scores avg < 7', async () => {
    const lowScores = {
      ...validAnalysis,
      vc_scores: { market_fit: 5, feasibility: 5, moat: 6, scalability: 6 },
      decision: 'KEEP' as const,
    };
    const out = await analyzeIdea('A solid idea', {
      runClaudeImpl: fakeRunClaude(JSON.stringify(lowScores)),
    });
    expect(out.decision).toBe('DROP');
  });

  it('derives viability.score as Math.round(avg * 10)', async () => {
    // avg = (8+7+6+9)/4 = 7.5 → score = 75
    const out = await analyzeIdea('A solid idea', {
      runClaudeImpl: fakeRunClaude(JSON.stringify(validAnalysis)),
    });
    expect(out.viability.score).toBe(75);
  });

  it('overrides Claude-supplied decision with vc_scores derived value', async () => {
    const mismatch = { ...validAnalysis, decision: 'DROP' as const };
    const out = await analyzeIdea('A solid idea', {
      runClaudeImpl: fakeRunClaude(JSON.stringify(mismatch)),
    });
    expect(out.decision).toBe('KEEP');
  });

  it('throws AnalyzerValidationError when vc_scores is missing', async () => {
    const { vc_scores: _omit, ...noVcScores } = validAnalysis;
    let caught: unknown;
    try {
      await analyzeIdea('A solid idea', {
        runClaudeImpl: fakeRunClaude(JSON.stringify(noVcScores)),
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AnalyzerValidationError);
    expect((caught as AnalyzerValidationError).issues.length).toBeGreaterThan(0);
  });

  it('throws AnalyzerValidationError when a vc_scores axis is missing', async () => {
    const partialVc = {
      ...validAnalysis,
      vc_scores: { market_fit: 8, feasibility: 7, moat: 6 },
    };
    let caught: unknown;
    try {
      await analyzeIdea('A solid idea', {
        runClaudeImpl: fakeRunClaude(JSON.stringify(partialVc)),
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AnalyzerValidationError);
    expect((caught as AnalyzerValidationError).issues.length).toBeGreaterThan(0);
  });
});

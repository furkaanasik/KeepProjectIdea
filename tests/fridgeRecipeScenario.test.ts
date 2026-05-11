import { describe, it, expect } from 'vitest';
import {
  analyzeIdea,
  type RunClaudeFn,
} from '../src/services/analyzerService.js';
import { buildAnalysisPdf } from '../src/services/pdfExporter.js';
import { buildStrategistPrompt } from '../src/prompts/strategistPrompt.js';
import type { AnalysisResult } from '../src/types/analysis.js';

// Realistic mock response for a fridge-recipe app — known-weak idea
// (Supercook, Epicurious, Yummly, AllRecipes all exist)
const fridgeRecipeAnalysis: AnalysisResult = {
  project_summary:
    'A mobile app that suggests recipes based on ingredients currently in the user\'s fridge, using computer vision to detect food items automatically.',
  competitors: [
    {
      name: 'Supercook',
      key_features: 'Searches 1M+ recipes by available ingredients; free tier',
      weakness: 'No computer vision; manual ingredient entry only',
    },
    {
      name: 'Epicurious',
      key_features: 'Editorial quality recipes, ingredient-based search, Condé Nast brand',
      weakness: 'Ingredient matching is coarse; no pantry tracking',
    },
    {
      name: 'Yummly',
      key_features: 'Personalized recommendations, smart shopping list, Whirlpool integration',
      weakness: 'Fridge detection requires manual input; app feels bloated',
    },
    {
      name: 'AllRecipes',
      key_features: '60M monthly users, community recipes, ingredient-based filter',
      weakness: 'No automatic fridge detection; heavy ad experience',
    },
  ],
  market_analysis: {
    trends:
      'Online recipe platform market reached $4.7B in 2024 growing at 7% CAGR. AI food-tech investments declined 18% YoY in 2024 vs 2023 peak.',
    target_audience:
      'Home cooks aged 25-45 who want to reduce food waste and simplify meal planning.',
  },
  viability: {
    score: 53,
    status: 'Riskli',
    reasoning:
      'The core problem is solved adequately by free tools like Supercook. CV ingredient detection adds marginal value vs cost. No defensible moat against established players with millions of users.',
  },
  differentiation_points: [
    'Computer vision auto-detects fridge contents without manual entry',
    'AI generates personalized recipes factoring dietary restrictions and taste history',
    'Integrates with smart fridges via API (LG ThinQ, Samsung Family Hub)',
  ],
  master_prompt:
    'You are a senior full-stack engineer tasked with building a fridge-recipe mobile app. ' +
    'The app must: (1) use ML-based object detection (YOLO v8 or similar) to identify food items from fridge photos, ' +
    '(2) match detected ingredients against a recipe database of 500K+ recipes, ' +
    '(3) rank suggestions by freshness (ingredients closest to expiry ranked higher), ' +
    '(4) support dietary filters (vegan, gluten-free, keto), ' +
    '(5) integrate with LG ThinQ and Samsung Family Hub APIs for automatic fridge inventory sync. ' +
    'Tech stack: React Native, Node.js/Express, PostgreSQL, Redis, TensorFlow Lite for on-device inference. ' +
    'Monetization: freemium — free for 5 analyses/month, $4.99/month pro. ' +
    'Key risk: user acquisition cost in a crowded market; differentiation must be frictionless onboarding. ' +
    'Build the MVP in 3 months with a team of 2 engineers.',
  vc_scores: {
    market_fit: 6,
    feasibility: 7,
    moat: 3,
    scalability: 6,
  },
  pain_points: [
    'Users open the fridge, see 12 ingredients, and spend 20 minutes manually searching recipe sites with no match.',
    'Roughly 30-40% of household food is wasted because people do not know which recipes use near-expiry items.',
    'Existing apps like Supercook require typing every ingredient; friction causes 70%+ drop-off before first result.',
  ],
  revenue_model:
    'Freemium model: free tier allows 5 fridge scans per month; Pro at $4.99/month unlocks unlimited scans, expiry tracking, and family sharing. ' +
    'Secondary revenue from affiliate links to grocery delivery (Instacart, Amazon Fresh) when users add missing ingredients to their shopping list.',
  decision: 'DROP',
};

function fakeRunner(result: AnalysisResult): RunClaudeFn {
  return async () => ({ result: JSON.stringify(result), raw: {} });
}

describe('Fridge Recipe Idea — acceptance criteria', () => {
  it('pain_points has exactly 3 items', async () => {
    const out = await analyzeIdea('App that suggests recipes from fridge ingredients', {
      runClaudeImpl: fakeRunner(fridgeRecipeAnalysis),
    });
    expect(out.pain_points).toHaveLength(3);
  });

  it('pain_points items are non-empty and specific (not generic filler)', async () => {
    const out = await analyzeIdea('App that suggests recipes from fridge ingredients', {
      runClaudeImpl: fakeRunner(fridgeRecipeAnalysis),
    });
    for (const point of out.pain_points) {
      expect(point.length).toBeGreaterThan(30);
      // Must not be a generic placeholder
      expect(point).not.toMatch(/acı nokta \d/i);
      expect(point).not.toMatch(/spesifik.*somut olmalı/i);
    }
  });

  it('vc_scores.moat is <= 4 for a fridge-recipe idea with established competitors', async () => {
    const out = await analyzeIdea('App that suggests recipes from fridge ingredients', {
      runClaudeImpl: fakeRunner(fridgeRecipeAnalysis),
    });
    expect(out.vc_scores.moat).toBeLessThanOrEqual(4);
  });

  it('decision is DROP when vc_scores average < 7', async () => {
    const out = await analyzeIdea('App that suggests recipes from fridge ingredients', {
      runClaudeImpl: fakeRunner(fridgeRecipeAnalysis),
    });
    const { market_fit, feasibility, moat, scalability } = out.vc_scores;
    const avg = (market_fit + feasibility + moat + scalability) / 4;
    expect(avg).toBeLessThan(7);
    expect(out.decision).toBe('DROP');
  });

  it('competitors are named real companies, not placeholders', async () => {
    const out = await analyzeIdea('App that suggests recipes from fridge ingredients', {
      runClaudeImpl: fakeRunner(fridgeRecipeAnalysis),
    });
    for (const c of out.competitors) {
      expect(c.name).not.toMatch(/rakip adı/i);
      expect(c.name.trim().length).toBeGreaterThan(2);
    }
    // At least one well-known recipe platform must appear
    const names = out.competitors.map((c) => c.name.toLowerCase());
    const knownPlayers = ['supercook', 'epicurious', 'yummly', 'allrecipes', 'whisk'];
    const found = knownPlayers.some((p) => names.some((n) => n.includes(p)));
    expect(found).toBe(true);
  });

  it('PDF export renders scoring table and KEEP/DROP badge without crash', async () => {
    const out = await analyzeIdea('App that suggests recipes from fridge ingredients', {
      runClaudeImpl: fakeRunner(fridgeRecipeAnalysis),
    });
    const pdf = await buildAnalysisPdf(out, {
      idea: 'App that suggests recipes from fridge ingredients',
      generatedAt: new Date('2026-05-11T12:00:00.000Z'),
    });
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.subarray(pdf.length - 32).toString('ascii')).toContain('%%EOF');
    expect(pdf.length).toBeGreaterThan(3_000);
  });

  it('PDF export works specifically with a DROP result and moat=3', async () => {
    const dropResult: AnalysisResult = {
      ...fridgeRecipeAnalysis,
      vc_scores: { market_fit: 5, feasibility: 6, moat: 3, scalability: 5 },
      decision: 'DROP',
    };
    const pdf = await buildAnalysisPdf(dropResult, {
      generatedAt: new Date('2026-05-11T12:00:00.000Z'),
    });
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});

describe('Fridge Recipe Idea — prompt anchoring', () => {
  it('prompt instructs moat scoring conservatively when established competitors exist', () => {
    const prompt = buildStrategistPrompt('recipe app from fridge ingredients');
    expect(prompt).toMatch(/moat MUTLAKA ≤ 4/);
  });

  it('prompt output template includes vc_scores field', () => {
    const prompt = buildStrategistPrompt('any idea');
    expect(prompt).toContain('"vc_scores"');
  });

  it('prompt output template includes pain_points field', () => {
    const prompt = buildStrategistPrompt('any idea');
    expect(prompt).toContain('"pain_points"');
  });

  it('prompt output template includes revenue_model field', () => {
    const prompt = buildStrategistPrompt('any idea');
    expect(prompt).toContain('"revenue_model"');
  });

  it('prompt output template includes decision field', () => {
    const prompt = buildStrategistPrompt('any idea');
    expect(prompt).toContain('"decision"');
  });

  it('prompt names Supercook and Epicurious as moat anchoring examples', () => {
    const prompt = buildStrategistPrompt('any idea');
    expect(prompt).toContain('Supercook');
    expect(prompt).toContain('Epicurious');
  });
});

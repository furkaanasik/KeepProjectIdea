import { describe, it, expect } from 'vitest';
import { buildStrategistPrompt } from '../src/prompts/strategistPrompt.js';

describe('buildStrategistPrompt', () => {
  const result = buildStrategistPrompt('Yapay zeka destekli proje yönetim aracı');

  it('injects the idea into the prompt', () => {
    expect(result).toContain('Yapay zeka destekli proje yönetim aracı');
  });

  it('contains VC role preamble', () => {
    expect(result).toContain('Risk Sermayesi Uzmanı');
    expect(result).toContain('Pazar Stratejist');
  });

  it('contains explicit no-uniqueness instruction', () => {
    expect(result).toContain('benzersiz');
    expect(result).toContain('Rakip bulmadan analiz yapma');
  });

  it('contains Pazar Taraması step', () => {
    expect(result).toContain('Pazar Taraması');
  });

  it('contains Teknik Bariyerler step', () => {
    expect(result).toContain('Teknik Bariyerler');
  });

  it('contains Hedef Kitle Sorgulaması step', () => {
    expect(result).toContain('Hedef Kitle Sorgulaması');
  });

  it('contains Gelir Modeli Eleştirisi step', () => {
    expect(result).toContain('Gelir Modeli Eleştirisi');
  });

  it('contains existing JSON key: project_summary', () => {
    expect(result).toContain('"project_summary"');
  });

  it('contains existing JSON key: competitors', () => {
    expect(result).toContain('"competitors"');
  });

  it('contains existing JSON key: market_analysis', () => {
    expect(result).toContain('"market_analysis"');
  });

  it('contains existing JSON key: viability', () => {
    expect(result).toContain('"viability"');
  });

  it('contains existing JSON key: differentiation_points', () => {
    expect(result).toContain('"differentiation_points"');
  });

  it('contains existing JSON key: master_prompt', () => {
    expect(result).toContain('"master_prompt"');
  });

  it('contains new JSON key: market_scan', () => {
    expect(result).toContain('"market_scan"');
  });

  it('contains new JSON key: technical_barriers', () => {
    expect(result).toContain('"technical_barriers"');
  });

  it('contains new JSON key: target_audience_challenge', () => {
    expect(result).toContain('"target_audience_challenge"');
  });

  it('contains new JSON key: revenue_model_critique', () => {
    expect(result).toContain('"revenue_model_critique"');
  });

  it('contains new JSON key: vc_scores', () => {
    expect(result).toContain('"vc_scores"');
  });

  it('contains new JSON key: pain_points', () => {
    expect(result).toContain('"pain_points"');
  });

  it('contains new JSON key: revenue_model', () => {
    expect(result).toContain('"revenue_model"');
  });

  it('contains new JSON key: decision', () => {
    expect(result).toContain('"decision"');
  });

  it('contains moat anchoring instruction', () => {
    expect(result).toContain('moat MUTLAKA ≤ 4');
  });

  it('names Supercook and Epicurious as moat anchor examples', () => {
    expect(result).toContain('Supercook');
    expect(result).toContain('Epicurious');
  });

  it('escapes backticks in idea', () => {
    const r = buildStrategistPrompt('idea with `backtick`');
    expect(r).toContain('idea with \\`backtick\\`');
  });

  it('escapes curly braces in idea', () => {
    const r = buildStrategistPrompt('idea with {brace}');
    expect(r).toContain('idea with \\{brace\\}');
  });
});

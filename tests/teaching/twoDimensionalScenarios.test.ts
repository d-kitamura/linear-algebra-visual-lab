import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyzeLinearCombination, analyzeVectorSet } from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl } from '../../src/sharing';
import {
  LINEAR_COMBINATION_TEACHING_SCENARIOS,
  THREE_DIMENSIONAL_LINEAR_COMBINATION_SCENARIOS,
  THREE_DIMENSIONAL_TEACHING_SCENARIOS,
  TWO_DIMENSIONAL_TEACHING_SCENARIOS,
} from '../../src/teaching';

const PRODUCTION_BASE_URL = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';

describe('teaching scenarios', () => {
  it('uses unique stable identifiers', () => {
    const ids = [
      ...TWO_DIMENSIONAL_TEACHING_SCENARIOS,
      ...LINEAR_COMBINATION_TEACHING_SCENARIOS,
      ...THREE_DIMENSIONAL_TEACHING_SCENARIOS,
      ...THREE_DIMENSIONAL_LINEAR_COMBINATION_SCENARIOS,
    ].map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every documented production link aligned with the scenario state', () => {
    const guide = readFileSync(
      new URL('../../docs/TEACHING_SCENARIOS.md', import.meta.url),
      'utf8',
    );

    const scenarios = [
      ...TWO_DIMENSIONAL_TEACHING_SCENARIOS,
      ...LINEAR_COMBINATION_TEACHING_SCENARIOS,
      ...THREE_DIMENSIONAL_TEACHING_SCENARIOS,
      ...THREE_DIMENSIONAL_LINEAR_COMBINATION_SCENARIOS,
    ];
    const documentedUrls = [...guide.matchAll(/\[本番環境で開く\]\((https:\/\/[^)]+)\)/gu)]
      .map((match) => match[1]);

    expect(documentedUrls).toHaveLength(scenarios.length);
    scenarios.forEach((scenario, index) => {
      expect(readShareStateFromUrl(documentedUrls[index])).toEqual({
        status: 'success',
        state: scenario.state,
      });
    });
  });

  for (const scenario of TWO_DIMENSIONAL_TEACHING_SCENARIOS) {
    it(`${scenario.title} has the documented mathematical result`, () => {
      expect(analyzeVectorSet({
        dimension: scenario.state.dim,
        vectors: scenario.state.vectors,
      })).toMatchObject(scenario.expected);
    });

    it(`${scenario.title} round-trips through its production share URL`, () => {
      const shareUrl = buildShareUrl(PRODUCTION_BASE_URL, scenario.state);
      const parsedUrl = new URL(shareUrl);

      expect(parsedUrl.origin).toBe('https://d-kitamura.github.io');
      expect(parsedUrl.pathname).toBe('/linear-algebra-visual-lab/');
      expect(parsedUrl.hash).toBe('');
      expect(readShareStateFromUrl(shareUrl)).toEqual({
        status: 'success',
        state: scenario.state,
      });
    });
  }

  for (const scenario of LINEAR_COMBINATION_TEACHING_SCENARIOS) {
    it(`${scenario.title} has the documented linear-combination result`, () => {
      const selectedVectors = scenario.state.vectors.filter((vector) =>
        scenario.state.spanSelection.includes(vector.id),
      );
      const target = scenario.state.linearCombination.target;

      expect(scenario.state.linearCombination.visible).toBe(true);
      expect(target).not.toBeNull();
      expect(analyzeVectorSet({
        dimension: scenario.state.dim,
        vectors: scenario.state.vectors,
      })).toMatchObject(scenario.expected);
      expect(analyzeLinearCombination({
        dimension: scenario.state.dim,
        vectors: selectedVectors,
      }, target!)).toMatchObject(scenario.linearCombinationExpected);
    });

    it(`${scenario.title} round-trips through its production share URL`, () => {
      const shareUrl = buildShareUrl(PRODUCTION_BASE_URL, scenario.state);

      expect(readShareStateFromUrl(shareUrl)).toEqual({
        status: 'success',
        state: scenario.state,
      });
    });
  }

  for (const scenario of THREE_DIMENSIONAL_TEACHING_SCENARIOS) {
    it(`${scenario.title} has the documented mathematical result`, () => {
      expect(analyzeVectorSet({
        dimension: scenario.state.dim,
        vectors: scenario.state.vectors,
      })).toMatchObject(scenario.expected);
    });

    it(`${scenario.title} round-trips through its production share URL with its camera`, () => {
      const shareUrl = buildShareUrl(PRODUCTION_BASE_URL, scenario.state);

      expect(scenario.state.visualization.camera).not.toBeNull();
      expect(readShareStateFromUrl(shareUrl)).toEqual({
        status: 'success',
        state: scenario.state,
      });
    });
  }

  for (const scenario of THREE_DIMENSIONAL_LINEAR_COMBINATION_SCENARIOS) {
    it(`${scenario.title} has the documented 3D linear-combination result`, () => {
      const selectedVectors = scenario.state.vectors.filter((vector) =>
        scenario.state.spanSelection.includes(vector.id),
      );
      const target = scenario.state.linearCombination.target;

      expect(scenario.state.linearCombination.visible).toBe(true);
      expect(target).not.toBeNull();
      expect(analyzeVectorSet({
        dimension: scenario.state.dim,
        vectors: scenario.state.vectors,
      })).toMatchObject(scenario.expected);
      expect(analyzeLinearCombination({
        dimension: scenario.state.dim,
        vectors: selectedVectors,
      }, target!)).toMatchObject(scenario.linearCombinationExpected);
    });

    it(`${scenario.title} round-trips through its production share URL with its camera`, () => {
      const shareUrl = buildShareUrl(PRODUCTION_BASE_URL, scenario.state);

      expect(scenario.state.visualization.camera).not.toBeNull();
      expect(readShareStateFromUrl(shareUrl)).toEqual({
        status: 'success',
        state: scenario.state,
      });
    });
  }
});

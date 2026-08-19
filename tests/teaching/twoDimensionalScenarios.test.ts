import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyzeVectorSet } from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl } from '../../src/sharing';
import { TWO_DIMENSIONAL_TEACHING_SCENARIOS } from '../../src/teaching';

const PRODUCTION_BASE_URL = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';

describe('2D teaching scenarios', () => {
  it('uses unique stable identifiers', () => {
    const ids = TWO_DIMENSIONAL_TEACHING_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every documented production link aligned with the scenario state', () => {
    const guide = readFileSync(
      new URL('../../docs/TEACHING_SCENARIOS.md', import.meta.url),
      'utf8',
    );

    for (const scenario of TWO_DIMENSIONAL_TEACHING_SCENARIOS) {
      expect(guide).toContain(buildShareUrl(PRODUCTION_BASE_URL, scenario.state));
    }
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
});

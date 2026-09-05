import { describe, expect, it } from 'vitest';
import { SHARE_STATE_VERSION, buildShareUrl, readShareStateFromUrl, validateSharedState } from '../../src/sharing';
import v3Fixture from '../fixtures/share-url-v3.json';
import basisV1Fixture from '../fixtures/share-url-basis-dimension-v1.json';
import linearMapV1Fixture from '../fixtures/share-url-linear-map-v1.json';

describe('10.7 旧共有URLの意味を維持し現行版へ移行する', () => {
  it('現行版と旧fixtureの版を混同しない（正式互換保証はまだ開始しない）', () => {
    expect(SHARE_STATE_VERSION).toBe(4);
    expect(v3Fixture.schemaVersion).toBe(3);
    expect(basisV1Fixture.schemaVersion).toBe(1);
    expect(linearMapV1Fixture.schemaVersion).toBe(1);
  });
  for (const fixture of [v3Fixture, basisV1Fixture, linearMapV1Fixture]) {
    it(fixture.url.slice(0, 90) + fixture.schemaVersion + 'を現行正規形へ復元する', () => {
      const state = validateSharedState(fixture.expectedState);
      expect(readShareStateFromUrl(fixture.url)).toEqual({ status: 'success', state });
      const url = buildShareUrl('https://d-kitamura.github.io/linear-algebra-visual-lab/', state);
      expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state });
      expect(buildShareUrl(url, state)).toBe(url);
    });
  }
});

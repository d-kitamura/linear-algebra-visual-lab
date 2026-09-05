import { describe, expect, it } from 'vitest';
import { analyzeBasisCandidate, analyzeBasisCoordinates } from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl } from '../../src/sharing';
import { BASIS_DIMENSION_TEACHING_SCENARIOS } from '../../src/teaching';

const PRODUCTION_BASE_URL = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';

describe('基底・次元Labの代表例', () => {
  it('基底の2条件と座標の3分類を含む', () => {
    const statuses = BASIS_DIMENSION_TEACHING_SCENARIOS.map(
      (scenario) => scenario.expected.coordinateStatus,
    );
    expect(statuses).toContain('coordinate-vector');
    expect(statuses).toContain('non-unique');
    expect(statuses).toContain('not-representable');
    expect(BASIS_DIMENSION_TEACHING_SCENARIOS.some(
      (scenario) => scenario.expected.isBasis === false
        && scenario.expected.candidateRank === scenario.expected.sourceRank,
    )).toBe(true);
    expect(BASIS_DIMENSION_TEACHING_SCENARIOS.some(
      (scenario) => scenario.expected.isBasis === false
        && scenario.expected.candidateRank < scenario.expected.sourceRank,
    )).toBe(true);
  });

  for (const scenario of BASIS_DIMENSION_TEACHING_SCENARIOS) {
    it(`${scenario.title}の数学的結果と共有往復が一致する`, () => {
      const analysis = analyzeBasisCandidate(
        { dimension: scenario.state.dim, vectors: scenario.state.vectors },
        scenario.state.candidateVectorIds,
        { targetSpace: 'ambient' },
      );
      const coordinates = analyzeBasisCoordinates(
        { dimension: scenario.state.dim, vectors: scenario.state.vectors },
        scenario.state.candidateVectorIds,
        scenario.state.linearCombination.target!,
        { targetSpace: 'ambient' },
      );
      expect(analysis).toMatchObject({
        sourceRank: scenario.expected.sourceRank,
        candidateRank: scenario.expected.candidateRank,
        isBasis: scenario.expected.isBasis,
      });
      expect(coordinates.status).toBe(scenario.expected.coordinateStatus);
      const shareUrl = buildShareUrl(PRODUCTION_BASE_URL, scenario.state);
      expect(shareUrl.length).toBeLessThanOrEqual(2_048);
      expect(readShareStateFromUrl(shareUrl)).toEqual({ status: 'success', state: scenario.state });
    });
  }
});

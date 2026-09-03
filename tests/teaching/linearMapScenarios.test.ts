import { describe, expect, it } from 'vitest';
import { analyzeLinearMap } from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl } from '../../src/sharing';
import { LINEAR_MAP_TEACHING_SCENARIOS } from '../../src/teaching';

const PRODUCTION_BASE_URL = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';

describe('線形写像Labの代表例', () => {
  it('全単射、rank 1射影、零写像、2→3単射、3→2全射を含む', () => {
    expect(LINEAR_MAP_TEACHING_SCENARIOS).toHaveLength(8);
    expect(LINEAR_MAP_TEACHING_SCENARIOS.some((scenario) => scenario.expected.isBijective)).toBe(true);
    expect(LINEAR_MAP_TEACHING_SCENARIOS.some((scenario) => scenario.expected.rank === 1)).toBe(true);
    expect(LINEAR_MAP_TEACHING_SCENARIOS.some((scenario) => scenario.expected.rank === 0)).toBe(true);
    expect(LINEAR_MAP_TEACHING_SCENARIOS.some((scenario) => (
      scenario.state.sourceDimension === 2
      && scenario.state.targetDimension === 3
      && scenario.expected.isInjective
    ))).toBe(true);
    expect(LINEAR_MAP_TEACHING_SCENARIOS.some((scenario) => (
      scenario.state.sourceDimension === 3
      && scenario.state.targetDimension === 2
      && scenario.expected.isSurjective
    ))).toBe(true);
  });

  for (const scenario of LINEAR_MAP_TEACHING_SCENARIOS) {
    it(`${scenario.title}の解析結果と共有往復が一致する`, () => {
      const result = analyzeLinearMap({
        sourceDimension: scenario.state.sourceDimension,
        targetDimension: scenario.state.targetDimension,
        matrix: scenario.state.matrix,
      }, scenario.state.inputVector);
      expect(result).toMatchObject(scenario.expected);

      const shareUrl = buildShareUrl(PRODUCTION_BASE_URL, scenario.state);
      expect(shareUrl.length).toBeLessThanOrEqual(2_048);
      expect(readShareStateFromUrl(shareUrl)).toEqual({ status: 'success', state: scenario.state });
    });
  }
});

import { describe, expect, it } from 'vitest';
import { analyzeVectorSet } from '../../src/domain';
import { validateShareState } from '../../src/sharing';
import { DEFAULT_2D_SHARE_STATE } from '../../src/state';

describe('DEFAULT_2D_SHARE_STATE', () => {
  it('is a valid shareable 2D state', () => {
    expect(validateShareState(DEFAULT_2D_SHARE_STATE)).toEqual(DEFAULT_2D_SHARE_STATE);
  });

  it('contains two independent vectors spanning the plane', () => {
    const analysis = analyzeVectorSet({
      dimension: DEFAULT_2D_SHARE_STATE.dim,
      vectors: DEFAULT_2D_SHARE_STATE.vectors,
    });

    expect(analysis).toMatchObject({
      vectorCount: 2,
      rank: 2,
      spanDimension: 2,
      isLinearlyIndependent: true,
    });
  });
});

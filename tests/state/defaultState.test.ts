import { describe, expect, it } from 'vitest';
import { analyzeVectorSet } from '../../src/domain';
import { validateShareState } from '../../src/sharing';
import { DEFAULT_2D_SHARE_STATE, DEFAULT_3D_SHARE_STATE } from '../../src/state';

describe('DEFAULT_2D_SHARE_STATE', () => {
  it('is a valid shareable 2D state', () => {
    expect(validateShareState(DEFAULT_2D_SHARE_STATE)).toEqual(DEFAULT_2D_SHARE_STATE);
    expect(DEFAULT_2D_SHARE_STATE.v).toBe(3);
    expect(DEFAULT_2D_SHARE_STATE.visualization.camera).toBeNull();
    expect(DEFAULT_2D_SHARE_STATE.linearCombination).toEqual({
      visible: false,
      target: null,
    });
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
    expect(DEFAULT_2D_SHARE_STATE.spanSelection).toEqual(['a1', 'a2']);
    expect(DEFAULT_2D_SHARE_STATE.visualization.showSpan).toBe(true);
  });
});

describe('DEFAULT_3D_SHARE_STATE', () => {
  it('is a valid shareable 3D state with three independent vectors', () => {
    expect(validateShareState(DEFAULT_3D_SHARE_STATE)).toEqual(DEFAULT_3D_SHARE_STATE);
    expect(DEFAULT_3D_SHARE_STATE.dim).toBe(3);
    expect(DEFAULT_3D_SHARE_STATE.visualization.camera).not.toBeNull();

    const analysis = analyzeVectorSet({
      dimension: DEFAULT_3D_SHARE_STATE.dim,
      vectors: DEFAULT_3D_SHARE_STATE.vectors,
    });

    expect(analysis).toMatchObject({
      vectorCount: 3,
      rank: 3,
      spanDimension: 3,
      isLinearlyIndependent: true,
    });
    expect(DEFAULT_3D_SHARE_STATE.spanSelection).toEqual(['a1', 'a2', 'a3']);
  });
});

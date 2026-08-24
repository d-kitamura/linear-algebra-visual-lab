import { describe, expect, it } from 'vitest';
import { analyzeVectorSet, type VectorValue } from '../../src/domain';
import { snapSpaceTargetToSelectedSpan } from '../../src/state';

const planeVectors: readonly VectorValue[] = [
  { id: 'a1', name: 'a₁', coordinates: [1, 0, 0] },
  { id: 'a2', name: 'a₂', coordinates: [0, 1, 0] },
];

describe('3D一次結合ターゲットの平面spanスナップ', () => {
  it('表示幅相対の距離内ではrank 2のspan平面へ直交射影する', () => {
    expect(snapSpaceTargetToSelectedSpan(
      [2, 3, 0.08],
      planeVectors,
      2,
      0.1,
    )).toEqual({
      coordinates: [2, 3, 0],
      snapKind: 'span-plane',
      basisVectorIds: ['a1', 'a2'],
    });
  });

  it('斜めのspan平面でも吸着後のターゲットを同じ平面上に置く', () => {
    const obliqueVectors: readonly VectorValue[] = [
      { id: 'a1', name: 'a₁', coordinates: [1, 0, 1] },
      { id: 'a2', name: 'a₂', coordinates: [0, 1, 1] },
      { id: 'a3', name: 'a₃', coordinates: [1, 1, 2] },
    ];
    const result = snapSpaceTargetToSelectedSpan(
      [2, 3, 5.08],
      obliqueVectors,
      2,
      0.1,
    );

    expect(result.snapKind).toBe('span-plane');
    expect(result.basisVectorIds).toEqual(['a1', 'a2']);
    expect(analyzeVectorSet({
      dimension: 3,
      vectors: [
        ...obliqueVectors,
        { id: 'target', name: 'v', coordinates: result.coordinates },
      ],
    }).rank).toBe(2);
  });

  it('距離外、rank 1、rank 3ではターゲット座標を変更しない', () => {
    const outside = [2, 3, 0.2] as const;
    expect(snapSpaceTargetToSelectedSpan(outside, planeVectors, 2, 0.1))
      .toEqual({ coordinates: outside, snapKind: null, basisVectorIds: [] });

    const lineVectors = [planeVectors[0]];
    expect(snapSpaceTargetToSelectedSpan([2, 0.05, 0], lineVectors, 1, 0.1).snapKind)
      .toBeNull();

    const spaceVectors: readonly VectorValue[] = [
      ...planeVectors,
      { id: 'a3', name: 'a₃', coordinates: [0, 0, 1] },
    ];
    expect(snapSpaceTargetToSelectedSpan([2, 3, 0.05], spaceVectors, 3, 0.1).snapKind)
      .toBeNull();
  });

  it('呼出側のrankと実際の選択集合が不整合なら吸着しない', () => {
    expect(snapSpaceTargetToSelectedSpan(
      [2, 3, 0.05],
      [...planeVectors, { id: 'a3', name: 'a₃', coordinates: [0, 0, 1] }],
      2,
      0.1,
    ).snapKind).toBeNull();
  });

  it('座標上限を適用してもターゲットを同じspan平面上に保つ', () => {
    const largePlaneVectors: readonly VectorValue[] = [
      { id: 'a1', name: 'a₁', coordinates: [1_000_000, -1_000_000, 0] },
      { id: 'a2', name: 'a₂', coordinates: [1_000_000, 0, -1_000_000] },
    ];
    const result = snapSpaceTargetToSelectedSpan(
      [1_000_000, -1_000_000, -1_000_000],
      largePlaneVectors,
      2,
      600_000,
    );

    expect(result.snapKind).toBe('span-plane');
    expect(Math.max(...result.coordinates.map(Math.abs))).toBeLessThanOrEqual(1_000_000);
    expect(analyzeVectorSet({
      dimension: 3,
      vectors: [
        ...largePlaneVectors,
        { id: 'target', name: 'v', coordinates: result.coordinates },
      ],
    }).rank).toBe(2);
  });

  it('不正な座標と距離を拒否する', () => {
    expect(() => snapSpaceTargetToSelectedSpan(
      [0, Number.NaN, 0],
      planeVectors,
      2,
      0.1,
    )).toThrow(TypeError);
    expect(() => snapSpaceTargetToSelectedSpan([0, 0, 0], planeVectors, 2, 0))
      .toThrow(RangeError);
  });
});

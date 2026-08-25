import { describe, expect, it } from 'vitest';
import { analyzeVectorSet, type VectorValue } from '../../src/domain';
import {
  SPACE_SNAP_DISTANCE_RATIO,
  snapDraggedSpaceVectorToDependentPosition,
  spaceSnapDistanceForViewWidth,
} from '../../src/state';

const vectors: readonly VectorValue[] = [
  { id: 'a1', name: 'a₁', coordinates: [2, 1, 1] },
  { id: 'a2', name: 'a₂', coordinates: [0, 2, 1] },
  { id: 'a3', name: 'a₃', coordinates: [2.01, 2.99, 2.02] },
];

describe('3Dの平行・同一平面スナップ', () => {
  it('3D専用の吸着距離を表示幅の3%として計算する', () => {
    expect(SPACE_SNAP_DISTANCE_RATIO).toBe(0.03);
    expect(spaceSnapDistanceForViewWidth(10)).toBeCloseTo(0.3);
    expect(spaceSnapDistanceForViewWidth(100)).toBeCloseTo(3);
    expect(spaceSnapDistanceForViewWidth(4)).toBeCloseTo(0.12);
    expect(() => spaceSnapDistanceForViewWidth(0)).toThrow(RangeError);
  });

  it('最も近いベクトルが張る直線へ直交射影して平行にする', () => {
    const result = snapDraggedSpaceVectorToDependentPosition(
      'a3',
      [4.02, 2.01, 2.03],
      vectors,
      0.1,
    );

    expect(result.snapKind).toBe('parallel');
    expect(result.targetVectorIds).toEqual(['a1']);
    expect(result.coordinates[0] / result.coordinates[1]).toBeCloseTo(2);
    expect(result.coordinates[2] / result.coordinates[1]).toBeCloseTo(1);
  });

  it('平行候補がなければ独立な2本が張る最寄り平面へ直交射影する', () => {
    const result = snapDraggedSpaceVectorToDependentPosition(
      'a3',
      [2.01, 2.99, 2.02],
      vectors,
      0.1,
    );
    const snappedVectors = vectors.map((vector) => (
      vector.id === 'a3' ? { ...vector, coordinates: result.coordinates } : vector
    ));

    expect(result.snapKind).toBe('coplanar');
    expect(result.targetVectorIds).toEqual(['a1', 'a2']);
    expect(analyzeVectorSet({ dimension: 3, vectors: snappedVectors }).rank).toBe(2);
  });

  it('直線と平面の両方の距離内なら、より強い条件である平行を優先する', () => {
    const result = snapDraggedSpaceVectorToDependentPosition(
      'a3',
      [4.01, 2.01, 2.01],
      vectors,
      0.1,
    );

    expect(result.snapKind).toBe('parallel');
    expect(result.targetVectorIds).toEqual(['a1']);
  });

  it('平行・同一平面吸着より原点吸着を優先して零ベクトルを作る', () => {
    expect(snapDraggedSpaceVectorToDependentPosition(
      'a3',
      [0.04, -0.03, 0.02],
      vectors,
      0.1,
    )).toEqual({ coordinates: [0, 0, 0], snapKind: 'origin', targetVectorIds: [] });
  });

  it('閾値の外では座標を変更しない', () => {
    const coordinates = [2.2, 3, 2.8] as const;
    expect(snapDraggedSpaceVectorToDependentPosition('a3', coordinates, vectors, 0.1))
      .toEqual({ coordinates, snapKind: null, targetVectorIds: [] });
  });

  it('零ベクトルと平行な2本の組を平面候補から除外する', () => {
    const degenerateTargets: readonly VectorValue[] = [
      { id: 'zero', name: 'z', coordinates: [0, 0, 0] },
      { id: 'a1', name: 'a₁', coordinates: [1, 0, 0] },
      { id: 'a2', name: 'a₂', coordinates: [2, 0, 0] },
      { id: 'a3', name: 'a₃', coordinates: [0, 1, 0.01] },
    ];

    expect(snapDraggedSpaceVectorToDependentPosition(
      'a3',
      [0, 1, 0.01],
      degenerateTargets,
      0.1,
    ).snapKind).toBeNull();
  });

  it('座標上限を適用しても平行・同一平面の関係を保つ', () => {
    const largeVectors: readonly VectorValue[] = [
      { id: 'a1', name: 'a₁', coordinates: [1_000_000, 1_000_000, 0] },
      { id: 'a2', name: 'a₂', coordinates: [0, 1_000_000, 1_000_000] },
      { id: 'a3', name: 'a₃', coordinates: [1_000_000, 1_000_000, 1_000_000] },
    ];
    const result = snapDraggedSpaceVectorToDependentPosition(
      'a3',
      [1_000_000, 1_000_000, 1_000_000],
      largeVectors,
      600_000,
    );

    expect(result.snapKind).toBe('coplanar');
    expect(Math.max(...result.coordinates.map(Math.abs))).toBeLessThanOrEqual(1_000_000);
    expect(analyzeVectorSet({
      dimension: 3,
      vectors: largeVectors.map((vector) => (
        vector.id === 'a3' ? { ...vector, coordinates: result.coordinates } : vector
      )),
    }).rank).toBe(2);
  });

  it('不正な閾値と座標を拒否する', () => {
    expect(() => snapDraggedSpaceVectorToDependentPosition('a3', [1, 2, 3], vectors, 0))
      .toThrow(RangeError);
    expect(() => snapDraggedSpaceVectorToDependentPosition(
      'a3',
      [1, Number.NaN, 3],
      vectors,
      0.1,
    )).toThrow(TypeError);
  });
});

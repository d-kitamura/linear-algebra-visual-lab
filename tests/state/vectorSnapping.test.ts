import { describe, expect, it } from 'vitest';
import { analyzeVectorSet, type VectorValue } from '../../src/domain';
import {
  DEFAULT_PARALLEL_SNAP_DISTANCE,
  parallelSnapDistanceForViewWidth,
  snapDraggedVectorToParallel,
} from '../../src/state';

const vectors: readonly VectorValue[] = [
  { id: 'v1', name: 'v₁', coordinates: [2, 1] },
  { id: 'v2', name: 'v₂', coordinates: [4, 2.1] },
];

describe('2D parallel snapping', () => {
  it('uses a threshold independent from the rank tolerance', () => {
    expect(DEFAULT_PARALLEL_SNAP_DISTANCE).toBe(1e-1);

    const before = analyzeVectorSet({ dimension: 2, vectors });
    const snapped = snapDraggedVectorToParallel('v2', [4, 2.1], vectors);
    const after = analyzeVectorSet({
      dimension: 2,
      vectors: vectors.map((vector) =>
        vector.id === 'v2' ? { ...vector, coordinates: snapped.coordinates } : vector,
      ),
    });

    expect(before.rank).toBe(2);
    expect(snapped.targetVectorId).toBe('v1');
    expect(after.rank).toBe(1);
  });

  it('projects onto the target line with the smallest endpoint movement', () => {
    const result = snapDraggedVectorToParallel('v2', [4, 2.1], vectors);

    expect(result.coordinates[0]).toBeCloseTo(4.04);
    expect(result.coordinates[1]).toBeCloseTo(2.02);
  });

  it('does not snap outside the screen-relative distance', () => {
    const result = snapDraggedVectorToParallel('v2', [4, 2.3], vectors);

    expect(result).toEqual({ coordinates: [4, 2.3], targetVectorId: null });
  });

  it('snaps vectors pointing in the opposite direction', () => {
    const result = snapDraggedVectorToParallel('v2', [-4, -2.1], vectors);

    expect(result.targetVectorId).toBe('v1');
    expect(result.coordinates[0]).toBeLessThan(0);
    expect(result.coordinates[1]).toBeLessThan(0);
  });

  it('ignores zero vectors as the dragged vector or snap target', () => {
    const withZeroTarget: readonly VectorValue[] = [
      { id: 'zero', name: 'z', coordinates: [0, 0] },
      ...vectors,
    ];

    expect(snapDraggedVectorToParallel('v2', [4, 2.1], withZeroTarget).targetVectorId)
      .toBe('v1');
    expect(snapDraggedVectorToParallel('v2', [0, 0], withZeroTarget))
      .toEqual({ coordinates: [0, 0], targetVectorId: null });
  });

  it('preserves exact parallelism when applying the coordinate safety limit', () => {
    const largeVectors: readonly VectorValue[] = [
      { id: 'v1', name: 'v₁', coordinates: [1, 0.99] },
      { id: 'v2', name: 'v₂', coordinates: [1_000_000, 1_000_000] },
    ];
    const result = snapDraggedVectorToParallel(
      'v2',
      [1_000_000, 1_000_000],
      largeVectors,
      10_000,
    );

    expect(result.targetVectorId).toBe('v1');
    expect(Math.max(...result.coordinates.map(Math.abs))).toBe(1_000_000);
    expect(result.coordinates[1] / result.coordinates[0]).toBeCloseTo(0.99);
  });

  it('scales the mathematical snap distance with the current view width', () => {
    expect(parallelSnapDistanceForViewWidth(10)).toBeCloseTo(0.1);
    expect(parallelSnapDistanceForViewWidth(100)).toBeCloseTo(1);
    expect(parallelSnapDistanceForViewWidth(4)).toBeCloseTo(0.04);
  });
});

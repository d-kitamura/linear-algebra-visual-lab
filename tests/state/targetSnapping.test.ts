import { describe, expect, it } from 'vitest';
import type { VectorValue } from '../../src/domain';
import { snapTargetToSelectedSpan } from '../../src/state';

const lineVectors: readonly VectorValue[] = [
  { id: 'v1', name: 'v₁', coordinates: [2, 1] },
  { id: 'v2', name: 'v₂', coordinates: [-4, -2] },
];

describe('2D linear-combination target snapping', () => {
  it('snaps a target to the origin first regardless of the selected span rank', () => {
    expect(snapTargetToSelectedSpan([0.06, -0.07], [], 0, 0.1)).toEqual({
      coordinates: [0, 0],
      snapKind: 'origin',
    });
    expect(snapTargetToSelectedSpan([0.06, -0.07], lineVectors, 1, 0.1)).toEqual({
      coordinates: [0, 0],
      snapKind: 'origin',
    });
    expect(snapTargetToSelectedSpan([0.06, -0.07], lineVectors, 2, 0.1)).toEqual({
      coordinates: [0, 0],
      snapKind: 'origin',
    });
    expect(snapTargetToSelectedSpan([0.08, -0.08], [], 0, 0.1)).toEqual({
      coordinates: [0.08, -0.08],
      snapKind: null,
    });
  });

  it('projects a target onto a rank-one selected span inside the distance', () => {
    const result = snapTargetToSelectedSpan([4, 2.08], lineVectors, 1, 0.1);

    expect(result.snapKind).toBe('span-line');
    expect(result.coordinates[1] / result.coordinates[0]).toBeCloseTo(0.5);
  });

  it('does not snap outside the rank-one distance or anywhere in rank two', () => {
    expect(snapTargetToSelectedSpan([4, 2.3], lineVectors, 1, 0.1)).toEqual({
      coordinates: [4, 2.3],
      snapKind: null,
    });
    expect(snapTargetToSelectedSpan([1, 1], lineVectors, 2, 0.1)).toEqual({
      coordinates: [1, 1],
      snapKind: null,
    });
  });

  it('ignores zero directions in a rank-one collection', () => {
    const vectors: readonly VectorValue[] = [
      { id: 'zero', name: '0', coordinates: [0, 0] },
      { id: 'v1', name: 'v₁', coordinates: [0, 2] },
    ];
    const result = snapTargetToSelectedSpan([0.06, 3], vectors, 1, 0.1);

    expect(result).toEqual({ coordinates: [0, 3], snapKind: 'span-line' });
  });

  it('uses the provided distance so the caller can scale it with the view width', () => {
    expect(snapTargetToSelectedSpan([4, 2.2], lineVectors, 1, 0.1).snapKind).toBeNull();
    expect(snapTargetToSelectedSpan([4, 2.2], lineVectors, 1, 1).snapKind).toBe('span-line');
  });

  it('keeps projection stable for a very small nonzero span direction', () => {
    const vectors: readonly VectorValue[] = [
      { id: 'tiny', name: 'v₁', coordinates: [1e-300, 0] },
    ];

    expect(snapTargetToSelectedSpan([2, 0.05], vectors, 1, 0.1)).toEqual({
      coordinates: [2, 0],
      snapKind: 'span-line',
    });
  });

  it('rejects invalid coordinates and distances', () => {
    expect(() => snapTargetToSelectedSpan([Number.NaN, 0], [], 0, 0.1)).toThrow(TypeError);
    expect(() => snapTargetToSelectedSpan([1, 0], [], 0, 0)).toThrow(RangeError);
  });
});

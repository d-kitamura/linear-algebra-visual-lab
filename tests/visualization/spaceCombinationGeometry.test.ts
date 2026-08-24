import { describe, expect, it } from 'vitest';
import { createSpaceCombinationGeometry } from '../../src/visualization';

describe('3D一次結合の幾何', () => {
  it('2項の係数倍を原点からの2辺とする平行四辺形を作る', () => {
    const geometry = createSpaceCombinationGeometry([
      { id: 'a1', name: 'a₁', coordinates: [1, 2, 0] },
      { id: 'a2', name: 'a₂', coordinates: [0, 1, 3] },
    ], [2, -1]);

    expect(geometry).toMatchObject({
      kind: 'parallelogram',
      targetIndex: 3,
      originEdges: [[0, 1], [0, 2]],
      helperEdges: [[1, 3], [2, 3]],
    });
    expect(geometry?.terms).toEqual([
      { x: 2, y: 4, z: 0 },
      { x: 0, y: -1, z: -3 },
    ]);
    expect(geometry?.vertices[3]).toEqual({ x: 2, y: 3, z: -3 });
  });

  it('3項の8頂点・12辺・6面を持つ平行六面体を作る', () => {
    const geometry = createSpaceCombinationGeometry([
      { id: 'a1', name: 'a₁', coordinates: [1, 0, 0] },
      { id: 'a2', name: 'a₂', coordinates: [0, 1, 0] },
      { id: 'a3', name: 'a₃', coordinates: [0, 0, 1] },
    ], [2, 3, -4]);

    expect(geometry?.kind).toBe('parallelepiped');
    expect(geometry?.vertices).toHaveLength(8);
    expect((geometry?.originEdges.length ?? 0) + (geometry?.helperEdges.length ?? 0)).toBe(12);
    expect(geometry?.faces).toHaveLength(6);
    expect(geometry).not.toBeNull();
    if (!geometry) {
      return;
    }
    expect(geometry.vertices[geometry.targetIndex]).toEqual({ x: 2, y: 3, z: -4 });
  });

  it('4項以上は代数表示だけとし、不正な係数を拒否する', () => {
    const vectors = [
      { id: 'a1', name: 'a₁', coordinates: [1, 0, 0] },
      { id: 'a2', name: 'a₂', coordinates: [0, 1, 0] },
      { id: 'a3', name: 'a₃', coordinates: [0, 0, 1] },
      { id: 'a4', name: 'a₄', coordinates: [1, 1, 1] },
    ];

    expect(createSpaceCombinationGeometry(vectors, [1, 1, 1, 1])).toBeNull();
    expect(() => createSpaceCombinationGeometry(vectors.slice(0, 2), [1])).toThrow(RangeError);
    expect(() => createSpaceCombinationGeometry(vectors.slice(0, 2), [1, Number.NaN]))
      .toThrow(RangeError);
  });
});

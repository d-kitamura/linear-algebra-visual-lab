import { describe, expect, it } from 'vitest';
import { analyzeRepresentationMatrix } from '../../src/domain';
import { DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';
import { createRepresentationScene, editRepresentationValue, moveRepresentationBasis, setRepresentationVector, snapRepresentationSpaceVector, dragRepresentationLineVector, REPRESENTATION_DIMENSIONS } from '../../src/labs/representation-matrix/representationMatrixState';
import { createRepresentationWorkspace, resetRepresentationWorkspace } from '../../src/labs/representation-matrix/representationWorkspace';

describe('11.4 9次元組の独立状態と直接操作', () => {
  for (const n of REPRESENTATION_DIMENSIONS) for (const m of REPRESENTATION_DIMENSIONS) {
    it(n + '→' + m + 'の長方形行列と2経路を導出する', () => {
      const s = createRepresentationScene(n, m);
      const result = analyzeRepresentationMatrix(s.definition, s.source, s.target, s.input);
      expect(result.status).toBe('ready');
      expect(result.representation!.matrix).toHaveLength(m);
      expect(result.representation!.matrix.every((row) => row.length === n)).toBe(true);
      expect(result.representation!.imageViaCoordinates).toEqual(result.imageVector);
      expect(editRepresentationValue(s, 'matrix', m, 0, 2)).toBe(s);
      expect(editRepresentationValue(s, 'source', 0, n, 2)).toBe(s);
    });
  }
  it('各場面と両側の表示状態は独立でResetも現在の場面だけ', () => {
    const w = createRepresentationWorkspace();
    expect(Object.keys(w.scenes)).toHaveLength(9);
    expect(w.scenes['1-to-2'].target).not.toBe(w.scenes['3-to-2'].target);
    const changed = { ...w, activeShapeId: '3-to-1' as const,
      scenes: { ...w.scenes, '3-to-1': editRepresentationValue(w.scenes['3-to-1'], 'input', 2, 0, 42) },
      views: { ...w.views, '3-to-1': { ...w.views['3-to-1'], cameras: { source: { ...DEFAULT_3D_CAMERA_STATE, zoom: 2 }, target: null } } },
    };
    const restored = resetRepresentationWorkspace(changed);
    expect(restored.scenes['3-to-1'].input).toEqual([3, 2, 1]);
    expect(restored.views['3-to-1'].cameras.source).toBeNull();
    expect(restored.scenes['2-to-2']).toBe(w.scenes['2-to-2']);
    expect(restored.views['2-to-2']).toBe(w.views['2-to-2']);
    expect(changed.scenes['3-to-1'].input).toEqual([3, 2, 42]);
  });
  it('3本の隣接順序変更はID・成分・M・wを保つ', () => {
    const s = createRepresentationScene(3, 3);
    const moved = moveRepresentationBasis(moveRepresentationBasis(s, 'source', 2, -1), 'source', 1, -1);
    expect(moved.source.vectors.map((v) => v.id)).toEqual(['u3', 'u1', 'u2']);
    expect(moved.source.vectors[0]).toBe(s.source.vectors[2]);
    expect(moved.definition).toBe(s.definition);
    expect(moved.input).toBe(s.input);
    expect(moveRepresentationBasis(s, 'target', 0, -1)).toBe(s);
  });
  it('1Dは原点へ吸着、数値入力は吸着せず、像の編集を拒否する', () => {
    const s = createRepresentationScene(1, 1);
    expect(dragRepresentationLineVector(s, 'source', 'u1', [0.19], 10).source.vectors[0].coordinates).toEqual([0]);
    expect(dragRepresentationLineVector(s, 'source', 'u1', [0.21], 10).source.vectors[0].coordinates).toEqual([0.21]);
    expect(editRepresentationValue(s, 'source', 0, 0, 0.1).source.vectors[0].coordinates).toEqual([0.1]);
    expect(setRepresentationVector(s, 'target', 'image-w', [2])).toBe(s);
    expect(setRepresentationVector(s, 'source', 'w', [1, 2])).toBe(s);
  });
  it('3Dは基底の平面・平行・原点へ吸着し、previewのrankと像を導出する', () => {
    const s = createRepresentationScene(3, 2);
    const plane = snapRepresentationSpaceVector(s, 'source', 'u3', [2, 1, 0.2], 0.3);
    expect(plane.coordinates).toEqual([2, 1, 0]);
    const next = setRepresentationVector(s, 'source', 'u3', plane.coordinates);
    const result = analyzeRepresentationMatrix(next.definition, next.source, next.target, next.input);
    expect(result.status).toBe('invalid-basis');
    expect(result.sourceBasis.analysis?.candidateRank).toBe(2);
    expect(snapRepresentationSpaceVector(next, 'source', 'u2', [2, 0.1, 0], 0.3).coordinates).toEqual([2, 0, 0]);
    expect(snapRepresentationSpaceVector(next, 'source', 'w', [0.1, 0.1, 0.1], 0.3).coordinates).toEqual([0, 0, 0]);
    const input = snapRepresentationSpaceVector(next, 'source', 'w', [2, 1, 0.2], 0.3);
    expect(input.coordinates).toEqual([2, 1, 0]);
    const preview = setRepresentationVector(next, 'source', 'w', input.coordinates);
    expect(analyzeRepresentationMatrix(preview.definition, preview.source, preview.target, preview.input).imageVector).toEqual([3, 1]);
    expect(next.input).toEqual([3, 2, 1]);
  });
});

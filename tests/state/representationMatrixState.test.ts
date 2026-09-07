import { describe, expect, it } from 'vitest';
import { analyzeRepresentationMatrix } from '../../src/domain';
import { createRepresentationScene, editRepresentationValue, swapRepresentationBasis, dragRepresentationVector, parseRepresentationNumber } from '../../src/labs/representation-matrix/representationMatrixState';

describe('11.3 独立した2→2教材状態', () => {
  it('D-092の初期例を生成し、他の生成結果と配列を共有しない', () => {
    const a = createRepresentationScene();
    const b = createRepresentationScene();
    expect(analyzeRepresentationMatrix(a.definition, a.source, a.target, a.input).representation?.matrix).toEqual([[1, 2], [-1, -1]]);
    expect(a.source.vectors[0].coordinates).not.toBe(b.source.vectors[0].coordinates);
    expect(a.definition.matrix).not.toBe(b.definition.matrix);
  });
  it('基底の数値編集はM,wや他方の基底を変更しない', () => {
    const scene = createRepresentationScene();
    const next = editRepresentationValue(scene, 'target', 1, 0, 3);
    expect(next.target.vectors[0].coordinates).toEqual([1, 3]);
    expect(next.source).toBe(scene.source);
    expect(next.definition).toBe(scene.definition);
    expect(next.input).toBe(scene.input);
    expect(scene.target.vectors[0].coordinates).toEqual([1, 1]);
  });
  it('順序交換はIDと成分の対応を維持し、Aの列・行だけを交換する', () => {
    const s = createRepresentationScene();
    for (const side of ['source', 'target'] as const) {
      const changed = swapRepresentationBasis(s, side);
      expect(changed[side].vectors.map((v) => v.id)).toEqual([...s[side].vectors].reverse().map((v) => v.id));
      expect(changed.definition).toBe(s.definition);
      expect(changed.input).toBe(s.input);
      expect(swapRepresentationBasis(changed, side)).toEqual(s);
    }
  });
  it('Mとwはそれぞれ数値入力で変更する', () => {
    const scene = createRepresentationScene();
    const changed = editRepresentationValue(scene, 'matrix', 0, 1, -2);
    expect(changed.definition.matrix).toEqual([[1, -2], [0, 1]]);
    expect(editRepresentationValue(changed, 'input', 1, 0, -3).input).toEqual([3, -3]);
  });
  it('不正な下書きを数学状態へ入れない', () => {
    for (const text of ['', '-', '1e', 'NaN', 'Infinity', '1000001']) expect(parseRepresentationNumber(text)).toBeNull();
    expect(parseRepresentationNumber('-2.5e2')).toBe(-250);
    const scene = createRepresentationScene();
    expect(editRepresentationValue(scene, 'matrix', 0, 0, Infinity)).toBe(scene);
    expect(editRepresentationValue(scene, 'target', 9, 0, 1)).toBe(scene);
  });
  it('ドラッグ中に平行へ吸着し、その時点で表現行列が未確定になる', () => {
    const scene = createRepresentationScene();
    const next = dragRepresentationVector(scene, 'source', 'u2', [2, 0.1], 10);
    expect(next.source.vectors[1].coordinates).toEqual([2, 0]);
    expect(analyzeRepresentationMatrix(next.definition, next.source, next.target, next.input).status).toBe('invalid-basis');
    expect(next.definition).toBe(scene.definition);
  });
  it('吸着は表示幅2%で原点優先、数値入力では吸着しない', () => {
    const scene = createRepresentationScene();
    expect(dragRepresentationVector(scene, 'source', 'u2', [0.1, 0.1], 10).source.vectors[1].coordinates).toEqual([0, 0]);
    expect(dragRepresentationVector(scene, 'source', 'u2', [20, 1], 100).source.vectors[1].coordinates).toEqual([20, 0]);
    expect(editRepresentationValue(scene, 'source', 1, 1, 0.1).source.vectors[1].coordinates).toEqual([1, 0.1]);
  });
  it('wは生成空間へ吸着し、像などのIDを指定しても編集できない', () => {
    const s = createRepresentationScene();
    const line = editRepresentationValue(s, 'source', 1, 1, 0);
    expect(dragRepresentationVector(line, 'source', 'w', [2, 0.1], 10).input).toEqual([2, 0]);
    expect(dragRepresentationVector(s, 'target', 'image-w', [2, 2], 10)).toBe(s);
    expect(dragRepresentationVector(s, 'source', 'w', [0.1, 0.1], 10).input).toEqual([0, 0]);
  });
});

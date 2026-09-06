import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyzeBasisCoordinates, applyLinearMap, type VectorSet, type VectorSpaceDimension } from '../../src/domain';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const design = read('docs/REPRESENTATION_MATRIX_DESIGN.md');

// 設計書の例を既存APIで検算する。11.2の表現行列APIの先行実装ではない。
function coordinates(basis: VectorSet, target: readonly number[]): readonly number[] {
  const result = analyzeBasisCoordinates(basis, basis.vectors.map((v) => v.id), target, { targetSpace: 'ambient' });
  expect(result.status).toBe('coordinate-vector');
  return result.coordinateVector!;
}

function basis(dimension: VectorSpaceDimension, columns: readonly (readonly number[])[]): VectorSet {
  return { dimension, vectors: columns.map((values, index) => ({ id: `v${index + 1}`, name: `v${index + 1}`, coordinates: values })) };
}

function expectCoordinates(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 10));
}

describe('11.1 表現行列Lab設計案', () => {
  it('フェーズ10承認と11.1の未承認事項・実装境界を区別する', () => {
    expect(read('ROADMAP.md')).toContain('完了（10.1〜10.8・利用者確認・統合棚卸し済み）');
    expect(read('docs/DECISIONS.md')).toContain('### D-092 表現行列Labの記号・変換方向・状態境界の具体案');
    for (const phrase of ['具体案作成済み・利用者確認待ち', 'representation-matrix', '9次元組', '基準座標', '2048文字', '3D側だけのカメラ', 'math-writing-rules.txt', '11.2']) {
      expect(design).toContain(phrase);
    }
    expect(design).toContain(String.raw`\bm P_{\mathcal C\leftarrow\mathcal B}`);
    expect(design).toContain('基底変換モードは同じ次元・同じ空間種別に限定');
  });

  it('数ベクトル例の各列と入力の2経路が一致する', () => {
    const source = basis(2, [[1, 0], [1, 1]]);
    const target = basis(2, [[1, 1], [0, 1]]);
    const map = { sourceDimension: 2, targetDimension: 2, matrix: [[1, 1], [0, 1]] } as const;
    const expectedColumns = [[1, -1], [2, -1]];
    source.vectors.forEach((v, i) => expectCoordinates(coordinates(target, applyLinearMap(map, v.coordinates)), expectedColumns[i]));
    expectCoordinates(coordinates(source, [3, 2]), [1, 2]);
    expectCoordinates(coordinates(target, applyLinearMap(map, [3, 2])), [5, -3]);
    expectCoordinates(applyLinearMap({ ...map, matrix: [[1, 2], [-1, -1]] }, [1, 2]), [5, -3]);
    expect(design).toContain(String.raw`\bm A=\begin{bmatrix}1&2\\-1&-1\end{bmatrix}`);
  });

  it('基底変換例はBの座標からCの座標へ向かう', () => {
    const source = basis(2, [[1, 0], [1, 1]]);
    const target = basis(2, [[1, 1], [0, 1]]);
    source.vectors.forEach((v, i) => expectCoordinates(coordinates(target, v.coordinates), [[1, -1], [1, 0]][i]));
    expectCoordinates(applyLinearMap({ sourceDimension: 2, targetDimension: 2, matrix: [[1, 1], [-1, 0]] }, [1, 2]), [3, -1]);
    expectCoordinates(coordinates(target, [3, 2]), [3, -1]);
    expect(design).toContain(String.raw`\begin{bmatrix}1&1\\-1&0\end{bmatrix}`);
  });

  it('多項式微分例で基準係数と選択基底の座標を区別する', () => {
    const source = basis(3, [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    const target = basis(2, [[1, 0], [1, 1]]);
    const derivative = { sourceDimension: 3, targetDimension: 2, matrix: [[0, 1, 0], [0, 0, 2]] } as const;
    source.vectors.forEach((v, i) => expectCoordinates(coordinates(target, applyLinearMap(derivative, v.coordinates)), [[0, 0], [1, 0], [-2, 2]][i]));
    expectCoordinates(applyLinearMap(derivative, [1, 2, 3]), [2, 6]);
    expectCoordinates(coordinates(target, [2, 6]), [-4, 6]);
    expect(design).toContain(String.raw`\bm A=\begin{bmatrix}0&1&-2\\0&0&2\end{bmatrix}`);
  });
});

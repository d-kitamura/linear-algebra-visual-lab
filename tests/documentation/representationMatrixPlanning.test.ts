import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyzeBasisCoordinates, applyLinearMap, type VectorSet, type VectorSpaceDimension } from '../../src/domain';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const design = read('docs/REPRESENTATION_MATRIX_DESIGN.md');

// 設計書の例を既存APIでも検算する。新APIそのものの回帰はdomain/representationMatrix.test.ts。
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
  it('11.1の承認済み設計と11.2の実装境界を区別する', () => {
    expect(read('ROADMAP.md')).toContain('完了（10.1〜10.8・利用者確認・統合棚卸し済み）');
    expect(read('docs/DECISIONS.md')).toContain('### D-092 表現行列Labの記号・変換方向・状態境界の具体案');
    for (const phrase of ['利用者確認済み・11.1完了', 'representation-matrix', '9次元組', '基準座標', '2048文字', '3D側だけのカメラ', 'math-writing-rules.txt', '11.2']) {
      expect(design).toContain(phrase);
    }
    expect(design).toContain(String.raw`\bm P_{\mathcal C\leftarrow\mathcal B}`);
    expect(design).toContain('基底変換モードは同じ次元・同じ空間種別に限定');
  });

  it('承認済み数学APIと11.3の実装・確認境界を維持する', () => {
    const rules = read('math-writing-rules.txt');
    expect(rules).toContain('D-092、11.1採用');
    expect(rules).toContain('基底Bの座標 → 基底Cの座標');
    const roadmap = read('ROADMAP.md');
    const approval = roadmap.split('### 11.1 ')[1].split('### 11.2 ')[0];
    const implementation = roadmap.split('### 11.2 ')[1].split('### 11.3 ')[0];
    expect(approval).not.toContain('- [ ]');
    expect(implementation).toContain('完了・利用者確認済み');
    expect(implementation).toContain('- [x]');
    expect(implementation).toContain('- [x] **確認ゲート:**');
    expect(roadmap.split('### 11.3 ')[1].split('### 11.4 ')[0]).toContain('完了・利用者確認済み（D-094）');
    expect(read('docs/PROJECT_STATUS.md')).toContain('11.4開始時の引継ぎ');
    expect(read('docs/REPRESENTATION_MATRIX_API.md')).toContain('numerical-failure');
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

  it('11.9まで確認済みとしてフェーズ11を完了する', () => {
    const roadmap = read('ROADMAP.md');
    const current = roadmap.split('### 11.4 ')[1].split('### 11.5 ')[0];
    expect(current).toContain('完了・利用者確認済み（D-095');
    expect(current.match(/- \[x\]/g)).toHaveLength(6);
    expect(current).toContain('- [x] **確認ゲート:**');
    expect(current).not.toContain('- [ ]');
    const next = roadmap.split('### 11.5 ')[1].split('### 11.6 ')[0];
    expect(next).toContain('完了・利用者確認済み（D-096）');
    expect(next.match(/- \[x\]/g)).toHaveLength(6);
    const polynomial = roadmap.split('### 11.6 ')[1].split('### 11.7 ')[0];
    expect(polynomial).toContain('完了・利用者確認済み（D-097');
    expect(polynomial.match(/- \[x\]/g)).toHaveLength(6);
    expect(polynomial).toContain('- [x] **確認ゲート:**');
    const sharing = roadmap.split('### 11.7 ')[1].split('### 11.8 ')[0];
    expect(sharing).toContain('完了・利用者確認済み（D-098');
    expect(sharing.match(/- \[x\]/g)).toHaveLength(6);
    expect(sharing).toContain('- [x] **確認ゲート:**');
    const teaching = roadmap.split('### 11.8 ')[1].split('### 11.9 ')[0];
    expect(teaching).toContain('完了・利用者確認済み（D-100');
    expect(teaching.match(/- \[x\]/g)).toHaveLength(5);
    expect(teaching).toContain('- [x] **確認ゲート:**');
    const inventory = roadmap.split('### 11.9 ')[1].split('## 13.')[0];
    expect(inventory).toContain('完了・利用者確認済み（D-101');
    expect(inventory.match(/- \[x\]/g)).toHaveLength(5);
    expect(inventory).toContain('- [x] **確認ゲート:**');
    expect(read('docs/INVENTORY_PHASE11.md')).toContain('対角化');
    expect(read('docs/REPRESENTATION_TEACHING_GUIDE.md')).toContain('計52例');
    expect(read('docs/PROJECT_STATUS.md')).toContain('11.4実装と11.5開始時の引継ぎ');
    expect(read('docs/DECISIONS.md')).toContain('### D-095');
    expect(read('docs/DECISIONS.md')).toContain('### D-096');
    expect(read('docs/DECISIONS.md')).toContain('### D-097');
    expect(read('docs/PROJECT_STATUS.md')).toContain('11.6実装と11.7開始時の引継ぎ');
    expect(read('docs/PROJECT_STATUS.md')).toContain('11.5実装と11.6開始時の引継ぎ');
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

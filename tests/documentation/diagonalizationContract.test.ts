import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const contract = read('docs/DIAGONALIZATION_API_CONTRACT.md');
type Matrix = readonly (readonly number[])[];
// 手計算した契約例の検算だけを行う。対角化ソルバーの先行実装ではない。
const multiply = (a: Matrix, b: Matrix) => a.map(row => b[0].map((_, j) => row.reduce((sum, x, k) => sum + x * b[k][j], 0)));
const apply = (a: Matrix, u: readonly number[]) => a.map(row => row.reduce((sum, x, k) => sum + x * u[k], 0));

describe('13.1 対角化の具体契約', () => {
  it('独立に固定したP・D・逆行列が0〜3Dで同じ写像を表す', () => {
    const examples = [
      { a: [], p: [], d: [], g: [] },
      { a: [[-2]], p: [[1]], d: [[-2]], g: [[1]] },
      { a: [[4, 1], [0, 2]], p: [[-0.5, 1], [1, 0]], d: [[2, 0], [0, 4]], g: [[0, 1], [1, 0.5]] },
      { a: [[2, 0, 0], [0, 2, 0], [0, 0, -1]], p: [[0, 1, 0], [0, 0, 1], [1, 0, 0]], d: [[-1, 0, 0], [0, 2, 0], [0, 0, 2]], g: [[0, 0, 1], [1, 0, 0], [0, 1, 0]] },
    ];
    for (const { a, p, d, g } of examples) {
      const identity = a.map((row, i) => row.map((_, j) => Number(i === j)));
      expect(multiply(a, p)).toEqual(multiply(p, d));
      expect(multiply(g, p)).toEqual(identity);
      expect(multiply(p, g)).toEqual(identity);
      expect(multiply(multiply(g, a), p)).toEqual(d);
    }
  });

  it('列順を交換しても入力と像は変わらず、座標だけが並び替わる', () => {
    const a = [[4, 1], [0, 2]], p = [[-0.5, 1], [1, 0]], d = [[2, 0], [0, 4]];
    const swapped = p.map(row => [row[1], row[0]]), ds = [[4, 0], [0, 2]];
    expect(apply(p, [2, 2])).toEqual([1, 2]);
    expect(apply(p, apply(d, [2, 2]))).toEqual([6, 4]);
    expect(apply(p, [2, 4])).toEqual([3, 2]);
    expect(apply(swapped, [4, 2])).toEqual([3, 2]);
    expect(apply(swapped, apply(ds, [4, 2]))).toEqual(apply(a, [3, 2]));
  });

  it('共有の予定JSONは列順を持ち、導出したP・Dを含めない', () => {
    const examples = [...contract.matchAll(/```json\n([^`]+)```/g)].map(match => JSON.parse(match[1]));
    expect(examples).toHaveLength(2);
    expect(examples[0]).toEqual({ v: 1, lab: 'diagonalization', kind: 'coordinate', dim: 2,
      matrix: [[4, 1], [0, 2]], input: [1, 2], order: [0, 1], showEigenspace: false,
      cameras: { reference: null, eigenbasis: null } });
    expect(examples[1]).toEqual({ v: 1, lab: 'diagonalization', dim: 0 });
    expect(contract).toContain('13.6までは既存デコーダーへ追加しない');
  });

  it('数値失敗・描画保留・不可を分け、初期基準の検証を13.2へ残す', () => {
    for (const phrase of ['criterion', 'inconclusive', 'unavailable-basis', 'κ∞', '1e8', '1e-12', '1e-8', '1e-10',
      '分母に一律の1を足さず', '描画のみ保留', '対象Labの復元時', '13.2', '既存5Lab']) expect(contract).toContain(phrase);
    const image = apply([[1e6, 0], [0, 1e6]], [1e6, 0]);
    expect(image).toEqual([1e12, 0]);
    expect(image[0]).toBeGreaterThan(1e6);
    expect(contract).toContain('D-116承認済み');
    expect(read('math-writing-rules.txt')).toContain('対角化Labの採用記号（D-115承認');
  });
});

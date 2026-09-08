import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const contract = read('docs/EIGENSPACE_API_CONTRACT.md');

// 小さい整数行列の設計例だけを検算するテスト用の余因子展開。
// 固有値ソルバーや本番の数値計算法を先行実装するものではない。
function determinant(matrix: readonly (readonly number[])[]): number {
  if (matrix.length === 0) return 1;
  return matrix[0].reduce((sum, entry, column) => sum + (-1) ** column * entry * determinant(
    matrix.slice(1).map((row) => row.filter((_, index) => index !== column)),
  ), 0);
}

describe('12.1 固有値Labの契約', () => {
  it('固有多項式の係数の向きと奇数次符号を独立した行列式で検算する', () => {
    const examples = [
      { matrix: [], coefficients: [1] },
      { matrix: [[-2]], coefficients: [-2, -1] },
      { matrix: [[2, 1], [1, 2]], coefficients: [3, -4, 1] },
      { matrix: [[0, -1], [1, 0]], coefficients: [1, 0, 1] },
      { matrix: [[2, 1], [0, 2]], coefficients: [4, -4, 1] },
      { matrix: [[2, 0, 0], [0, 2, 0], [0, 0, -1]], coefficients: [-4, 0, 3, -1] },
      { matrix: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], coefficients: [0, 0, 0, -1] },
      { matrix: [[0, 1, 0], [0, 0, 2], [0, 0, 0]], coefficients: [0, 0, 0, -1] },
      { matrix: [[1, 1, 1], [0, 1, 2], [0, 0, 1]], coefficients: [1, -3, 3, -1] },
    ];
    for (const { matrix, coefficients } of examples) {
      expect(contract).toContain(`| [${coefficients.join(',').replaceAll('-', '−')}] |`);
      expect(coefficients).toHaveLength(matrix.length + 1);
      expect(coefficients.at(-1)).toBe((-1) ** matrix.length);
      // 次数以下の異なる点の一致だけでなく、余分な点でも係数表を検算する。
      for (const lambda of [-3, -1, 0, 1, 2, 4]) {
        const shifted = matrix.map((row, i) => row.map((value, j) => value - (i === j ? lambda : 0)));
        const polynomial = coefficients.reduce((sum, value, degree) => sum + value * lambda ** degree, 0);
        expect(polynomial).toBeCloseTo(determinant(shifted), 12);
      }
    }
  });

  it('共有の設計例をJSONとして読め、0Dで固定データを省く', () => {
    const examples = [...contract.matchAll(/```json\n([^`]+)```/g)].map((match) => JSON.parse(match[1]));
    expect(examples).toHaveLength(2);
    expect(examples[0]).toEqual({ v: 1, lab: 'eigenspace', kind: 'coordinate', dim: 2,
      matrix: [[2, 1], [1, 2]], input: [2, 1], selectedEigenvalueIndex: 0, showEigenspace: true, camera: null });
    expect(examples[1]).toEqual({ v: 1, lab: 'eigenspace', dim: 0 });
    expect(contract).toContain('12.7で実装');
  });

  it('不確かな結果・零入力・選択空間外を取り違えない契約を持つ', () => {
    for (const phrase of ['spectrumComplete', 'algebraicMultiplicity', 'no-real-eigenvalues',
      'inconclusive', 'numerical-failure', '全成分が厳密に0', '選択空間以外も調べ',
      '基底次元0と表さない', 'cleanNumber', '既存Labの動作を変えず', '既存4Lab',
      '0始まり序数', '空間表示をオフ', '初期Workspace', '12.2で検証']) expect(contract).toContain(phrase);
  });

  it('用語と具体契約の承認待ちを記録する', () => {
    expect(contract).toContain('契約具体化済み・利用者確認待ち（D-103）');
    expect(read('docs/DECISIONS.md')).toContain('### D-103');
    const rules = read('math-writing-rules.txt');
    expect(rules).toContain('固有値の重複度と固有空間の次元（D-103具体案）');
    expect(rules).toContain(String.raw`\mathcal{Q}=(\bm{q}_1,\ldots,\bm{q}_d)`);
  });
});

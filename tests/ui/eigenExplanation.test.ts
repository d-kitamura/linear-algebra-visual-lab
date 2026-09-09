import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { analyzeEigenInput, analyzeEigenMap, type EigenMapAnalysis } from '../../src/domain';
import { EigenPanel } from '../../src/labs/eigenspace/EigenspaceLab';
import { createEigenScene } from '../../src/labs/eigenspace/eigenScene';
import { eigenDirectionDescription } from '../../src/labs/eigenspace/eigenExplanation';

const render = (tab: 'space' | 'input' | 'values' | 'equation', matrix: number[][], vector: number[], kind: 'coordinate' | 'polynomial' = 'coordinate', override?: Partial<EigenMapAnalysis>) => {
  const analysis = { ...analyzeEigenMap(createEigenScene(matrix).definition), ...override };
  return renderToStaticMarkup(createElement(EigenPanel, { tab, analysis, input: analyzeEigenInput(analysis, vector), kind }));
};
const plain = (html: string) => html.replace(/<[^>]*>/g, '');

describe('12.6 固有方程式・核・幾何の説明', () => {
  it('初期行列の各A−λEと基底の一次結合を、丸めから再解析せず示す', () => {
    const html = render('space', [[4, 1], [0, 2]], [1, 2]);
    expect(html).toContain('2行2列。第1行 2、1。第2行 0、0'); // λ=2
    expect(html).toContain('2行2列。第1行 0、1。第2行 0、-2'); // λ=4
    expect(plain(html)).toContain('W(λ; T) = Ker(T − λIU)');
    expect(plain(html)).toContain('⇔ (A − λE)u = 0');
    expect(plain(html).match(/W\(λ; T\) = span\(q1\)/g)).toHaveLength(2);
    expect(html).toContain('任意の一次結合');
    expect(html).toContain('基底の取り方は唯一ではありません');
  });
  it('多項式の核は係数列で対応させ、多項式を行列の被乗数にしない', () => {
    const text = plain(render('space', [[0, 1, 0], [0, 0, 2], [0, 0, 0]], [1, 2, 3], 'polynomial'));
    expect(text).toContain('⇔ (A − λE)[u]ℰ = 0');
    expect(text).not.toContain('(A − λE)u');
    expect(text).toContain('多項式の係数列が Ker');
    expect(text).toContain('固有空間の次元：1');
  });
  it('同じ重複度2でも2EとJordan型の空間次元を分ける', () => {
    for (const [matrix, dimension] of [[[[2, 0], [0, 2]], 2], [[[2, 1], [0, 2]], 1]] as const) {
      const text = plain(render('values', matrix.map((row) => [...row]), [1, 0]));
      expect(text).toContain('固有値の重複度：2');
      expect(text).toContain(`固有空間の次元：${dimension}`);
      expect(text).toContain('両者は必ずしも一致しません');
    }
  });
  it.each([[-2, '反対向き', '大きく'], [-1, '反対向き', '変わりません'], [-.5, '反対向き', '小さく'], [.5, '同じ向き', '小さく'], [2, '同じ向き', '大きく']])('λ=%sの向きと長さを示す', (value, direction, length) => {
    const html = render('input', [[value as number]], [1]);
    expect(html).toContain(direction as string); expect(html).toContain(length as string);
  });
  it('正負の所属を別々に示し、一般入力へ固有倍率を割り当てない', () => {
    const matrix = [[2, 0], [0, -1]];
    expect(render('input', matrix, [1, 0])).toContain('同じ向き');
    expect(render('input', matrix, [0, 1])).toContain('反対向き');
    const general = render('input', matrix, [1, 1]);
    expect(general).toContain('入力は固有ベクトルではありません');
    expect(general).not.toContain('この固有値の固有空間に属します');
    expect(general).not.toContain('同じ向き');
    expect(eigenDirectionDescription(1)).toContain('一致');
    expect(eigenDirectionDescription(1 + 1e-12)).toContain('大きく');
  });
  it('零入力と固有値0を分け、多項式でも零への像を説明する', () => {
    const zero = render('input', [[2, 0], [0, 3]], [0, 0]);
    expect(zero).toContain('任意の実数'); expect(zero).toContain('固有値を特定できません');
    expect(zero).not.toContain('非零の入力が零へ');
    const zeroEigenvalue = render('input', [[0, 0], [0, 1]], [2, 0], 'polynomial');
    expect(zeroEigenvalue).toContain('非零の入力が零へ写ります');
    expect(plain(zeroEigenvalue)).toContain('[T(u)]ℰ = (0)[u]ℰ');
    expect(zeroEigenvalue).not.toContain('同じ向き');
  });
  it('0Dのg=1と奇数次符号、非整数の表示等号を維持する', () => {
    const zero = plain(render('equation', [], []));
    expect(zero).toContain('= 1'); expect(zero).not.toContain('= 0');
    expect(plain(render('equation', [[-2]], [1]))).toContain('− λ− 2 = 0');
    expect(plain(render('equation', [[2, 0, 0], [0, 2, 0], [0, 0, -1]], [1, 1, 1]))).toContain('− λ3+ 3λ2− 4 = 0');
    const irrational = render('space', [[0, 2], [1, 0]], [1, 1]);
    expect(irrational).not.toContain('≈'); expect(irrational).toContain('1.41421');
  });
  it('保留した空間の基底や次元や数値行列を作らず、実根なしとも断定しない', () => {
    const pending = render('space', [[1, 1], [1e-24, 1]], [1, 0]);
    expect(pending).toContain('判定保留');
    expect(pending).not.toContain('linear-map-display-matrix');
    expect(pending).not.toContain('固有空間の基底の一例');
    expect(pending).not.toContain('実固有値がないため');
    const equation = render('equation', [[1]], [1], 'coordinate', { characteristicCoefficients: null });
    expect(equation).toContain('係数は数値計算を保留');
    expect(plain(equation)).not.toContain('= 0');
    expect(render('space', [[0, -1], [1, 0]], [1, 0])).toContain('実固有値がないため');
  });
});

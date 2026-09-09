import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EigenspaceLab, EigenPanel } from '../../src/labs/eigenspace/EigenspaceLab';
import { createEigenPolynomialScene, applyEigenPolynomialExample } from '../../src/labs/eigenspace/eigenPolynomial';
import { analyzeEigenInput, analyzeEigenMap } from '../../src/domain';
import { createEigenScene, setEigenInput } from '../../src/labs/eigenspace/eigenScene';

describe('12.5 多項式の数式と係数空間', () => {
  it('1〜3Dは共通の多項式見出し、係数入力、4タブ。多項式0Dを表示しない', () => {
    for (const n of [1, 2, 3] as const) {
      const html = renderToStaticMarkup(createElement(EigenspaceLab, { active: false, initialScene: createEigenPolynomialScene(n) }));
      expect(html).toContain('（係数空間）');
      expect(html).toContain(`</span>]<sub>${n - 1}</sub>`);
      expect(html).not.toContain('>0D</button>');
      expect(html.match(/role="tabpanel"/g)).toHaveLength(4);
      expect(html.match(/inputMode="decimal"/g)).toHaveLength(n * n + n);
      expect(html).toContain('入力多項式の係数b0');
      expect(html).toContain('同型によって対応');
      expect(html).toContain('basis-script-symbol');
      expect(html).toContain('関数グラフではありません');
      expect(html).not.toContain('≈');
      expect(html).toMatch(/disabled=""[^>]*>共有URLをエクスポート/);
    }
  });
  it('多項式と像と基底の係数列を等置せず、対応を明示する', () => {
    const scene = setEigenInput(applyEigenPolynomialExample(createEigenPolynomialScene(3), 'derivative'), [2, 0, 0]);
    const analysis = analyzeEigenMap(scene.definition), input = analyzeEigenInput(analysis, scene.input);
    const render = (tab: 'space' | 'input') => renderToStaticMarkup(createElement(EigenPanel, { tab, analysis, input, kind: 'polynomial' }));
    expect(render('space')).toContain('basis-polynomial');
    expect(render('space')).toContain('列ベクトル 1、0、0');
    const html = render('input');
    expect(html).toContain('固有ベクトルである多項式');
    expect(html).toContain('列ベクトル 0、0、0');
    expect(html).toContain('非零の入力が零へ写ります');
    expect(html).toContain('昇べき順の係数 b0 から b2');
  });
  it('数値保留では像の多項式を捏造せず、数ベクトル画面へ例選択を追加しない', () => {
    const analysis = analyzeEigenMap(createEigenPolynomialScene(2).definition);
    const input = { ...analyzeEigenInput(analysis, [1, 1]), imageVector: null };
    const html = renderToStaticMarkup(createElement(EigenPanel, { tab: 'input', analysis, input, kind: 'polynomial' }));
    expect(html).toContain('数値計算を保留');
    expect(html.match(/class="basis-polynomial"/g)).toHaveLength(1);
    const coordinate = renderToStaticMarkup(createElement(EigenspaceLab, { active: false, initialScene: createEigenScene() }));
    expect(coordinate).not.toContain('多項式の線形変換の行列の例');
    expect(coordinate).not.toContain('basis-polynomial');
  });
  it('3Dの係数軸は安定した定数で、同じpreview経路を再利用する', () => {
    const source = readFileSync(new URL('../../src/labs/eigenspace/EigenspaceLab.tsx', import.meta.url), 'utf8');
    expect(source).toContain("const POLYNOMIAL_AXES_3D = ['b₀', 'b₁', 'b₂'] as const");
    expect(source).toContain('axisLabels={polynomial ? POLYNOMIAL_AXES_3D : undefined}');
    expect(source).toContain('vectorCoordinatePreview={imagePreview}');
  });
});

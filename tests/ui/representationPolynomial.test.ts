import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RepresentationSceneView } from '../../src/labs/representation-matrix/RepresentationMatrixLab';
import { BasisChangePanel } from '../../src/labs/representation-matrix/RepresentationCoordinatePanels';
import { createRepresentationScene, editRepresentationValue } from '../../src/labs/representation-matrix/representationMatrixState';
import { createRepresentationViewState, createBasisChangeScene } from '../../src/labs/representation-matrix/representationWorkspace';
import { createPolynomialMapExample } from '../../src/labs/representation-matrix/representationPolynomialExamples';

const render = (committed: ReturnType<typeof createRepresentationScene>) => renderToStaticMarkup(createElement(RepresentationSceneView, {
  active: true, committed, views: createRepresentationViewState(), setScene: () => {}, setViews: () => {}, onReset: () => {}, onDimensionChange: () => {},
}));
describe('11.6 多項式と基準係数・選択座標の表示', () => {
  it('微分の入力・像・異なる座標・単項式基底と列構成を示す', () => {
    const html = render(createPolynomialMapExample('derivative'));
    for (const text of ['1 + 2x + 3x^2', '2 + 6x', '列ベクトル -4、6', '列ベクトル 2、6', '昇べき順の係数 b0 から b2', '関数グラフではなく', '微分', '係数空間']) expect(html).toContain(text);
    expect(html).toContain('basis-script-symbol">ℰ');
    expect(html).toContain('b₀');
    expect(html).toContain('b₁');
    expect(html).toContain('math-scalar-base">x');
  });
  for (const n of [1, 2, 3] as const) for (const m of [1, 2, 3] as const) it(n + '→' + m + 'の多項式係数入力・行列形状を保つ', () => {
    const html = render(createRepresentationScene(n, m, 'polynomial', 'polynomial'));
    expect(html.match(/<input/g)).toHaveLength(m * n + n + n * n + m * m);
    expect(html).toContain(m + '行' + n + '列');
    expect(html).toContain('入力f(x)の定数項');
    expect(html).toContain('高々' + (n - 1) + '次');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });
  it('数ベクトルと多項式の混在場面を恒等写像と誤認しない', () => {
    for (const [source, target] of [['polynomial', 'coordinate'], ['coordinate', 'polynomial']] as const) {
      const scene = createRepresentationScene(2, 2, source, target);
      const html = renderToStaticMarkup(createElement(BasisChangePanel, { scene, direction: 'B-to-C', onDirectionChange: () => {} }));
      expect(html).toContain('異なる空間の間の恒等写像とは呼びません');
      expect(html).not.toContain('逆方向からの往復も確認');
      expect(render(scene)).toContain('基準係数空間');
    }
  });
  it('多項式の基底変換は同じfを保ち、逆方向と両座標を示す', () => {
    const scene = createBasisChangeScene(2, 'oblique', 'polynomial');
    const html = renderToStaticMarkup(createElement(BasisChangePanel, { scene, direction: 'C-to-B', onDirectionChange: () => {} }));
    expect(html).toContain('3 + 2x');
    expect(html).toContain('列ベクトル 1、2');
    expect(html).toContain('列ベクトル 3、-1');
    expect(html).toContain('逆方向からの往復も確認');
  });
  it('行列編集後に微分の説明を残さず、基底不成立でも入力と像を示す', () => {
    const s = createPolynomialMapExample('derivative');
    const changed = render(editRepresentationValue(s, 'matrix', 0, 0, 9));
    expect(changed).not.toContain('現在の基準行列が定める写像');
    const invalid = render(editRepresentationValue(s, 'target', 0, 0, 0));
    expect(invalid).toContain('表現行列・基底座標は未確定');
    expect(invalid).toContain('2 + 6x');
  });
});

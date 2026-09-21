import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InnerProductLab } from '../../src/labs/inner-product/InnerProductLab';
import { innerProductNumber } from '../../src/labs/inner-product/InnerProductPanels';
import { analyzeInnerProductScene, createInnerProductScene, editInnerProductInput, innerProductPlots,
  selectInnerProductPair, snapInnerProductInput } from '../../src/labs/inner-product/innerProductScene';

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const render = (scene = createInnerProductScene(), active = true) => renderToStaticMarkup(createElement(InnerProductLab, { initialScene: scene, active }));

describe('14.3 内積・射影の数ベクトル2D画面', () => {
  it('第七Labに1図・4成分・3タブ（1枚表示）・元入力だけの編集を接続する', () => {
    const html = render();
    expect(read('src/app/App.tsx')).toContain("<InnerProductLab active={activeLabId === 'inner-product'} />");
    expect(read('src/app/LabMenu.tsx')).toContain("id: 'inner-product'");
    expect(html).toContain('内積と正規直交基底');
    expect(html.match(/<svg/g)).toHaveLength(1);
    expect(html.match(/type="text"/g)).toHaveLength(4);
    expect(html.match(/class="vector-drag-handle/g)).toHaveLength(2);
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/role="tabpanel"[^>]*hidden=""/g)).toHaveLength(2);
    expect(html).toMatch(/disabled=""[^>]*>共有URLをエクスポート/);
    expect(html).toContain('14.7で対応予定');
    expect(html).toContain('a₁');
    expect(html).not.toContain('≈');
    expect(render(undefined, false)).not.toContain('<svg');
  });
  it('初期値の45度と射影・残差、直角の補助図を表示する', () => {
    const html = render();
    expect(html).toContain('45°');
    expect(html).toContain('列ベクトル 0.5、0.5');
    expect(html).toContain('列ベクトル 0.5、-0.5');
    expect(html).toContain('inner-right-angle');
    expect(html).toContain('pointer-events="none"');
  });
  it('uが零なら角度未定義・零部分空間への射影とし、零除算の図を描かない', () => {
    const html = render(editInnerProductInput(createInnerProductScene(), 1, [0, 0]));
    expect(html).toContain('定義されません（零ベクトルを含む）');
    expect(html).toContain('零部分空間への射影');
    expect(html).toContain('列ベクトル 0、0');
    expect(html).toContain('列ベクトル 1、0');
    expect(html).not.toContain('inner-right-angle');
    expect(html).not.toMatch(/NaN|Infinity/);
  });
  it('負の内積なら鈍角と逆方向の射影、直交なら90度と零射影を示す', () => {
    const negative = editInnerProductInput(createInnerProductScene(), 2, [-1, 0]);
    expect(analyzeInnerProductScene(negative).innerProduct?.numeric).toEqual({ status: 'ready', value: -1 });
    expect(render(negative)).toContain('135°');
    expect(render(negative)).toContain('列ベクトル -0.5、-0.5');
    const perpendicular = editInnerProductInput(createInnerProductScene(), 2, [-1, 1]);
    expect(render(perpendicular)).toContain('90°');
    expect(render(perpendicular)).toContain('列ベクトル 0、0');
  });
  it('vが零でも角度を90度にせず、同じIDを選ぶ場合は0度になる', () => {
    expect(render(editInnerProductInput(createInnerProductScene(), 2, [0, 0]))).toContain('定義されません（零ベクトルを含む）');
    const scene = selectInnerProductPair(createInnerProductScene(), 1, 1);
    expect(scene.pair).toEqual([1, 1]);
    expect(analyzeInnerProductScene(scene).angle).toMatchObject({ status: 'ready', degrees: 0 });
    expect(selectInnerProductPair(scene, 0, 9)).toBe(scene);
  });
  it('元の入力・ID・順序を保持し、有効成分だけ更新する', () => {
    const scene = createInnerProductScene();
    for (const values of [[Infinity, 0], [NaN, 0], [1e6 + 1, 0], [1]]) expect(editInnerProductInput(scene, 1, values)).toBe(scene);
    expect(editInnerProductInput(scene, 9, [0, 0])).toBe(scene);
    const changed = editInnerProductInput(scene, 1, [-0, 1e-200]);
    expect(changed.inputs[0]).toEqual({ id: 1, components: [0, 1e-200] });
    expect(Object.is(changed.inputs[0].components[0], -0)).toBe(false);
    expect(scene.inputs[0].components).toEqual([1, 1]);
    expect(changed.inputs[1]).toBe(scene.inputs[1]);
  });
  it('原点だけに表示幅の2%で吸着し、平行な方向には丸めない', () => {
    for (const width of [2, 10, 100]) {
      expect(snapInnerProductInput([width * .019, 0], width)).toEqual([0, 0]);
      expect(snapInnerProductInput([width * .021, 0], width)).toEqual([width * .021, 0]);
    }
    expect(snapInnerProductInput([1, .001], 10)).toEqual([1, .001]);
    expect(editInnerProductInput(createInnerProductScene(), 1, [.01, 0]).inputs[0].components).toEqual([.01, 0]);
  });
  it('補助図を隠しても入力・解析を保持し、導出ベクトルに編集ハンドルを付けない', () => {
    const scene = createInnerProductScene(), result = analyzeInnerProductScene(scene);
    const plots = innerProductPlots(scene, result);
    expect(plots.editableIds).toEqual(['inner-input-1', 'inner-input-2']);
    expect(plots.vectors.map(v => v.id)).toEqual(['inner-p', 'inner-r', ...plots.editableIds]);
    const hidden = { ...scene, showGeometry: false };
    expect(innerProductPlots(hidden, result).vectors).toHaveLength(2);
    const html = render(hidden);
    expect(html).not.toContain('inner-projection-overlay');
    expect(html).toContain('列ベクトル 0.5、0.5');
  });
  it('描画上限を超える射影では図だけ保留し、成分編集から復帰できる', () => {
    const scene = editInnerProductInput(editInnerProductInput(createInnerProductScene(), 1, [1, .5]), 2, [1e6, 1e6]);
    expect(innerProductPlots(scene, analyzeInnerProductScene(scene)).safe).toBe(false);
    expect(render(scene)).not.toContain('<svg');
    expect(render(scene)).toContain('成分入力から変更できます');
    const repaired = editInnerProductInput(scene, 2, [1, 0]);
    expect(innerProductPlots(repaired, analyzeInnerProductScene(repaired)).safe).toBe(true);
  });
  it('微小非零を表示で0に置き換えず、角度やノルムを残す', () => {
    expect(innerProductNumber(1e-200)).not.toBe('0');
    const html = render(editInnerProductInput(createInnerProductScene(), 1, [1e-200, 0]));
    expect(html).not.toContain('定義されません（零ベクトルを含む）');
    expect(html).not.toMatch(/NaN|Infinity/);
  });
  it('ドラッグの表示値から再解析し、終了・取消・非表示とResetの経路を分離する', () => {
    const source = read('src/labs/inner-product/InnerProductLab.tsx');
    expect(source).toContain('analyzeInnerProductScene(displayScene)');
    expect(source).toContain('onVectorDragEnd={commitDrag} onVectorDragCancel={cancelDrag}');
    expect(source).toContain('if (!active) cancelDrag()');
    expect(source).toContain('setScene(initial); setView(null); setInvalid(new Set())');
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape']) expect(source).toContain(key);
    expect(source).toContain('直前の有効値');
    expect(source).not.toContain('analyzeGramSchmidt(');
    const css = read('src/labs/inner-product/innerProduct.css');
    expect(css).toContain('position: static');
    expect(css).toContain('@media (max-width: 480px)');
    expect(read('src/visualization/VectorPlane2D.tsx')).toContain('geometryOverlay &&');
  });
});

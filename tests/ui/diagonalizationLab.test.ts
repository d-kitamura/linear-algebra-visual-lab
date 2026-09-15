import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { analyzeDiagonalization, analyzeDiagonalizationInput, reorderDiagonalization } from '../../src/domain';
import { DiagonalizationLab } from '../../src/labs/diagonalization/DiagonalizationLab';
import { createDiagonalizationScene, diagonalizationPlotVectors, canPlotDiagonalization, editDiagonalizationMatrix,
  resolvedDiagonalizationOrder, setDiagonalizationInput } from '../../src/labs/diagonalization/diagonalizationScene';
import { snapEigenInput } from '../../src/labs/eigenspace/eigenScene';
import { inputImagePresentation } from '../../src/visualization/inputImagePresentation';
import { DEFAULT_PLANE_VIEWPORT } from '../../src/visualization';

const read = (file: string) => readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
const sceneFor = (matrix: number[][], input = [1, 2]) => ({ ...createDiagonalizationScene(), definition: { dimension: 2 as const, matrix }, input });
const render = (scene = createDiagonalizationScene()) => renderToStaticMarkup(createElement(DiagonalizationLab, { initialScene: scene }));

describe('13.3 対角化Labの2D接続', () => {
  it('第六Lab、2図・6成分入力・3タブ（1枚表示）・左だけ矢先編集を接続する', () => {
    const html = render();
    expect(read('src/app/App.tsx')).toContain("<DiagonalizationLab active={activeLabId === 'diagonalization'} />");
    expect(read('src/app/App.tsx')).toContain("hidden={activeLabId !== 'diagonalization'}");
    expect(read('src/app/LabMenu.tsx')).toContain("id: 'diagonalization'");
    expect(html).toContain('行列の対角化');
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html.match(/type="text"/g)).toHaveLength(6);
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(3);
    expect(html.match(/role="tabpanel"[^>]*hidden=""/g)).toHaveLength(2);
    expect(html.match(/class="vector-drag-handle/g)).toHaveLength(1);
    expect(html).toContain('列ベクトル 6、4');
    expect(html).toContain('列ベクトル 2、2');
    expect(html).toContain('列ベクトル 4、8');
    expect(html).toContain('c₁'); expect(html).toContain('c₂');
    expect(html).not.toContain('Domain'); expect(html).not.toContain('Codomain');
    expect(html).not.toContain('≈');
    expect(html).toMatch(/disabled=""[^>]*>共有URLをエクスポート/);
    expect(html).toContain('13.6で対応予定');
  });
  it('既定で固有空間を隠し、オンで2直線を別々に描画する', () => {
    expect(render()).not.toContain('class="span-line"');
    const html = render({ ...createDiagonalizationScene(), showEigenspace: true });
    expect(html.match(/class="span-line"/g)).toHaveLength(2);
    expect(html).not.toContain('class="span-plane-fill"');
    const scalar = render({ ...sceneFor([[2, 0], [0, 2]]), showEigenspace: true });
    expect(scalar).toContain('class="span-plane-fill"');
  });
  it('列順交換でc・D・Pが連動し、入力と像は変わらない', () => {
    const scene = setDiagonalizationInput(createDiagonalizationScene(), [3, 2]);
    const canonical = analyzeDiagonalization(scene.definition);
    const swapped = reorderDiagonalization(canonical, [1, 0]);
    const before = analyzeDiagonalizationInput(canonical, scene.input), after = analyzeDiagonalizationInput(swapped, scene.input);
    expect(before.coordinates?.inputCoordinates).toEqual([2, 4]);
    expect(after.coordinates?.inputCoordinates).toEqual([4, 2]);
    expect(after.coordinates?.imageCoordinatesViaDiagonal).toEqual([16, 4]);
    expect(after.imageVector).toEqual([14, 4]);
    expect(swapped.basis?.p).toEqual([[1, -0.5], [0, 1]]);
    expect(swapped.basis?.d).toEqual([[4, 0], [0, 2]]);
    expect(diagonalizationPlotVectors(after).reference).toEqual(diagonalizationPlotVectors(before).reference);
    expect(render({ ...scene, order: [1, 0] })).toContain('列ベクトル 4、2');
  });
  it('行列編集で旧列順を破棄し、入力・Resetの初期値を保持する', () => {
    const initial = createDiagonalizationScene();
    const scene = { ...setDiagonalizationInput(initial, [3, 2]), order: [1, 0] };
    const edited = editDiagonalizationMatrix(scene, 0, 0, 2);
    expect(edited.order).toBeNull(); expect(edited.input).toEqual([3, 2]);
    expect(initial).toEqual(createDiagonalizationScene());
    expect(resolvedDiagonalizationOrder(edited, analyzeDiagonalization(edited.definition))).toBeNull();
    const recovered = editDiagonalizationMatrix(edited, 0, 1, 0);
    expect(resolvedDiagonalizationOrder(recovered, analyzeDiagonalization(recovered.definition))).toEqual([0, 1]);
    expect(editDiagonalizationMatrix(scene, 0, 0, Infinity)).toBe(scene);
    expect(setDiagonalizationInput(scene, [NaN, 1]).input).toEqual([3, 2]);
  });
  it.each([
    { matrix: [[2, 1], [0, 2]], text: '本数が不足するため、対角化できません' },
    { matrix: [[0, -1], [1, 0]], text: '実数ではない固有値があるため、実数上では対角化できません' },
    { matrix: [[1, 1], [1e-24, 1]], text: '対角化の判定を保留しています' },
    { matrix: [[1, 1], [0, 1 + 1.5e-8]], text: '固有空間の次元条件は満たしますが' },
  ])('不可・保留時は左図を保ち、古い右図・P・Dを表示しない: $text', ({ matrix, text }) => {
    const html = render(sceneFor(matrix));
    expect(html.match(/<svg/g)).toHaveLength(1); expect(html).toContain(text);
    expect(html).not.toContain('基底の1番目と2番目を交換');
    expect(html).not.toContain('列ベクトル 4、8');
  });
  it('入力のunderflowで対角化可能性を否定せず、像・座標だけ保留する', () => {
    const html = render(sceneFor([[1e-200, 0], [0, 2e-200]], [1e-200, 1e-200]));
    expect(html).toContain('実数上で対角化できます');
    expect(html).toContain('像の数値計算を保留');
    expect(html.match(/<svg/g)).toHaveLength(1);
  });
  it('導出値はクリップせず、上限を超えた図だけ保留する', () => {
    const scene = sceneFor([[1e6, 0], [0, 1e6]], [1e6, 0]);
    const result = analyzeDiagonalizationInput(analyzeDiagonalization(scene.definition), scene.input);
    const plots = diagonalizationPlotVectors(result);
    expect(plots.reference[0].coordinates).toEqual([1e12, 0]);
    expect(canPlotDiagonalization(plots.reference)).toBe(false);
    expect(canPlotDiagonalization(plots.eigenbasis)).toBe(false);
    expect(canPlotDiagonalization([{ id: 'test', name: 'u', coordinates: [1e6, -1e6] }])).toBe(true);
    expect(render(scene)).toContain('この図を保留しています');
    expect(render(scene)).not.toContain('<svg');
    expect(render(scene)).toContain('列ベクトル 1000000000000、0');
    // 左は安全だが、悪条件限界内のPによって右座標だけが描画上限を超える例。
    const oneSide = render(sceneFor([[1, 1], [0, 1.000001]], [1, 2]));
    expect(oneSide.match(/<svg/g)).toHaveLength(1);
    expect(oneSide).toContain('実数上で対角化できます');
  });
  it('第五Labと同じ原点優先・表示幅2%・表示した各固有空間への吸着を使う', () => {
    const scene = { ...createDiagonalizationScene(), showEigenspace: true };
    const analysis = analyzeDiagonalization(scene.definition).eigenAnalysis;
    expect(snapEigenInput(scene, analysis, [0.1, 0.1], 10).coordinates).toEqual([0, 0]);
    expect(snapEigenInput(scene, analysis, [2, 0.15], 10).coordinates[1]).toBe(0);
    expect(snapEigenInput(scene, analysis, [20, 1.5], 100).coordinates[1]).toBe(0);
    expect(snapEigenInput({ ...scene, showEigenspace: false }, analysis, [2, 0.15], 10).coordinates).toEqual([2, 0.15]);
  });
  it('共通の近接・一致ラベル処理をcとDcにも適用する', () => {
    const c = { id: 'c', name: 'c', coordinates: [1, 2] }, dc = { id: 'dc', name: 'Dc', coordinates: [1, 2] };
    const same = inputImagePresentation(c, dc, DEFAULT_PLANE_VIEWPORT);
    expect(same.dc.hideArrow).toBe(true); expect(same.dc.label).toBeNull(); expect(same.c.label).toBeTruthy();
    const near = inputImagePresentation(c, { ...dc, coordinates: [1.01, 2.01] }, DEFAULT_PLANE_VIEWPORT);
    expect(near.dc.outline).toBe(true); expect(near.c.labelOffset?.[1]).toBeLessThan(0); expect(near.dc.labelOffset?.[1]).toBeGreaterThan(0);
  });
  it('描画境界でdragロックを解除し、取消・Reset・非表示時のpreview破棄を接続する', () => {
    const source = read('src/labs/diagonalization/DiagonalizationLab.tsx');
    expect(source).toContain('onVectorDragCancel={cancelDrag}');
    expect(source).toContain('dragging && !referenceSafe && previewRef.current');
    expect(source).toContain('if (!active) cancelDrag()');
    expect(source).toContain('resetDiagonalizationWorkspace(w, initial)');
    expect(source).toContain('key={`${dimension}-${revision}`}');
    expect(source).toContain("useState<DiagonalizationTab>('condition')");
    expect(source).toContain('preview === null ? committed : analyzeDiagonalizationInput(analysis, preview)');
    expect(source).toContain('[scene.definition]');
    expect(source).toContain("event.key === 'Home'"); expect(source).toContain("event.key === 'End'");
    const css = read('src/labs/diagonalization/diagonalization.css');
    expect(css).toContain('grid-column: 1 / -1'); expect(css).toContain('@media (max-width: 760px)');
  });
  it('下段にカードが続く2図には共通デスクトップstickyを適用しない', () => {
    const css = read('src/labs/diagonalization/diagonalization.css');
    // 共通 .plot-card より詳細度を高くし、App.cssが後から読み込まれても解除する。
    // CSS契約の回帰検査。実ブラウザのスクロール確認は利用者へ残す。
    expect(css).toMatch(/\.diagonalization-lab \.diagonalization-plot\s*\{[^}]*position:\s*static;[^}]*top:\s*auto;/);
    const html = render();
    expect(html).toContain('class="lab-page diagonalization-lab"');
    expect(html.match(/class="plot-card diagonalization-plot"/g)).toHaveLength(2);
  });
});

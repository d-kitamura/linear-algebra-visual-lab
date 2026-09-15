import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { analyzeDiagonalization, analyzeDiagonalizationInput, reorderDiagonalization } from '../../src/domain';
import { DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';
import { DEFAULT_LINE_VIEWPORT, DEFAULT_PLANE_VIEWPORT } from '../../src/visualization';
import { DiagonalizationLab } from '../../src/labs/diagonalization/DiagonalizationLab';
import { DiagonalizationSpace, diagonalizationSpacePreview } from '../../src/labs/diagonalization/DiagonalizationSpace';
import { canPlotDiagonalization, createDiagonalizationScene, diagonalizationPlotVectors, setDiagonalizationInput, swapDiagonalizationColumns } from '../../src/labs/diagonalization/diagonalizationScene';
import { createDiagonalizationWorkspace, resetDiagonalizationWorkspace, updateDiagonalizationSlot } from '../../src/labs/diagonalization/diagonalizationWorkspace';
import { createEigenSpaceGeometries, snapEigenSpaceInput } from '../../src/labs/eigenspace/eigenScene';

const read = (file: string) => readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
const render = (n: 0 | 1 | 2 | 3, active = true) => renderToStaticMarkup(createElement(DiagonalizationLab, { initialScene: createDiagonalizationScene(n), active }));
const noop = () => {};

describe('13.4 次元ごとの状態と対角化表示', () => {
  it('初期2Dを維持し、0〜3D選択を共通見出し・操作の下に置く', () => {
    const html = render(2);
    expect(html.match(/aria-pressed=/g)).toHaveLength(4);
    expect(html.indexOf('diagonalization-dimensions')).toBeGreaterThan(html.indexOf('</section>'));
    expect(html.indexOf('diagonalization-dimensions')).toBeLessThan(html.indexOf('diagonalization-workspace'));
    expect(html).toContain('列ベクトル 6、4');
  });
  it('0Dは2個の一点表示と空基底・空行列だけ。成分・偽の固有値・交換ボタンを作らない', () => {
    const html = render(0);
    expect(html.match(/class="zero-space-point"/g)).toHaveLength(2);
    expect(html).not.toContain('inputMode="decimal"');
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain('番目を交換');
    expect(html).not.toContain('固有空間の次元：');
    expect(html).toContain('固有値・非零の固有ベクトルはありません');
    expect(html).toContain('空の基底によって形式的に対角化');
    expect(html).toContain('空の順序付き基底');
    expect(html).toContain('0×0の空行列');
    expect(html).not.toContain('列ベクトル 0');
  });
  it('1Dは2図・2成分入力・左だけ矢先編集。負・零の倍率を扱う', () => {
    const html = render(1);
    expect(html.match(/inputMode="decimal"/g)).toHaveLength(2);
    expect(html.match(/class="line-vector-drag-handle/g)).toHaveLength(1);
    expect(html).toContain('列ベクトル -2'); expect(html).toContain('c₁');
    expect(html).not.toContain('番目を交換');
    const scene = { ...createDiagonalizationScene(1), definition: { dimension: 1 as const, matrix: [[0]] } };
    const zero = renderToStaticMarkup(createElement(DiagonalizationLab, { initialScene: scene }));
    expect(zero).toContain('実数上で対角化できます');
    expect(zero).toContain('列ベクトル 0');
    expect(zero).toContain('固有空間の次元：1');
  });
  it('3Dは12成分と2種類の固有空間。非表示LabにWebGLをマウントしない', () => {
    const html = render(3, false);
    expect(html.match(/inputMode="decimal"/g)).toHaveLength(12);
    expect(html).toContain('固有空間の次元：1'); expect(html).toContain('固有空間の次元：2');
    expect(html).toContain('基底の1番目と2番目を交換');
    expect(html).toContain('基底の2番目と3番目を交換');
    expect(html).toContain('列ベクトル -1、2、2');
    expect(html).not.toContain('three-dimensional-render-host');
  });
  it('次元切替で各scene・左右の表示とカメラを保持し、Resetは現在の次元だけ戻す', () => {
    const initial = createDiagonalizationWorkspace();
    let workspace = updateDiagonalizationSlot(initial, 2, (s) => ({ ...s, scene: setDiagonalizationInput(s.scene, [3, 2]),
      views: { ...s.views, reference: { ...s.views.reference, plane: { ...DEFAULT_PLANE_VIEWPORT, minX: -10 } } } }));
    workspace = updateDiagonalizationSlot(workspace, 1, (s) => ({ ...s, views: { ...s.views, eigenbasis: { ...s.views.eigenbasis, line: DEFAULT_LINE_VIEWPORT } } }));
    workspace = updateDiagonalizationSlot(workspace, 3, (s) => ({ ...s, scene: { ...s.scene, order: [2, 1, 0], showEigenspace: true },
      views: { reference: { ...s.views.reference, camera: DEFAULT_3D_CAMERA_STATE },
        eigenbasis: { ...s.views.eigenbasis, camera: { ...DEFAULT_3D_CAMERA_STATE, zoom: 2 } } } }));
    const reset3 = resetDiagonalizationWorkspace({ ...workspace, dimension: 3 }, initial);
    expect(reset3.slots[3]).toEqual(initial.slots[3]);
    expect(reset3.slots[2]).toBe(workspace.slots[2]); expect(reset3.slots[1]).toBe(workspace.slots[1]);
    const reset2 = resetDiagonalizationWorkspace({ ...workspace, dimension: 2 }, initial);
    expect(reset2.slots[2]).toEqual(initial.slots[2]); expect(reset2.slots[3]).toBe(workspace.slots[3]);
    expect(initial.slots[2].scene.input).toEqual([1, 2]);
    expect(initial.slots[3].views.reference.camera).toBeNull();
    expect(workspace.slots[3].views.reference.camera?.zoom).not.toBe(workspace.slots[3].views.eigenbasis.camera?.zoom);
  });
  it('3D隣接交換で全ての列を並び替えられ、元の入力・像は変わらない', () => {
    const scene = createDiagonalizationScene(3), base = analyzeDiagonalization(scene.definition);
    let order: readonly number[] = [0, 1, 2];
    const before = analyzeDiagonalizationInput(base, [1, 2, 3]);
    expect(before.coordinates?.inputCoordinates).toEqual([3, 1, 2]);
    order = swapDiagonalizationColumns(order, 0, 1);
    const first = analyzeDiagonalizationInput(reorderDiagonalization(base, order), [1, 2, 3]);
    expect(first.coordinates?.inputCoordinates).toEqual([1, 3, 2]);
    expect(first.coordinates?.imageCoordinatesViaDiagonal).toEqual([2, -3, 4]);
    order = swapDiagonalizationColumns(order, 1, 2);
    const second = analyzeDiagonalizationInput(reorderDiagonalization(base, order), [1, 2, 3]);
    expect(second.coordinates?.inputCoordinates).toEqual([1, 2, 3]);
    expect(second.imageVector).toEqual([2, 4, -3]); expect(second.imageVector).toEqual(before.imageVector);
    expect(swapDiagonalizationColumns(order, -1, 0)).toBe(order);
  });
  it('3Dは各固有空間へ独立に吸着し、原点が最優先・表示オフで原点のみ', () => {
    const scene = { ...createDiagonalizationScene(3), showEigenspace: true };
    const eigen = analyzeDiagonalization(scene.definition).eigenAnalysis;
    expect(createEigenSpaceGeometries(eigen).map((g) => g.dimension)).toEqual([1, 2]);
    expect(snapEigenSpaceInput(scene, eigen, [0.1, 0.1, 0.1], 0.3).coordinates).toEqual([0, 0, 0]);
    expect(snapEigenSpaceInput(scene, eigen, [2, 1, 0.1], 0.3).coordinates).toEqual([2, 1, 0]);
    expect(snapEigenSpaceInput(scene, eigen, [0.1, 0.1, 2], 0.3).coordinates).toEqual([0, 0, 2]);
    expect(snapEigenSpaceInput({ ...scene, showEigenspace: false }, eigen, [2, 1, 0.1], 0.3).coordinates).toEqual([2, 1, 0.1]);
  });
  it('3Dプレビューで左の像と右のc・Dcを同期し、取消しで確定状態に戻す', () => {
    const scene = createDiagonalizationScene(3), analysis = analyzeDiagonalization(scene.definition);
    const committed = analyzeDiagonalizationInput(analysis, scene.input), current = analyzeDiagonalizationInput(analysis, [1, 2, 3]);
    expect(diagonalizationSpacePreview('reference', committed, current, true)).toEqual([{ vectorId: 'diagonal-image', coordinates: [2, 4, -3] }]);
    expect(diagonalizationSpacePreview('eigenbasis', committed, current, true)).toEqual([
      { vectorId: 'diagonal-c', coordinates: [3, 1, 2] }, { vectorId: 'diagonal-dc', coordinates: [-3, 2, 4] },
    ]);
    expect(diagonalizationSpacePreview('eigenbasis', committed, committed, false)).toBeNull();
    expect(committed.inputVector).toEqual([1, 1, 1]);
    const failed = { ...current, status: 'numerical-failure' as const, imageVector: null, coordinates: null };
    expect(diagonalizationSpacePreview('reference', committed, failed, true)?.[0].coordinates).toBeNull();
    expect(diagonalizationSpacePreview('eigenbasis', committed, failed, true)?.every((v) => v.coordinates === null)).toBe(true);
  });
  it('3D部品は座標軸・視点・代替説明を備え、重複見出しと操作モードを追加しない', () => {
    const scene = createDiagonalizationScene(3), analysis = analyzeDiagonalization(scene.definition);
    const current = analyzeDiagonalizationInput(analysis, scene.input);
    const html = renderToStaticMarkup(createElement(DiagonalizationSpace, { side: 'eigenbasis', scene, analysis, committed: current, current,
      hasPreview: false, camera: null, invalid: false, onCamera: noop, onPreview: noop, onCommit: noop }));
    expect(html).toContain('固有ベクトル基底での座標');
    expect(html).toContain('全体を表示'); expect(html).toContain('視点だけ変更できます');
    expect(html).not.toContain('<h2'); expect(html).not.toContain('three-dimensional-gesture-guide');
    const source = read('src/labs/diagonalization/DiagonalizationSpace.tsx');
    expect(source).toContain("['c₁', 'c₂', 'c₃']"); expect(source).toContain('[left, committed]');
    expect(source).toContain('editableVectorIds={left && !invalid ? EDITABLE : READ_ONLY}');
    expect(source).toContain('showHeading={false}'); expect(source).toContain('showHelpText={false}');
    expect(source).toContain('snapEigenSpaceInput(scene, analysis.eigenAnalysis, coordinates, distance)');
    const common = read('src/visualization/VectorSpace3D.tsx');
    expect(common).toContain("const AXIS_COLOR = '#000000'");
    expect(common).toContain('for (const preview of previews)'); expect(common).toContain('previewedVectorIds.clear()');
    expect(common).toContain('clearObjectGroup(vectorCoordinatePreviewGroup)');
  });
  it('1D・3Dとも導出値は保持し、図単位で上限と保留を判定する', () => {
    for (const n of [1, 3] as const) {
      const matrix = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1e6 : 0));
      const analysis = analyzeDiagonalization({ dimension: n, matrix });
      const result = analyzeDiagonalizationInput(analysis, Array.from({ length: n }, () => 1e6));
      const plots = diagonalizationPlotVectors(result);
      expect(result.status).toBe('ready'); expect(result.imageVector?.[0]).toBe(1e12);
      expect(canPlotDiagonalization(plots.reference, n)).toBe(false); expect(canPlotDiagonalization(plots.eigenbasis, n)).toBe(false);
    }
    const bad = analyzeDiagonalization({ dimension: 3, matrix: [[2, 1, 0], [0, 2, 0], [0, 0, 2]] });
    expect(bad.status).toBe('not-diagonalizable');
    const plots = diagonalizationPlotVectors(analyzeDiagonalizationInput(bad, [1, 2, 3]));
    expect(plots.eigenbasis).toEqual([]); expect(canPlotDiagonalization(plots.reference, 3)).toBe(true);
  });
  it('0D・1D・3Dの導入でも外側と内側3Dのstickyを無効に保つ', () => {
    const css = read('src/labs/diagonalization/diagonalization.css');
    expect(css).toMatch(/\.diagonalization-lab \.diagonalization-plot\s*\{[^}]*position:\s*static;/);
    expect(css).toMatch(/\.diagonalization-plot \.three-dimensional-plot-card\s*\{[^}]*position:\s*static;/);
  });
});

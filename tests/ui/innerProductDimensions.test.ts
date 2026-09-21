import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { analyzeGramSchmidt } from '../../src/domain';
import { InnerProductLab } from '../../src/labs/inner-product/InnerProductLab';
import InnerProductSpace from '../../src/labs/inner-product/InnerProductSpace';
import { GramSchmidtBasisPanel } from '../../src/labs/inner-product/GramSchmidtPanels';
import { gramSchmidtPlots } from '../../src/labs/inner-product/gramSchmidtPresentation';
import { createInnerProductScene, innerProductMetric, editInnerProductInput, addInnerProductInput, analyzeInnerProductScene, innerProductPlots, resolveInnerProductStage, type InnerProductScene } from '../../src/labs/inner-product/innerProductScene';
import { createInnerProductWorkspace, updateInnerProductSlot, resetInnerProductWorkspace } from '../../src/labs/inner-product/innerProductWorkspace';
import { innerSpaceVectorPool, innerSpacePreviews, innerSpaceSegments, snapInnerSpaceInput } from '../../src/labs/inner-product/innerProductSpaceGeometry';
import { DEFAULT_LINE_VIEWPORT, DEFAULT_PLANE_VIEWPORT } from '../../src/visualization';
import { DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const analyze = (scene: InnerProductScene) => analyzeGramSchmidt(innerProductMetric(scene.dimension), scene.inputs);
const render = (scene: InnerProductScene) => renderToStaticMarkup(createElement(InnerProductLab, { initialScene: scene }));
const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s/g, '');

describe('14.5 数0D・1D・3Dの状態と表示', () => {
  it('初期値は次元別。2Dを維持し、0Dを架空の1成分として扱わない', () => {
    expect(createInnerProductWorkspace().dimension).toBe(2);
    expect(createInnerProductScene(0)).toMatchObject({ inputs: [], pair: null, stage: null });
    expect(createInnerProductScene(1).inputs.map(v => v.components)).toEqual([[1], [2]]);
    expect(createInnerProductScene(2).inputs.map(v => v.components)).toEqual([[2, 2], [3, 0]]);
    expect(createInnerProductScene(3).inputs.map(v => v.components)).toEqual([[1, 1, 0], [1, 0, 1], [0, 1, 1]]);
    const zero = createInnerProductScene(0); expect(addInnerProductInput(zero)).toBe(zero);
  });
  it('次元切替で教材・範囲・視点を保持し、Resetは現在slotだけを初期状態へ戻す', () => {
    const initial = createInnerProductWorkspace();
    let w = updateInnerProductSlot(initial, 1, slot => ({ scene: { ...editInnerProductInput(slot.scene, 1, [-2]), mode: 'gram-schmidt', stage: { inputId: 1, phase: 'normalize' } }, view: { ...slot.view, line: { ...DEFAULT_LINE_VIEWPORT, min: -20, max: 20 } } }));
    w = updateInnerProductSlot(w, 3, slot => ({ ...slot, scene: editInnerProductInput(slot.scene, 2, [0, 0, 2]), view: { ...slot.view, camera: DEFAULT_3D_CAMERA_STATE } }));
    w = updateInnerProductSlot(w, 2, slot => ({ ...slot, view: { ...slot.view, plane: DEFAULT_PLANE_VIEWPORT } }));
    w = { ...w, dimension: 1 };
    expect(w.slots[1].scene.inputs[0].components).toEqual([-2]);
    expect(w.slots[1].view.line?.min).toBe(-20);
    const reset = resetInnerProductWorkspace(w, initial);
    expect(reset.dimension).toBe(1); expect(reset.slots[1]).toBe(initial.slots[1]);
    expect(reset.slots[3]).toBe(w.slots[3]); expect(reset.slots[2]).toBe(w.slots[2]);
    expect(initial.slots[1].scene.inputs[0].components).toEqual([1]);
  });
  it('0Dは一点・空基底・零内積・未定義の角度。入力欄と追加・選択UIは設けない', () => {
    const scene = createInnerProductScene(0), html = render(scene), gs = analyze(scene);
    expect(html).toContain('zero-dimensional-space');
    expect(html).not.toContain('type="text"'); expect(html).not.toContain('<select');
    expect(html).not.toContain('ベクトルを追加'); expect(html).not.toContain('列ベクトル ');
    expect(html).toContain('定義されません'); expect(plain(html)).toContain('〈u,v〉=0');
    expect(gs.basisOfAmbient).toBe(true); expect(gs.accepted).toEqual([]);
    expect(plain(html)).toContain('V=ℝ0'); expect(html).not.toMatch(/NaN|Infinity/);
  });
  it('1Dは数直線と1成分、負方向の正規化を正に反転させない', () => {
    const scene = { ...editInnerProductInput(createInnerProductScene(1), 1, [-2]), mode: 'gram-schmidt' as const, stage: { inputId: 1, phase: 'normalize' as const } };
    const gs = analyze(scene), html = render(scene);
    expect(html).toContain('vector-line'); expect(html.match(/type="text"/g)).toHaveLength(2);
    expect(gs.accepted[0].q).toEqual([-1]); expect(gs.steps[1].outcome).toBe('skipped-dependent');
    expect(html).toContain('180°'); expect(html).toContain('符号は反転しません');
    expect(plain(html)).toContain('V=ℝ1');
    expect(addInnerProductInput(scene).inputs.at(-1)?.components).toEqual([0]);
  });
  it('正次元の空入力は0Dではなく、周囲の空間の基底とは呼ばない', () => {
    for (const dimension of [1, 3] as const) {
      const empty = { ...createInnerProductScene(dimension), inputs: [], pair: null, stage: null };
      expect(analyzeInnerProductScene(empty)).toBeNull();
      expect(analyze(empty).basisOfAmbient).toBe(false);
      expect(render(empty)).toContain('周囲の空間V全体の基底ではありません');
    }
  });
  it('3D初期例の直交残差を手計算と照合し、3本の直交単位ベクトルを得る', () => {
    const gs = analyze(createInnerProductScene(3));
    const expected = [[1, 1, 0], [.5, -.5, 1], [-2 / 3, 2 / 3, 2 / 3]];
    gs.accepted.forEach((entry, i) => {
      expect(entry.w.numeric.status).toBe('ready');
      if (entry.w.numeric.status === 'ready') entry.w.numeric.value.forEach((v, j) => expect(v).toBeCloseTo(expected[i][j], 12));
      expect(Math.hypot(...entry.q)).toBeCloseTo(1, 12);
      for (let j = 0; j < i; j++) expect(entry.q.reduce((s, v, k) => s + v * gs.accepted[j].q[k], 0)).toBeCloseTo(0, 12);
    });
    expect(gs.basisOfAmbient).toBe(true);
    expect(render(createInnerProductScene(3)).match(/type="text"/g)).toHaveLength(9);
  });
  it('3Dの平面だけの基底とR³の基底を区別する', () => {
    const base = createInnerProductScene(3);
    const scene = { ...base, inputs: base.inputs.slice(0, 2) }, gs = analyze(scene);
    expect(gs.basisOfSpan).toBe(true); expect(gs.basisOfAmbient).toBe(false);
    const html = renderToStaticMarkup(createElement(GramSchmidtBasisPanel, { analysis: gs }));
    expect(html).toContain('周囲の空間V全体の基底ではありません'); expect(plain(html)).toContain('V=ℝ3');
  });
  it('3Dの原点吸着は共通3%を受け取り、近い方向や成分入力には吸着しない', () => {
    for (const width of [4, 10, 100]) {
      expect(snapInnerSpaceInput('a', [width * .029, 0, 0], width * .03).coordinates).toEqual([0, 0, 0]);
      expect(snapInnerSpaceInput('a', [width * .031, 0, 0], width * .03).snapKind).toBeNull();
    }
    expect(snapInnerSpaceInput('a', [1, 1, .001], .3).coordinates).toEqual([1, 1, .001]);
    expect(editInnerProductInput(createInnerProductScene(3), 1, [.01, 0, 0]).inputs[0].components).toEqual([.01, 0, 0]);
  });
  it('固定の派生slotをpreviewで更新し、段階退避後には消えたqを隠す', () => {
    const scene = { ...createInnerProductScene(3), mode: 'gram-schmidt' as const, stage: { inputId: 3, phase: 'normalize' as const } };
    const before = gramSchmidtPlots(scene, analyze(scene), scene.stage), pool = innerSpaceVectorPool(before);
    const changed = editInnerProductInput(scene, 3, [1, 1, 0]), gs = analyze(changed), stage = resolveInnerProductStage(changed.stage, gs);
    expect(stage).toEqual({ inputId: 1, phase: 'input' });
    const after = gramSchmidtPlots(changed, gs, stage);
    expect(innerSpaceVectorPool(after).vectors.map(v => v.id)).toEqual(pool.vectors.map(v => v.id));
    const previews = innerSpacePreviews(after);
    expect(previews.find(v => v.vectorId === 'inner-space-q3')?.coordinates).toBeNull();
    expect(innerSpacePreviews(before).find(v => v.vectorId === 'inner-space-q3')?.coordinates).not.toBeNull();
    expect(before.editableIds).toEqual(['inner-input-1', 'inner-input-2', 'inner-input-3']);
  });
  it('補助図オフ／保留では派生slotを隠し、零の偽ラベルを作らない', () => {
    const scene = { ...createInnerProductScene(3), showGeometry: false };
    expect(innerSpacePreviews(innerProductPlots(scene, analyzeInnerProductScene(scene))).every(p => p.coordinates === null)).toBe(true);
    expect(innerSpacePreviews(innerProductPlots(createInnerProductScene(3), null)).every(p => p.coordinates === null)).toBe(true);
  });
  it('射影補助辺は原点からの分解を結び、直角印の2辺は世界座標で直交する', () => {
    const scene = createInnerProductScene(3), gs = analyze(scene);
    const segments = innerSpaceSegments('pair', analyzeInnerProductScene(scene), gs, scene.stage, 5);
    expect(segments.filter(s => s.dashed)).toEqual([
      { start: [.5, .5, 0], end: [1, 0, 1], dashed: true },
      { start: [.5, -.5, 1], end: [1, 0, 1], dashed: true },
    ]);
    const [a, b] = segments.filter(s => !s.dashed);
    const u = a.end.map((v, i) => v - a.start[i]), v = b.end.map((v, i) => v - b.start[i]);
    expect(u.reduce((s, x, i) => s + x * v[i], 0)).toBeCloseTo(0, 12);
  });
  it('3方向の平行六面体は補助9辺、零方向・初期段階は補助辺なし', () => {
    const scene = createInnerProductScene(3), gs = analyze(scene);
    expect(innerSpaceSegments('gram-schmidt', null, gs, { inputId: 3, phase: 'residual' }, 5).filter(s => s.dashed)).toHaveLength(9);
    expect(innerSpaceSegments('gram-schmidt', null, gs, { inputId: 3, phase: 'input' }, 5)).toEqual([]);
    const zero = editInnerProductInput(scene, 1, [0, 0, 0]);
    expect(innerSpaceSegments('pair', analyzeInnerProductScene(zero), analyze(zero), null, 5)).toEqual([]);
  });
  it('WebGL代替・カメラ操作を共通部品へ接続し、派生更新をruntime構築と分ける', () => {
    const scene = createInnerProductScene(3), gs = analyze(scene), result = analyzeInnerProductScene(scene);
    const html = renderToStaticMarkup(createElement(InnerProductSpace, { scene, committedGs: gs, committedResult: result, plots: innerProductPlots(scene, result), gs, stage: scene.stage, result, camera: null, disabled: false, onCameraChange() {}, onPreview() {}, onCommit() {} }));
    expect(html).toContain('成分入力と解析タブ'); expect(html).toContain('3D視点プリセット');
    const source = read('src/labs/inner-product/InnerProductSpace.tsx');
    expect(source).toContain('[scene, committedGs, committedResult]');
    expect(source).toContain('onVectorCoordinatesSnap={snapInnerSpaceInput}');
    const common = read('src/visualization/VectorSpace3D.tsx');
    expect(common).toContain('clearObjectGroup(vectorCoordinatePreviewGroup)');
    expect(common).toContain('clearObjectGroup(auxiliaryGroup)');
    expect(common).toContain('[auxiliarySegments]');
    const css = read('src/labs/inner-product/innerProduct.css');
    expect(css).toContain('min-width: 0; width: min(100%, 720px)');
    expect(css).toContain("button[aria-pressed='true']");
  });
});

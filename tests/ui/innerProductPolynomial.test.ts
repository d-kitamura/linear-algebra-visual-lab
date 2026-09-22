import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { analyzeGramSchmidt } from '../../src/domain';
import { InnerProductLab } from '../../src/labs/inner-product/InnerProductLab';
import { InnerProductPanel } from '../../src/labs/inner-product/InnerProductPanels';
import { GramSchmidtStepPanel, GramSchmidtBasisPanel } from '../../src/labs/inner-product/GramSchmidtPanels';
import { InnerProductOverlay } from '../../src/labs/inner-product/InnerProductOverlay';
import { createInnerProductScene, innerProductMetric, analyzeInnerProductScene, innerProductPlots, editInnerProductInput, resolveInnerProductStage, type InnerProductScene } from '../../src/labs/inner-product/innerProductScene';
import { innerDisplayCoordinates, innerDisplayPlots, innerInputCoordinates } from '../../src/labs/inner-product/innerProductCoordinates';
import { createInnerProductWorkspace, selectInnerScene, activeInnerSlot, updateActiveInnerSlot, resetInnerProductWorkspace, fitInnerProductView } from '../../src/labs/inner-product/innerProductWorkspace';
import { innerSpaceSegments, createInnerSpaceDragGuard, innerSpacePreviews } from '../../src/labs/inner-product/innerProductSpaceGeometry';
import { gramSchmidtPlots } from '../../src/labs/inner-product/gramSchmidtPresentation';
import { DEFAULT_PLANE_VIEWPORT } from '../../src/visualization';
import { DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';

const poly = (dimension: 1 | 2 | 3 = 3) => createInnerProductScene(dimension, 'polynomial');
const metricFor = (scene: InnerProductScene) => innerProductMetric(scene.dimension, scene.metric);
const gsFor = (scene: InnerProductScene) => analyzeGramSchmidt(metricFor(scene), scene.inputs);
const render = (scene: InnerProductScene) => renderToStaticMarkup(createElement(InnerProductLab, { initialScene: scene }));
const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s/g, '');
const read = (file: string) => readFileSync(new URL('../../' + file, import.meta.url), 'utf8');

describe('14.6 多項式の内積・係数・幾何の一貫性', () => {
  it('7場面を独立保持し、0Dから多項式へは前の多項式次元（初回2D）へ戻る', () => {
    const initial = createInnerProductWorkspace();
    expect(Object.keys(initial.slots)).toHaveLength(4); expect(Object.keys(initial.polynomialSlots)).toHaveLength(3);
    let w = selectInnerScene(initial, 'coordinate', 0);
    w = selectInnerScene(w, 'polynomial'); expect(w.dimension).toBe(2);
    w = selectInnerScene(w, 'polynomial', 3);
    w = updateActiveInnerSlot(w, s => ({ ...s, scene: { ...editInnerProductInput(s.scene, 2, [2, 3, 4]), metric: 'coefficient', mode: 'gram-schmidt', stage: { inputId: 2, phase: 'normalize' } } }));
    const saved = activeInnerSlot(w);
    w = selectInnerScene(w, 'coordinate'); expect(w.dimension).toBe(0);
    w = selectInnerScene(w, 'polynomial'); expect(w.dimension).toBe(3); expect(activeInnerSlot(w)).toBe(saved);
    const reset = resetInnerProductWorkspace(w, initial);
    expect(activeInnerSlot(reset)).toBe(initial.polynomialSlots[3]);
    expect(reset.slots).toBe(w.slots); expect(reset.polynomialSlots[2]).toBe(w.polynomialSlots[2]);
    expect(() => createInnerProductScene(0, 'polynomial')).toThrow();
  });
  it('初期多項式は標準単項式、積分内積。1Dの比較は同じ定数1', () => {
    for (const n of [1, 2, 3] as const) {
      const scene = poly(n); expect(scene.metric).toBe('integral'); expect(scene.kind).toBe('polynomial');
      expect(scene.inputs).toHaveLength(n);
      expect(scene.pair).toEqual(n === 1 ? [1, 1] : [1, 2]);
      const html = render(scene);
      expect(html.match(/type="text"/g)).toHaveLength(n * n);
      expect(html).not.toContain('>0D</button>'); expect(html).toContain('多項式の係数');
      expect(html).toContain('f1の係数b0'); expect(html).toContain('内積を反映した座標');
      expect(html).not.toContain('14.7で対応予定'); expect(html).not.toContain('details open');
      expect(plain(html)).toContain(`V=ℝ[x]${n - 1}`);
    }
  });
  it('定数1の積分ノルムは√2、正規化後は1/√2で、表示上の長さは1', () => {
    const scene = poly(1), result = analyzeInnerProductScene(scene)!, gs = gsFor(scene);
    expect(result.innerProduct?.numeric).toEqual({ status: 'ready', value: 2 });
    expect(result.uNorm).toEqual({ status: 'ready', value: Math.SQRT2 });
    expect(gs.accepted[0].q[0]).toBeCloseTo(1 / Math.SQRT2, 12);
    expect(innerDisplayCoordinates(metricFor(scene), gs.accepted[0].q)?.[0]).toBeCloseTo(1, 12);
    expect(render(scene)).toContain('ξ₁');
  });
  it('1とx²は積分で非直交、係数内積では直交。内積変更で元係数を変更しない', () => {
    const integral = { ...poly(), pair: [1, 3] as const }, coefficient = { ...integral, metric: 'coefficient' as const };
    const a = analyzeInnerProductScene(integral)!, b = analyzeInnerProductScene(coefficient)!;
    expect(a.innerProduct?.numeric).toEqual({ status: 'ready', value: 2 / 3 });
    expect(b.innerProduct?.numeric).toEqual({ status: 'ready', value: 0 });
    expect(a.projection?.vector.numeric).toEqual({ status: 'ready', value: [1 / 3, 0, 0] });
    expect(a.projection?.residual.numeric).toEqual({ status: 'ready', value: [-1 / 3, 0, 1] });
    expect(b.projection?.vector.numeric).toEqual({ status: 'ready', value: [0, 0, 0] });
    expect(coefficient.inputs).toBe(integral.inputs);
    expect(a.angle?.status).toBe('ready');
    if (a.angle?.status === 'ready') expect(a.angle.degrees).toBeCloseTo(Math.acos(Math.sqrt(5) / 3) * 180 / Math.PI, 10);
  });
  it('図の内積はGの内積に一致し、座標の往復で元係数へ戻る', () => {
    for (const n of [1, 2, 3] as const) for (const metric of ['integral', 'coefficient'] as const) {
      const scene = { ...poly(n), metric }, definition = metricFor(scene), values = [2, -3, 4].slice(0, n);
      const z = innerDisplayCoordinates(definition, values)!;
      const back = innerInputCoordinates(scene, z)!;
      back.forEach((v, i) => expect(v).toBeCloseTo(values[i], 12));
      if (metric === 'coefficient') expect(z).toEqual(values);
    }
    const scene = { ...poly(), pair: [1, 3] as const }, result = analyzeInnerProductScene(scene)!;
    const plots = innerDisplayPlots(scene, innerProductPlots(scene, result));
    const p = plots.vectors.find(v => v.name === 'p')!.coordinates, r = plots.vectors.find(v => v.name === 'r')!.coordinates;
    expect(p.reduce((s, x, i) => s + x * r[i], 0)).toBeCloseTo(0, 12);
    expect(r[2]).toBeCloseTo(Math.sqrt(8 / 45), 12);
  });
  it('GSの最終多項式はx²−1/3、正規化結果を図に移すと標準方向の単位3本', () => {
    const scene = { ...poly(), mode: 'gram-schmidt' as const, stage: { inputId: 3, phase: 'normalize' as const } }, gs = gsFor(scene);
    expect(gs.accepted[2].w.numeric).toEqual({ status: 'ready', value: [-1 / 3, 0, 1] });
    gs.accepted.forEach((entry, i) => innerDisplayCoordinates(metricFor(scene), entry.q)!.forEach((v, j) => expect(v).toBeCloseTo(i === j ? 1 : 0, 12)));
    const plots = innerDisplayPlots(scene, gramSchmidtPlots(scene, gs, scene.stage));
    expect(innerSpacePreviews(plots).find(p => p.vectorId === 'inner-space-q3')?.coordinates?.[2]).toBeCloseTo(1, 12);
    const html = renderToStaticMarkup(createElement(GramSchmidtStepPanel, { analysis: gs, stage: scene.stage }));
    expect(html).toContain('basis-polynomial'); expect(html).not.toContain('列ベクトル');
    expect(html).toContain('x^2');
  });
  it('多項式自体は多項式で、編集欄はE基底の係数として示す', () => {
    const scene = { ...poly(2), pair: [1, 2] as const }, pair = analyzeInnerProductScene(scene);
    const html = renderToStaticMarkup(createElement(InnerProductPanel, { result: pair, pair: scene.pair }));
    expect(html).toContain('inner-integral-sign'); expect(html).not.toContain('列ベクトル');
    expect(plain(html)).not.toContain('1×0');
    expect(render(scene)).toContain('ℰ'); expect(render(scene)).toContain('標準単項式');
    const coefficient = renderToStaticMarkup(createElement(InnerProductPanel, { result: analyzeInnerProductScene({ ...scene, metric: 'coefficient' }), pair: scene.pair }));
    expect(plain(coefficient)).toContain('1×0+0×1=0'); expect(coefficient).not.toContain('inner-integral-sign');
  });
  it('正規直交基底の対象は多項式空間、空・部分空間を全体の基底と呼ばない', () => {
    const base = poly(), scene = { ...base, inputs: base.inputs.slice(0, 2) }, gs = gsFor(scene);
    const html = renderToStaticMarkup(createElement(GramSchmidtBasisPanel, { analysis: gs }));
    expect(plain(html)).toContain('V=ℝ[x]2'); expect(html).toContain('周囲の空間V全体の基底ではありません');
    expect(html).not.toContain('列ベクトル');
    expect(render({ ...base, inputs: [], pair: null, stage: null })).toContain('空の組がその正規直交基底');
    expect(render(editInnerProductInput(poly(1), 1, [0]))).toContain('定義されません');
  });
  it('内積切替後も存在する段階・pairを維持し、fitは視点の向きを維持する', () => {
    const scene = { ...poly(), stage: { inputId: 3, phase: 'normalize' as const } }, changed = { ...scene, metric: 'coefficient' as const };
    expect(resolveInnerProductStage(changed.stage, gsFor(changed))).toEqual(scene.stage); expect(changed.pair).toBe(scene.pair);
    const camera = { ...DEFAULT_3D_CAMERA_STATE, target: [1, 2, 3] as const, zoom: 3 };
    const view = fitInnerProductView({ plane: DEFAULT_PLANE_VIEWPORT, line: null, camera });
    expect(view.camera).toMatchObject({ direction: camera.direction, up: camera.up, target: [0, 0, 0], zoom: 1 });
    expect(view.plane).toBeNull(); expect(camera.target).toEqual([1, 2, 3]);
  });
  it('逆変換の係数上限と図の上限は別。非零の成分消失も保留する', () => {
    const scene = poly();
    expect(innerInputCoordinates(scene, [0, 0, 1e6])).toBeNull();
    expect(innerInputCoordinates(scene, [0, 0, 0])).toEqual([0, 0, 0]);
    expect(innerInputCoordinates(scene, [NaN, 0, 0])).toBeNull();
    const large = editInnerProductInput(scene, 1, [1e6, 0, 0]);
    expect(innerDisplayPlots(large, innerProductPlots(large, analyzeInnerProductScene(large))).safe).toBe(false);
    expect(render(large)).toContain('図を保留'); expect(render(large)).toContain('f1の係数b0');
    expect(innerDisplayCoordinates(metricFor(poly(2)), [0, Number.MIN_VALUE])).toBeNull();
    expect(innerDisplayCoordinates(metricFor(scene), [-400000, 0, 1200000])).not.toBeNull();
  });
  it('3D逆変換拒否は最後の有効な図座標、取消後は元入力座標へ戻す', () => {
    const scene = poly(), plots = innerDisplayPlots(scene, innerProductPlots(scene, analyzeInnerProductScene(scene)));
    const guard = createInnerSpaceDragGuard(scene, plots.inputs), id = 'inner-input-1';
    const valid = guard.snap(id, [2, 0, 0], .3); expect(guard.rejected).toBe(false);
    expect(guard.snap(id, [0, 0, 1e6], .3).coordinates).toEqual(valid.coordinates); expect(guard.rejected).toBe(true);
    guard.reset(); expect(guard.rejected).toBe(false);
    expect(guard.snap(id, [0, 0, 1e6], .3).coordinates).toEqual(plots.inputs[0].coordinates);
    expect(guard.snap(id, [.1, .1, .1], .3).coordinates).toEqual([0, 0, 0]); expect(guard.rejected).toBe(false);
  });
  it('2D補助図もC座標へ変換し、3Dの辺・直角印は同じ変換座標を使う', () => {
    const scene = editInnerProductInput(poly(2), 2, [1, 1]), result = analyzeInnerProductScene(scene)!;
    const html = renderToStaticMarkup(createElement(InnerProductOverlay, { result, metric: metricFor(scene), viewport: DEFAULT_PLANE_VIEWPORT }));
    const raw = renderToStaticMarkup(createElement(InnerProductOverlay, { result, viewport: DEFAULT_PLANE_VIEWPORT }));
    expect(html).not.toEqual(raw); expect(html).toContain('inner-right-angle');
    const three = { ...poly(), pair: [1, 3] as const }, gs = gsFor(three);
    const lines = innerSpaceSegments('pair', analyzeInnerProductScene(three), gs, three.stage, 5, metricFor(three));
    expect(lines.filter(l => l.dashed)).toHaveLength(2);
    const [a, b] = lines.filter(l => !l.dashed);
    expect(a.end.reduce((s, x, i) => s + (x - a.start[i]) * (b.end[i] - b.start[i]), 0)).toBeCloseTo(0, 12);
  });
  it('metric変更を解析の依存に含め、下書き／ドラッグ中は内積切替を止める', () => {
    const source = read('src/labs/inner-product/InnerProductLab.tsx');
    expect(source).toContain('[scene.inputs, metric]'); expect(source).toContain('[scene.inputs, scene.pair, metric]');
    expect(source).toContain('value={scene.metric} disabled={preview !== null || invalid.size > 0}');
    expect(source).toContain('setView(fitInnerProductView(view))');
    const space = read('src/labs/inner-product/InnerProductSpace.tsx');
    expect(space).toContain('else if (!dragGuard.rejected) onPreview(id, coordinates)');
    expect(space).toContain('dragGuard.reset(); onPreview(id, null)');
  });
});

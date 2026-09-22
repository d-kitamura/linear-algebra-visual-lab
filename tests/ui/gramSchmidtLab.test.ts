import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { analyzeGramSchmidt, type StageKey } from '../../src/domain';
import { InnerProductLab } from '../../src/labs/inner-product/InnerProductLab';
import { GramSchmidtBasisPanel, GramSchmidtControls, GramSchmidtStepPanel } from '../../src/labs/inner-product/GramSchmidtPanels';
import { GramSchmidtOverlay } from '../../src/labs/inner-product/GramSchmidtOverlay';
import { gramSchmidtFrame, gramSchmidtPlots } from '../../src/labs/inner-product/gramSchmidtPresentation';
import { addInnerProductInput, removeInnerProductInput, moveInnerProductInput, createInnerProductScene, editInnerProductInput,
  resolveInnerProductStage, stageId, innerInputColor, analyzeInnerProductScene, INNER_PRODUCT_2D_METRIC, type InnerProductScene } from '../../src/labs/inner-product/innerProductScene';
import { DEFAULT_PLANE_VIEWPORT } from '../../src/visualization';

const read = (file: string) => readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
const sceneFor = (...values: number[][]): InnerProductScene => ({ ...createInnerProductScene(), mode: 'gram-schmidt', inputs: values.map((components, i) => ({ id: i + 1, components })), pair: values.length ? [1, 1] : null, stage: values.length ? { inputId: 1, phase: 'input' } : null });
const analyze = (scene = createInnerProductScene()) => analyzeGramSchmidt(INNER_PRODUCT_2D_METRIC, scene.inputs);
const render = (scene: InnerProductScene) => renderToStaticMarkup(createElement(InnerProductLab, { initialScene: scene }));
const text = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s/g, '');

describe('14.4 数2Dグラム・シュミットの状態と段階表示', () => {
  it('すべてのプルダウンを線形写像Labの次元選択と同じCSSで描画する', () => {
    const shared = read('src/app/App.css');
    const rule = shared.match(/\.linear-map-dimension-selectors select,\s*\.inner-product-lab select\s*\{([^}]+)\}/)?.[1];
    expect(rule).toBeDefined();
    for (const style of ['min-height: 38px', 'padding: 4px 20px 4px 10px', 'font-size: 0.85rem',
      'border: 1px solid var(--line)', 'border-radius: 8px', 'background: var(--paper)', 'color: var(--ink)']) expect(rule).toContain(style);
    const local = read('src/labs/inner-product/innerProduct.css');
    const selectRules = [...local.matchAll(/[^{}]*select[^{}]*\{([^}]+)\}/g)].map(match => match[1]).join('');
    expect(selectRules).not.toMatch(/min-height:|border:|background:|font:/);
    expect(render(sceneFor([2, 2], [3, 0])).match(/<select/g)).toHaveLength(4);
  });
  it('0〜8本、最小未使用IDと固定色、参照削除時の未選択を維持する', () => {
    let scene = createInnerProductScene();
    for (let i = 0; i < 6; i++) scene = addInnerProductInput(scene);
    expect(scene.inputs.map(input => input.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(addInnerProductInput(scene)).toBe(scene);
    scene = removeInnerProductInput(scene, 1);
    expect(scene.pair).toBeNull(); expect(analyzeInnerProductScene(scene)).toBeNull();
    scene = addInnerProductInput(scene);
    expect(scene.inputs.at(-1)).toEqual({ id: 1, components: [0, 0] });
    expect(scene.pair).toBeNull();
    expect(innerInputColor(1)).toBe('#ce5135');
    for (let id = 1; id <= 8; id++) scene = removeInnerProductInput(scene, id);
    expect(scene.inputs).toEqual([]); expect(scene.stage).toBeNull();
    expect(addInnerProductInput(scene).pair).toBeNull();
    expect(removeInnerProductInput(scene, 9)).toBe(scene);
  });
  it('並べ替えは名前・成分・pairを保ち、順序と先頭段階だけ変える', () => {
    const original = { ...createInnerProductScene(), stage: { inputId: 2, phase: 'normalize' } as StageKey };
    const moved = moveInnerProductInput(original, 2, -1);
    expect(moved.inputs.map(x => x.id)).toEqual([2, 1]);
    expect(moved.inputs[0]).toBe(original.inputs[1]);
    expect(moved.pair).toBe(original.pair);
    expect(moved.stage).toEqual({ inputId: 2, phase: 'input' });
    expect(analyze(moved).accepted[0].q).toEqual([1, 0]);
    expect(analyze(original).accepted[0].q[0]).toBeCloseTo(Math.SQRT1_2);
    expect(moveInnerProductInput(moved, 2, -1)).toBe(moved);
  });
  it('成分編集で段階が残るなら維持、消えたら先頭へ、取消は元sceneで復元する', () => {
    const original = { ...createInnerProductScene(), stage: { inputId: 2, phase: 'normalize' } as StageKey };
    const changed = editInnerProductInput(original, 2, [4, 0]);
    expect(resolveInnerProductStage(changed.stage, analyze(changed))).toEqual(original.stage);
    const preview = editInnerProductInput(original, 2, [4, 4]);
    expect(resolveInnerProductStage(preview.stage, analyze(preview))).toEqual({ inputId: 1, phase: 'input' });
    expect(resolveInnerProductStage(original.stage, analyze(original))).toEqual(original.stage);
    expect(resolveInnerProductStage(original.stage, analyze(sceneFor()))).toBeNull();
  });
  it('初期例の7段階から現在の射影・残差・採用列だけを図へ出す', () => {
    const scene = { ...createInnerProductScene(), mode: 'gram-schmidt' as const }, result = analyze(scene);
    expect(result.availableStages.map(stageId)).toEqual(['1:input', '1:residual', '1:normalize', '2:input', '2:projection:1', '2:residual', '2:normalize']);
    const stage: StageKey = { inputId: 2, phase: 'projection', count: 1 };
    const frame = gramSchmidtFrame(result, stage);
    expect(frame.projections[0].coefficient.numeric).toEqual({ status: 'ready', value: .75 });
    expect(frame.residual?.numeric).toEqual({ status: 'ready', value: [1.5, -1.5] });
    const plots = gramSchmidtPlots(scene, result, stage);
    expect(plots.vectors.map(x => x.name)).toEqual(['q1', 'p1', 'r', 'a1', 'a2']);
    expect(plots.editableIds).toEqual(['inner-input-1', 'inner-input-2']);
    expect(gramSchmidtPlots(scene, result, { inputId: 1, phase: 'input' }).vectors.map(x => x.name)).toEqual(['a1', 'a2']);
    expect(gramSchmidtFrame(result, { inputId: 2, phase: 'normalize' }).accepted).toHaveLength(2);
    const html = render({ ...scene, stage });
    expect(html).toContain('inner-right-angle'); expect(html).toContain('1.5');
    expect(html.match(/class="vector-drag-handle/g)).toHaveLength(2);
    expect(html).not.toContain('14.4で追加予定');
    expect(html).toContain('2番目の入力');
  });
  it('従属中間入力を理由付きで飛ばし、後続を処理して出力番号を詰める', () => {
    const scene = sceneFor([1, 0], [2, 0], [0, 1]), result = analyze(scene);
    const skip = renderToStaticMarkup(createElement(GramSchmidtStepPanel, { analysis: result, stage: { inputId: 2, phase: 'skip' } }));
    expect(skip).toContain('一次従属なので飛ばして次の入力へ進みます');
    expect(result.accepted.map(x => [x.sourceId, x.outputIndex])).toEqual([[1, 1], [3, 2]]);
    expect(result.availableStages).not.toContainEqual({ inputId: 2, phase: 'normalize' });
    expect(text(renderToStaticMarkup(createElement(GramSchmidtBasisPanel, { analysis: result })))).toContain('a3から採用');
  });
  it('全零・空は空基底、直線はWの基底、いずれも周囲のR²の基底ではない', () => {
    for (const scene of [sceneFor(), sceneFor([0, 0]), sceneFor([2, 0], [4, 0])]) {
      const html = renderToStaticMarkup(createElement(GramSchmidtBasisPanel, { analysis: analyze(scene) }));
      expect(html).toContain('周囲の空間V全体の基底ではありません');
      expect(html).not.toContain('周囲の空間Vの正規直交基底でもあります');
    }
    const empty = render(sceneFor());
    expect(empty).toContain('比較するベクトルを選択してください');
    expect(empty).toContain('空の組がその正規直交基底');
    expect(empty).not.toMatch(/NaN|Infinity/);
    const zero = render({ ...sceneFor([0, 0]), stage: { inputId: 1, phase: 'skip' } });
    expect(zero).toContain('元の入力が零ベクトルなので');
  });
  it('正規化失敗後は未確認結果・完成した基底を表示せず、保留段階を用意する', () => {
    const scene = sceneFor([Number.MIN_VALUE, 1e6], [1, 0]), result = analyze(scene);
    expect(result.status).toBe('inconclusive');
    const stage = result.availableStages.at(-1)!;
    expect(stage.phase).toBe('hold');
    const html = render({ ...scene, stage });
    expect(html).toContain('完成した基底とは断定しません');
    expect(html).toContain('以降の入力の結果は未確認');
    expect(gramSchmidtPlots(scene, result, stage).vectors.some(x => x.name === 'q1')).toBe(false);
  });
  it('極小の非零は飛ばさず、負方向の正規化を維持する', () => {
    const tiny = sceneFor([1, 0], [1, 1e-200]), result = analyze(tiny);
    expect(result.accepted[1].q).toEqual([0, 1]);
    const html = render({ ...tiny, stage: { inputId: 2, phase: 'normalize' } });
    expect(html).toContain('1e−200'); expect(html).not.toContain('一次従属なので飛ばして');
    expect(analyze(sceneFor([-2, 0])).accepted[0].q).toEqual([-1, 0]);
  });
  it('段階別の図の保留・補助図オフ・成分編集からの復帰を分離する', () => {
    const scene = sceneFor([1, .5], [1e6, 1e6]), result = analyze(scene), stage: StageKey = { inputId: 2, phase: 'projection', count: 1 };
    expect(gramSchmidtPlots(scene, result, stage).safe).toBe(false);
    expect(gramSchmidtPlots({ ...scene, showGeometry: false }, result, stage).safe).toBe(true);
    expect(gramSchmidtPlots({ ...scene, showGeometry: false }, result, stage).vectors).toHaveLength(2);
    const repaired = editInnerProductInput(scene, 2, [1, 0]);
    expect(gramSchmidtPlots(repaired, analyze(repaired), stage).safe).toBe(true);
  });
  it('2方向の射影による補助図もNaNを作らず、未表示の段階を先取りしない', () => {
    const result = analyze(sceneFor([1, 0], [0, 1], [2, 3]));
    const html = renderToStaticMarkup(createElement(GramSchmidtOverlay, { analysis: result, stage: { inputId: 3, phase: 'projection', count: 2 }, viewport: DEFAULT_PLANE_VIEWPORT }));
    expect(html).toContain('inner-right-angle'); expect(html).not.toMatch(/NaN|Infinity/);
    const initial = renderToStaticMarkup(createElement(GramSchmidtOverlay, { analysis: result, stage: { inputId: 3, phase: 'input' }, viewport: DEFAULT_PLANE_VIEWPORT }));
    expect(initial).toBe('');
  });
  it('段階の両端・空入力で前後操作を停止し、8本の入力も表示する', () => {
    const analysis = analyze();
    const controls = (stage: StageKey | null, a = analysis) => renderToStaticMarkup(createElement(GramSchmidtControls, { analysis: a, stage, disabled: false, onStage: () => {} }));
    expect(controls(analysis.availableStages[0])).toContain('disabled="">前へ');
    expect(controls(analysis.availableStages.at(-1)!)).toContain('disabled="">次へ');
    expect(controls(null, analyze(sceneFor()))).toContain('<fieldset class="inner-stage-controls" disabled=""');
    const html = render(sceneFor(...Array.from({ length: 8 }, (_, i) => [i, 1])));
    expect(html.match(/type="text"/g)).toHaveLength(16);
    expect(html).toContain('disabled="">ベクトルを追加（8/8）');
  });
  it('入力だけを依存に解析をメモ化し、段階は純粋なsnapshot参照にする', () => {
    const source = read('src/labs/inner-product/InnerProductLab.tsx');
    expect(source).toContain('analyzeGramSchmidt(metric, scene.inputs), [scene.inputs, metric]');
    expect(source).toContain('[displayScene.inputs, committedGs]');
    expect(source).toContain('if (!preview && stageWasReset)');
    expect(source).toContain("setTab(mode === 'pair' ? 'pair' : 'steps')");
    expect(read('src/labs/inner-product/gramSchmidtPresentation.ts')).not.toContain('analyzeGramSchmidt(');
    expect(read('src/labs/inner-product/GramSchmidtPanels.tsx')).not.toContain('setInterval');
  });
});

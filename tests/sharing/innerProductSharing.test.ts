import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as domain from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl, validateInnerProductShareState, createShareQrCodeDataUrl, createShareTextFileContents, ShareUrlBuildError, DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';
import { createInnerProductShareState, createInnerProductInitialization, restoreInnerProductWorkspace } from '../../src/labs/inner-product/innerProductSharing';
import { activeInnerSlot, createInnerProductWorkspace, updateActiveInnerSlot, resetInnerProductWorkspace, selectInnerScene } from '../../src/labs/inner-product/innerProductWorkspace';
import { createInnerProductScene, innerProductMetric, type InnerProductScene } from '../../src/labs/inner-product/innerProductScene';
import { InnerProductLab } from '../../src/labs/inner-product/InnerProductLab';
import { createAppInitialization } from '../../src/state';
import { createBasisDimensionInitialization } from '../../src/labs/basis-dimension/basisDimensionInitialization';
import { createLinearMapInitialization } from '../../src/labs/linear-map/linearMapInitialization';
import { createRepresentationInitialization } from '../../src/labs/representation-matrix/representationSharing';
import { createEigenInitialization } from '../../src/labs/eigenspace/eigenSharing';
import { createDiagonalizationInitialization } from '../../src/labs/diagonalization/diagonalizationSharing';
import fixture from '../fixtures/share-url-inner-product-v1.json';
import sixth from '../fixtures/share-url-diagonalization-v1.json';
import fifth from '../fixtures/share-url-eigenspace-v1.json';
import fourth from '../fixtures/share-url-representation-matrix-v1.json';
import previous from '../fixtures/share-url-low-dimensions.json';

const base = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';
const encode = (s: unknown) => Buffer.from(JSON.stringify(s)).toString('base64url');
const make = () => validateInnerProductShareState(fixture.expectedState);
const stateOf = (scene: InnerProductScene) => createInnerProductShareState(activeInnerSlot(createInnerProductWorkspace(scene)));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('14.7 内積Labの共有v1', () => {
  it('固定URLの順序・積分・途中段階・カメラと独立期待値を再現する', () => {
    const s = make();
    expect(readShareStateFromUrl(fixture.url)).toEqual({ status: 'success', state: s });
    const slot = activeInnerSlot(restoreInnerProductWorkspace(s));
    expect(slot.scene.inputs.map(x => x.id)).toEqual([3, 1, 2]);
    expect(slot.scene.stage).toEqual({ inputId: 2, phase: 'projection', count: 2 });
    const gs = domain.analyzeGramSchmidt(innerProductMetric(3, 'integral'), slot.scene.inputs);
    expect(gs.steps[2].previousSourceIds).toEqual([3, 1]);
    expect(gs.steps[2].residual?.numeric).toEqual({ status: 'ready', value: [-1 / 3, 0, 1] });
    expect(gs.steps[2].normSquared?.numeric).toEqual({ status: 'ready', value: 8 / 45 });
    expect(slot.view.camera).toEqual(fixture.expectedState.camera);
    expect(createInnerProductShareState(slot)).toEqual(s);
    expect(buildShareUrl(base, s)).toBe(fixture.url);
  });
  for (const kind of ['coordinate', 'polynomial'] as const) for (const dim of [0, 1, 2, 3] as const) {
    if (kind === 'polynomial' && dim === 0) continue;
    for (const mode of ['pair', 'gram-schmidt'] as const) it(`${kind} ${dim}D ${mode}を復元、手動範囲と派生値を除外`, () => {
      const scene = { ...createInnerProductScene(dim, kind), mode };
      const slot = activeInnerSlot(createInnerProductWorkspace(scene));
      const state = createInnerProductShareState({ ...slot, view: { ...slot.view, plane: { minX: -50, maxX: 50, minY: -50, maxY: 50 }, line: { min: -20, max: 20 } } });
      const url = buildShareUrl(base + '?old=1#hash', state), result = createInnerProductInitialization(url);
      expect(result.errorMessage).toBeNull(); expect(activeInnerSlot(result.initialWorkspace).scene).toEqual(scene);
      expect(activeInnerSlot(result.initialWorkspace).view).toEqual({ plane: null, line: null, camera: dim === 3 ? DEFAULT_3D_CAMERA_STATE : null });
      expect(buildShareUrl(url, state)).toBe(url);
      for (const key of ['q', 'p', 'r', 'G', 'C', 'slots', 'view', 'tab', 'preview']) expect(Object.keys(state)).not.toContain(key);
      if (dim === 0) expect(state).toEqual({ v: 1, lab: 'inner-product', dim: 0, mode });
    });
  }
  it('全ての実在する段階を保持し、pairモードに隠れた段階も保存する', () => {
    for (const kind of ['coordinate', 'polynomial'] as const) {
      const scene = createInnerProductScene(3, kind);
      const analysis = domain.analyzeGramSchmidt(innerProductMetric(3, scene.metric), scene.inputs);
      for (const stage of analysis.availableStages) {
        const original = { ...scene, stage };
        expect(activeInnerSlot(restoreInnerProductWorkspace(stateOf(original))).scene).toEqual(original);
      }
    }
  });
  it('URLからの実コンポーネント初期化でGSタブ・段階を選び、意味エラーを通知する', () => {
    const scene = { ...createInnerProductScene(), mode: 'gram-schmidt' as const, stage: { inputId: 2, phase: 'normalize' as const } };
    vi.stubGlobal('window', { location: { href: buildShareUrl(base, stateOf(scene)) } });
    const html = renderToStaticMarkup(createElement(InnerProductLab));
    expect(html).toContain('data-inner-mode="gram-schmidt"');
    expect(html).toMatch(/id="inner-tab-steps" aria-selected="true"/);
    vi.stubGlobal('window', { location: { href: base + '?state=' + encode({ ...stateOf(scene), stage: { inputId: 1, phase: 'projection', count: 1 } }) } });
    const bad = renderToStaticMarkup(createElement(InnerProductLab));
    expect(bad).toContain('role="alert"'); expect(bad).toContain('共有された計算段階');
    expect(bad).toContain('data-inner-mode="pair"');
  });
  it('係数内積・同じ2本選択・未選択・空入力・零と従属skipを保つ', () => {
    const initial = createInnerProductScene(2, 'polynomial');
    for (const scene of [
      { ...initial, metric: 'coefficient' as const, pair: [1, 1] as const, showGeometry: false },
      { ...initial, pair: null },
      { ...initial, inputs: [], pair: null, stage: null },
      { ...initial, inputs: [{ id: 1, components: [0, 0] }], pair: [1, 1] as const, stage: { inputId: 1, phase: 'skip' as const } },
      { ...initial, inputs: [{ id: 1, components: [1, 0] }, { id: 2, components: [2, 0] }], stage: { inputId: 2, phase: 'skip' as const } },
    ]) expect(activeInnerSlot(restoreInnerProductWorkspace(stateOf(scene))).scene).toEqual(scene);
  });
  it('共有時Resetは現在slotだけ、再共有と他slot編集で基準は変わらない', () => {
    const initial = restoreInnerProductWorkspace(make());
    let w = updateActiveInnerSlot(initial, slot => ({ ...slot, scene: { ...slot.scene, metric: 'coefficient', mode: 'pair', pair: null, showGeometry: false },
      view: { ...slot.view, camera: DEFAULT_3D_CAMERA_STATE } }));
    expect(createInnerProductShareState(activeInnerSlot(w))).not.toEqual(make());
    w = updateActiveInnerSlot(selectInnerScene(w, 'coordinate', 1), slot => ({ ...slot, scene: { ...slot.scene, inputs: [{ id: 1, components: [8] }], pair: [1, 1] } }));
    const other = w.slots[1];
    w = resetInnerProductWorkspace(selectInnerScene(w, 'polynomial', 3), initial);
    expect(activeInnerSlot(w)).toEqual(activeInnerSlot(initial)); expect(w.slots[1]).toBe(other);
    expect(resetInnerProductWorkspace(selectInnerScene(w, 'coordinate', 1), initial).slots[1]).toEqual(initial.slots[1]);
  });
  it('構造検査や他Lab起動はGSを呼ばず、存在しない段階だけ対象Labで拒否する', () => {
    const spy = vi.spyOn(domain, 'analyzeGramSchmidt');
    const url = base + '?state=' + encode({ ...fixture.expectedState, stage: { inputId: 3, phase: 'projection', count: 1 } });
    expect(readShareStateFromUrl(url).status).toBe('success'); expect(spy).not.toHaveBeenCalled();
    for (const init of [createAppInitialization, createBasisDimensionInitialization, createLinearMapInitialization, createRepresentationInitialization, createEigenInitialization, createDiagonalizationInitialization]) {
      expect(init(url)).toEqual(init(base));
    }
    expect(spy).not.toHaveBeenCalled();
    const result = createInnerProductInitialization(url);
    expect(spy).toHaveBeenCalledTimes(1); expect(result.errorMessage).toContain('計算段階');
    expect(result.initialWorkspace).toEqual(createInnerProductWorkspace());
  });
  it('計算保留のinput・holdは再現し、normalizeや未処理の後続段階は拒否する', () => {
    const scene = { ...createInnerProductScene(2), inputs: [{ id: 1, components: [Number.MIN_VALUE, 1e6] }, { id: 2, components: [1, 0] }] };
    for (const phase of ['input', 'hold'] as const) {
      const original = { ...scene, stage: { inputId: 1, phase } };
      expect(activeInnerSlot(restoreInnerProductWorkspace(stateOf(original))).scene).toEqual(original);
    }
    for (const stage of [{ inputId: 1, phase: 'normalize' }, { inputId: 2, phase: 'input' }]) {
      const s = validateInnerProductShareState({ ...stateOf(scene), stage });
      expect(() => restoreInnerProductWorkspace(s)).toThrow('計算段階');
    }
  });
  it('未知項目・欠落・次元・ID・参照・内積・段階形状・カメラを厳密に検証', () => {
    const s = fixture.expectedState;
    const bad: unknown[] = [null, { ...s, v: 2 }, { ...s, lab: 'other' }, { ...s, dim: 4 }, { ...s, kind: 'other' },
      { ...s, metric: 'euclidean' }, { ...s, kind: 'coordinate' }, { ...s, metric: 'other' }, { ...s, extra: 1 }, { ...s, mode: 'other' }, { ...s, showGeometry: 1 },
      { ...s, inputs: null }, { ...s, inputs: Array(9).fill(s.inputs[0]) }, { ...s, inputs: [s.inputs[0], s.inputs[0]] },
      ...[0, 9, 1.5, '1'].map(id => ({ ...s, inputs: [{ id, components: [1, 0, 0] }] })),
      ...[NaN, Infinity, 1000001, '1'].map(x => ({ ...s, inputs: [{ id: 1, components: [x, 0, 0] }] })),
      { ...s, inputs: [{ id: 1, components: [1, 2] }] }, { ...s, inputs: [{ ...s.inputs[0], extra: 1 }] },
      ...[[], [1], [1, 2, 3], [1, 8], ['1', 2]].map(pair => ({ ...s, pair })),
      ...[null, { inputId: 8, phase: 'input' }, { inputId: 1, phase: 'other' }, { inputId: 1, phase: 'input', count: 1 },
        { inputId: 1, phase: 'projection' }, ...[0, 4, 1.5, '1'].map(count => ({ inputId: 2, phase: 'projection', count }))].map(stage => ({ ...s, stage })),
      { ...s, inputs: [], pair: null }, { ...s, inputs: [], stage: null },
      ...[null, { ...s.camera, zoom: 0 }, { ...s.camera, zoom: 101 }, { ...s.camera, direction: [0, 0, 0] }, { ...s.camera, up: s.camera.direction },
        { ...s.camera, target: [1e8, 0, 0] }, { ...s.camera, extra: 1 }].map(camera => ({ ...s, camera }))];
    for (const key of Object.keys(s)) { const missing: Record<string, unknown> = { ...s }; delete missing[key]; bad.push(missing); }
    for (const value of bad) expect(() => validateInnerProductShareState(value)).toThrow();
    for (const key of ['kind', 'metric', 'inputs', 'pair', 'stage', 'showGeometry', 'camera', 'extra']) {
      expect(() => validateInnerProductShareState({ v: 1, lab: 'inner-product', dim: 0, mode: 'pair', [key]: null })).toThrow();
    }
    expect(() => validateInnerProductShareState({ v: 1, lab: 'inner-product', dim: 0 })).toThrow();
    expect(() => validateInnerProductShareState({ ...stateOf(createInnerProductScene(1)), camera: s.camera })).toThrow();
    expect(createInnerProductInitialization(base + '?state=bad').errorMessage).not.toBeNull();
    const normalized = stateOf({ ...createInnerProductScene(1), inputs: [{ id: 1, components: [-0] }], pair: [1, 1] });
    expect(normalized.dim !== 0 && Object.is(normalized.inputs[0].components[0], -0)).toBe(false);
  });
  it('既存6Labの固定URLを変えず、内積Labの初期値に干渉しない', () => {
    for (const f of [sixth, fifth, fourth, ...previous]) {
      const result = readShareStateFromUrl(f.url); expect(result.status).toBe('success');
      if (result.status === 'success') expect(buildShareUrl(base, result.state)).toBe(f.url);
      expect(createInnerProductInitialization(f.url)).toEqual(createInnerProductInitialization(base));
    }
  });
  it('上限2048文字、長い8本の拒否、丸めない値、QR／テキスト／別pathを共用', async () => {
    const s = make(), url = buildShareUrl(base, s);
    expect(createShareTextFileContents(url)).toBe(url + '\n');
    expect(await createShareQrCodeDataUrl(url)).toMatch(/^data:image\/png;base64,/);
    const boundary = base + 'a'.repeat(2048 - url.length);
    expect(buildShareUrl(boundary, s)).toHaveLength(2048);
    expect(() => buildShareUrl(boundary + 'a', s)).toThrow(ShareUrlBuildError);
    expect(buildShareUrl('https://example.edu/course/lab/?old=1#x', s)).toMatch(/^https:\/\/example.edu\/course\/lab\/\?state=/);
    const precise = validateInnerProductShareState({ ...fixture.expectedState, inputs: Array.from({ length: 8 }, (_, i) => ({ id: i + 1,
      components: [0.12345678901234567, -999999.1234567891, Number.MIN_VALUE] })), stage: { inputId: 1, phase: 'input' } });
    // 生のwireで値を丸めないことを確認し、長い配信先URLでは説明付きで拒否する。
    expect(precise.dim !== 0 && precise.inputs[7].components).toEqual([0.12345678901234567, -999999.1234567891, Number.MIN_VALUE]);
    const preciseUrl = buildShareUrl(base, precise);
    expect(readShareStateFromUrl(preciseUrl)).toEqual({ status: 'success', state: precise });
    expect(() => buildShareUrl(base + 'a'.repeat(2049 - preciseUrl.length), precise)).toThrow(ShareUrlBuildError);
  });
  it('共有ボタン・一時状態停止・警告・共通ダイアログを接続（実機確認とは別）', () => {
    const html = renderToStaticMarkup(createElement(InnerProductLab, { initialScene: createInnerProductScene() }));
    expect(html).toContain('共有URLをエクスポート'); expect(html).not.toContain('14.7で対応予定');
    const source = readFileSync(new URL('../../src/labs/inner-product/InnerProductLab.tsx', import.meta.url), 'utf8');
    for (const phrase of ['createInnerProductInitialization', 'ShareExportDialog', 'exportDisabled={invalid.size > 0 || preview !== null}',
      'invalid.size > 0 || previewRef.current !== null', 'setShareUrl(null)', 'loadError={initialization.errorMessage}']) expect(source).toContain(phrase);
  });
});

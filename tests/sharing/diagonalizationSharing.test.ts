import { afterEach, describe, expect, it, vi } from 'vitest';
import * as domain from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl, decodeShareState, validateDiagonalizationShareState, createShareQrCodeDataUrl, ShareUrlBuildError, DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';
import { createDiagonalizationShareState, createDiagonalizationInitialization, restoreDiagonalizationWorkspace } from '../../src/labs/diagonalization/diagonalizationSharing';
import { createDiagonalizationWorkspace, diagonalizationCurrentSlot, updateDiagonalizationSlot, resetDiagonalizationWorkspace, selectDiagonalizationKind, selectDiagonalizationDimension } from '../../src/labs/diagonalization/diagonalizationWorkspace';
import { createDiagonalizationScene, createDiagonalizationPolynomialScene, setDiagonalizationInput } from '../../src/labs/diagonalization/diagonalizationScene';
import { createAppInitialization } from '../../src/state';
import { createBasisDimensionInitialization } from '../../src/labs/basis-dimension/basisDimensionInitialization';
import { createLinearMapInitialization } from '../../src/labs/linear-map/linearMapInitialization';
import { createRepresentationInitialization } from '../../src/labs/representation-matrix/representationSharing';
import { createEigenInitialization } from '../../src/labs/eigenspace/eigenSharing';
import fixture from '../fixtures/share-url-diagonalization-v1.json';
import fifth from '../fixtures/share-url-eigenspace-v1.json';
import fourth from '../fixtures/share-url-representation-matrix-v1.json';
import previous from '../fixtures/share-url-low-dimensions.json';

const base = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';
const encode = (s: unknown) => Buffer.from(JSON.stringify(s)).toString('base64url');
const make = () => validateDiagonalizationShareState(fixture.expectedState);
afterEach(() => vi.restoreAllMocks());
describe('13.6 対角化Labの共有v1', () => {
  it('独立fixtureのURL・基底列順・両カメラと手計算した座標を再現する', () => {
    const state = make();
    expect(readShareStateFromUrl(fixture.url)).toEqual({ status: 'success', state });
    expect(buildShareUrl(base, state)).toBe(fixture.url);
    const w = restoreDiagonalizationWorkspace(state), slot = diagonalizationCurrentSlot(w);
    expect(w.kind).toBe('polynomial'); expect(w.dimension).toBe(3);
    const analysis = domain.reorderDiagonalization(domain.analyzeDiagonalization(slot.scene.definition), slot.scene.order!);
    expect(analysis.basis?.p).toEqual([[0, 1, 0], [0, 0, 1], [1, 0, 0]]);
    expect(analysis.basis?.d).toEqual([[2, 0, 0], [0, 0, 0], [0, 0, 1]]);
    const input = domain.analyzeDiagonalizationInput(analysis, slot.scene.input);
    expect(input.imageVector).toEqual([0, 2, 6]); expect(input.coordinates?.inputCoordinates).toEqual([3, 1, 2]);
    expect(input.coordinates?.imageCoordinatesViaDiagonal).toEqual([6, 0, 2]);
    expect(slot.views.reference.camera).toEqual(fixture.expectedState.cameras.reference);
    expect(slot.views.eigenbasis.camera).toEqual(fixture.expectedState.cameras.eigenbasis);
    expect(createDiagonalizationShareState(slot)).toEqual(state);
  });
  for (const kind of ['coordinate', 'polynomial'] as const) for (const n of [0, 1, 2, 3] as const) {
    if (kind === 'polynomial' && n === 0) continue;
    it(`${kind} ${n}Dを共有し、手動範囲・他slot・導出値を保存しない`, () => {
      const scene = kind === 'polynomial' && n !== 0 ? createDiagonalizationPolynomialScene(n) : createDiagonalizationScene(n);
      const w = createDiagonalizationWorkspace(scene), slot = diagonalizationCurrentSlot(w);
      const manual = { ...slot.views.reference, plane: { minX: -50, maxX: 50, minY: -50, maxY: 50 }, line: { min: -20, max: 20 } };
      const state = createDiagonalizationShareState({ ...slot, views: { reference: manual, eigenbasis: manual } });
      const url = buildShareUrl(base + '?old=1#hash', state);
      expect(url.startsWith(base + '?state=')).toBe(true); expect(url.length).toBeLessThanOrEqual(2048);
      const restored = createDiagonalizationInitialization(url);
      expect(restored.errorMessage).toBeNull(); expect(diagonalizationCurrentSlot(restored.initialWorkspace).scene).toEqual(scene);
      for (const view of Object.values(diagonalizationCurrentSlot(restored.initialWorkspace).views)) {
        expect(view).toEqual({ plane: null, line: null, camera: n === 3 ? DEFAULT_3D_CAMERA_STATE : null });
      }
      expect(buildShareUrl(url, state)).toBe(url);
      for (const key of ['p', 'd', 'views', 'slots']) expect(Object.keys(state)).not.toContain(key);
      if (n === 0) expect(state).toEqual({ v: 1, lab: 'diagonalization', dim: 0 });
    });
  }
  it('再エクスポートでReset基準を変更せず、現在slotの行列・列順・視点を復元する', () => {
    const initial = restoreDiagonalizationWorkspace(make());
    let w = updateDiagonalizationSlot(initial, 3, (s) => ({ ...s, scene: { ...setDiagonalizationInput(s.scene, [9, 8, 7]), order: [1, 2, 0], showEigenspace: false },
      views: { reference: { ...s.views.reference, camera: DEFAULT_3D_CAMERA_STATE }, eigenbasis: { ...s.views.eigenbasis, camera: DEFAULT_3D_CAMERA_STATE } } }));
    const edited = createDiagonalizationShareState(diagonalizationCurrentSlot(w));
    expect(edited).not.toEqual(make());
    w = selectDiagonalizationDimension(selectDiagonalizationKind(w, 'coordinate'), 1);
    w = updateDiagonalizationSlot(w, 1, (s) => ({ ...s, scene: setDiagonalizationInput(s.scene, [8]) }));
    const other = w.slots[1];
    w = selectDiagonalizationDimension(selectDiagonalizationKind(w, 'polynomial'), 3);
    w = resetDiagonalizationWorkspace(w, initial);
    expect(diagonalizationCurrentSlot(w)).toEqual(diagonalizationCurrentSlot(initial)); expect(w.slots[1]).toBe(other);
    const resetOther = resetDiagonalizationWorkspace(selectDiagonalizationDimension(selectDiagonalizationKind(w, 'coordinate'), 1), initial);
    expect(resetOther.slots[1]).toEqual(initial.slots[1]); expect(resetOther.polynomialSlots[3]).toBe(initial.polynomialSlots[3]);
  });
  it('不可・数値保留はorder=null、入力計算や描画だけの失敗は有効なorderで共有できる', () => {
    const cases = [
      { matrix: [[2, 1], [0, 2]], input: [1, 2], order: null },
      { matrix: [[0, -1], [1, 0]], input: [1, 2], order: null },
      { matrix: [[1, 1], [1e-24, 1]], input: [1, 2], order: null },
      { matrix: [[1e-200]], input: [1e-200], order: [0] },
      { matrix: [[1e6]], input: [1e6], order: [0] },
    ];
    for (const c of cases) {
      const n = c.input.length as 1 | 2;
      const scene = { ...createDiagonalizationScene(n), definition: { dimension: n, matrix: c.matrix }, input: c.input, order: null };
      const state = createDiagonalizationShareState(diagonalizationCurrentSlot(createDiagonalizationWorkspace(scene)));
      expect(state.dim !== 0 && state.order).toEqual(c.order);
      expect(diagonalizationCurrentSlot(restoreDiagonalizationWorkspace(state)).scene).toEqual({ ...scene, order: c.order });
      expect(readShareStateFromUrl(buildShareUrl(base, state)).status).toBe('success');
    }
  });
  it('構造検証は数学解析を呼ばず、意味的不整合を対象Lab復元時に通知する', () => {
    const spy = vi.spyOn(domain, 'analyzeDiagonalization');
    const bad = { ...fixture.expectedState, order: null };
    const url = base + '?state=' + encode(bad);
    expect(readShareStateFromUrl(url).status).toBe('success'); expect(spy).not.toHaveBeenCalled();
    for (const init of [createAppInitialization, createBasisDimensionInitialization, createLinearMapInitialization, createRepresentationInitialization, createEigenInitialization]) {
      expect(init(url)).toEqual(init(base));
    }
    expect(spy).not.toHaveBeenCalled();
    const result = createDiagonalizationInitialization(url);
    expect(result.errorMessage).toContain('基底の列順'); expect(spy).toHaveBeenCalledTimes(1);
    expect(result.initialWorkspace).toEqual(createDiagonalizationWorkspace());
    const notReady = { ...fixture.expectedState, matrix: [[0, 1, 0], [0, 0, 2], [0, 0, 0]] };
    expect(createDiagonalizationInitialization(base + '?state=' + encode(notReady)).errorMessage).toContain('一致しません');
  });
  it('版・未知項目・欠落・数値境界・列順・両カメラの不整合を拒否する', () => {
    const s = fixture.expectedState;
    const bad: unknown[] = [null, { ...s, v: 2 }, { ...s, lab: 'other' }, { ...s, dim: 4 }, { ...s, kind: 'other' },
      { ...s, extra: true }, { ...s, input: [1, 2] }, { ...s, matrix: [[1]] }, { ...s, showEigenspace: 1 },
      ...[[], [0, 1], [0, 0, 2], [0, 1, 3], [-1, 1, 2], [0, 1, 1.5], ['0', 1, 2]].map((order) => ({ ...s, order })),
      ...[NaN, Infinity, 1000001, '1'].flatMap((value) => [{ ...s, input: [1, 2, value] }, { ...s, matrix: [[value, 0, 0], [0, 1, 0], [0, 0, 1]] }]),
      { ...s, cameras: { ...s.cameras, extra: true } }, { ...s, cameras: { reference: s.cameras.reference } }];
    for (const side of ['reference', 'eigenbasis'] as const) for (const camera of [null, { ...s.cameras[side], zoom: 0 }, { ...s.cameras[side], zoom: 101 },
      { ...s.cameras[side], direction: [0, 0, 0] }, { ...s.cameras[side], up: s.cameras[side].direction }, { ...s.cameras[side], target: [1e8, 0, 0] }, { ...s.cameras[side], extra: 0 }]) {
      bad.push({ ...s, cameras: { ...s.cameras, [side]: camera } });
    }
    for (const key of Object.keys(s)) { const missing: Record<string, unknown> = { ...s }; delete missing[key]; bad.push(missing); }
    for (const value of bad) expect(() => validateDiagonalizationShareState(value)).toThrow();
    for (const field of ['kind', 'matrix', 'input', 'order', 'showEigenspace', 'cameras', 'extra']) {
      expect(() => validateDiagonalizationShareState({ v: 1, lab: 'diagonalization', dim: 0, [field]: null })).toThrow();
    }
    const one = { v: 1, lab: 'diagonalization', kind: 'coordinate', dim: 1, matrix: [[2]], input: [1], order: [0], showEigenspace: false, cameras: s.cameras };
    expect(() => validateDiagonalizationShareState(one)).toThrow();
    expect(decodeShareState(encode({ ...s, extra: true })).ok).toBe(false);
    expect(createDiagonalizationInitialization(base + '?state=bad').errorMessage).not.toBeNull();
  });
  it('既存5Labの固定URLと状態を変更しない', () => {
    for (const f of [fifth, fourth, ...previous]) {
      const result = readShareStateFromUrl(f.url); expect(result.status).toBe('success');
      if (result.status === 'success') expect(buildShareUrl(base, result.state)).toBe(f.url);
      expect(createDiagonalizationInitialization(f.url)).toEqual(createDiagonalizationInitialization(base));
    }
  });
  it('長い3D小数も丸めず保存し、2048文字境界・QR・学内パスを共用する', async () => {
    const s = make();
    const highPrecision = validateDiagonalizationShareState({ ...s, input: [0.1234567890123456, -999999.123456789, 1e-300],
      cameras: { reference: { ...fixture.expectedState.cameras.reference, zoom: 1.1234567890123456 }, eigenbasis: fixture.expectedState.cameras.eigenbasis } });
    const url = buildShareUrl(base, highPrecision);
    expect(url.length).toBeLessThanOrEqual(2048); expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state: highPrecision });
    const atLimit = base + 'a'.repeat(2048 - url.length);
    expect(buildShareUrl(atLimit, highPrecision)).toHaveLength(2048);
    expect(() => buildShareUrl(atLimit + 'a', highPrecision)).toThrow(ShareUrlBuildError);
    expect(await createShareQrCodeDataUrl(fixture.url)).toMatch(/^data:image\/png;base64,/);
    expect(await createShareQrCodeDataUrl(buildShareUrl(base, { v: 1, lab: 'diagonalization', dim: 0 }))).toMatch(/^data:image\/png;base64,/);
    expect(buildShareUrl('https://school.example/materials/lab/index.html', s)).toMatch(/^https:\/\/school.example\/materials\/lab\/index.html\?state=/);
  });
});

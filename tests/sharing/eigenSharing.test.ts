import { describe, expect, it } from 'vitest';
import { analyzeEigenInput, analyzeEigenMap } from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl, decodeShareState, validateEigenspaceShareState, createShareQrCodeDataUrl, ShareUrlBuildError, DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';
import { createEigenShareState, createEigenInitialization, restoreEigenWorkspace } from '../../src/labs/eigenspace/eigenSharing';
import { createEigenWorkspace, currentEigenSlot, updateEigenSlot, resetEigenWorkspace, selectEigenKind, selectEigenDimension } from '../../src/labs/eigenspace/eigenWorkspace';
import { createEigenSceneForDimension, createEigenScene, setEigenInput } from '../../src/labs/eigenspace/eigenScene';
import { createEigenPolynomialScene } from '../../src/labs/eigenspace/eigenPolynomial';
import { createAppInitialization } from '../../src/state';
import { createBasisDimensionInitialization } from '../../src/labs/basis-dimension/basisDimensionInitialization';
import { createLinearMapInitialization } from '../../src/labs/linear-map/linearMapInitialization';
import { createRepresentationInitialization } from '../../src/labs/representation-matrix/representationSharing';
import fixture from '../fixtures/share-url-eigenspace-v1.json';
import fourth from '../fixtures/share-url-representation-matrix-v1.json';
import previous from '../fixtures/share-url-low-dimensions.json';

const base = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';
const encode = (s: unknown) => Buffer.from(JSON.stringify(s)).toString('base64url');
const make = () => validateEigenspaceShareState(fixture.expectedState);
describe('12.7 第五Labの共有v1', () => {
  it('独立fixtureを同一URLへ再生成し、係数・像・カメラを復元する', () => {
    const state = make();
    expect(readShareStateFromUrl(fixture.url)).toEqual({ status: 'success', state });
    expect(buildShareUrl(base, state)).toBe(fixture.url);
    const w = restoreEigenWorkspace(state), slot = currentEigenSlot(w);
    expect(w.kind).toBe('polynomial'); expect(w.dimension).toBe(3);
    expect(slot.scene.input).toEqual([1, 2, 3]);
    expect(analyzeEigenInput(analyzeEigenMap(slot.scene.definition), slot.scene.input).imageVector).toEqual([2, 6, 0]);
    expect(slot.view.camera).toEqual(fixture.expectedState.camera);
    expect(createEigenShareState(slot)).toEqual(state);
  });
  for (const kind of ['coordinate', 'polynomial'] as const) for (const n of [0, 1, 2, 3] as const) {
    if (kind === 'polynomial' && n === 0) continue;
    it(`${kind} ${n}Dの現在場面だけを共有し、手動範囲を含めない`, () => {
      const scene = kind === 'polynomial' && n !== 0 ? createEigenPolynomialScene(n) : createEigenSceneForDimension(n);
      const w = createEigenWorkspace(scene), slot = currentEigenSlot(w);
      const state = createEigenShareState({ ...slot, view: { ...slot.view, plane: { minX: -50, maxX: 50, minY: -50, maxY: 50 }, line: { min: -20, max: 20 } } });
      const url = buildShareUrl(base + '?old=1#hash', state);
      expect(url.startsWith(base + '?state=')).toBe(true); expect(url.length).toBeLessThanOrEqual(2048);
      expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state });
      const restored = createEigenInitialization(url);
      expect(restored.errorMessage).toBeNull();
      expect(currentEigenSlot(restored.initialWorkspace).scene).toEqual(scene);
      expect(currentEigenSlot(restored.initialWorkspace).view).toEqual({ plane: null, line: null, camera: n === 3 ? DEFAULT_3D_CAMERA_STATE : null });
      expect(buildShareUrl(url, state)).toBe(url);
      if (n === 0) expect(state).toEqual({ v: 1, lab: 'eigenspace', dim: 0 });
    });
  }
  it('共有時Reset・別場面Reset・再エクスポートで起動時の基準を変えない', () => {
    const initial = restoreEigenWorkspace(make());
    let w = updateEigenSlot(initial, 3, (s) => ({ scene: setEigenInput({ ...s.scene, showEigenspace: false }, [8, 9, 10]), view: { ...s.view, camera: DEFAULT_3D_CAMERA_STATE } }));
    createEigenShareState(currentEigenSlot(w));
    w = selectEigenDimension(selectEigenKind(w, 'coordinate'), 1);
    w = updateEigenSlot(w, 1, (s) => ({ ...s, scene: setEigenInput(s.scene, [8]) }));
    const other = currentEigenSlot(w);
    w = selectEigenDimension(selectEigenKind(w, 'polynomial'), 3);
    w = resetEigenWorkspace(w, initial);
    expect(currentEigenSlot(w)).toEqual(currentEigenSlot(initial));
    expect(w.slots[1]).toBe(other);
    w = resetEigenWorkspace(selectEigenDimension(selectEigenKind(w, 'coordinate'), 1), initial);
    expect(w.slots[1]).toEqual(initial.slots[1]);
    expect(w.polynomialSlots[3]).toBe(initial.polynomialSlots[3]);
  });
  it('保留や実根なしでも共有でき、微小非零・上限値を保持する', () => {
    for (const matrix of [[[1, 1], [1e-24, 1]], [[0, -1], [1, 0]], [[1e6, 0], [0, 1e-300]]]) {
      const w = createEigenWorkspace(setEigenInput(createEigenScene(matrix), [1e-300, -1e6]));
      const state = createEigenShareState(currentEigenSlot(w));
      expect(currentEigenSlot(restoreEigenWorkspace(state)).scene).toEqual(currentEigenSlot(w).scene);
      expect(readShareStateFromUrl(buildShareUrl(base, state)).status).toBe('success');
    }
  });
  it('未知版・余剰／欠落・不正形状・非有限・カメラの不整合を拒否する', () => {
    const s = fixture.expectedState;
    const bad: unknown[] = [null, { ...s, v: 2 }, { ...s, lab: 'other' }, { ...s, dim: 4 }, { ...s, dim: '3' }, { ...s, kind: 'other' },
      { ...s, extra: true }, { ...s, input: [1, 2] }, { ...s, matrix: [[1]] }, { ...s, showEigenspace: 1 }, { ...s, camera: null },
      { ...s, camera: { ...s.camera, extra: 0 } }, { ...s, camera: { ...s.camera, direction: [0, 0, 0] } },
      { ...s, camera: { ...s.camera, up: [0, -1, 0] } }, { ...s, camera: { ...s.camera, target: [1e8, 0, 0] } },
      ...[0, 101, Infinity].map((zoom) => ({ ...s, camera: { ...s.camera, zoom } })),
      ...[NaN, Infinity, 1000001, '1'].flatMap((value) => [{ ...s, input: [1, 2, value] }, { ...s, matrix: [[value, 0, 0], [0, 1, 0], [0, 0, 1]] }]),
      { v: 1, lab: 'eigenspace', dim: 1, kind: 'coordinate', matrix: [[2]], input: [1], showEigenspace: false, camera: s.camera }];
    for (const key of Object.keys(s)) { const missing: Record<string, unknown> = { ...s }; delete missing[key]; bad.push(missing); }
    for (const value of bad) expect(() => validateEigenspaceShareState(value)).toThrow();
    const zero = { v: 1, lab: 'eigenspace', dim: 0 };
    for (const field of ['kind', 'matrix', 'input', 'showEigenspace', 'camera', 'extra']) expect(() => validateEigenspaceShareState({ ...zero, [field]: null })).toThrow();
    expect(decodeShareState(encode({ ...s, extra: true })).ok).toBe(false);
    expect(createEigenInitialization(base + '?state=' + encode({ ...s, v: 2 })).errorMessage).not.toBeNull();
    expect(createEigenInitialization(base + '?state=bad').initialWorkspace).toEqual(createEigenWorkspace());
  });
  it('既存4Labの初期化と旧fixtureを変えず、第五Labも他Lab状態を読み込まない', () => {
    for (const init of [createAppInitialization, createBasisDimensionInitialization, createLinearMapInitialization, createRepresentationInitialization]) expect(init(fixture.url)).toEqual(init(base));
    for (const f of [fourth, ...previous]) {
      const result = readShareStateFromUrl(f.url); expect(result.status).toBe('success');
      if (result.status === 'success') expect(buildShareUrl(base, result.state)).toBe(f.url);
      expect(createEigenInitialization(f.url)).toEqual(createEigenInitialization(base));
    }
  });
  it('QR・本番パス・URL長制限を既存経路で扱う', async () => {
    expect(await createShareQrCodeDataUrl(fixture.url)).toMatch(/^data:image\/png;base64,/);
    expect(() => buildShareUrl(base + 'a'.repeat(2048), make())).toThrow(ShareUrlBuildError);
    const url = buildShareUrl('https://school.example/materials/lab/index.html', make());
    expect(url.startsWith('https://school.example/materials/lab/index.html?state=')).toBe(true);
  });
});

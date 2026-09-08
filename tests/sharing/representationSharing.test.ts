import { describe, expect, it } from 'vitest';
import { buildShareUrl, readShareStateFromUrl, validateRepresentationMatrixShareState, decodeShareState, MAX_ENCODED_SHARE_STATE_LENGTH, DEFAULT_3D_CAMERA_STATE, createShareQrCodeDataUrl, ShareUrlBuildError } from '../../src/sharing';
import { createRepresentationScene, moveRepresentationBasis, editRepresentationValue } from '../../src/labs/representation-matrix/representationMatrixState';
import { createRepresentationWorkspace, createRepresentationViewState, createBasisChangeScene, resetRepresentationWorkspace, updateActiveRepresentationScene, activeRepresentationScene, activeRepresentationViews, selectRepresentationDimension, representationChangeId } from '../../src/labs/representation-matrix/representationWorkspace';
import { createRepresentationShareState, createRepresentationInitialization, restoreRepresentationWorkspace } from '../../src/labs/representation-matrix/representationSharing';
import { analyzeRepresentationMatrix } from '../../src/domain';
import legacy from '../fixtures/share-url-low-dimensions.json';
import fixture from '../fixtures/share-url-representation-matrix-v1.json';
import { createAppInitialization } from '../../src/state';
import { createBasisDimensionInitialization } from '../../src/labs/basis-dimension/basisDimensionInitialization';
import { createLinearMapInitialization } from '../../src/labs/linear-map/linearMapInitialization';

const base = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';
const views = createRepresentationViewState();
const make = () => createRepresentationShareState(createRepresentationScene(3, 3, 'polynomial', 'polynomial'), views);
const encoded = (s: unknown) => Buffer.from(JSON.stringify(s)).toString('base64url');

describe('11.7 第四Labの独立した共有v1', () => {
  it('第四の固定fixtureを同一URLへ再生成し、他の3Labへ状態を漏らさない', () => {
    const s = validateRepresentationMatrixShareState(fixture.expectedState);
    expect(readShareStateFromUrl(fixture.url)).toEqual({ status: 'success', state: s });
    expect(buildShareUrl(base, s)).toBe(fixture.url);
    const restored = restoreRepresentationWorkspace(s);
    const scene = activeRepresentationScene(restored);
    expect(scene.source.vectors.map((v) => v.id)).toEqual(['u3', 'u1', 'u2']);
    expect(createRepresentationShareState(scene, activeRepresentationViews(restored))).toEqual(s);
    for (const initialize of [createAppInitialization, createBasisDimensionInitialization, createLinearMapInitialization]) {
      expect(initialize(fixture.url)).toEqual(initialize(base));
    }
  });
  for (const source of ['coordinate', 'polynomial'] as const) for (const target of ['coordinate', 'polynomial'] as const)
    for (const n of [1, 2, 3] as const) for (const m of [1, 2, 3] as const) it(`${source} ${n}→${target} ${m}を復元する`, () => {
      const scene = moveRepresentationBasis(createRepresentationScene(n, m, source, target), 'source', 0, 1);
      const state = createRepresentationShareState(scene, views);
      const url = buildShareUrl(base + '?old=discard#hash', state);
      const result = readShareStateFromUrl(url);
      expect(result).toEqual({ status: 'success', state });
      expect(url.startsWith(base + '?state=')).toBe(true);
      expect(url).not.toContain('old=');
      const restored = createRepresentationInitialization(url);
      expect(activeRepresentationScene(restored.initialWorkspace)).toEqual(scene);
      expect(restored.errorMessage).toBeNull();
      expect(buildShareUrl(url, state)).toBe(url);
      expect(url.length).toBeLessThanOrEqual(2048);
    });
  for (const kind of ['coordinate', 'polynomial'] as const) for (const n of [1, 2, 3] as const) it(`${kind} ${n}D恒等写像の逆方向・共有時Resetを維持する`, () => {
    const scene = createBasisChangeScene(n, 'order', kind);
    const state = createRepresentationShareState(scene, views, 'basis-change', 'C-to-B');
    const initial = createRepresentationInitialization(buildShareUrl(base, state)).initialWorkspace;
    const changed = updateActiveRepresentationScene(initial, (s) => editRepresentationValue(s, 'input', 0, 0, 91));
    const id = representationChangeId(initial);
    const reset = resetRepresentationWorkspace({ ...changed, changeDirections: { ...changed.changeDirections, [id]: 'B-to-C' } }, initial);
    expect(activeRepresentationScene(reset)).toEqual(scene);
    expect(reset.changeDirections[id]).toBe('C-to-B');
    expect(reset.scenes).toBe(changed.scenes);
    expect(reset.mode).toBe('basis-change');
  });
  it('通常の共有時Resetは現在の場面だけで、再エクスポートも初期値を変えない', () => {
    const initial = restoreRepresentationWorkspace(make());
    let w = updateActiveRepresentationScene(initial, (s) => editRepresentationValue(s, 'input', 0, 0, 91));
    const changedScene = activeRepresentationScene(w);
    createRepresentationShareState(changedScene, activeRepresentationViews(w));
    w = selectRepresentationDimension(w, 'source', 1);
    w = updateActiveRepresentationScene(w, (s) => editRepresentationValue(s, 'input', 0, 0, -8));
    const otherId = w.activeShapeId;
    w = resetRepresentationWorkspace(w, initial);
    expect(activeRepresentationScene(w)).toEqual(initial.scenes[otherId]);
    expect(w.scenes[initial.activeShapeId]).toBe(changedScene);
    w = resetRepresentationWorkspace({ ...w, activeShapeId: initial.activeShapeId }, initial);
    expect(activeRepresentationScene(w)).toEqual(activeRepresentationScene(initial));
    expect(w.changeScenes).toBe(initial.changeScenes);
  });
  it('手動範囲を捨て、3Dカメラだけをそのまま保存・復元する', () => {
    const camera = { ...DEFAULT_3D_CAMERA_STATE, target: [1, -2, 3] as const, zoom: 2.5 };
    const state = createRepresentationShareState(createRepresentationScene(2, 3), { ...views,
      plane: { source: { minX: -20, maxX: 20, minY: -20, maxY: 20 }, target: null },
      line: { source: { min: -100, max: 100 }, target: null }, cameras: { source: null, target: camera } });
    const restored = activeRepresentationViews(restoreRepresentationWorkspace(state));
    expect(restored).toEqual({ ...views, cameras: { source: null, target: camera } });
    expect(Object.keys(state)).not.toContain('plane');
    expect(Object.keys(state)).not.toContain('representation');
  });
  it('基底でない候補もそのまま復元し、表現行列は再判定する', () => {
    const scene = editRepresentationValue(createRepresentationScene(1, 2), 'source', 0, 0, 0);
    const restored = activeRepresentationScene(restoreRepresentationWorkspace(createRepresentationShareState(scene, views)));
    expect(restored).toEqual(scene);
    expect(analyzeRepresentationMatrix(restored.definition, restored.source, restored.target, restored.input).status).toBe('invalid-basis');
  });
  it('未知版・欠損・未知フィールド・不正形状・非有限値・過大値を拒否する', () => {
    const s = make();
    const bad = [ { ...s, v: 2 }, { ...s, v: '1' }, { ...s, unexpected: true }, { ...s, mode: 'unknown' },
      { ...s, sourceDimension: 0 }, { ...s, targetDimension: 4 }, { ...s, sourceKind: 'function' },
      { ...s, matrix: [[1]] }, { ...s, input: [1, 2] }, { ...s, input: [NaN, 2, 3] }, { ...s, input: [Infinity, 2, 3] }, { ...s, input: [1000001, 2, 3] },
      { ...s, sourceBasis: s.sourceBasis.slice(1) }, { ...s, sourceBasis: [s.sourceBasis[0], s.sourceBasis[0], s.sourceBasis[2]] },
      { ...s, sourceBasis: [{ index: 4, coordinates: [1, 2, 3] }, ...s.sourceBasis.slice(1)] },
      { ...s, sourceBasis: [{ ...s.sourceBasis[0], name: 'injected' }, ...s.sourceBasis.slice(1)] },
      { ...s, direction: 'B-to-C' }, { ...s, cameras: { ...s.cameras, source: null } },
      { ...s, cameras: { ...s.cameras, source: { ...DEFAULT_3D_CAMERA_STATE, zoom: 101 } } },
      { ...s, cameras: { ...s.cameras, target: { ...DEFAULT_3D_CAMERA_STATE, up: DEFAULT_3D_CAMERA_STATE.direction } } },
    ];
    const { input: _input, ...missing } = s;
    for (const invalid of [...bad, missing]) expect(() => validateRepresentationMatrixShareState(invalid)).toThrow();
    expect(decodeShareState('a'.repeat(MAX_ENCODED_SHARE_STATE_LENGTH + 1)).ok).toBe(false);
    expect(decodeShareState(encoded({ ...s, unknown: 1 })).ok).toBe(false);
  });
  it('異次元・異種の基底変換、非恒等行列、1D/2Dカメラを拒否する', () => {
    const s = createRepresentationShareState(createBasisChangeScene(2), views, 'basis-change');
    for (const bad of [{ ...s, targetKind: 'polynomial' }, { ...s, targetDimension: 3 }, { ...s, matrix: [[1, 1], [0, 1]] },
      { ...s, direction: null }, { ...s, cameras: { ...s.cameras, source: DEFAULT_3D_CAMERA_STATE } }]) expect(() => validateRepresentationMatrixShareState(bad)).toThrow();
  });
  it('未知URLは初期例とエラー、他Labの固定URLは自分の初期例で開始する', () => {
    expect(createRepresentationInitialization(base + '?state=bad').errorMessage).not.toBeNull();
    expect(createRepresentationInitialization(base).initialWorkspace).toEqual(createRepresentationWorkspace());
    for (const fixture of legacy) {
      const result = createRepresentationInitialization(fixture.url);
      expect(result.errorMessage).toBeNull();
      expect(result.initialWorkspace).toEqual(createRepresentationWorkspace());
    }
  });
  it('最大次元の通常URLとQRを作成し、超過URLは丸めず拒否する', async () => {
    const s = make();
    const url = buildShareUrl(base, s);
    expect(url.length).toBeLessThanOrEqual(2048);
    expect(await createShareQrCodeDataUrl(url)).toMatch(/^data:image\/png;base64,/);
    expect(() => buildShareUrl(base + 'a'.repeat(2048), s)).toThrow(ShareUrlBuildError);
    expect(s).toEqual(make());
  });
  it('3Dの高精度成分は丸めず、2048文字ちょうどを許可して次の1文字を拒否する', () => {
    const scene = createRepresentationScene(3, 3, 'polynomial', 'polynomial');
    const precise = -0.12345678901234566;
    const filled = { ...scene, definition: { ...scene.definition, matrix: Array.from({ length: 3 }, () => [precise, precise, precise]) },
      source: { ...scene.source, vectors: scene.source.vectors.map((v) => ({ ...v, coordinates: [precise, precise, precise] })) },
      target: { ...scene.target, vectors: scene.target.vectors.map((v) => ({ ...v, coordinates: [precise, precise, precise] })) }, input: [precise, precise, precise] };
    const s = createRepresentationShareState(filled, views);
    const url = buildShareUrl(base, s);
    expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state: s });
    const limitBase = base + 'a'.repeat(2048 - url.length);
    expect(buildShareUrl(limitBase, s)).toHaveLength(2048);
    expect(() => buildShareUrl(limitBase + 'a', s)).toThrow(ShareUrlBuildError);
  });
});

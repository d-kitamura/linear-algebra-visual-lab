import { describe, expect, it } from 'vitest';
import { analyzeEigenInput, analyzeEigenMap } from '../../src/domain';
import { DEFAULT_LINE_VIEWPORT, DEFAULT_PLANE_VIEWPORT } from '../../src/visualization';
import { DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';
import { spaceSnapDistanceForViewWidth } from '../../src/state';
import { createEigenScene, createEigenSceneForDimension, createEigenSpaceGeometries, editEigenMatrix, setEigenInput, snapEigenSpaceInput } from '../../src/labs/eigenspace/eigenScene';
import { createEigenWorkspace, resetEigenWorkspace, updateEigenSlot } from '../../src/labs/eigenspace/eigenWorkspace';

describe('12.4 次元別の教材と表示状態', () => {
  it('0D、負の1D、従来2D、固有平面と直線の3Dを初期値にする', () => {
    const workspace = createEigenWorkspace();
    expect(workspace.dimension).toBe(2);
    for (const n of [0, 1, 2, 3] as const) {
      const { scene, view } = workspace.slots[n];
      expect(scene.input).toHaveLength(n);
      expect(scene.definition.matrix).toHaveLength(n);
      expect(scene.showEigenspace).toBe(false);
      expect(view).toEqual({ line: null, plane: null, camera: null });
      const analysis = analyzeEigenMap(scene.definition);
      expect(analysis.realEigenvalues.map((r) => r.value)).toEqual([[], [-2], [2, 4], [-1, 2]][n]);
      expect(analyzeEigenInput(analysis, scene.input).imageVector).toEqual([[], [-2], [6, 4], [2, 2, -1]][n]);
    }
  });
  it('次元切替・現在次元Resetはほかの教材と範囲を変更しない', () => {
    const initial = createEigenWorkspace();
    let workspace = initial;
    for (const n of [1, 2, 3] as const) workspace = updateEigenSlot(workspace, n, (s) => ({
      scene: { ...setEigenInput(editEigenMatrix(s.scene, 0, 0, 7), Array(n).fill(3)), showEigenspace: true },
      view: { line: { ...DEFAULT_LINE_VIEWPORT, min: -10, max: 10 }, plane: DEFAULT_PLANE_VIEWPORT,
        camera: { ...DEFAULT_3D_CAMERA_STATE, zoom: 2 } },
    }));
    const previous = workspace;
    workspace = resetEigenWorkspace({ ...workspace, dimension: 3 }, initial);
    expect(workspace.slots[3]).toBe(initial.slots[3]);
    expect(workspace.slots[2]).toBe(previous.slots[2]);
    expect(workspace.slots[1]).toBe(previous.slots[1]);
    expect(initial.slots[1].scene.input).toEqual([1]);
    expect(workspace.slots[1].scene.input).toEqual([3]);
  });
  it('各次元の編集で形状と範囲を維持し、0Dと1D零変換を区別する', () => {
    for (const n of [0, 1, 2, 3] as const) {
      const scene = createEigenSceneForDimension(n);
      expect(setEigenInput(scene, Array(n + 1).fill(0))).toBe(scene);
      expect(editEigenMatrix(scene, n, 0, 1)).toBe(scene);
      expect(editEigenMatrix(scene, .5, 0, 1)).toBe(scene);
      expect(editEigenMatrix(scene, 0, 0, Infinity)).toBe(scene);
    }
    const zeroSpace = analyzeEigenMap(createEigenScene([]).definition);
    expect(zeroSpace.realEigenvalues).toEqual([]);
    expect(zeroSpace.characteristicCoefficients).toEqual([1]);
    const zeroMap = analyzeEigenMap(createEigenScene([[0]]).definition);
    expect(zeroMap.realEigenvalues[0]).toMatchObject({ value: 0, eigenspace: { dimension: 1 } });
    expect(analyzeEigenInput(zeroMap, [1]).eigenvectorStatus).toBe('eigenvector');
  });
});

describe('12.4 個別の3D固有空間への吸着', () => {
  const scene = { ...createEigenSceneForDimension(3), showEigenspace: true };
  const analysis = analyzeEigenMap(scene.definition);
  it('平面と直線を全空間へ合成せず、両方に表示幅3%で吸着する', () => {
    expect(createEigenSpaceGeometries(analysis).map((g) => g.dimension)).toEqual([1, 2]);
    for (const width of [4, 10, 100]) {
      const d = spaceSnapDistanceForViewWidth(width);
      expect(d).toBeCloseTo(width * .03);
      const plane = snapEigenSpaceInput(scene, analysis, [width * .3, width * .2, width * .029], d);
      expect(plane.snapKind).toBe('span-plane');
      expect(plane.coordinates).toEqual([width * .3, width * .2, 0]);
      const line = snapEigenSpaceInput(scene, analysis, [width * .029, 0, width * .3], d);
      expect(line.snapKind).toBe('span-line');
      expect(line.coordinates).toEqual([0, 0, width * .3]);
      expect(snapEigenSpaceInput(scene, analysis, [width * .3, width * .2, width * .031], d).snapKind).toBeNull();
      expect(analyzeEigenInput(analysis, plane.coordinates).eigenvectorStatus).toBe('eigenvector');
      expect(analyzeEigenInput(analysis, line.coordinates).eigenvectorStatus).toBe('eigenvector');
    }
  });
  it('初期非表示でも原点が最優先。非表示なら固有空間には吸着しない', () => {
    for (const showEigenspace of [true, false]) {
      expect(snapEigenSpaceInput({ ...scene, showEigenspace }, analysis, [.1, .1, .1], .3).snapKind).toBe('origin');
    }
    expect(snapEigenSpaceInput({ ...scene, showEigenspace: false }, analysis, [2, 3, .1], .3).coordinates).toEqual([2, 3, .1]);
    // 直線と平面の両方から0.3以内だが原点の外。列挙順ではなく距離で選ぶ。
    expect(snapEigenSpaceInput(scene, analysis, [.25, 0, .2], .3).coordinates).toEqual([.25, 0, 0]);
    expect(snapEigenSpaceInput(scene, analysis, [.2, 0, .25], .3).coordinates).toEqual([0, 0, .25]);
  });
  it('複数の固有直線、実根1個、全空間、未確認空間を区別する', () => {
    const cases = [
      { matrix: [[2, 0, 0], [0, 3, 0], [0, 0, 4]], dimensions: [1, 1, 1] },
      { matrix: [[0, -1, 0], [1, 0, 0], [0, 0, 2]], dimensions: [1] },
      { matrix: [[2, 0, 0], [0, 2, 0], [0, 0, 2]], dimensions: [3] },
    ];
    for (const { matrix, dimensions } of cases) {
      expect(createEigenSpaceGeometries(analyzeEigenMap(createEigenScene(matrix).definition)).map((g) => g.dimension)).toEqual(dimensions);
    }
    const whole = { ...createEigenScene(cases[2].matrix), showEigenspace: true };
    expect(snapEigenSpaceInput(whole, analyzeEigenMap(whole.definition), [1, 2, 3], .3).snapKind).toBeNull();
    const uncertain = { ...analysis, realEigenvalues: analysis.realEigenvalues.map((r) => ({ ...r, eigenspace: null })) };
    expect(createEigenSpaceGeometries(uncertain)).toEqual([]);
    expect(snapEigenSpaceInput(scene, uncertain, [2, 3, .1], .3).snapKind).toBeNull();
  });
});

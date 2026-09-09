import { describe, expect, it } from 'vitest';
import { analyzeEigenInput, analyzeEigenMap } from '../../src/domain';
import { createEigenScene, createEigenSpaceGeometries, editEigenMatrix, parseEigenNumber, setEigenInput, snapEigenInput } from '../../src/labs/eigenspace/eigenScene';

describe('12.3 固有値Labの2D教材状態', () => {
  it('D-106初期例は固有値2・4、空間初期非表示、選択状態なし', () => {
    const scene = createEigenScene();
    expect(scene.definition).toEqual({ dimension: 2, matrix: [[4, 1], [0, 2]] });
    expect(scene.input).toEqual([1, 2]);
    expect(analyzeEigenMap(scene.definition).realEigenvalues.map((r) => r.value)).toEqual([2, 4]);
    expect(scene.showEigenspace).toBe(false);
    expect(Object.keys(scene).sort()).toEqual(['definition', 'input', 'kind', 'showEigenspace']);
  });
  it('入力変更は行列参照を維持し、数値入力には吸着しない', () => {
    const initial = createEigenScene();
    const scene = initial;
    const edited = setEigenInput(scene, [1, 1.01]);
    expect(edited.definition).toBe(scene.definition);
    expect(edited.input).toEqual([1, 1.01]);
    expect(initial.input).toEqual([1, 2]);
  });
  it('行列変更は入力・表示設定を維持し、回転は固有空間なしにする', () => {
    const initial = createEigenScene();
    const scene = editEigenMatrix(initial, 0, 0, 3);
    expect(scene.showEigenspace).toBe(false);
    expect(scene.input).toBe(initial.input);
    expect(initial.definition.matrix[0][0]).toBe(4);
    expect(createEigenSpaceGeometries(analyzeEigenMap(createEigenScene([[0, -1], [1, 0]]).definition))).toEqual([]);
    expect(editEigenMatrix(initial, 0, 0, 4)).toBe(initial);
  });
  it('判定保留の空間を描画用の直線や原点に置き換えない', () => {
    const analysis = analyzeEigenMap(createEigenScene([[1, 1], [1e-24, 1]]).definition);
    expect(analysis.spectrumComplete).toBe(true);
    expect(createEigenSpaceGeometries(analysis)).toEqual([]);
    const whole = analyzeEigenMap(createEigenScene([[2, 0], [0, 2]]).definition);
    expect(createEigenSpaceGeometries(whole)[0].dimension).toBe(2);
    expect(createEigenSpaceGeometries(whole)[0].vectors).toHaveLength(2);
  });
  it('表示幅2%でどちらの直線にも吸着し、全スケールで同じ画面距離を使う', () => {
    const scene = { ...createEigenScene([[1, 0], [0, 2]]), showEigenspace: true };
    const analysis = analyzeEigenMap(scene.definition);
    for (const width of [4, 10, 100]) {
      expect(snapEigenInput(scene, analysis, [width * .3, width * .019], width).coordinates).toEqual([width * .3, 0]);
      expect(snapEigenInput(scene, analysis, [width * .3, width * .021], width).snapKind).toBeNull();
    }
    expect(snapEigenInput(scene, analysis, [3, .1], 10).coordinates).toEqual([3, 0]);
    expect(snapEigenInput(scene, analysis, [.1, 3], 10).coordinates).toEqual([0, 3]);
    expect(createEigenSpaceGeometries(analysis).map((g) => g.dimension)).toEqual([1, 1]);
  });
  it('非表示や全空間では移動を変えず、原点吸着は最優先で維持する', () => {
    const scene = createEigenScene([[1, 0], [0, 2]]), analysis = analyzeEigenMap(scene.definition);
    const hidden = { ...scene, showEigenspace: false };
    expect(snapEigenInput(hidden, analysis, [3, .1], 10).coordinates).toEqual([3, .1]);
    for (const s of [scene, hidden]) expect(snapEigenInput(s, analysis, [.1, .1], 10).snapKind).toBe('origin');
    const whole = { ...createEigenScene([[2, 0], [0, 2]]), showEigenspace: true };
    expect(snapEigenInput(whole, analyzeEigenMap(whole.definition), [1, 2], 10).coordinates).toEqual([1, 2]);
  });
  it('斜め空間へ吸着した入力と像を同じ解析から検算する', () => {
    const scene = { ...createEigenScene([[2, 1], [1, 2]]), showEigenspace: true }, analysis = analyzeEigenMap(scene.definition);
    const preview = snapEigenInput(scene, analysis, [2, -1.9], 10).coordinates;
    const result = analyzeEigenInput(analysis, preview, 0);
    expect(result.selectionRelation).toBe('member');
    expect(result.eigenvectorStatus).toBe('eigenvector');
    expect(result.imageVector![0]).toBeCloseTo(preview[0], 12);
    expect(scene.input).toEqual([1, 2]); // previewの取消しでは確定状態を変えない。
  });
  it('2直線の吸着範囲が重なる場合は近い方へ吸着する', () => {
    const scene = { ...createEigenScene([[2, 1], [0, 3]]), showEigenspace: true }, analysis = analyzeEigenMap(scene.definition);
    // 両直線から0.2以内、原点からは0.2以上。斜め線の方が近い。
    const result = snapEigenInput(scene, analysis, [.25, .18], 10);
    expect(result.coordinates[0]).toBeCloseTo(.215, 12);
    expect(result.coordinates[1]).toBeCloseTo(.215, 12);
  });
  it('不正値・範囲外を拒否し微小非零値は保持する', () => {
    for (const value of ['', '-', 'Infinity', 'NaN', '1000001']) expect(parseEigenNumber(value)).toBeNull();
    expect(parseEigenNumber('1e-300')).toBe(1e-300);
    const scene = createEigenScene();
    expect(setEigenInput(scene, [Infinity, 0])).toBe(scene);
    expect(editEigenMatrix(scene, 2, 0, 3)).toBe(scene);
    expect(editEigenMatrix(scene, 0, 0, 1e7)).toBe(scene);
  });
});

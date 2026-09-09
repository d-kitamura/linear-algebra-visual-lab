import { describe, expect, it } from 'vitest';
import { analyzeEigenInput, analyzeEigenMap } from '../../src/domain';
import { createEigenScene, createEigenSpaceGeometry, editEigenMatrix, firstEigenSelection, parseEigenNumber, setEigenInput, snapEigenInput } from '../../src/labs/eigenspace/eigenScene';

describe('12.3 固有値Labの2D教材状態', () => {
  it('D-103初期例と最初の空間を使い、導出値を保存しない', () => {
    const scene = createEigenScene();
    expect(scene.definition).toEqual({ dimension: 2, matrix: [[2, 1], [1, 2]] });
    expect(scene.input).toEqual([2, 1]);
    expect(scene.selectedEigenvalueIndex).toBe(0);
    expect(scene.showEigenspace).toBe(true);
    expect(Object.keys(scene).sort()).toEqual(['definition', 'input', 'selectedEigenvalueIndex', 'showEigenspace']);
  });
  it('入力変更は行列参照と選択を維持し、数値入力には吸着しない', () => {
    const initial = createEigenScene();
    const scene = { ...initial, selectedEigenvalueIndex: 1 };
    const edited = setEigenInput(scene, [1, 1.01]);
    expect(edited.definition).toBe(scene.definition);
    expect(edited.selectedEigenvalueIndex).toBe(1);
    expect(edited.input).toEqual([1, 1.01]);
    expect(initial.input).toEqual([2, 1]);
  });
  it('行列変更で選択を再初期化し、回転は選択なしにする', () => {
    const initial = { ...createEigenScene(), selectedEigenvalueIndex: 1 };
    const scene = editEigenMatrix(initial, 0, 0, 3);
    expect(scene.selectedEigenvalueIndex).toBe(0);
    expect(scene.input).toBe(initial.input);
    expect(initial.definition.matrix[0][0]).toBe(2);
    expect(createEigenScene([[0, -1], [1, 0]]).selectedEigenvalueIndex).toBeNull();
    expect(editEigenMatrix(initial, 0, 0, 2)).toBe(initial);
  });
  it('判定保留の空間を描画用の直線や原点に置き換えない', () => {
    const analysis = analyzeEigenMap(createEigenScene([[1, 1], [1e-24, 1]]).definition);
    expect(analysis.spectrumComplete).toBe(true);
    expect(firstEigenSelection(analysis, 0)).toBeNull();
    expect(createEigenSpaceGeometry(analysis, 0)).toBeNull();
    expect(createEigenSpaceGeometry(analysis, null)).toBeNull();
    const whole = analyzeEigenMap(createEigenScene([[2, 0], [0, 2]]).definition);
    expect(createEigenSpaceGeometry(whole, 0)?.dimension).toBe(2);
    expect(createEigenSpaceGeometry(whole, 0)?.vectors).toHaveLength(2);
  });
  it('表示幅2%で選択直線だけへ吸着し、全スケールで同じ画面距離を使う', () => {
    const scene = createEigenScene([[1, 0], [0, 2]]);
    const analysis = analyzeEigenMap(scene.definition);
    for (const width of [4, 10, 100]) {
      expect(snapEigenInput(scene, analysis, [width * .3, width * .019], width).coordinates).toEqual([width * .3, 0]);
      expect(snapEigenInput(scene, analysis, [width * .3, width * .021], width).snapKind).toBeNull();
    }
    const other = { ...scene, selectedEigenvalueIndex: 1 };
    expect(snapEigenInput(other, analysis, [3, .1], 10).snapKind).toBeNull();
    expect(snapEigenInput(other, analysis, [.1, 3], 10).coordinates).toEqual([0, 3]);
  });
  it('非表示や全空間では移動を変えず、原点吸着は最優先で維持する', () => {
    const scene = createEigenScene([[1, 0], [0, 2]]), analysis = analyzeEigenMap(scene.definition);
    const hidden = { ...scene, showEigenspace: false };
    expect(snapEigenInput(hidden, analysis, [3, .1], 10).coordinates).toEqual([3, .1]);
    for (const s of [scene, hidden]) expect(snapEigenInput(s, analysis, [.1, .1], 10).snapKind).toBe('origin');
    const whole = createEigenScene([[2, 0], [0, 2]]);
    expect(snapEigenInput(whole, analyzeEigenMap(whole.definition), [1, 2], 10).coordinates).toEqual([1, 2]);
  });
  it('斜め空間へ吸着した入力と像を同じ解析から検算する', () => {
    const scene = createEigenScene(), analysis = analyzeEigenMap(scene.definition);
    const preview = snapEigenInput(scene, analysis, [2, -1.9], 10).coordinates;
    const result = analyzeEigenInput(analysis, preview, 0);
    expect(result.selectionRelation).toBe('member');
    expect(result.eigenvectorStatus).toBe('eigenvector');
    expect(result.imageVector![0]).toBeCloseTo(preview[0], 12);
    expect(scene.input).toEqual([2, 1]); // previewの取消しでは確定状態を変えない。
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

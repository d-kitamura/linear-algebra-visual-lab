import { describe, expect, it } from 'vitest';
import { analyzeEigenInput, analyzeEigenMap } from '../../src/domain';
import { DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';
import { applyEigenPolynomialExample, createEigenPolynomialScene, eigenPolynomialMatrix, eigenPolynomialRule, EIGEN_POLYNOMIAL_EXAMPLES } from '../../src/labs/eigenspace/eigenPolynomial';
import { createEigenScene, editEigenMatrix, setEigenInput, snapEigenInput, snapEigenSpaceInput } from '../../src/labs/eigenspace/eigenScene';
import { createEigenWorkspace, currentEigenSlot, resetEigenWorkspace, selectEigenDimension, selectEigenKind, updateEigenSlot } from '../../src/labs/eigenspace/eigenWorkspace';

describe('12.5 多項式の自己写像', () => {
  it('既定行列・入力は契約どおりで、0D多項式を作らない', () => {
    const w = createEigenWorkspace();
    expect(Object.keys(w.slots)).toHaveLength(4);
    expect(Object.keys(w.polynomialSlots)).toEqual(['1', '2', '3']);
    for (const n of [1, 2, 3] as const) {
      const scene = w.polynomialSlots[n].scene;
      expect(scene.kind).toBe('polynomial');
      expect(scene.input).toEqual(Array(n).fill(1));
      expect(scene.showEigenspace).toBe(false);
      expect(analyzeEigenMap(scene.definition).realEigenvalues.map((r) => r.value)).toEqual(n === 1 ? [2] : Array.from({ length: n }, (_, i) => i));
    }
    expect(() => createEigenScene([], 'polynomial')).toThrow();
    expect(() => eigenPolynomialMatrix('derivative', 0 as 1)).toThrow();
  });
  it('全次元・全例で同じ空間への行列作用と独立した多項式計算が一致する', () => {
    const evaluate = (coefficients: readonly number[], x: number) => coefficients.reduce((v, b, i) => v + b * x ** i, 0);
    for (const n of [1, 2, 3] as const) for (const [example] of EIGEN_POLYNOMIAL_EXAMPLES) {
      const input = [1, 2, 3].slice(0, n);
      const scene = applyEigenPolynomialExample(setEigenInput(createEigenPolynomialScene(n), input), example);
      expect(scene.definition.dimension).toBe(n);
      expect(scene.definition.matrix).toHaveLength(n);
      scene.definition.matrix.forEach((row) => expect(row).toHaveLength(n));
      const image = analyzeEigenInput(analyzeEigenMap(scene.definition), input).imageVector!;
      for (const x of [-2, .5, 3]) {
        const derivative = input.slice(1).reduce((v, b, i) => v + (i + 1) * b * x ** i, 0);
        const expected = example === 'derivative' ? derivative : example === 'degree' ? x * derivative : evaluate(input, x + 1);
        expect(evaluate(image, x)).toBeCloseTo(expected, 12);
      }
    }
  });
  it('微分は重根0・定数の空間、xDは次数、平行移動は重根1・定数の空間', () => {
    for (const n of [1, 2, 3] as const) for (const [example] of EIGEN_POLYNOMIAL_EXAMPLES) {
      const analysis = analyzeEigenMap(applyEigenPolynomialExample(createEigenPolynomialScene(n), example).definition);
      expect(analysis.realEigenvalues.map((r) => r.value)).toEqual(example === 'degree' ? Array.from({ length: n }, (_, i) => i) : [example === 'derivative' ? 0 : 1]);
      for (const root of analysis.realEigenvalues) {
        expect(root.algebraicMultiplicity).toBe(example === 'degree' ? 1 : n);
        expect(root.eigenspace?.dimension).toBe(1);
        const expected = Array(n).fill(0); expected[example === 'degree' ? root.value : 0] = 1;
        expect(root.eigenspace?.basis[0].map(Math.abs)).toEqual(expected);
      }
    }
  });
  it('例は入力と表示を保持し、手動編集後に古い規則を表示しない', () => {
    const initial = { ...setEigenInput(createEigenPolynomialScene(3), [4, -1, 2]), showEigenspace: true };
    const example = applyEigenPolynomialExample(initial, 'derivative');
    expect(example.input).toBe(initial.input); expect(example.showEigenspace).toBe(true);
    expect(eigenPolynomialRule(example)).toBe('derivative');
    expect(eigenPolynomialRule(editEigenMatrix(example, 0, 0, 7))).toBeNull();
    expect(eigenPolynomialRule(createEigenPolynomialScene(1))).toBe('twice');
    for (const example of ['derivative', 'degree'] as const) expect(eigenPolynomialRule(applyEigenPolynomialExample(createEigenPolynomialScene(1), example))).toBe('zero');
    const coordinate = createEigenScene();
    expect(applyEigenPolynomialExample(coordinate, 'derivative')).toBe(coordinate);
  });
  it('係数図の吸着から多項式の固有ベクトル判定へ接続する', () => {
    const s2 = { ...createEigenPolynomialScene(2), showEigenspace: true };
    const a2 = analyzeEigenMap(s2.definition);
    const u2 = snapEigenInput(s2, a2, [.1, 2], 10).coordinates;
    expect(analyzeEigenInput(a2, u2).eigenvectorStatus).toBe('eigenvector');
    const s3 = { ...applyEigenPolynomialExample(createEigenPolynomialScene(3), 'derivative'), showEigenspace: true };
    const a3 = analyzeEigenMap(s3.definition);
    const u3 = snapEigenSpaceInput(s3, a3, [2, .1, .1], .3).coordinates;
    expect(u3).toEqual([2, 0, 0]);
    expect(analyzeEigenInput(a3, u3).imageVector).toEqual([0, 0, 0]);
    expect(analyzeEigenInput(a3, u3).eigenvectorStatus).toBe('eigenvector');
  });
});

describe('12.5 種別別の教材状態とReset', () => {
  it('有効次元は維持し、0Dからは直前の多項式次元へ戻る', () => {
    let w = createEigenWorkspace();
    w = selectEigenKind(selectEigenDimension(w, 0), 'polynomial');
    expect(w.dimension).toBe(2);
    expect(selectEigenDimension(w, 0)).toBe(w);
    w = selectEigenDimension(w, 3);
    w = selectEigenDimension(selectEigenKind(w, 'coordinate'), 0);
    expect(selectEigenKind(w, 'polynomial').dimension).toBe(3);
    w = selectEigenKind(selectEigenDimension(w, 1), 'polynomial');
    expect(w.dimension).toBe(1);
  });
  it('同次元の数ベクトル・多項式と別次元の表示を混ぜず、現在場面だけResetする', () => {
    const initial = createEigenWorkspace();
    let w = updateEigenSlot(initial, 3, (s) => ({ ...s, scene: setEigenInput(s.scene, [9, 8, 7]) }));
    w = selectEigenDimension(selectEigenKind(w, 'polynomial'), 3);
    w = updateEigenSlot(w, 3, (s) => ({ scene: applyEigenPolynomialExample(setEigenInput(s.scene, [1, 2, 3]), 'translation'),
      view: { ...s.view, camera: { ...DEFAULT_3D_CAMERA_STATE, zoom: 2 } } }));
    const before = w;
    w = selectEigenKind(selectEigenKind(w, 'coordinate'), 'polynomial');
    expect(currentEigenSlot(w)).toBe(before.polynomialSlots[3]);
    w = resetEigenWorkspace(w, initial);
    expect(currentEigenSlot(w)).toBe(initial.polynomialSlots[3]);
    expect(w.slots[3]).toBe(before.slots[3]);
    expect(w.polynomialSlots[2]).toBe(before.polynomialSlots[2]);
    expect(w.lastPolynomialDimension).toBe(3);
  });
});

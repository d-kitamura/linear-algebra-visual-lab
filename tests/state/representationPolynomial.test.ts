import { describe, expect, it } from 'vitest';
import { analyzeRepresentationMatrix, analyzeLinearMapLinearity, applyLinearMap } from '../../src/domain';
import { createRepresentationWorkspace, activeRepresentationScene, activeRepresentationViews, selectRepresentationKind, selectRepresentationDimension, updateActiveRepresentationScene, resetRepresentationWorkspace, representationChangeId } from '../../src/labs/representation-matrix/representationWorkspace';
import { createPolynomialMapExample, openPolynomialMapExample, polynomialMapRule } from '../../src/labs/representation-matrix/representationPolynomialExamples';
import { editRepresentationValue, moveRepresentationBasis } from '../../src/labs/representation-matrix/representationMatrixState';

describe('11.6 多項式の係数行列と場面分離', () => {
  const evaluate = (coefficients: readonly number[], x: number) => coefficients.reduce((sum, b, degree) => sum + b * x ** degree, 0);
  for (const example of ['derivative', 'multiply-x', 'translation'] as const) it(example + 'の規則・線形性・座標経路を確認する', () => {
    const s = createPolynomialMapExample(example);
    const r = analyzeRepresentationMatrix(s.definition, s.source, s.target, s.input);
    expect(r.status).toBe('ready');
    expect(r.representation!.imageViaCoordinates).toEqual(r.imageVector);
    const linear = analyzeLinearMapLinearity(s.definition, s.input, s.input.map((_, i) => -i - 1), -2.5);
    expect(linear.preservesAddition).toBe(true);
    expect(linear.preservesScalarMultiplication).toBe(true);
    const arbitrary = s.input.map((_, i) => i * 3 - 2);
    const image = applyLinearMap(s.definition, arbitrary);
    for (const x of [-2, 0, 0.5, 3]) {
      const expected = example === 'derivative' ? arbitrary.reduce((sum, b, i) => sum + (i === 0 ? 0 : i * b * x ** (i - 1)), 0)
        : example === 'multiply-x' ? x * evaluate(arbitrary, x) : evaluate(arbitrary, x + 1);
      expect(evaluate(image, x)).toBeCloseTo(expected, 10);
    }
    expect(polynomialMapRule(s)).toBe(example);
    expect(polynomialMapRule(editRepresentationValue(s, 'matrix', 0, 0, 17))).toBeNull();
  });
  it('D-092の微分例を再現し、基底変更でも入力と像は不変', () => {
    const s = createPolynomialMapExample('derivative');
    const r = analyzeRepresentationMatrix(s.definition, s.source, s.target, s.input);
    expect(r.representation!.matrix).toEqual([[0, 1, -2], [0, 0, 2]]);
    expect(r.representation!.inputCoordinates).toEqual([1, 2, 3]);
    expect(r.representation!.imageCoordinates).toEqual([-4, 6]);
    expect(r.imageVector).toEqual([2, 6]);
    const next = moveRepresentationBasis(s, 'target', 1, -1);
    expect(next.definition).toBe(s.definition);
    expect(next.input).toBe(s.input);
    const changed = analyzeRepresentationMatrix(next.definition, next.source, next.target, next.input);
    expect(changed.imageVector).toEqual(r.imageVector);
    expect(changed.representation!.imageCoordinates).toEqual([6, -4]);
  });
  it('36場面が独立して有効であり、種別を切り替えても編集は保持', () => {
    let w = createRepresentationWorkspace();
    expect(Object.keys(w.scenes)).toHaveLength(36);
    for (const s of Object.values(w.scenes)) expect(analyzeRepresentationMatrix(s.definition, s.source, s.target, s.input).status).toBe('ready');
    const numeric = activeRepresentationScene(w);
    w = selectRepresentationKind(w, 'source', 'polynomial');
    w = updateActiveRepresentationScene(w, (s) => editRepresentationValue(s, 'input', 0, 0, 11));
    const mixed = activeRepresentationScene(w);
    w = selectRepresentationKind(w, 'source', 'coordinate');
    expect(activeRepresentationScene(w)).toBe(numeric);
    w = selectRepresentationKind(w, 'source', 'polynomial');
    expect(activeRepresentationScene(w)).toBe(mixed);
    const reset = resetRepresentationWorkspace(w);
    expect(activeRepresentationScene(reset).sourceKind).toBe('polynomial');
    expect(activeRepresentationScene(reset).targetKind).toBe('coordinate');
    expect(activeRepresentationScene(reset).input).toEqual([3, 2]);
    expect(reset.scenes['2-to-2']).toBe(numeric);
  });
  it('例は指定先の多項式場面だけ置換し、他場面・恒等写像状態を維持', () => {
    const w = createRepresentationWorkspace();
    const next = openPolynomialMapExample(w, 'derivative');
    expect(activeRepresentationScene(next)).toEqual(createPolynomialMapExample('derivative'));
    expect(next.scenes['2-to-2']).toBe(w.scenes['2-to-2']);
    expect(next.changeScenes).toBe(w.changeScenes);
    expect(activeRepresentationViews(next).cameras.source).toBeNull();
  });
  it('恒等写像の種別は左右同時に切替え、数ベクトルと多項式を別保存', () => {
    let w = { ...createRepresentationWorkspace(), mode: 'basis-change' as const };
    const original = activeRepresentationScene(w);
    w = selectRepresentationKind(w, 'target', 'polynomial') as typeof w;
    expect(representationChangeId(w)).toBe('polynomial-2');
    expect(activeRepresentationScene(w).sourceKind).toBe('polynomial');
    expect(activeRepresentationScene(w).targetKind).toBe('polynomial');
    w = selectRepresentationDimension(w, 'source', 3) as typeof w;
    expect(activeRepresentationScene(w).definition.matrix).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    w = { ...w, changeDirections: { ...w.changeDirections, 'polynomial-3': 'C-to-B' } };
    w = selectRepresentationKind(w, 'source', 'coordinate') as typeof w;
    expect(w.changeDirections[3]).toBe('B-to-C');
    w = selectRepresentationDimension(w, 'source', 2) as typeof w;
    expect(activeRepresentationScene(w)).toBe(original);
    w = selectRepresentationKind(w, 'source', 'polynomial') as typeof w;
    const active = activeRepresentationScene(w);
    expect(updateActiveRepresentationScene(w, (s) => ({ ...s, targetKind: 'coordinate' }))).toBe(w);
    expect(activeRepresentationScene(resetRepresentationWorkspace(w)).sourceKind).toBe('polynomial');
    expect(active.definition.matrix).toEqual([[1, 0], [0, 1]]);
    const identityLinearity = analyzeLinearMapLinearity(active.definition, active.input, [2, -1], 3);
    expect(identityLinearity.preservesAddition && identityLinearity.preservesScalarMultiplication).toBe(true);
  });
});

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { analyzeDiagonalization, analyzeDiagonalizationInput, reorderDiagonalization } from '../../src/domain';
import { DiagonalizationLab } from '../../src/labs/diagonalization/DiagonalizationLab';
import { DiagonalizationPanel } from '../../src/labs/diagonalization/DiagonalizationPanels';
import { applyDiagonalizationPolynomialExample, createDiagonalizationPolynomialScene, editDiagonalizationMatrix, setDiagonalizationInput } from '../../src/labs/diagonalization/diagonalizationScene';
import { createDiagonalizationWorkspace, diagonalizationCurrentSlot, selectDiagonalizationKind, selectDiagonalizationDimension, resetDiagonalizationWorkspace, updateDiagonalizationSlot } from '../../src/labs/diagonalization/diagonalizationWorkspace';
import { eigenPolynomialRule } from '../../src/labs/eigenspace/eigenPolynomial';
import { DEFAULT_3D_CAMERA_STATE } from '../../src/sharing';

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const noop = () => {};

describe('13.5 多項式の対角化', () => {
  it.each([1, 2, 3] as const)('%iDの初期状態は自己写像・標準係数と固有基底座標を対応させる', (n) => {
    const scene = createDiagonalizationPolynomialScene(n);
    const analysis = analyzeDiagonalization(scene.definition);
    const input = analyzeDiagonalizationInput(analysis, scene.input);
    expect(scene.input).toEqual(Array(n).fill(1)); expect(scene.showEigenspace).toBe(false);
    expect(analysis.status).toBe('ready'); expect(input.status).toBe('ready');
    expect(input.imageVector).toEqual(n === 1 ? [2] : Array.from({ length: n }, (_, i) => i));
    expect(input.coordinates?.inputViaCoordinates).toEqual(scene.input);
    const html = renderToStaticMarkup(createElement(DiagonalizationLab, { initialScene: scene, active: n !== 3 }));
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/aria-pressed=/g)).toHaveLength(5);
    expect(html).not.toContain('>0D</button>');
    expect(html).toContain('標準単項式基底での係数');
    expect(html).toContain('図は関数グラフではなく係数空間');
    expect(html).toContain(`入力多項式の係数b${n - 1}`);
    expect(html).toContain('多項式の変換例'); expect(html).toContain('このLabの共有機能は13.6');
    if (n < 3) { expect(html).toContain('b₀'); expect(html).toContain('c₁'); }
  });
  it.each([1, 2, 3] as const)('%iDの微分・xf′・平行移動は1D例外も含め独立した既知の作用を満たす', (n) => {
    const original = setDiagonalizationInput(createDiagonalizationPolynomialScene(n), [2, 3, 4].slice(0, n));
    for (const example of ['derivative', 'degree', 'translation'] as const) {
      const scene = applyDiagonalizationPolynomialExample(original, example);
      const analysis = analyzeDiagonalization(scene.definition), input = analyzeDiagonalizationInput(analysis, scene.input);
      expect(scene.input).toBe(original.input); expect(scene.order).toBeNull();
      expect(analysis.status).toBe(n === 1 || example === 'degree' ? 'ready' : 'not-diagonalizable');
      const expected = example === 'derivative' ? [n > 1 ? 3 : 0, n > 2 ? 8 : 0, 0]
        : example === 'degree' ? [0, 3, 8] : [2 + (n > 1 ? 3 : 0) + (n > 2 ? 4 : 0), 3 + (n > 2 ? 8 : 0), 4];
      expect(input.imageVector).toEqual(expected.slice(0, n));
      if (n > 1 && example !== 'degree') expect(input.coordinates).toBeNull();
    }
  });
  it('7場面の行列・入力・列順・表示・左右視点を独立保持し、現在場面だけResetする', () => {
    const initial = createDiagonalizationWorkspace();
    let workspace = selectDiagonalizationKind(selectDiagonalizationDimension(initial, 3), 'polynomial');
    workspace = updateDiagonalizationSlot(workspace, 3, (s) => ({ ...s,
      scene: { ...setDiagonalizationInput(s.scene, [2, 3, 4]), order: [2, 0, 1], showEigenspace: true },
      views: { reference: { ...s.views.reference, camera: DEFAULT_3D_CAMERA_STATE }, eigenbasis: { ...s.views.eigenbasis, camera: { ...DEFAULT_3D_CAMERA_STATE, zoom: 2 } } } }));
    expect(workspace.slots).toBe(initial.slots);
    expect(diagonalizationCurrentSlot(workspace).scene.input).toEqual([2, 3, 4]);
    expect(workspace.polynomialSlots[2]).toBe(initial.polynomialSlots[2]);
    const returned = selectDiagonalizationKind(selectDiagonalizationDimension(selectDiagonalizationKind(workspace, 'coordinate'), 0), 'polynomial');
    expect(returned.dimension).toBe(3); expect(diagonalizationCurrentSlot(returned)).toBe(workspace.polynomialSlots[3]);
    expect(selectDiagonalizationDimension(returned, 0)).toBe(returned);
    const reset = resetDiagonalizationWorkspace(returned, initial);
    expect(reset.polynomialSlots[3]).toBe(initial.polynomialSlots[3]); expect(reset.slots).toBe(initial.slots);
    expect(reset.polynomialSlots[1]).toBe(workspace.polynomialSlots[1]);
    expect(() => createDiagonalizationWorkspace({ ...initial.slots[0].scene, kind: 'polynomial' })).toThrow();
  });
  it('非自明な固有多項式の列順変更でも多項式自体と像を保持する', () => {
    const scene = editDiagonalizationMatrix(createDiagonalizationPolynomialScene(2), 0, 1, 1);
    const analysis = analyzeDiagonalization(scene.definition), before = analyzeDiagonalizationInput(analysis, [2, 3]);
    const swapped = reorderDiagonalization(analysis, [1, 0]), after = analyzeDiagonalizationInput(swapped, [2, 3]);
    expect(before.coordinates?.inputCoordinates).toEqual([-1, 3]);
    expect(after.coordinates?.inputCoordinates).toEqual([3, -1]);
    expect(after.inputVector).toEqual(before.inputVector); expect(after.imageVector).toEqual([3, 3]);
    expect(eigenPolynomialRule(scene)).toBeNull();
    const html = renderToStaticMarkup(createElement(DiagonalizationPanel, { tab: 'basis', kind: 'polynomial', analysis: swapped, input: after, onSwap: noop }));
    expect(html).toContain('aria-label="1 + x"');
    expect(html).toContain('basis-script-symbol');
    expect(html).not.toContain('≈');
  });
  it('多項式の等式と係数列の等式を分離し、原点0Dや他Labの実装を流用しない', () => {
    const source = read('src/labs/diagonalization/DiagonalizationPanels.tsx');
    expect(source).toContain('<EigenCoordinateName kind={kind} name={`p${i + 1}`} />');
    expect(source).toContain('<EigenPolynomialValue coefficients={input.inputVector} />');
    expect(source).toContain('<EigenCoordinateName kind={kind} mapped /> = <Vector name="A" />');
    expect(source).toContain('{!polynomial && <> = <Vector name="P" />');
    const space = read('src/labs/diagonalization/DiagonalizationSpace.tsx');
    expect(space).toContain("['b₀', 'b₁', 'b₂']");
    expect(space).toContain("scene.kind === 'polynomial' ? POLYNOMIAL_AXES");
    const lab = read('src/labs/diagonalization/DiagonalizationLab.tsx');
    expect(lab).toContain('fieldset key={editorRevision}');
    expect(lab).toContain('setEditorRevision((r) => r + 1)');
    expect(lab).toContain('kind={scene.kind}');
  });
});

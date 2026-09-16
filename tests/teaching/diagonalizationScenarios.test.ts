import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIAGONALIZATION_TEACHING_SCENARIOS as examples } from '../../src/teaching/diagonalizationScenarios';
import { analyzeDiagonalization, analyzeDiagonalizationInput, reorderDiagonalization } from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl } from '../../src/sharing';
import { createDiagonalizationShareState, restoreDiagonalizationWorkspace } from '../../src/labs/diagonalization/diagonalizationSharing';
import { diagonalizationCurrentSlot, resetDiagonalizationWorkspace, updateDiagonalizationSlot } from '../../src/labs/diagonalization/diagonalizationWorkspace';
import { setDiagonalizationInput } from '../../src/labs/diagonalization/diagonalizationScene';

const guide = readFileSync(new URL('../../docs/DIAGONALIZATION_TEACHING_GUIDE.md', import.meta.url), 'utf8');
const base = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';
// APIの積・逆行列を期待値生成に使わず、独立に列・座標の等式も確認する。
const multiply = (a: readonly (readonly number[])[], v: readonly number[]) => a.map((row) => row.reduce((sum, x, i) => sum + x * v[i], 0));
function near(actual: readonly number[], expected: readonly number[]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 10));
}
describe('13.7 対角化Labの18授業例', () => {
  it.each(examples)('$id の独立期待値・URL・共有時Reset', (example) => {
    const initial = restoreDiagonalizationWorkspace(example.state), slot = diagonalizationCurrentSlot(initial);
    const canonical = analyzeDiagonalization(slot.scene.definition);
    const analysis = canonical.basis && slot.scene.order ? reorderDiagonalization(canonical, slot.scene.order) : canonical;
    const expected = example.expected, input = analyzeDiagonalizationInput(analysis, slot.scene.input);
    expect(analysis.status).toBe(expected.p ? 'ready' : 'not-diagonalizable');
    expect(analysis.criterion.status).toBe(expected.p ? 'satisfied' : 'not-satisfied');
    expect(analysis.eigenAnalysis.realEigenvalues).toHaveLength(expected.roots.length);
    expected.roots.forEach((root, i) => {
      const actual = analysis.eigenAnalysis.realEigenvalues[i];
      expect(actual.value).toBeCloseTo(root.value, 12);
      expect(actual.algebraicMultiplicity).toBe(root.multiplicity);
      expect(actual.eigenspace?.dimension).toBe(root.dimension);
    });
    near(input.imageVector!, expected.image);
    near(multiply(slot.scene.definition.matrix, slot.scene.input), expected.image);
    if (expected.p) {
      expect(analysis.basis).not.toBeNull(); expect(input.coordinates).not.toBeNull();
      expect(analysis.basis!.p).toHaveLength(expected.p.length);
      expected.p.forEach((row, i) => near(analysis.basis!.p[i], row));
      expected.d!.forEach((row, i) => near(analysis.basis!.d[i], row));
      near(input.coordinates!.inputCoordinates, expected.c!);
      near(input.coordinates!.imageCoordinatesViaDiagonal, expected.dc!);
      near(input.coordinates!.imageCoordinates, expected.dc!);
      near(multiply(expected.p, expected.c!), slot.scene.input);
      near(multiply(expected.p, expected.dc!), expected.image);
      near(multiply(expected.d!, expected.c!), expected.dc!);
      for (let j = 0; j < expected.p.length; j++) {
        const column = expected.p.map((row) => row[j]);
        near(multiply(slot.scene.definition.matrix, column), column.map((v) => v * expected.d![j][j]));
      }
    } else {
      expect(analysis.basis).toBeNull(); expect(input.coordinates).toBeNull();
    }
    const url = buildShareUrl(base, example.state);
    expect(guide).toContain(`(${url}) <!-- ${example.id} -->`);
    expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state: example.state });
    expect(createDiagonalizationShareState(slot)).toEqual(example.state);
    expect(url.length).toBeLessThanOrEqual(2048);
    expect(slot.scene.showEigenspace).toBe(false);
    const edited = updateDiagonalizationSlot(initial, initial.dimension, (s) => ({ ...s, scene: setDiagonalizationInput(s.scene, s.scene.input.map(() => 7)) }));
    expect(diagonalizationCurrentSlot(resetDiagonalizationWorkspace(edited, initial))).toEqual(slot);
  });
  it('全7場面・独立ID・授業例と数値境界の分離', () => {
    expect(examples).toHaveLength(18);
    expect(new Set(examples.map((e) => e.id)).size).toBe(18);
    expect(new Set(examples.map(({ state: s }) => s.dim === 0 ? 'coordinate-0' : `${s.kind}-${s.dim}`)).size).toBe(7);
    expect(guide.match(/https:\/\/d-kitamura.github.io\/linear-algebra-visual-lab\/\?state=/g)).toHaveLength(18);
    expect(guide).toContain('数値境界の検証は授業例と分ける');
    expect(guide).toContain('実ブラウザの390pxレイアウト');
  });
  it('順序変更だけの2例は同じ入力・像でDの成分順を変える', () => {
    const [a, b] = examples;
    expect(a.state.dim !== 0 && a.state.input).toEqual(b.state.dim !== 0 && b.state.input);
    expect(a.expected.image).toEqual(b.expected.image);
    expect(a.expected.d).not.toEqual(b.expected.d);
    expect(a.expected.dc).toEqual([...b.expected.dc!].reverse());
  });
});

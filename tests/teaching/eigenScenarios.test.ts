import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EIGEN_TEACHING_SCENARIOS as examples } from '../../src/teaching/eigenScenarios';
import { analyzeEigenInput, analyzeEigenMap } from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl } from '../../src/sharing';
import { restoreEigenWorkspace } from '../../src/labs/eigenspace/eigenSharing';
import { currentEigenSlot, resetEigenWorkspace, updateEigenSlot } from '../../src/labs/eigenspace/eigenWorkspace';
import { setEigenInput } from '../../src/labs/eigenspace/eigenScene';
import { EigenspaceLab } from '../../src/labs/eigenspace/EigenspaceLab';

const guide = readFileSync(new URL('../../docs/EIGENSPACE_TEACHING_GUIDE.md', import.meta.url), 'utf8');
const base = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';
describe('12.8 固有値Labの18授業例', () => {
  it.each(examples)('$id の独立期待値・URL・共有時Reset', (example) => {
    const initial = restoreEigenWorkspace(example.state), { scene } = currentEigenSlot(initial);
    const analysis = analyzeEigenMap(scene.definition), input = analyzeEigenInput(analysis, scene.input);
    expect(analysis.status).toBe(example.expected.roots.length ? 'ready' : 'no-real-eigenvalues');
    expect(analysis.characteristicCoefficients).toEqual(example.expected.coefficients);
    expect(input.imageVector).toEqual(example.expected.image);
    expect(input.eigenvectorStatus).toBe(example.expected.inputStatus);
    expect(analysis.realEigenvalues).toHaveLength(example.expected.roots.length);
    example.expected.roots.forEach((root, i) => {
      const actual = analysis.realEigenvalues[i];
      expect(actual.value).toBeCloseTo(root.value, 12);
      expect(actual.algebraicMultiplicity).toBe(root.multiplicity);
      expect(actual.eigenspace?.dimension).toBe(root.basis.length);
      // 正規化・符号の違いでは失敗させず、独立に指定した基底が同じ空間にあるか検証。
      for (const q of root.basis) for (let j = 0; j < q.length; j++) {
        expect(scene.definition.matrix[j].reduce((sum, a, k) => sum + a * q[k], 0)).toBeCloseTo(root.value * q[j], 12);
        const projection = actual.eigenspace!.basis.reduce((sum, b) => sum + b[j] * b.reduce((dot, v, k) => dot + v * q[k], 0), 0);
        expect(projection).toBeCloseTo(q[j], 10);
      }
    });
    const url = buildShareUrl(base, example.state);
    expect(guide).toContain(`(${url}) <!-- ${example.id} -->`);
    expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state: example.state });
    expect(url.length).toBeLessThanOrEqual(2048);
    expect(scene.showEigenspace).toBe(false);
    const changed = updateEigenSlot(initial, initial.dimension, (slot) => ({ ...slot, scene: setEigenInput(slot.scene, slot.scene.input.map(() => 7)) }));
    expect(currentEigenSlot(resetEigenWorkspace(changed, initial))).toEqual(currentEigenSlot(initial));
  });
  it('独立ID、全7場面、資料限定での観察課題と境界検証の分離を維持する', () => {
    expect(examples).toHaveLength(18);
    expect(new Set(examples.map((e) => e.id)).size).toBe(18);
    expect(new Set(examples.map((e) => e.state.dim === 0 ? 'coordinate-0' : `${e.state.kind}-${e.state.dim}`)).size).toBe(7);
    expect(guide.match(/https:\/\/d-kitamura.github.io\/linear-algebra-visual-lab\/\?state=/g)).toHaveLength(18);
    expect(guide).toContain('数値境界の検証は授業例と分ける');
    expect(guide).toContain('実ブラウザの390pxレイアウト');
    const html = renderToStaticMarkup(createElement(EigenspaceLab, { active: false }));
    expect(html).not.toContain('授業用の代表例と観察課題');
    expect(html).not.toContain('現在の状態の読み上げ要約');
  });
});

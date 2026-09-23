import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { INNER_PRODUCT_TEACHING_SCENARIOS as examples } from '../../src/teaching/innerProductScenarios';
import { analyzeGramSchmidt } from '../../src/domain';
import { buildShareUrl, readShareStateFromUrl } from '../../src/sharing';
import { createInnerProductShareState, restoreInnerProductWorkspace } from '../../src/labs/inner-product/innerProductSharing';
import { activeInnerSlot, resetInnerProductWorkspace, updateActiveInnerSlot } from '../../src/labs/inner-product/innerProductWorkspace';
import { analyzeInnerProductScene, createInnerProductScene, innerProductMetric, innerProductPlots } from '../../src/labs/inner-product/innerProductScene';
import { innerDisplayPlots } from '../../src/labs/inner-product/innerProductCoordinates';

const guide = readFileSync(new URL('../../docs/INNER_PRODUCT_TEACHING_GUIDE.md', import.meta.url), 'utf8');
const base = 'https://d-kitamura.github.io/linear-algebra-visual-lab/';
const near = (a: readonly number[], b: readonly number[]) => { expect(a).toHaveLength(b.length); a.forEach((x, i) => expect(x).toBeCloseTo(b[i], 12)); };
// 解析のG/Cを使わず、積分の単項式公式から期待する内積を検算する。
const product = (a: readonly number[], b: readonly number[], integral: boolean) => a.reduce((sum, x, i) => sum + b.reduce((s, y, j) =>
  s + x * y * (integral ? (i + j) % 2 ? 0 : 2 / (i + j + 1) : i === j ? 1 : 0), 0), 0);

describe('14.8 内積Labの18授業例', () => {
  it.each(examples)('$id の独立期待値・公開URL・共有時Reset', example => {
    const initial = restoreInnerProductWorkspace(example.state), slot = activeInnerSlot(initial), scene = slot.scene;
    const gs = analyzeGramSchmidt(innerProductMetric(scene.dimension, scene.metric), scene.inputs);
    const expected = example.expected;
    expect(gs.status).toBe('complete'); expect(gs.basisOfSpan).toBe(true); expect(gs.basisOfAmbient).toBe(expected.ambient);
    expect(gs.accepted).toHaveLength(expected.q.length);
    expect(gs.steps.filter(s => s.outcome.startsWith('skipped')).map(s => s.sourceId)).toEqual(expected.skipped);
    expected.q.forEach((q, i) => near(gs.accepted[i].q, q));
    expected.q.forEach((q, i) => expected.q.forEach((r, j) => expect(product(q, r, scene.metric === 'integral')).toBeCloseTo(Number(i === j), 12)));
    for (const residual of expected.residuals ?? []) {
      const step = gs.steps.find(s => s.sourceId === residual.id)!;
      expect(step.residual?.numeric.status).toBe('ready');
      if (step.residual?.numeric.status === 'ready') near(step.residual.numeric.value, residual.value);
      expect(step.normSquared?.numeric.status).toBe('ready');
      if (step.normSquared?.numeric.status === 'ready') expect(step.normSquared.numeric.value).toBeCloseTo(residual.normSquared, 12);
    }
    if (expected.pair) {
      const pair = analyzeInnerProductScene(scene)!;
      expect(pair.innerProduct?.numeric).toEqual({ status: 'ready', value: expected.pair.product });
      for (const [i, norm] of [pair.uNorm, pair.vNorm].entries()) { expect(norm?.status).toBe('ready'); if (norm?.status === 'ready') expect(norm.value).toBeCloseTo(expected.pair.norms[i], 12); }
      if (expected.pair.angle === null) expect(pair.angle?.status).toBe('undefined-zero-vector');
      else { expect(pair.angle?.status).toBe('ready'); if (pair.angle?.status === 'ready') expect(pair.angle.degrees).toBeCloseTo(expected.pair.angle, 10); }
      const projection = pair.projection!;
      expect(projection.vector.numeric.status).toBe('ready'); expect(projection.residual.numeric.status).toBe('ready');
      if (projection.vector.numeric.status === 'ready') near(projection.vector.numeric.value, expected.pair.p);
      if (projection.residual.numeric.status === 'ready') near(projection.residual.numeric.value, expected.pair.r);
      near(expected.pair.p.map((x, i) => x + expected.pair!.r[i]), pair.v);
      expect(product(pair.u, expected.pair.r, scene.metric === 'integral')).toBeCloseTo(0, 12);
    }
    const url = buildShareUrl(base, example.state);
    expect(guide).toContain(`(${url}) <!-- ${example.id} -->`);
    expect(url.length).toBeLessThanOrEqual(2048);
    expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state: example.state });
    expect(createInnerProductShareState(slot)).toEqual(example.state);
    const changed = updateActiveInnerSlot(initial, s => ({ ...s, scene: { ...s.scene, mode: s.scene.mode === 'pair' ? 'gram-schmidt' : 'pair' } }));
    expect(activeInnerSlot(resetInnerProductWorkspace(changed, initial))).toEqual(slot);
  });
  it('7場面・独立ID・通常教材と数値境界・既存例を区別する', () => {
    expect(examples).toHaveLength(18); expect(new Set(examples.map(e => e.id)).size).toBe(18);
    expect(new Set(examples.map(({ state: s }) => s.dim === 0 ? 'coordinate-0' : `${s.kind}-${s.dim}`)).size).toBe(7);
    expect(guide.match(/https:\/\/d-kitamura.github.io\/linear-algebra-visual-lab\/\?state=/g)).toHaveLength(18);
    for (const phrase of ['既存6Labの88例は変更しません', '計106例', '数値境界の検証は授業例と分ける', '実ブラウザの390pxレイアウト', 'D-132', 'D-133']) expect(guide).toContain(phrase);
    expect(examples[1].expected.q).not.toEqual(examples[2].expected.q);
  });
  it('授業例と分離した非零残差・成分消失・図だけの上限を検証する', () => {
    const metric = innerProductMetric(2);
    const tiny = analyzeGramSchmidt(metric, [{ id: 1, components: [1, 0] }, { id: 2, components: [1, 1e-12] }]);
    expect(tiny.status).toBe('complete'); expect(tiny.steps[1].outcome).toBe('accepted');
    expect(tiny.steps[1].residual?.numeric).toEqual({ status: 'ready', value: [0, 1e-12] });
    const hold = analyzeGramSchmidt(metric, [{ id: 1, components: [Number.MIN_VALUE, 1e6] }, { id: 2, components: [1, 0] }]);
    expect(hold.status).toBe('inconclusive'); expect(hold.basisOfSpan).toBeNull(); expect(hold.accepted).toHaveLength(0);
    const scene = { ...createInnerProductScene(1, 'polynomial'), inputs: [{ id: 1, components: [1e6] }] };
    const result = analyzeInnerProductScene(scene);
    expect(result?.status).toBe('complete'); expect(innerDisplayPlots(scene, innerProductPlots(scene, result)).safe).toBe(false);
    expect(scene.inputs[0].components).toEqual([1e6]);
  });
});

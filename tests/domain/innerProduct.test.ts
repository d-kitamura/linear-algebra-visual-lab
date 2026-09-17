import { describe, expect, it } from 'vitest';
import { analyzeGramSchmidt, analyzeInnerProductPair, createInnerProductMetric, fromInnerProductCoordinates,
  toInnerProductCoordinates, InvalidInnerProductInputError, type MetricDefinition, type OrderedInput, type Value } from '../../src/domain';
import { createInnerProductEngine } from '../../src/domain/innerProduct';
import { INNER_PRODUCT_BUDGET } from '../../src/domain/innerProductNumerics';

const metric = (dimension: MetricDefinition['dimension'], kind: MetricDefinition['metric'] = 'euclidean') => createInnerProductMetric({ dimension, metric: kind });
const inputs = (...vectors: number[][]): OrderedInput[] => vectors.map((components, i) => ({ id: i + 1, components }));
function value<T>(result: Value<T> | null): T {
  expect(result?.status).toBe('ready');
  if (result?.status !== 'ready') throw new Error('Expected ready value');
  return result.value;
}
const close = (a: readonly number[], b: readonly number[]) => {
  expect(a).toHaveLength(b.length);
  a.forEach((x, i) => expect(x).toBeCloseTo(b[i], 12));
};

describe('14.2 内積・射影', () => {
  it('初期2Dの独立期待値、向き、ノルム、45度', () => {
    const result = analyzeInnerProductPair(metric(2), [1, 1], [1, 0]);
    expect(result.status).toBe('complete');
    expect(result.innerProduct?.exact).toEqual({ numerator: 1n, denominator: 1n });
    expect(value(result.uNorm)).toBeCloseTo(Math.sqrt(2), 14);
    expect(value(result.vNorm)).toBe(1);
    expect(result.angle?.status).toBe('ready');
    if (result.angle?.status === 'ready') expect(result.angle.degrees).toBeCloseTo(45, 12);
    close(value(result.projection!.vector.numeric), [0.5, 0.5]);
    close(value(result.projection!.residual.numeric), [0.5, -0.5]);
  });
  it.each([[1, 1, 0], [1, -2, 180], [-2, 3, 180]])('1D u=%s, v=%sの符号と角度', (u, v, degrees) => {
    const result = analyzeInnerProductPair(metric(1), [u], [v]);
    expect(result.status).toBe('complete');
    expect(result.angle).toEqual({ status: 'ready', degrees });
    expect(value(result.projection!.vector.numeric)).toEqual([v]);
    expect(value(result.projection!.residual.numeric)).toEqual([0]);
  });
  it.each([[[0, 0], [2, 3]], [[2, 3], [0, 0]], [[0, 0], [0, 0]]])('零の角度を90度にしない', (u, v) => {
    const result = analyzeInnerProductPair(metric(2), u, v);
    expect(result.status).toBe('complete');
    expect(result.angle).toEqual({ status: 'undefined-zero-vector' });
    expect(value(result.innerProduct!.numeric)).toBe(0);
    expect(value(result.projection!.vector.numeric)).toEqual([0, 0]);
    expect(value(result.projection!.residual.numeric)).toEqual(v);
    expect(result.projection!.kind).toBe(u.every(x => x === 0) ? 'zero-subspace' : 'line');
  });
  it('0Dの暗黙の零を扱う', () => {
    const result = analyzeInnerProductPair(metric(0), [], []);
    expect(result.status).toBe('complete');
    expect(value(result.uNorm)).toBe(0);
    expect(result.angle?.status).toBe('undefined-zero-vector');
    expect(value(result.projection!.vector.numeric)).toEqual([]);
  });
  it('積分内積の1とx²は係数内積と異なる', () => {
    const integral = analyzeInnerProductPair(metric(3, 'integral'), [1, 0, 0], [0, 0, 1]);
    const coefficient = analyzeInnerProductPair(metric(3, 'coefficient'), [1, 0, 0], [0, 0, 1]);
    expect(integral.status).toBe('complete');
    expect(integral.innerProduct!.exact).toEqual({ numerator: 2n, denominator: 3n });
    close(value(integral.projection!.vector.numeric), [1 / 3, 0, 0]);
    close(value(integral.projection!.residual.numeric), [-1 / 3, 0, 1]);
    expect(value(coefficient.innerProduct!.numeric)).toBe(0);
    expect(value(coefficient.projection!.vector.numeric)).toEqual([0, 0, 0]);
  });
  it('MIN_VALUEの二乗が表示不能でもノルム・角度・射影を残す', () => {
    const result = analyzeInnerProductPair(metric(1), [Number.MIN_VALUE], [Number.MIN_VALUE]);
    expect(result.status).toBe('partial');
    expect(result.innerProduct!.exact.numerator).not.toBe(0n);
    expect(result.innerProduct!.numeric.status).toBe('unavailable');
    expect(value(result.uNorm)).toBe(Number.MIN_VALUE);
    expect(result.angle).toEqual({ status: 'ready', degrees: 0 });
    expect(value(result.projection!.vector.numeric)).toEqual([Number.MIN_VALUE]);
  });
  it('相殺する内積は丸めた積を足して決めない', () => {
    const result = analyzeInnerProductPair(metric(3), [1e6, 1e-200, 1e6], [1e6, 1e-200, -1e6]);
    expect(result.innerProduct!.exact.numerator).not.toBe(0n);
    expect(result.innerProduct!.numeric.status).toBe('unavailable');
  });
  it('対称性と分配法則を小さな整数の独立期待値で確認する', () => {
    const m = metric(2, 'integral');
    const ab = analyzeInnerProductPair(m, [1, 2], [3, 4]);
    const ba = analyzeInnerProductPair(m, [3, 4], [1, 2]);
    expect(ab.innerProduct!.exact).toEqual(ba.innerProduct!.exact);
    expect(value(ab.innerProduct!.numeric)).toBeCloseTo(34 / 3, 13);
    const combined = analyzeInnerProductPair(m, [1, 2], [4, 3]);
    const ac = analyzeInnerProductPair(m, [1, 2], [1, -1]);
    expect(value(combined.innerProduct!.numeric)).toBeCloseTo(value(ab.innerProduct!.numeric) + value(ac.innerProduct!.numeric), 13);
  });
});

describe('14.2 段階付きグラム・シュミット', () => {
  it('初期2Dの正規化・段階・基底条件', () => {
    const result = analyzeGramSchmidt(metric(2), inputs([1, 1], [1, 0]));
    expect(result.status).toBe('complete');
    expect(result.basisOfAmbient).toBe(true);
    close(result.accepted[0].q, [1 / Math.sqrt(2), 1 / Math.sqrt(2)]);
    close(result.accepted[1].q, [1 / Math.sqrt(2), -1 / Math.sqrt(2)]);
    expect(result.availableStages).toEqual([
      { inputId: 1, phase: 'input' }, { inputId: 1, phase: 'residual' }, { inputId: 1, phase: 'normalize' },
      { inputId: 2, phase: 'input' }, { inputId: 2, phase: 'projection', count: 1 },
      { inputId: 2, phase: 'residual' }, { inputId: 2, phase: 'normalize' },
    ]);
    expect(result.diagnostics.maxResidual).toBeLessThanOrEqual(1e-12);
  });
  it('初期3Dの直交出力を手計算の値と照合', () => {
    const result = analyzeGramSchmidt(metric(3), inputs([1, 1, 0], [1, 0, 1], [0, 1, 1]));
    expect(result.status).toBe('complete');
    [[1, 1, 0], [0.5, -0.5, 1], [-2 / 3, 2 / 3, 2 / 3]].forEach((w, i) => close(value(result.accepted[i].w.numeric), w));
    expect(result.accepted[2].normSquared.exact).toEqual({ numerator: 4n, denominator: 3n });
  });
  it('従属入力をスキップし、固定IDと出力番号を分ける', () => {
    const result = analyzeGramSchmidt(metric(2), [{ id: 8, components: [1, 0] }, { id: 3, components: [2, 0] }, { id: 1, components: [0, 1] }]);
    expect(result.status).toBe('complete');
    expect(result.steps.map(x => x.outcome)).toEqual(['accepted', 'skipped-dependent', 'accepted']);
    expect(result.accepted.map(x => [x.sourceId, x.outputIndex])).toEqual([[8, 1], [1, 2]]);
    expect(result.availableStages).toContainEqual({ inputId: 3, phase: 'skip' });
    expect(result.availableStages).not.toContainEqual({ inputId: 3, phase: 'normalize' });
  });
  it('生成空間の基底と周囲の空間の基底を区別する', () => {
    const result = analyzeGramSchmidt(metric(3), inputs([1, 0, 0], [0, 1, 0]));
    expect(result.basisOfSpan).toBe(true);
    expect(result.basisOfAmbient).toBe(false);
  });
  it.each([0, 1, 2, 3] as const)('次元%sの空入力は空基底', dimension => {
    const result = analyzeGramSchmidt(metric(dimension), []);
    expect(result.status).toBe('complete');
    expect(result.accepted).toEqual([]);
    expect(result.availableStages).toEqual([]);
    expect(result.basisOfSpan).toBe(true);
    expect(result.basisOfAmbient).toBe(dimension === 0);
  });
  it('零の先行入力と全零を正規化しない', () => {
    const result = analyzeGramSchmidt(metric(2), inputs([0, 0], [1, 0], [0, 1]));
    expect(result.steps[0].outcome).toBe('skipped-zero-input');
    expect(result.processedCount).toBe(3);
    expect(analyzeGramSchmidt(metric(2), inputs([0, 0], [0, 0])).accepted).toEqual([]);
  });
  it('正規化で符号を反転せず、順序を変えた組を再計算', () => {
    const result = analyzeGramSchmidt(metric(1), inputs([-2], [3]));
    expect(result.accepted[0].q).toEqual([-1]);
    const reversed = analyzeGramSchmidt(metric(2), inputs([1, 0], [1, 1]));
    expect(reversed.accepted.map(x => x.q)).toEqual([[1, 0], [0, 1]]);
  });
  it.each([1, 2, 3] as const)('多項式%sDの積分正規化を独立期待値と照合', dimension => {
    const vectors = Array.from({ length: dimension }, (_, i) => Array.from({ length: dimension }, (_, j) => Number(i === j)));
    const result = analyzeGramSchmidt(metric(dimension, 'integral'), inputs(...vectors));
    expect(result.status).toBe('complete');
    const q = [[1 / Math.sqrt(2), 0, 0], [0, Math.sqrt(3 / 2), 0], [-Math.sqrt(5 / 8), 0, 3 * Math.sqrt(5 / 8)]];
    result.accepted.forEach((column, i) => close(column.q, q[i].slice(0, dimension)));
    if (dimension === 3) expect(result.accepted[2].normSquared.exact).toEqual({ numerator: 8n, denominator: 45n });
    const coef = analyzeGramSchmidt(metric(dimension, 'coefficient'), inputs(...vectors));
    expect(coef.accepted.map(x => x.q)).toEqual(vectors);
  });
  it.each([1e-200, Number.MIN_VALUE])('微小非零%sを従属と判定しない', tiny => {
    const result = analyzeGramSchmidt(metric(2), inputs([1, 0], [1, tiny]));
    expect(result.status).toBe('complete');
    expect(result.accepted[1].q).toEqual([0, 1]);
    expect(result.steps[1].normSquared?.numeric.status).toBe('unavailable');
  });
  it('正規化の非零成分消失は保留、後続を完成基底にしない', () => {
    const result = analyzeGramSchmidt(metric(2), inputs([Number.MIN_VALUE, 1e6], [1, 0]));
    expect(result.status).toBe('inconclusive');
    expect(result.basisOfSpan).toBeNull();
    expect(result.basisOfAmbient).toBeNull();
    expect(result.accepted).toEqual([]);
    expect(result.processedCount).toBe(0);
    expect(result.steps).toHaveLength(1);
    expect(result.availableStages.at(-1)).toEqual({ inputId: 1, phase: 'hold' });
  });
  it('演算予算超過は明示的失敗、入力や後続を偽の零にしない', () => {
    const engine = createInnerProductEngine({ ...INNER_PRODUCT_BUDGET, operations: 0 });
    const result = engine.analyzeGS(metric(2), inputs([1, 1], [1, 0]));
    expect(result.status).toBe('numerical-failure');
    expect(result.issues).toEqual(['rational-budget']);
    expect(result.steps[0].residual).toBeNull();
    expect(result.availableStages).toEqual([{ inputId: 1, phase: 'input' }, { inputId: 1, phase: 'hold' }]);
    const pair = engine.analyzePair(metric(2), [1, 1], [1, 0]);
    expect(pair.status).toBe('numerical-failure');
    expect(pair.innerProduct).toBeNull();
  });
  it('最大8本の固定例を処理し予算以内に収める', () => {
    const result = analyzeGramSchmidt(metric(3, 'integral'), inputs([1, 2, 3], [2, -3, 4], [-1, 1, 2], [1, 1, 1], [0, 0, 0], [4, 5, 6], [-1, -2, -3], [0.1, 0.2, 0.3]));
    expect(result.status).toBe('complete');
    expect(result.processedCount).toBe(8);
    expect(result.accepted).toHaveLength(3);
    expect(result.diagnostics.operations).toBeLessThan(INNER_PRODUCT_BUDGET.operations);
    expect(result.diagnostics.remainders).toBeLessThan(INNER_PRODUCT_BUDGET.remainders);
  });
  it('予算終了までの確認済みprefixを残す', () => {
    const m = metric(2), first = analyzeGramSchmidt(m, inputs([1, 0]));
    const result = createInnerProductEngine({ ...INNER_PRODUCT_BUDGET, operations: first.diagnostics.operations })
      .analyzeGS(m, inputs([1, 0], [0, 1]));
    expect(result.status).toBe('numerical-failure');
    expect(result.accepted).toHaveLength(1);
    expect(result.processedCount).toBe(1);
    expect(result.basisOfSpan).toBeNull();
    expect(result.steps[1].residual).toBeNull();
  });
  it('最大8本を反復しても予算を共有せず、固定結果を再現する', () => {
    const m = metric(3, 'integral');
    const sample = inputs([1, 2, 3], [2, -3, 4], [-1, 1, 2], [1, 1, 1], [0, 0, 0], [4, 5, 6], [-1, -2, -3], [0.1, 0.2, 0.3]);
    const baseline = analyzeGramSchmidt(m, sample);
    const times: number[] = [];
    for (let i = 0; i < 32; i++) {
      const start = performance.now();
      const result = analyzeGramSchmidt(m, sample);
      times.push(performance.now() - start);
      expect(result).toEqual(baseline);
    }
    // 計測値は参考情報のみ。CIに端末速度の固定閾値を課さない。
    if (process.env.INNER_PRODUCT_BENCHMARK === '1') console.info(JSON.stringify({
      fixture: 'integral-3D-eight-inputs', iterations: times.length,
      averageMs: times.reduce((s, x) => s + x, 0) / times.length,
      maxMs: Math.max(...times), diagnostics: baseline.diagnostics,
    }));
  });
  it('上限付近の値と近従属を、表示丸めによって統合しない', () => {
    const large = analyzeGramSchmidt(metric(2), inputs([1e6, 1e6], [1e6, -1e6]));
    expect(large.status).toBe('complete');
    const near = analyzeGramSchmidt(metric(2), inputs([1, 1], [1, 1 + Number.EPSILON]));
    expect(near.status).toBe('complete');
    expect(near.accepted).toHaveLength(2);
    close(near.accepted[1].q, [-1 / Math.sqrt(2), 1 / Math.sqrt(2)]);
  });
  it('編集相当の非整数8本でもGに関する直交単位性を保つ', () => {
    for (const kind of ['euclidean', 'coefficient', 'integral'] as const) {
      const m = metric(3, kind);
      const data = inputs([3.125, 0.321, -0.712], [0.351, 3.192, 0.167], [-0.214, 0.512, 3.875],
        [0.01, -1.417, 2.741], [5.782, 7.401, -3.316], [1e-100, 2e-100, -1e-100], [0, 0, 0], [1.318, -4.211, 1.456]);
      const result = analyzeGramSchmidt(m, data);
      expect(result.status).toBe('complete');
      expect(result.processedCount).toBe(8);
      const g = kind === 'integral' ? [[2, 0, 2 / 3], [0, 2 / 3, 0], [2 / 3, 0, 2 / 5]] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      result.accepted.forEach((a, i) => result.accepted.forEach((b, j) => {
        const product = a.q.reduce((s, x, row) => s + x * g[row].reduce((t, y, col) => t + y * b.q[col], 0), 0);
        expect(product).toBeCloseTo(Number(i === j), 12);
      }));
    }
  });
});

describe('14.2 表示座標・検証・snapshot', () => {
  it.each([1, 2, 3] as const)('積分%sDの往復と軸名', dimension => {
    const m = metric(dimension, 'integral'), b = [2, -3, 4].slice(0, dimension);
    const z = value(toInnerProductCoordinates(m, b));
    close(value(fromInnerProductCoordinates(m, z)), b);
    close(z, [Math.sqrt(2) * (2 + (dimension === 3 ? 4 / 3 : 0)), -3 * Math.sqrt(2 / 3), 4 * Math.sqrt(8 / 45)].slice(0, dimension));
    expect(m.axes).toEqual(['ξ₁', 'ξ₂', 'ξ₃'].slice(0, dimension));
  });
  it('導出値は描画上限で切らず、変換のoverflowは保留', () => {
    const m = metric(3, 'integral');
    expect(value(toInnerProductCoordinates(m, [1e6, 0, 1e6]))[0]).toBeGreaterThan(1e6);
    expect(toInnerProductCoordinates(m, [Number.MAX_VALUE, 0, Number.MAX_VALUE]).status).toBe('unavailable');
    expect(value(toInnerProductCoordinates(metric(0), []))).toEqual([]);
  });
  it('逆変換で必要な微小成分が失われる場合は保留', () => {
    const m = metric(3, 'integral');
    expect(toInnerProductCoordinates(m, [Number.MIN_VALUE, 0, 1]).status).toBe('unavailable');
    const z = value(toInnerProductCoordinates(m, [-1, 0, 3]));
    expect(z[0]).toBe(0); // exactなb₀+b₂/3の零は正当な相殺。
    close(value(fromInnerProductCoordinates(m, z)), [-1, 0, 3]);
  });
  it('snapshotは不変で呼出し元の編集に追従しない', () => {
    const original = inputs([1, 1], [1, 0]);
    const result = analyzeGramSchmidt(metric(2), original);
    (original[0].components as number[])[0] = 99;
    expect(result.inputs[0].components).toEqual([1, 1]);
    expect(Object.isFrozen(result.accepted[0].q)).toBe(true);
    expect(Object.isFrozen(result.steps[0])).toBe(true);
  });
  it('不正な入力を計算保留や零へ置換しない', () => {
    expect(() => createInnerProductMetric({ dimension: 0, metric: 'integral' })).toThrow(InvalidInnerProductInputError);
    expect(() => analyzeGramSchmidt(metric(0), inputs([]))).toThrow(InvalidInnerProductInputError);
    expect(() => analyzeGramSchmidt(metric(2), [{ id: 1, components: [1, 0] }, { id: 1, components: [0, 1] }])).toThrow(InvalidInnerProductInputError);
    expect(() => analyzeGramSchmidt(metric(1), inputs(...Array.from({ length: 9 }, () => [1])))).toThrow(InvalidInnerProductInputError);
    for (const x of [NaN, Infinity, 1e6 + 1]) expect(() => analyzeInnerProductPair(metric(1), [x], [1])).toThrow(InvalidInnerProductInputError);
    expect(() => analyzeInnerProductPair(metric(2), new Array(2), [1, 0])).toThrow(InvalidInnerProductInputError);
    expect(() => analyzeInnerProductPair(metric(1), [], [1])).toThrow(InvalidInnerProductInputError);
  });
});

import { ONE, ZERO, rat, type Rational, type RationalBudget } from './exactRational';
import { createInnerProductNumerics, exactScalar, immutable, INNER_PRODUCT_BUDGET, InnerProductNumericalError,
  numericalIssue, rational, type InnerProductNumerics } from './innerProductNumerics';
import { InvalidInnerProductInputError, type AcceptedOrthogonalVector, type GramSchmidtAnalysis,
  type GramSchmidtStep, type InnerProductIssue, type InnerProductMetric, type MetricDefinition, type OrderedInput,
  type PairAnalysis, type ProjectionStep, type StageKey, type Value } from './innerProductTypes';

// 固定内積を構築したAPIのsnapshotだけ受け付け、G/Cを書き換えた偽の内積を通さない。
const grams = new WeakMap<InnerProductMetric, readonly (readonly Rational[])[]>();
export function createInnerProductMetric(definition: MetricDefinition): InnerProductMetric {
  if (!definition || !Number.isInteger(definition.dimension) || definition.dimension < 0 || definition.dimension > 3
    || !['euclidean', 'coefficient', 'integral'].includes(definition.metric)
    || (definition.dimension === 0 && definition.metric !== 'euclidean')) throw new InvalidInnerProductInputError('Invalid metric definition');
  const { dimension: n, metric } = definition;
  const g = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => metric === 'integral'
    ? (i + j) % 2 ? ZERO : rat(2n, BigInt(i + j + 1)) : i === j ? ONE : ZERO));
  const c3 = [[Math.sqrt(2), 0, Math.sqrt(2) / 3], [0, Math.sqrt(2 / 3), 0], [0, 0, Math.sqrt(8 / 45)]];
  const inverse3 = [[1 / Math.sqrt(2), 0, -1 / (3 * Math.sqrt(8 / 45))],
    [0, 1 / Math.sqrt(2 / 3), 0], [0, 0, 1 / Math.sqrt(8 / 45)]];
  const matrix = (values: number[][]) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) =>
    metric === 'integral' ? values[i][j] : Number(i === j)));
  const result: InnerProductMetric = immutable({ definition: { dimension: n, metric }, gram: g.map(row => row.map(exactScalar)),
    transform: matrix(c3), inverseTransform: matrix(inverse3),
    axes: (metric === 'integral' ? ['ξ₁', 'ξ₂', 'ξ₃'] : metric === 'coefficient' ? ['b₀', 'b₁', 'b₂'] : ['x', 'y', 'z']).slice(0, n) });
  grams.set(result, g);
  return result;
}
function gram(metric: InnerProductMetric) {
  const g = grams.get(metric);
  if (!g) throw new InvalidInnerProductInputError('Use createInnerProductMetric to construct the metric');
  return g;
}
function components(metric: InnerProductMetric, value: readonly number[], bounded = true): number[] {
  if (!Array.isArray(value) || value.length !== metric.definition.dimension
    || Array.from(value).some(x => typeof x !== 'number' || !Number.isFinite(x) || (bounded && Math.abs(x) > 1e6))) {
    throw new InvalidInnerProductInputError('Invalid column components');
  }
  return value.map(x => x === 0 ? 0 : x);
}
function inputsSnapshot(metric: InnerProductMetric, inputs: readonly OrderedInput[]): OrderedInput[] {
  if (!Array.isArray(inputs) || inputs.length > 8 || (metric.definition.dimension === 0 && inputs.length !== 0)) {
    throw new InvalidInnerProductInputError('Invalid input count');
  }
  const ids = new Set<number>();
  return Array.from(inputs, input => {
    if (!input || !Number.isInteger(input.id) || input.id < 1 || input.id > 8 || ids.has(input.id)) throw new InvalidInnerProductInputError('Invalid input ID');
    ids.add(input.id);
    return { id: input.id, components: components(metric, input.components) };
  });
}
function valueIssues(value: unknown, issues: Set<InnerProductIssue>) {
  if (!value || typeof value !== 'object') return;
  if ('status' in value && (value.status === 'unavailable' || value.status === 'inconclusive') && 'reason' in value) {
    issues.add(value.reason as InnerProductIssue);
  }
  Object.values(value).forEach(item => valueIssues(item, issues));
}
function required<T>(value: Value<T>): T {
  if (value.status !== 'ready') throw new InnerProductNumericalError(value.reason);
  return value.value;
}

/** テスト専用の予算注入境界。domain/index.tsには公開せず、通常呼出しは承認済み予算を使う。 */
export function createInnerProductEngine(budget: RationalBudget = INNER_PRODUCT_BUDGET) {
  function analyzePair(metric: InnerProductMetric, uInput: readonly number[], vInput: readonly number[]): PairAnalysis {
    const g = gram(metric), u = components(metric, uInput), v = components(metric, vInput);
    const math = createInnerProductNumerics(budget);
    const result: { -readonly [K in keyof PairAnalysis]: PairAnalysis[K] } = {
      definition: metric.definition, u, v, status: 'complete', innerProduct: null, uNormSquared: null,
      vNormSquared: null, uNorm: null, vNorm: null, angle: null, projection: null, issues: [], diagnostics: math.diagnostics(),
    };
    const issues = new Set<InnerProductIssue>();
    try {
      const a = math.vector(u), b = math.vector(v);
      const product = math.dot(a, b, g);
      result.innerProduct = math.scalarResult(product);
      const aa = math.dot(a, a, g);
      result.uNormSquared = math.scalarResult(aa);
      result.uNorm = math.norm(aa);
      const bb = math.dot(b, b, g);
      result.vNormSquared = math.scalarResult(bb);
      result.vNorm = math.norm(bb);
      if (!aa.n || !bb.n) result.angle = { status: 'undefined-zero-vector' };
      else {
        try {
          const qa = math.vector(math.normalize(a, aa, g)), qb = math.vector(math.normalize(b, bb, g));
          const cosine = math.represented(math.dot(qa, qb, g));
          if (cosine < -1 - 32 * Number.EPSILON || cosine > 1 + 32 * Number.EPSILON) throw new InnerProductNumericalError('residual-too-large');
          result.angle = { status: 'ready', degrees: Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI };
        } catch (error) {
          const issue = numericalIssue(error);
          if (issue === 'rational-budget') throw error;
          result.angle = { status: 'inconclusive', reason: issue };
        }
      }
      const coefficient = aa.n ? math.op.div(product, aa) : null;
      const p = coefficient ? math.scale(a, coefficient) : a.map(() => ZERO);
      const r = math.subtract(b, p);
      result.projection = { kind: aa.n ? 'line' : 'zero-subspace', coefficient: coefficient ? math.scalarResult(coefficient) : null,
        vector: math.vectorResult(p), residual: math.vectorResult(r) };
      // 表示不能な値は残す。表示できるp/rだけ実際の数値再構成を検算する。
      if (result.projection.vector.numeric.status === 'ready' && result.projection.residual.numeric.status === 'ready') {
        math.checkReconstruction(b, [result.projection.vector.numeric.value, result.projection.residual.numeric.value]);
      }
      if (math.dot(a, r, g).n !== 0n) throw new InnerProductNumericalError('inconsistent-analysis');
    } catch (error) {
      const issue = numericalIssue(error);
      issues.add(issue);
      result.status = issue === 'rational-budget' || issue === 'inconsistent-analysis' ? 'numerical-failure' : 'partial';
    }
    valueIssues(result, issues);
    if (result.status === 'complete' && issues.size) result.status = 'partial';
    result.issues = [...issues]; result.diagnostics = math.diagnostics();
    return immutable(result);
  }

  function analyzeGS(metric: InnerProductMetric, original: readonly OrderedInput[]): GramSchmidtAnalysis {
    const g = gram(metric), inputs = inputsSnapshot(metric, original), math = createInnerProductNumerics(budget);
    const steps: GramSchmidtStep[] = [], accepted: AcceptedOrthogonalVector[] = [], availableStages: StageKey[] = [];
    let status: GramSchmidtAnalysis['status'] = 'complete', processedCount = 0;
    const issues = new Set<InnerProductIssue>();
    for (const [position, input] of inputs.entries()) {
      const projections: ProjectionStep[] = [];
      const step: { -readonly [K in keyof GramSchmidtStep]: GramSchmidtStep[K] } = { sourceId: input.id, inputPosition: position + 1,
        previousSourceIds: accepted.map(x => x.sourceId), projections, residual: null, normSquared: null, norm: null,
        outcome: 'inconclusive', outputIndex: null, q: null };
      availableStages.push({ inputId: input.id, phase: 'input' });
      try {
        const a = math.vector(input.components);
        let r = a;
        for (const previous of accepted) {
          const w = previous.w.exact.map(rational), squared = rational(previous.normSquared.exact);
          const coefficient = math.op.div(math.dot(a, w, g), squared);
          const p = math.scale(w, coefficient);
          r = math.subtract(r, p);
          projections.push({ ontoSourceId: previous.sourceId, coefficient: math.scalarResult(coefficient),
            vector: math.vectorResult(p), cumulativeResidual: math.vectorResult(r) });
          availableStages.push({ inputId: input.id, phase: 'projection', count: projections.length });
        }
        step.residual = math.vectorResult(r);
        availableStages.push({ inputId: input.id, phase: 'residual' });
        const squared = math.dot(r, r, g);
        step.normSquared = math.scalarResult(squared); step.norm = math.norm(squared);
        // スキップした入力についても、提示する射影の和で元入力を再構成できることを確認する。
        required(step.residual.numeric);
        const terms = projections.map(p => required(p.vector.numeric));
        math.checkReconstruction(a, [...terms, required(step.residual.numeric)]);
        if (r.every(x => x.n === 0n)) {
          step.outcome = a.every(x => x.n === 0n) ? 'skipped-zero-input' : 'skipped-dependent';
          availableStages.push({ inputId: input.id, phase: 'skip' });
        } else {
          if (accepted.length >= metric.definition.dimension) throw new InnerProductNumericalError('inconsistent-analysis');
          const q = math.normalize(r, squared, g);
          math.checkOrthogonal(q, accepted.map(x => x.q), g);
          // 微小残差や個別射影を丸め消失させて、全体だけ整合したことにしない。
          // 採用した数値qでの再構成も独立に検算（exactなwだけの自己一致にしない）。
          const qs = [...accepted.map(x => x.q), q];
          const basisTerms = qs.map(column => {
            const columnExact = math.vector(column);
            return math.scale(columnExact, math.dot(a, columnExact, g)).map(math.represented);
          });
          math.checkReconstruction(a, basisTerms);
          step.q = q; step.outputIndex = accepted.length + 1; step.outcome = 'accepted';
          accepted.push({ sourceId: input.id, outputIndex: step.outputIndex, w: step.residual,
            normSquared: step.normSquared, norm: step.norm, q });
          availableStages.push({ inputId: input.id, phase: 'normalize' });
        }
        processedCount++;
      } catch (error) {
        const issue = numericalIssue(error); issues.add(issue);
        status = issue === 'rational-budget' || issue === 'inconsistent-analysis' ? 'numerical-failure' : 'inconclusive';
        step.outcome = status;
        availableStages.push({ inputId: input.id, phase: 'hold' });
      }
      steps.push(step);
      if (status !== 'complete') break;
    }
    return immutable({ definition: metric.definition, inputs, steps, accepted, availableStages, status, issues: [...issues], processedCount,
      basisOfSpan: status === 'complete' ? true : null,
      basisOfAmbient: status === 'complete' ? accepted.length === metric.definition.dimension : null, diagnostics: math.diagnostics() });
  }
  return { analyzePair, analyzeGS };
}

export const analyzeInnerProductPair = (metric: InnerProductMetric, u: readonly number[], v: readonly number[]) =>
  createInnerProductEngine().analyzePair(metric, u, v);
export const analyzeGramSchmidt = (metric: InnerProductMetric, inputs: readonly OrderedInput[]) =>
  createInnerProductEngine().analyzeGS(metric, inputs);

/** Cの因子を使い、b₀+b₂/3の相殺をexactに行ってから固定sqrt係数を掛ける。 */
function transform(metric: InnerProductMetric, values: readonly number[], inverse: boolean, math: InnerProductNumerics): number[] {
  if (metric.definition.metric !== 'integral') return [...values];
  const b = math.vector(values), op = math.op, third = op.rat(1n, 3n);
  const roots = [Math.sqrt(2), Math.sqrt(2 / 3), Math.sqrt(8 / 45)].map(x => op.fromNumber(x));
  if (!inverse) return b.map((x, i) => math.represented(op.mul(i === 0 ? op.add(x, op.mul(b[2] ?? ZERO, third)) : x, roots[i])));
  const last = b[2] ? op.div(b[2], roots[2]) : ZERO;
  return b.map((x, i) => math.represented(i === 0 ? op.sub(op.div(x, roots[i]), op.mul(last, third)) : op.div(x, roots[i])));
}
function convert(metric: InnerProductMetric, input: readonly number[], inverse: boolean): Value<readonly number[]> {
  gram(metric);
  const values = components(metric, input, false), math = createInnerProductNumerics();
  // 最大3次の固定変換。数学入力の上限で導出値を切らず、描画境界はUIに委ねる。
  const result = math.attempt(() => {
    const output = transform(metric, values, inverse, math);
    const restored = transform(metric, output, !inverse, math);
    math.checkRoundTrip(values, restored);
    return output;
  });
  return immutable(result);
}
export const toInnerProductCoordinates = (metric: InnerProductMetric, components: readonly number[]) => convert(metric, components, false);
export const fromInnerProductCoordinates = (metric: InnerProductMetric, coordinates: readonly number[]) => convert(metric, coordinates, true);

import { createRationalArithmetic, RationalPrecisionLimit, toNumber, fromNumber, add, sub, mul, ONE, ZERO, type Rational, type RationalBudget } from './exactRational';
import type { ExactScalar, InnerProductIssue, ScalarResult, Value, VectorResult } from './innerProductTypes';

export const INNER_PRODUCT_TOLERANCE = 1e-12;
// 固定の検証定数は呼出し予算の外。入力に依存する計算だけを解析内で計数する。
const tolerance = fromNumber(INNER_PRODUCT_TOLERANCE);
const upperSquare = mul(add(ONE, tolerance), add(ONE, tolerance));
const lowerSquare = mul(sub(ONE, tolerance), sub(ONE, tolerance));
export const INNER_PRODUCT_BUDGET: RationalBudget = Object.freeze({
  rationalBits: 32768, temporaryBits: 65536, operations: 20000, remainders: 200000,
});
export class InnerProductNumericalError extends Error {
  constructor(readonly issue: Exclude<InnerProductIssue, 'rational-budget'>) { super(issue); }
}
export const ready = <T>(value: T): Value<T> => ({ status: 'ready', value });
export const unavailable = (reason: 'unrepresentable-result' | 'residual-too-large'): Value<never> => ({ status: 'unavailable', reason });
export const abs = (x: Rational): Rational => ({ n: x.n < 0n ? -x.n : x.n, d: x.d });
export const exactScalar = (x: Rational): ExactScalar => ({ numerator: x.n, denominator: x.d });
export const rational = (x: ExactScalar): Rational => ({ n: x.numerator, d: x.denominator });
export function numericalIssue(error: unknown): InnerProductIssue {
  if (error instanceof RationalPrecisionLimit) return 'rational-budget';
  if (error instanceof InnerProductNumericalError) return error.issue;
  throw error; // プログラムの不具合を数学的な保留として隠さない。
}
export function immutable<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}

/** 各解析が所有する算術・検算。許容誤差を厳密な零判定には使わない。 */
export function createInnerProductNumerics(budget: RationalBudget = INNER_PRODUCT_BUDGET) {
  const op = createRationalArithmetic(budget);
  let maxResidual = 0;
  const max = (xs: readonly Rational[]) => xs.reduce((a, b) => op.compare(a, b) >= 0 ? a : b, ZERO);
  const normInfinity = (v: readonly Rational[]) => max(v.map(abs));
  const sum = (xs: readonly Rational[]) => xs.reduce((s, x) => op.add(s, x), ZERO);
  const vector = (xs: readonly number[]) => xs.map(x => op.fromNumber(x));
  const subtract = (a: readonly Rational[], b: readonly Rational[]) => a.map((x, i) => op.sub(x, b[i]));
  const scale = (a: readonly Rational[], c: Rational) => a.map(x => op.mul(x, c));
  const dot = (a: readonly Rational[], b: readonly Rational[], g: readonly (readonly Rational[])[]) =>
    sum(a.map((x, i) => sum(b.map((y, j) => op.mul(op.mul(x, g[i][j]), y)))));
  function check(error: Rational, denominator: Rational = ONE) {
    if (!denominator.n) {
      if (error.n) throw new InnerProductNumericalError('residual-too-large');
      return;
    }
    const ratio = op.div(abs(error), abs(denominator));
    maxResidual = Math.max(maxResidual, toNumber(ratio));
    if (op.compare(ratio, tolerance) > 0) throw new InnerProductNumericalError('residual-too-large');
  }
  function represented(x: Rational): number {
    const value = toNumber(x);
    if (!Number.isFinite(value) || (x.n !== 0n && value === 0)) throw new InnerProductNumericalError('unrepresentable-result');
    // 亜正規数の大きな相対丸め誤差も検出する。零の由来はexactで保つ。
    if (x.n) check(op.sub(op.fromNumber(value), x), abs(x));
    return value === 0 ? 0 : value;
  }
  function attempt<T>(fn: () => T): Value<T> {
    try { return ready(fn()); } catch (error) {
      if (error instanceof InnerProductNumericalError && error.issue !== 'inconsistent-analysis') return unavailable(error.issue);
      throw error;
    }
  }
  const scalarResult = (x: Rational): ScalarResult => ({ exact: exactScalar(x), numeric: attempt(() => represented(x)) });
  const vectorResult = (xs: readonly Rational[]): VectorResult => ({ exact: xs.map(exactScalar), numeric: attempt(() => xs.map(represented)) });

  /** 比を先にnumber化しない。二進指数を半分にしてからsqrtするので1e-400の根も得られる。 */
  function squareRoot(x: Rational): number {
    if (x.n < 0n) throw new InnerProductNumericalError('inconsistent-analysis');
    if (!x.n) return 0;
    const exponent = x.n.toString(2).length - x.d.toString(2).length;
    const half = Math.floor(exponent / 2);
    const power = Math.abs(2 * half);
    if (power + 1 > budget.temporaryBits) throw new RationalPrecisionLimit('Square root scaling budget');
    const factor = half >= 0 ? op.rat(1n, 1n << BigInt(power)) : op.rat(1n << BigInt(power));
    const scaled = toNumber(op.mul(x, factor));
    const first = Math.max(-1022, Math.min(1023, half));
    const result = Math.sqrt(scaled) * 2 ** first * 2 ** (half - first);
    if (!Number.isFinite(result) || result === 0) throw new InnerProductNumericalError('unrepresentable-result');
    // sqrt値の二乗比をexactに比較し、元の値との1e-12相対誤差を保証する。
    const candidate = op.fromNumber(result);
    const ratio = op.div(op.mul(candidate, candidate), x);
    maxResidual = Math.max(maxResidual, Math.abs(toNumber(ratio) - 1) / 2);
    if (op.compare(ratio, lowerSquare) < 0 || op.compare(ratio, upperSquare) > 0) throw new InnerProductNumericalError('residual-too-large');
    return result;
  }
  const norm = (squared: Rational) => attempt(() => squareRoot(squared));
  function normalize(w: readonly Rational[], squared: Rational, g: readonly (readonly Rational[])[]): number[] {
    if (squared.n <= 0n) throw new InnerProductNumericalError('inconsistent-analysis');
    // 各成分の二乗比は最大成分でのスケーリングと同値。途中の小成分もnumberへ落とさない。
    const q = w.map(x => x.n === 0n ? 0 : (x.n < 0n ? -1 : 1) * squareRoot(op.div(op.mul(x, x), squared)));
    check(op.sub(dot(vector(q), vector(q), g), ONE));
    return q;
  }
  function checkOrthogonal(q: readonly number[], previous: readonly (readonly number[])[], g: readonly (readonly Rational[])[]) {
    const current = vector(q);
    for (const other of previous) check(dot(current, vector(other), g));
  }
  function checkReconstruction(original: readonly Rational[], terms: readonly (readonly number[])[]) {
    const exactTerms = terms.map(vector);
    const rebuilt = original.map((_, i) => sum(exactTerms.map(t => t[i])));
    check(normInfinity(subtract(original, rebuilt)), op.add(normInfinity(original), sum(exactTerms.map(normInfinity))));
  }
  function checkRoundTrip(original: readonly number[], restored: readonly number[]) {
    original.forEach((x, i) => {
      if (!Number.isFinite(restored[i]) || (x !== 0 && restored[i] === 0)) throw new InnerProductNumericalError('unrepresentable-result');
    });
    const a = vector(original), b = vector(restored);
    // 相殺後に微小成分が別の丸め誤差へ化ける場合も「保存できた」としない。
    // 全体の相対残差だけでは、大きい他成分がこの誤りを隠してしまう。
    a.forEach((x, i) => { if (x.n) check(op.sub(x, b[i]), abs(x)); });
    check(normInfinity(subtract(a, b)), op.add(normInfinity(a), normInfinity(b)));
  }
  return { op, vector, subtract, scale, dot, sum, check, norm, normalize, checkOrthogonal, checkReconstruction,
    represented, attempt, scalarResult, vectorResult, checkRoundTrip,
    diagnostics: () => ({ ...op.diagnostics(), tolerance: INNER_PRODUCT_TOLERANCE, maxResidual }) };
}
export type InnerProductNumerics = ReturnType<typeof createInnerProductNumerics>;

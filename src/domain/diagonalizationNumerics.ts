import { add, compare, div, EigenPrecisionLimit, fromNumber, mul, sub, toNumber, ZERO, type Rational } from './eigenExact';
import { DEFAULT_RELATIVE_TOLERANCE } from './vectorSet';

export type Matrix = readonly (readonly number[])[];
type ExactMatrix = readonly (readonly Rational[])[];
export const DIAGONALIZATION_CONDITION_LIMIT = 1e8;
export const DIAGONALIZATION_INVERSE_TOLERANCE = 1e-8;
export const DIAGONALIZATION_COORDINATE_TOLERANCE = DEFAULT_RELATIVE_TOLERANCE;
export class DiagonalizationNumericalError extends Error {
  constructor(readonly issue: 'unrepresentable-result' | 'basis-solve-failed') { super(issue); }
}
const abs = (x: Rational): Rational => x.n < 0n ? { n: -x.n, d: x.d } : x;
const max = (xs: readonly Rational[]) => xs.reduce((a, b) => compare(a, b) > 0 ? a : b, ZERO);
const sum = (xs: readonly Rational[]) => xs.reduce(add, ZERO);
const exact = (a: Matrix) => a.map(row => row.map(fromNumber));
function represented(x: Rational): number {
  const value = toNumber(x);
  if (!Number.isFinite(value) || (x.n !== 0n && value === 0)) throw new DiagonalizationNumericalError('unrepresentable-result');
  return value;
}
const dot = (a: readonly Rational[], b: readonly Rational[]) => sum(a.map((x, i) => mul(x, b[i])));
const product = (a: ExactMatrix, b: ExactMatrix) => a.map(row => b[0].map((_, j) => dot(row, b.map(r => r[j]))));
const difference = (a: ExactMatrix, b: ExactMatrix) => a.map((row, i) => row.map((x, j) => sub(x, b[i][j])));
const norm = (a: ExactMatrix) => max(a.map(row => sum(row.map(abs))));
const vectorNorm = (v: readonly Rational[]) => max(v.map(abs));
// 有理数で比を作ってから数値化する。微小な残差の比が0へ丸められても合否には安全。
const ratio = (numerator: Rational, denominator: Rational) => denominator.n === 0n
  ? numerator.n === 0n ? 0 : Infinity : toNumber(div(numerator, denominator));
export const identity = (n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Number(i === j)));

/** 同じbinary64値の正確な有理数計算を再利用。丸め消失を含む偽の零を返さない。 */
export function multiplyVector(a: Matrix, v: readonly number[]): number[] {
  const b = v.map(fromNumber);
  return exact(a).map(row => {
    const terms = row.map((x, i) => mul(x, b[i]));
    terms.forEach(represented); // 非零積のunderflowも区別する（D-116）。
    return represented(sum(terms));
  });
}
export function normalizeColumn(column: readonly number[]): number[] {
  const largest = Math.max(0, ...column.map(Math.abs));
  if (!largest || !Number.isFinite(largest)) throw new DiagonalizationNumericalError('basis-solve-failed');
  const pivot = fromNumber(column[column.findIndex(x => Math.abs(x) === largest)]);
  return column.map(x => represented(div(fromNumber(x), pivot)));
}

/** 部分ピボットLUを一度だけ作る。入力ドラッグではこの閉包で右辺だけを解く。
 * 消去中の丸めを避ける小さな有理数LU（最大3次）。既存rankやRREFの微小値整理は変更しない。
 */
export function factorBasis(a: Matrix): (rhs: readonly number[]) => number[] {
  const n = a.length, lu = exact(a), permutation = Array.from({ length: n }, (_, i) => i);
  const threshold = mul(max(lu.flat().map(abs)), fromNumber(DEFAULT_RELATIVE_TOLERANCE));
  for (let k = 0; k < n; k++) {
    let pivot = k;
    for (let i = k + 1; i < n; i++) if (compare(abs(lu[i][k]), abs(lu[pivot][k])) > 0) pivot = i;
    if (compare(abs(lu[pivot][k]), threshold) <= 0) throw new DiagonalizationNumericalError('basis-solve-failed');
    [lu[k], lu[pivot]] = [lu[pivot], lu[k]];
    [permutation[k], permutation[pivot]] = [permutation[pivot], permutation[k]];
    for (let i = k + 1; i < n; i++) {
      lu[i][k] = div(lu[i][k], lu[k][k]);
      for (let j = k + 1; j < n; j++) lu[i][j] = sub(lu[i][j], mul(lu[i][k], lu[k][j]));
    }
  }
  return rhs => {
    const x = permutation.map(i => fromNumber(rhs[i]));
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) x[i] = sub(x[i], mul(lu[i][j], x[j]));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = i + 1; j < n; j++) x[i] = sub(x[i], mul(lu[i][j], x[j]));
      x[i] = div(x[i], lu[i][i]);
    }
    return x.map(represented);
  };
}
export function inverseFromSolver(n: number, solve: (rhs: readonly number[]) => number[]): number[][] {
  const columns = identity(n).map(solve);
  return columns.map((_, i) => columns.map(column => column[i]));
}
export function basisMetrics(a: Matrix, p: Matrix, d: Matrix, g: Matrix) {
  const A = exact(a), P = exact(p), D = exact(d), G = exact(g), E = exact(identity(a.length));
  return {
    conditionInfinity: a.length ? toNumber(mul(norm(P), norm(G))) : 1,
    intertwining: ratio(norm(difference(product(A, P), product(P, D))), add(mul(norm(A), norm(P)), mul(norm(P), norm(D)))),
    leftInverse: toNumber(norm(difference(product(G, P), E))),
    rightInverse: toNumber(norm(difference(product(P, G), E))),
  };
}
export function equationResidual(a: Matrix, x: readonly number[], b: readonly number[]): number {
  const A = exact(a), X = x.map(fromNumber), B = b.map(fromNumber);
  const residual = A.map((row, i) => sub(dot(row, X), B[i]));
  return ratio(vectorNorm(residual), add(mul(norm(A), vectorNorm(X)), vectorNorm(B)));
}
export function agreementResidual(a: readonly number[], b: readonly number[]): number {
  const A = a.map(fromNumber), B = b.map(fromNumber);
  return ratio(vectorNorm(A.map((x, i) => sub(x, B[i]))), add(vectorNorm(A), vectorNorm(B)));
}
export function numericalIssue(error: unknown): 'precision-limit' | 'unrepresentable-result' | 'basis-solve-failed' | null {
  return error instanceof EigenPrecisionLimit ? 'precision-limit' : error instanceof DiagonalizationNumericalError ? error.issue : null;
}

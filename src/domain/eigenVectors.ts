import { add, div, mul, rat, rationalKernel, sub, toNumber, type Rational } from './eigenExact';
import type { EigenSpace } from './eigenTypes';

export const EIGEN_RESIDUAL_TOLERANCE = 1e-12;
export const EIGEN_BASIS_CONDITION_FLOOR = 1e-8;
export const EIGEN_DIRECTION_ERROR_TOLERANCE = 1e-11;
export const EIGEN_MEMBERSHIP_TOLERANCE = 1e-10;
export const EIGEN_NONMEMBERSHIP_TOLERANCE = 1e-8;
const dot = (a: readonly number[], b: readonly number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
export function unit(v: readonly number[]): number[] | null {
  const scale = Math.max(0, ...v.map(Math.abs));
  if (!scale || !Number.isFinite(scale)) return null;
  const scaled = v.map((x) => x / scale), norm = Math.hypot(...scaled);
  return scaled.map((x) => x / norm);
}
/** uもAも先にスケーリングし、微小入力を分母の絶対閾値で零扱いしない。 */
export function eigenResidual(matrix: readonly (readonly number[])[], lambda: number, input: readonly number[]): number {
  const u = unit(input);
  if (!u) return 0;
  const scale = Math.max(Math.abs(lambda), ...matrix.flat().map(Math.abs));
  if (!scale) return 0;
  const a = matrix.map((row) => row.map((v) => v / scale)), l = lambda / scale;
  return Math.hypot(...a.map((row, i) => dot(row, u) - l * u[i])) / (Math.hypot(...a.flat()) + Math.abs(l));
}
export function spaceDistance(input: readonly number[], basis: readonly (readonly number[])[]): number {
  const u = unit(input);
  if (!u) return 0;
  const residual = [...u];
  for (const q of basis) { const c = dot(q, u); q.forEach((v, i) => { residual[i] -= c * v; }); }
  return Math.hypot(...residual);
}
function orthonormalize(columns: readonly (readonly number[])[]): number[][] | null {
  const basis: number[][] = [];
  for (const column of columns) {
    let u = unit(column);
    if (!u) return null;
    // 再直交化で投影誤差を抑制。小さすぎる独立成分は「空間不明」にする。
    for (let pass = 0; pass < 2; pass++) for (const q of basis) {
      const c = dot(u, q); u = u.map((v, i) => v - c * q[i]);
    }
    if (Math.hypot(...u) < EIGEN_BASIS_CONDITION_FLOOR) return null;
    u = unit(u)!;
    const pivot = u.findIndex((v) => Math.abs(v) === Math.max(...u!.map(Math.abs)));
    if (u[pivot] < 0) u = u.map((v) => -v);
    basis.push(u);
  }
  return basis;
}
/** 異なる固有空間の直和も数値的に識別できるか。ほぼ重なる直線を別々に吸着させない。 */
export function distinguishEigenSpaces(spaces: readonly EigenSpace[]): boolean {
  return orthonormalize(spaces.flatMap((space) => space.basis)) !== null;
}
export function findEigenSpace(
  matrix: readonly (readonly number[])[], exactMatrix: readonly (readonly Rational[])[],
  lambda: number, rationalLambda: Rational | null, multiplicity: number,
  rootAbsoluteError = 0,
): EigenSpace | null {
  const n = matrix.length;
  let columns: number[][];
  if (rationalLambda) {
    const kernel = rationalKernel(exactMatrix, rationalLambda), exact: Rational[][] = [];
    const dotExact = (a: Rational[], b: Rational[]) => a.reduce((s, v, i) => add(s, mul(v, b[i])), rat(0n));
    // 核の基底が悪条件でも、有理数の段階で直交化すれば独立成分を失わない。
    for (let column of kernel) {
      for (const previous of exact) {
        const factor = div(dotExact(column, previous), dotExact(previous, previous));
        column = column.map((v, i) => sub(v, mul(factor, previous[i])));
      }
      exact.push(column);
    }
    columns = exact.map((v) => {
      const largest = v.reduce((a, b) => {
        const an = a.n < 0n ? -a.n : a.n, bn = b.n < 0n ? -b.n : b.n;
        return an * b.d >= bn * a.d ? a : b;
      }, rat(0n));
      return v.map((x) => toNumber(div(x, largest)));
    });
  } else {
    // 次数<=3で非有理の多重根は生じない。単根の固有空間次元は1。
    if (multiplicity !== 1) return null;
    const scale = Math.max(Math.abs(lambda), ...matrix.flat().map(Math.abs));
    const rows = matrix.map((row, i) => row.map((v, j) => v / scale - (i === j ? lambda / scale : 0)));
    const delta = rootAbsoluteError / scale + 8 * Number.EPSILON * (1 + Math.abs(lambda / scale));
    if (n === 2) {
      const r = Math.hypot(...rows[0]) >= Math.hypot(...rows[1]) ? rows[0] : rows[1];
      if (Math.hypot(...r) < EIGEN_BASIS_CONDITION_FLOOR) return null;
      columns = [[-r[1], r[0]]];
      if (2 * delta / Math.hypot(...r) > EIGEN_DIRECTION_ERROR_TOLERANCE) return null;
    } else {
      const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      columns = [cross(rows[0], rows[1]), cross(rows[0], rows[2]), cross(rows[1], rows[2])]
        .sort((a, b) => Math.hypot(...b) - Math.hypot(...a)).slice(0, 1);
      if (Math.hypot(...columns[0]) < EIGEN_BASIS_CONDITION_FLOOR) return null;
      // cross(r+dr,s+ds)の摂動上界。根の区間幅と浮動小数演算を方向精度へ伝播する。
      const rowNorm = Math.max(...rows.map((r) => Math.hypot(...r)));
      const error = 2 * rowNorm * delta + delta * delta + 32 * Number.EPSILON * Math.max(1, rowNorm * rowNorm);
      if (2 * error / Math.hypot(...columns[0]) > EIGEN_DIRECTION_ERROR_TOLERANCE) return null;
    }
  }
  if (!columns.length || columns.length > multiplicity) return null;
  const basis = orthonormalize(columns);
  if (!basis) return null;
  const maxRelativeResidual = Math.max(...basis.map((q) => eigenResidual(matrix, lambda, q)));
  if (!Number.isFinite(maxRelativeResidual) || maxRelativeResidual > EIGEN_RESIDUAL_TOLERANCE) return null;
  return { dimension: basis.length, basis, maxRelativeResidual };
}

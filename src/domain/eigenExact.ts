/** 次数3以下の固有値解析専用。入力のbinary64を正確な有理数として保持する。 */
export interface Rational { readonly n: bigint; readonly d: bigint }
export class EigenPrecisionLimit extends Error {}
const abs = (n: bigint) => n < 0n ? -n : n;
function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return abs(a);
}
export function rat(n: bigint, d = 1n): Rational {
  if (!d) throw new Error('Zero rational denominator');
  if (!n) return ZERO;
  const g = gcd(n, d) * (d < 0n ? -1n : 1n);
  n /= g; d /= g;
  if (abs(n).toString(2).length + d.toString(2).length > 32768) throw new EigenPrecisionLimit('Rational bit budget');
  return { n, d };
}
export const ZERO: Rational = { n: 0n, d: 1n };
export const ONE: Rational = { n: 1n, d: 1n };
export const add = (a: Rational, b: Rational) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const neg = (a: Rational) => ({ n: -a.n, d: a.d });
export const sub = (a: Rational, b: Rational) => add(a, neg(b));
export const mul = (a: Rational, b: Rational) => rat(a.n * b.n, a.d * b.d);
export const div = (a: Rational, b: Rational) => rat(a.n * b.d, a.d * b.n);
export const compare = (a: Rational, b: Rational) => { const n = a.n * b.d - b.n * a.d; return n < 0n ? -1 : n > 0n ? 1 : 0; };
export function fromNumber(value: number): Rational {
  if (!Number.isFinite(value)) throw new Error('Finite number required');
  if (!value) return ZERO;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0);
  const exponent = Number((bits >> 52n) & 2047n);
  const fraction = bits & ((1n << 52n) - 1n);
  const significand = (exponent ? (1n << 52n) | fraction : fraction) * (value < 0 ? -1n : 1n);
  const shift = exponent ? exponent - 1075 : -1074;
  return shift >= 0 ? rat(significand << BigInt(shift)) : rat(significand, 1n << BigInt(-shift));
}
export function toNumber(a: Rational): number {
  if (!a.n) return 0;
  const n = abs(a.n);
  const sn = Math.max(0, n.toString(2).length - 54), sd = Math.max(0, a.d.toString(2).length - 54);
  const exponent = sn - sd, first = Math.max(-1022, Math.min(1023, exponent));
  return (a.n < 0n ? -1 : 1) * (Number(n >> BigInt(sn)) / Number(a.d >> BigInt(sd))) * 2 ** first * 2 ** (exponent - first);
}

/** 多項式は昇べき。零多項式は[]。 */
export type Polynomial = readonly Rational[];
const trim = (p: Polynomial): Rational[] => { const out = [...p]; while (out.length && !out.at(-1)!.n) out.pop(); return out; };
function plus(a: Polynomial, b: Polynomial): Rational[] {
  return trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => add(a[i] ?? ZERO, b[i] ?? ZERO)));
}
function times(a: Polynomial, b: Polynomial): Rational[] {
  const out = Array<Rational>(Math.max(0, a.length + b.length - 1)).fill(ZERO);
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = add(out[i + j], mul(x, y)); }));
  return trim(out);
}
export function polynomialValue(p: Polynomial, x: Rational): Rational {
  return p.reduceRight((value, coefficient) => add(mul(value, x), coefficient), ZERO);
}
function derivative(p: Polynomial): Rational[] { return p.slice(1).map((v, i) => mul(v, rat(BigInt(i + 1)))); }
function divide(a: Polynomial, b: Polynomial): { quotient: Rational[]; remainder: Rational[] } {
  if (!b.length) throw new Error('Zero polynomial divisor');
  let remainder = trim(a);
  const quotient = Array<Rational>(Math.max(0, a.length - b.length + 1)).fill(ZERO);
  while (remainder.length >= b.length) {
    const i = remainder.length - b.length, q = div(remainder.at(-1)!, b.at(-1)!);
    quotient[i] = q;
    b.forEach((v, j) => { remainder[i + j] = sub(remainder[i + j], mul(q, v)); });
    remainder = trim(remainder);
  }
  return { quotient: trim(quotient), remainder };
}
function monic(p: Polynomial): Rational[] { return p.length ? p.map((v) => div(v, p.at(-1)!)) : []; }
function polynomialGcd(a: Polynomial, b: Polynomial): Rational[] {
  while (b.length) [a, b] = [b, divide(a, b).remainder];
  return monic(a);
}
export function characteristic(matrix: readonly (readonly Rational[])[]): Rational[] {
  const n = matrix.length;
  const determinant = (rows: readonly (readonly Polynomial[])[]): Rational[] => {
    if (!rows.length) return [ONE];
    return rows[0].reduce<Rational[]>((sum, entry, j) => plus(sum, times(
      j % 2 ? entry.map(neg) : entry,
      determinant(rows.slice(1).map((row) => row.filter((_, k) => k !== j))),
    )), []);
  };
  const p = determinant(matrix.map((row, i) => row.map((v, j) => i === j ? [v, neg(ONE)] : [v])));
  return Array.from({ length: n + 1 }, (_, i) => p[i] ?? ZERO);
}
export function squareFreeFactors(p: Polynomial): { polynomial: Polynomial; multiplicity: number }[] {
  const f = monic(p);
  let c = polynomialGcd(f, derivative(f)), w = divide(f, c).quotient;
  const factors = [];
  for (let multiplicity = 1; w.length > 1; multiplicity++) {
    const y = polynomialGcd(w, c), z = divide(w, y).quotient;
    if (z.length > 1) factors.push({ polynomial: z, multiplicity });
    w = y; c = divide(c, y).quotient;
  }
  return factors;
}

export interface IsolatedRoot { readonly value: Rational; readonly exact: boolean; readonly radius?: Rational }
/** 正規化行列の固有値は(-4,4)内。SturmのV(a)-V(b)は(a,b]の根数。 */
export function isolateRoots(p: Polynomial): { roots: IsolatedRoot[]; realCount: number; exhausted: boolean } {
  if (p.length === 2) return { roots: [{ value: div(neg(p[0]), p[1]), exact: true }], realCount: 1, exhausted: false };
  const chain: Polynomial[] = [p, derivative(p)];
  while (chain.at(-1)!.length > 1) {
    const next = divide(chain.at(-2)!, chain.at(-1)!).remainder.map(neg);
    if (!next.length) break;
    chain.push(next);
  }
  const variations = (x: Rational) => {
    let previous = 0, changes = 0;
    for (const polynomial of chain) {
      const n = polynomialValue(polynomial, x).n, sign = n < 0n ? -1 : n > 0n ? 1 : 0;
      if (sign) { if (previous && sign !== previous) changes++; previous = sign; }
    }
    return changes;
  };
  const left = rat(-4n), right = rat(4n), realCount = variations(left) - variations(right);
  const queue = [{ lo: left, hi: right, count: realCount, depth: 0 }];
  const roots: IsolatedRoot[] = [];
  let exhausted = false;
  while (queue.length) {
    const { lo, hi, count, depth } = queue.pop()!;
    if (!count) continue;
    const mid = div(add(lo, hi), rat(2n));
    if (count === 1) {
      if (!polynomialValue(p, hi).n) { roots.push({ value: hi, exact: true }); continue; }
      if (!polynomialValue(p, mid).n) { roots.push({ value: mid, exact: true }); continue; }
      // 相対幅を使う。小さい非零根を一律の絶対誤差で0へ押しつぶさない。
      if (compare(lo, ZERO) * compare(hi, ZERO) > 0
        && toNumber(sub(hi, lo)) <= 2e-15 * Math.max(Math.abs(toNumber(lo)), Math.abs(toNumber(hi)))) {
        roots.push({ value: mid, exact: false, radius: div(sub(hi, lo), rat(2n)) }); continue;
      }
    }
    if (depth >= 192) { exhausted = true; continue; }
    const lower = variations(lo) - variations(mid);
    queue.push({ lo: mid, hi, count: count - lower, depth: depth + 1 }, { lo, hi: mid, count: lower, depth: depth + 1 });
  }
  return { roots, realCount, exhausted };
}

/** 有理固有値の核。ピボットは厳密な非零で判定し、他Labのrank閾値を使わない。 */
export function rationalKernel(matrix: readonly (readonly Rational[])[], lambda: Rational): Rational[][] {
  const n = matrix.length;
  const rows = matrix.map((row, i) => row.map((v, j) => i === j ? sub(v, lambda) : v));
  const pivots: number[] = [];
  for (let col = 0, row = 0; col < n && row < n; col++) {
    const pivot = rows.findIndex((values, i) => i >= row && values[col].n !== 0n);
    if (pivot < 0) continue;
    [rows[row], rows[pivot]] = [rows[pivot], rows[row]];
    const value = rows[row][col];
    rows[row] = rows[row].map((v) => div(v, value));
    for (let i = 0; i < n; i++) if (i !== row) {
      const factor = rows[i][col];
      rows[i] = rows[i].map((v, j) => sub(v, mul(factor, rows[row][j])));
    }
    pivots.push(col); row++;
  }
  return Array.from({ length: n }, (_, i) => i).filter((i) => !pivots.includes(i)).map((free) => {
    const column = Array<Rational>(n).fill(ZERO); column[free] = ONE;
    pivots.forEach((col, row) => { column[col] = neg(rows[row][free]); });
    return column;
  });
}

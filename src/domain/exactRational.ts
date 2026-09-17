/** Binary64を正確な比として扱う共通算術。根探索・rank・表示丸めには依存しない。 */
export interface Rational { readonly n: bigint; readonly d: bigint }
export class RationalPrecisionLimit extends Error {}
export const ZERO: Rational = Object.freeze({ n: 0n, d: 1n });
export const ONE: Rational = Object.freeze({ n: 1n, d: 1n });
const abs = (n: bigint) => n < 0n ? -n : n;
const bits = (n: bigint) => abs(n).toString(2).length;

export interface RationalBudget {
  readonly rationalBits: number;
  readonly temporaryBits: number;
  readonly operations: number;
  readonly remainders: number;
}

/** 予算は呼出し単位。共有のグローバルカウンタを使わず、再現性と既存APIを守る。 */
export function createRationalArithmetic(budget?: RationalBudget) {
  let operations = 0, remainders = 0;
  const tick = () => {
    if (!budget) return;
    operations++;
    if (budget && operations > budget.operations) throw new RationalPrecisionLimit('Rational operation budget');
  };
  const temporary = (size: number) => {
    if (budget && size > budget.temporaryBits) throw new RationalPrecisionLimit('Rational temporary bit budget');
  };
  function rat(n: bigint, d = 1n): Rational {
    tick();
    if (budget) temporary(Math.max(bits(n), bits(d)));
    if (!d) throw new Error('Zero rational denominator');
    if (!n) return ZERO;
    let a = n, b = d;
    while (b) {
      if (budget) remainders++;
      if (budget && remainders > budget.remainders) throw new RationalPrecisionLimit('Rational GCD budget');
      [a, b] = [b, a % b];
    }
    const g = abs(a) * (d < 0n ? -1n : 1n);
    n /= g; d /= g;
    if (bits(n) + bits(d) > (budget?.rationalBits ?? 32768)) throw new RationalPrecisionLimit('Rational bit budget');
    return { n, d };
  }
  const neg = (a: Rational): Rational => { tick(); return { n: -a.n, d: a.d }; };
  const add = (a: Rational, b: Rational): Rational => {
    tick();
    if (budget) {
      temporary(Math.max(bits(a.n) + bits(b.d), bits(b.n) + bits(a.d)) + 1);
      temporary(bits(a.d) + bits(b.d));
    }
    return rat(a.n * b.d + b.n * a.d, a.d * b.d);
  };
  const sub = (a: Rational, b: Rational) => { tick(); return add(a, neg(b)); };
  const mul = (a: Rational, b: Rational): Rational => {
    tick();
    if (budget) temporary(Math.max(bits(a.n) + bits(b.n), bits(a.d) + bits(b.d)));
    return rat(a.n * b.n, a.d * b.d);
  };
  const div = (a: Rational, b: Rational): Rational => {
    tick();
    if (budget) temporary(Math.max(bits(a.n) + bits(b.d), bits(a.d) + bits(b.n)));
    return rat(a.n * b.d, a.d * b.n);
  };
  const compare = (a: Rational, b: Rational): number => {
    tick();
    if (budget) temporary(Math.max(bits(a.n) + bits(b.d), bits(b.n) + bits(a.d)) + 1);
    const n = a.n * b.d - b.n * a.d;
    return n < 0n ? -1 : n > 0n ? 1 : 0;
  };
  function fromNumber(value: number): Rational {
    tick();
    if (!Number.isFinite(value)) throw new Error('Finite number required');
    if (!value) return ZERO;
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, value);
    const raw = view.getBigUint64(0), exponent = Number((raw >> 52n) & 2047n);
    const fraction = raw & ((1n << 52n) - 1n);
    const significand = (exponent ? (1n << 52n) | fraction : fraction) * (value < 0 ? -1n : 1n);
    const shift = exponent ? exponent - 1075 : -1074;
    if (budget) temporary(Math.max(bits(significand) + Math.max(0, shift), 1 + Math.max(0, -shift)));
    return shift >= 0 ? rat(significand << BigInt(shift)) : rat(significand, 1n << BigInt(-shift));
  }
  return { rat, neg, add, sub, mul, div, compare, fromNumber,
    diagnostics: () => ({ operations, remainders }) };
}

// 既存の固有値／対角化計算には追加の回数・一時bit上限を課さない。
export const { rat, neg, add, sub, mul, div, compare, fromNumber } = createRationalArithmetic();
export function toNumber(a: Rational): number {
  if (!a.n) return 0;
  const n = abs(a.n);
  const sn = Math.max(0, bits(n) - 54), sd = Math.max(0, bits(a.d) - 54);
  const exponent = sn - sd, first = Math.max(-1022, Math.min(1023, exponent));
  return (a.n < 0n ? -1 : 1) * (Number(n >> BigInt(sn)) / Number(a.d >> BigInt(sd))) * 2 ** first * 2 ** (exponent - first);
}

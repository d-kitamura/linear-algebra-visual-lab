import { describe, expect, it } from 'vitest';
import { characteristic, EigenPrecisionLimit, fromNumber, isolateRoots, polynomialValue, rat, rationalKernel, squareFreeFactors, toNumber } from '../../src/domain/eigenExact';

describe('固有値専用の正確な有理数と根区間', () => {
  it('binary64を文字列丸めせず往復する', () => {
    const values = [0, -0, Number.MIN_VALUE, Number.MAX_VALUE, Number.EPSILON, -0.1, 1 / 3, 1e-300, 1e6];
    for (let i = 0; i < 80; i++) values.push((1 + i / 83) * 2 ** (-1000 + i * 25));
    for (const v of values) expect(toNumber(fromNumber(v))).toBe(v === 0 ? 0 : v);
  });

  it('正確な平方因子から有理数の重根と単根を分離する', () => {
    // (3x−1)^2(7x−3)。根を先に小数にしてから比較してはいけない。
    const p = [-3n, 25n, -69n, 63n].map((v) => rat(v));
    const factors = squareFreeFactors(p);
    expect(factors.map((f) => f.multiplicity)).toEqual([1, 2]);
    const roots = factors.map((f) => isolateRoots(f.polynomial).roots[0]);
    expect(roots[0]).toEqual({ value: rat(3n, 7n), exact: true });
    expect(roots[1]).toEqual({ value: rat(1n, 3n), exact: true });
    roots.forEach((r) => expect(polynomialValue(p, r.value).n).toBe(0n));
  });

  it('Sturm列は実根数と区間端の根を重複せず数える', () => {
    for (const [coefficients, expected] of [
      [[0, -1, 0, 1], [-1, 0, 1]], [[1, 0, 1], []], [[-2, 0, 0, 1], [Math.cbrt(2)]],
    ] as const) {
      const result = isolateRoots(coefficients.map(fromNumber));
      expect(result.realCount).toBe(expected.length);
      expect(result.exhausted).toBe(false);
      expect(result.roots).toHaveLength(expected.length);
      result.roots.map((r) => toNumber(r.value)).sort((a, b) => a - b)
        .forEach((value, i) => expect(value).toBeCloseTo(expected[i], 13));
    }
  });

  it('有理固有値の核と係数は小さい非零ピボットを捨てない', () => {
    const tiny = fromNumber(1e-300);
    const matrix = [[tiny, rat(0n)], [rat(0n), rat(0n)]];
    expect(characteristic(matrix)).toEqual([rat(0n), { n: -tiny.n, d: tiny.d }, rat(1n)]);
    expect(rationalKernel(matrix, rat(0n))).toEqual([[rat(0n), rat(1n)]]);
  });

  it('有限のbit budgetを超える処理を止める', () => {
    expect(() => rat(1n << 32768n)).toThrow(EigenPrecisionLimit);
  });
});

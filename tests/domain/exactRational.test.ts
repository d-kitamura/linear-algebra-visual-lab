import { describe, expect, it } from 'vitest';
import { createRationalArithmetic, RationalPrecisionLimit, fromNumber, toNumber, rat, add, mul } from '../../src/domain/exactRational';
import * as legacy from '../../src/domain/eigenExact';
import { INNER_PRODUCT_BUDGET } from '../../src/domain/innerProductNumerics';

describe('共通有理数算術と既存APIの互換', () => {
  it('従来の関数・例外の同一性を保つ', () => {
    expect(legacy.EigenPrecisionLimit).toBe(RationalPrecisionLimit);
    expect(legacy.fromNumber).toBe(fromNumber);
    expect(legacy.add).toBe(add);
    expect(legacy.mul).toBe(mul);
    expect(legacy.rat(2n, -6n)).toEqual({ n: -1n, d: 3n });
  });
  it.each([0, -0, 1, -2, 0.1, 1e-200, Number.MIN_VALUE, 1e6])('binary64の%sを往復する', value => {
    expect(toNumber(fromNumber(value))).toBe(value === 0 ? 0 : value);
    expect(fromNumber(value).d).toBeGreaterThan(0n);
  });
  it('10進の0.1を厳密な1/10へ置き換えない', () => {
    expect(fromNumber(0.1)).toEqual({ n: 3602879701896397n, d: 36028797018963968n });
    expect(add(rat(1n, 3n), rat(1n, 6n))).toEqual({ n: 1n, d: 2n });
  });
  it('既存の32768bit上限と例外を維持する', () => {
    expect(() => legacy.rat(1n << 32768n)).toThrow(legacy.EigenPrecisionLimit);
  });
  it('演算数の境界はAPIごとに独立', () => {
    const first = createRationalArithmetic({ ...INNER_PRODUCT_BUDGET, operations: 1 });
    const second = createRationalArithmetic({ ...INNER_PRODUCT_BUDGET, operations: 1 });
    expect(first.rat(1n)).toEqual({ n: 1n, d: 1n });
    expect(() => first.rat(2n)).toThrow(RationalPrecisionLimit);
    expect(second.rat(2n)).toEqual({ n: 2n, d: 1n });
  });
  it('約分後bit上限・GCD回数・演算前の一時bit上限を別に検査', () => {
    const small = createRationalArithmetic({ ...INNER_PRODUCT_BUDGET, rationalBits: 4 });
    expect(small.rat(32n, 32n)).toEqual({ n: 1n, d: 1n });
    expect(() => small.rat(8n, 1n)).toThrow(RationalPrecisionLimit);
    const gcd = createRationalArithmetic({ ...INNER_PRODUCT_BUDGET, remainders: 1 });
    expect(() => gcd.rat(13n, 8n)).toThrow(RationalPrecisionLimit);
    const temporary = createRationalArithmetic({ ...INNER_PRODUCT_BUDGET, temporaryBits: 8 });
    expect(() => temporary.mul({ n: 16n, d: 1n }, { n: 16n, d: 1n })).toThrow(RationalPrecisionLimit);
    expect(temporary.diagnostics().remainders).toBe(0); // 大きい積やGCDを実行する前に停止。
  });
  it('追加予算を指定しない従来経路は新しい回数上限を持たない', () => {
    const unlimited = createRationalArithmetic();
    for (let i = 0; i < 20001; i++) unlimited.rat(1n);
    expect(unlimited.rat(2n)).toEqual({ n: 2n, d: 1n });
  });
});

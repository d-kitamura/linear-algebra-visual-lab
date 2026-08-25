import { describe, expect, it } from 'vitest';
import {
  createPolynomialTerms,
  formatPolynomialExpression,
  polynomialCoefficientLabel,
} from '../../src/domain';

describe('多項式と係数ベクトルの対応', () => {
  it('係数を定数項から昇べき順の項へ変換する', () => {
    expect(createPolynomialTerms([1, -2, 3])).toEqual([
      { degree: 0, coefficient: 1 },
      { degree: 1, coefficient: -2 },
      { degree: 2, coefficient: 3 },
    ]);
  });

  it('零係数を省略し、零多項式だけは0として残す', () => {
    expect(createPolynomialTerms([0, 2, 0])).toEqual([
      { degree: 1, coefficient: 2 },
    ]);
    expect(createPolynomialTerms([0, -0, 0])).toEqual([
      { degree: 0, coefficient: 0 },
    ]);
  });

  it('係数1と符号を一般的な多項式表記へ整形する', () => {
    expect(formatPolynomialExpression([1, 3, 1])).toBe('1 + 3x + x^2');
    expect(formatPolynomialExpression([-1, -1, 2])).toBe('-1 - x + 2x^2');
    expect(formatPolynomialExpression([0, 0, 0])).toBe('0');
  });

  it('係数入力の読み上げ名を次数に応じて返す', () => {
    expect(polynomialCoefficientLabel(0)).toBe('定数項');
    expect(polynomialCoefficientLabel(1)).toBe('xの係数');
    expect(polynomialCoefficientLabel(2)).toBe('xの2乗の係数');
  });

  it('不正な係数と次数を拒否する', () => {
    expect(() => createPolynomialTerms([])).toThrow(TypeError);
    expect(() => createPolynomialTerms([1, Number.NaN])).toThrow(TypeError);
    expect(() => polynomialCoefficientLabel(-1)).toThrow(RangeError);
  });
});

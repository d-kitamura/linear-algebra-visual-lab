import { describe, expect, it } from 'vitest';
import { formatMathNumber } from '../../src/ui';

describe('math number presentation', () => {
  it('keeps exact short values and normalizes negative zero', () => {
    expect(formatMathNumber(3)).toEqual({ text: '3', approximate: false });
    expect(formatMathNumber(-0)).toEqual({ text: '0', approximate: false });
    expect(formatMathNumber(-2.5)).toEqual({ text: '−2.5', approximate: false });
  });

  it('marks a rounded coefficient so the UI can use an approximation sign', () => {
    expect(formatMathNumber(1 / 3)).toEqual({ text: '0.333333', approximate: true });
    expect(formatMathNumber(2.999999999999)).toEqual({ text: '3', approximate: true });
  });

  it('uses compact scientific notation for very small and large values', () => {
    expect(formatMathNumber(0.000012345678)).toEqual({
      text: '1.23457e−5',
      approximate: true,
    });
    expect(formatMathNumber(1_000_000)).toEqual({
      text: '1e6',
      approximate: false,
    });
  });

  it('rejects invalid values and digit settings', () => {
    expect(() => formatMathNumber(Number.NaN)).toThrow(TypeError);
    expect(() => formatMathNumber(1, 0)).toThrow(RangeError);
  });
});

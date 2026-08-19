import { describe, expect, it } from 'vitest';
import { parseCoordinateInput } from '../../src/state';

describe('2D vector coordinate input', () => {
  it('accepts decimal and exponential notation', () => {
    expect(parseCoordinateInput('-2.5')).toEqual({ ok: true, value: -2.5 });
    expect(parseCoordinateInput(' 1e2 ')).toEqual({ ok: true, value: 100 });
  });

  it('normalizes negative zero', () => {
    expect(parseCoordinateInput('-0')).toEqual({ ok: true, value: 0 });
  });

  it('keeps an empty intermediate input out of the mathematical state', () => {
    expect(parseCoordinateInput('')).toMatchObject({ ok: false, code: 'EMPTY' });
    expect(parseCoordinateInput('   ')).toMatchObject({ ok: false, code: 'EMPTY' });
  });

  it('rejects unfinished, non-decimal, and non-finite values', () => {
    expect(parseCoordinateInput('-')).toMatchObject({ ok: false, code: 'NOT_A_NUMBER' });
    expect(parseCoordinateInput('1e')).toMatchObject({ ok: false, code: 'NOT_A_NUMBER' });
    expect(parseCoordinateInput('0x10')).toMatchObject({ ok: false, code: 'NOT_A_NUMBER' });
    expect(parseCoordinateInput('Infinity')).toMatchObject({ ok: false, code: 'NOT_A_NUMBER' });
  });

  it('enforces the shared-state coordinate safety limit', () => {
    expect(parseCoordinateInput('1000000')).toEqual({ ok: true, value: 1_000_000 });
    expect(parseCoordinateInput('1000001')).toMatchObject({
      ok: false,
      code: 'OUT_OF_RANGE',
    });
  });
});

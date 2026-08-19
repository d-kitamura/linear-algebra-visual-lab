import { MAX_ABSOLUTE_COORDINATE } from '../sharing';

const DECIMAL_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u;

export type CoordinateInputErrorCode = 'EMPTY' | 'NOT_A_NUMBER' | 'OUT_OF_RANGE';

export type CoordinateInputResult =
  | { readonly ok: true; readonly value: number }
  | {
      readonly ok: false;
      readonly code: CoordinateInputErrorCode;
      readonly message: string;
    };

export function parseCoordinateInput(input: string): CoordinateInputResult {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return {
      ok: false,
      code: 'EMPTY',
      message: '成分を入力してください。',
    };
  }

  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) {
    return {
      ok: false,
      code: 'NOT_A_NUMBER',
      message: '整数、小数、または指数表記で入力してください。',
    };
  }

  const value = Number(trimmed);

  if (!Number.isFinite(value)) {
    return {
      ok: false,
      code: 'NOT_A_NUMBER',
      message: '有限な数を入力してください。',
    };
  }

  if (Math.abs(value) > MAX_ABSOLUTE_COORDINATE) {
    return {
      ok: false,
      code: 'OUT_OF_RANGE',
      message: `成分は ±${MAX_ABSOLUTE_COORDINATE.toLocaleString('ja-JP')} 以内で入力してください。`,
    };
  }

  return { ok: true, value: Object.is(value, -0) ? 0 : value };
}

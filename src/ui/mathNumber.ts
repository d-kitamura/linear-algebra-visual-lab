export interface FormattedMathNumber {
  readonly text: string;
  readonly approximate: boolean;
}

const DEFAULT_SIGNIFICANT_DIGITS = 6;

/**
 * 教材の係数表示を読みやすい桁数へ丸め、丸めの有無も同時に返す。
 * 呼び出し側は approximate=true の値を式へ使う場合に ≈ を表示する。
 */
export function formatMathNumber(
  value: number,
  significantDigits = DEFAULT_SIGNIFICANT_DIGITS,
): FormattedMathNumber {
  if (!Number.isFinite(value)) {
    throw new TypeError('表示する数は有限値である必要があります。');
  }
  if (!Number.isInteger(significantDigits) || significantDigits < 1 || significantDigits > 15) {
    throw new RangeError('有効数字は1桁以上15桁以下の整数である必要があります。');
  }

  const normalized = Object.is(value, -0) ? 0 : value;
  const rounded = normalized === 0 ? 0 : Number(normalized.toPrecision(significantDigits));
  const absolute = Math.abs(rounded);
  const rawText = absolute !== 0 && (absolute >= 1_000_000 || absolute < 0.0001)
    ? stripExponentPadding(rounded.toExponential(significantDigits - 1))
    : String(rounded);

  return {
    text: rawText.replaceAll('-', '−'),
    approximate: rounded !== normalized,
  };
}

function stripExponentPadding(value: string): string {
  return value
    .replace(/(\.\d*?[1-9])0+(?=e)/u, '$1')
    .replace(/\.0+(?=e)/u, '')
    .replace(/e\+/u, 'e')
    .replace(/e(-?)0+(\d+)/u, 'e$1$2');
}

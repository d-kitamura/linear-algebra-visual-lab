export interface PolynomialTerm {
  readonly degree: number;
  readonly coefficient: number;
}

export function createPolynomialTerms(
  coefficients: readonly number[],
): readonly PolynomialTerm[] {
  if (coefficients.length === 0 || coefficients.some((value) => !Number.isFinite(value))) {
    throw new TypeError('多項式の係数は1個以上の有限値である必要があります。');
  }

  const terms = coefficients.flatMap((coefficient, degree) => {
    const normalized = Object.is(coefficient, -0) ? 0 : coefficient;
    return normalized === 0 ? [] : [{ degree, coefficient: normalized }];
  });
  return terms.length > 0 ? terms : [{ degree: 0, coefficient: 0 }];
}

export function formatPolynomialExpression(coefficients: readonly number[]): string {
  return createPolynomialTerms(coefficients)
    .map((term, index) => {
      const negative = term.coefficient < 0;
      const absolute = Math.abs(term.coefficient);
      const variable = term.degree === 0
        ? ''
        : term.degree === 1
          ? 'x'
          : `x^${term.degree}`;
      const coefficient = term.degree > 0 && absolute === 1 ? '' : formatNumber(absolute);
      const body = `${coefficient}${variable}` || '0';

      if (index === 0) {
        return negative ? `-${body}` : body;
      }
      return negative ? ` - ${body}` : ` + ${body}`;
    })
    .join('');
}

export function polynomialCoefficientLabel(degree: number): string {
  if (!Number.isInteger(degree) || degree < 0) {
    throw new RangeError('多項式の次数は0以上の整数である必要があります。');
  }
  if (degree === 0) {
    return '定数項';
  }
  if (degree === 1) {
    return 'xの係数';
  }
  return `xの${degree}乗の係数`;
}

function formatNumber(value: number): string {
  return String(Number(value.toPrecision(10)));
}

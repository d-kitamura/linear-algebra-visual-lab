const UNICODE_SUBSCRIPT_DIGITS: Readonly<Record<string, string>> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
};

export interface VectorNameParts {
  readonly base: string;
  readonly subscript?: string;
}

export function splitVectorName(name: string): VectorNameParts {
  const unicodeMatch = /^(.*?)([₀-₉]+)$/u.exec(name);
  if (unicodeMatch && unicodeMatch[1].length > 0) {
    return {
      base: unicodeMatch[1],
      subscript: [...unicodeMatch[2]].map((digit) => UNICODE_SUBSCRIPT_DIGITS[digit]).join(''),
    };
  }

  const underscoreMatch = /^(.*?)_([0-9]+)$/u.exec(name);
  if (underscoreMatch && underscoreMatch[1].length > 0) {
    return { base: underscoreMatch[1], subscript: underscoreMatch[2] };
  }

  const asciiMatch = /^(.*?)([0-9]+)$/u.exec(name);
  if (asciiMatch && asciiMatch[1].length > 0) {
    return { base: asciiMatch[1], subscript: asciiMatch[2] };
  }

  return { base: name };
}

export function formatVectorSpokenName(name: string): string {
  const { base, subscript } = splitVectorName(name);
  return subscript ? `${base} 添え字 ${subscript}` : base;
}

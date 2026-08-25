import { describe, expect, it } from 'vitest';
import { formatVectorSpokenName, splitVectorName } from '../../src/ui';

describe('mathematical vector-name notation', () => {
  it('separates Unicode subscript digits from the vector symbol', () => {
    expect(splitVectorName('v₁')).toEqual({ base: 'v', subscript: '1' });
    expect(splitVectorName('a₁₂')).toEqual({ base: 'a', subscript: '12' });
  });

  it('supports underscore notation used by TeX-style source text', () => {
    expect(splitVectorName('v_2')).toEqual({ base: 'v', subscript: '2' });
  });

  it('supports trailing ASCII digits used by local Lab state', () => {
    expect(splitVectorName('a1')).toEqual({ base: 'a', subscript: '1' });
    expect(splitVectorName('a12')).toEqual({ base: 'a', subscript: '12' });
  });

  it('keeps an unsubscripted vector name intact', () => {
    expect(splitVectorName('u')).toEqual({ base: 'u' });
  });

  it('provides an explicit spoken form for a numeric subscript', () => {
    expect(formatVectorSpokenName('v₁')).toBe('v 添え字 1');
    expect(formatVectorSpokenName('a_12')).toBe('a 添え字 12');
    expect(formatVectorSpokenName('u')).toBe('u');
  });
});

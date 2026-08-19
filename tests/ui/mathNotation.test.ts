import { describe, expect, it } from 'vitest';
import { splitVectorName } from '../../src/ui';

describe('mathematical vector-name notation', () => {
  it('separates Unicode subscript digits from the vector symbol', () => {
    expect(splitVectorName('v₁')).toEqual({ base: 'v', subscript: '1' });
    expect(splitVectorName('a₁₂')).toEqual({ base: 'a', subscript: '12' });
  });

  it('supports underscore notation used by TeX-style source text', () => {
    expect(splitVectorName('v_2')).toEqual({ base: 'v', subscript: '2' });
  });

  it('keeps an unsubscripted vector name intact', () => {
    expect(splitVectorName('u')).toEqual({ base: 'u' });
  });
});

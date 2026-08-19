import { describe, expect, it } from 'vitest';
import { describeLinearCombinationStatus } from '../../src/ui';

describe('linear-combination status presentation', () => {
  it('uses the textbook term 不能 for no solution', () => {
    expect(describeLinearCombinationStatus('none')).toMatchObject({
      term: '不能（解なし）',
      heading: '一次結合では表現できません',
    });
  });

  it('uses the textbook term 唯一解 for one solution', () => {
    expect(describeLinearCombinationStatus('unique')).toMatchObject({
      term: '唯一解',
      heading: '表し方は一意です',
    });
  });

  it('uses the textbook term 不定 for infinitely many solutions', () => {
    expect(describeLinearCombinationStatus('infinite')).toMatchObject({
      term: '不定（解が無数）',
      heading: '表し方は無数にあります',
    });
  });
});

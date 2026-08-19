import type { LinearCombinationStatus } from '../domain';

export interface LinearCombinationStatusPresentation {
  readonly symbol: string;
  readonly term: string;
  readonly heading: string;
  readonly explanation: string;
}

export function describeLinearCombinationStatus(
  status: LinearCombinationStatus,
): LinearCombinationStatusPresentation {
  if (status === 'none') {
    return {
      symbol: '×',
      term: '不能（解なし）',
      heading: '一次結合では表現できません',
      explanation: 'どのように係数を選んでも、選択したベクトルの一次結合はターゲットに一致しません。',
    };
  }
  if (status === 'unique') {
    return {
      symbol: '1',
      term: '唯一解',
      heading: '表し方は一意です',
      explanation: 'ターゲットを表す一次結合係数の組は、ただ1つに定まります。',
    };
  }

  return {
    symbol: '∞',
    term: '不定（解が無数）',
    heading: '表し方は無数にあります',
    explanation: 'ターゲットは表現できますが、同じターゲットを作る異なる係数の組が無数にあります。',
  };
}

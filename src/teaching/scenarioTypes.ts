import type { LinearCombinationStatus } from '../domain';
import type { ShareState } from '../sharing';

export interface TeachingScenario {
  readonly id: string;
  readonly title: string;
  readonly learningPoint: string;
  readonly state: ShareState;
  readonly expected: {
    readonly vectorCount: number;
    readonly rank: number;
    readonly isLinearlyIndependent: boolean;
  };
}

export interface LinearCombinationTeachingScenario extends TeachingScenario {
  readonly linearCombinationExpected: {
    readonly status: LinearCombinationStatus;
    readonly rank: number;
    readonly augmentedRank: number;
  };
}

import type { LinearCombinationStatus } from '../domain';
import type { BasisCoordinateStatus } from '../domain';
import type {
  BasisDimensionShareState,
  LinearMapShareState,
  ShareState,
} from '../sharing';

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

export interface BasisDimensionTeachingScenario {
  readonly id: string;
  readonly title: string;
  readonly learningPoint: string;
  readonly state: BasisDimensionShareState;
  readonly expected: {
    readonly sourceRank: number;
    readonly candidateRank: number;
    readonly isBasis: boolean;
    readonly coordinateStatus: BasisCoordinateStatus;
  };
}

export interface LinearMapTeachingScenario {
  readonly id: string;
  readonly title: string;
  readonly learningPoint: string;
  readonly state: LinearMapShareState;
  readonly expected: {
    readonly rank: number;
    readonly nullity: number;
    readonly isInjective: boolean;
    readonly isSurjective: boolean;
    readonly isBijective: boolean;
  };
}

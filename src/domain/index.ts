export {
  DEFAULT_RELATIVE_TOLERANCE,
  InvalidVectorSetError,
  analyzeVectorSet,
} from './vectorSet';

export {
  InvalidLinearCombinationError,
  analyzeLinearCombination,
} from './linearCombination';

export type {
  LinearCombinationAnalysis,
  LinearCombinationStatus,
  LinearCombinationValidationCode,
} from './linearCombination';

export type {
  RankOptions,
  VectorDimension,
  VectorSet,
  VectorSetAnalysis,
  VectorSetValidationCode,
  VectorValue,
} from './vectorSet';

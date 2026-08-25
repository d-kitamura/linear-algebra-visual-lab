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

export {
  InvalidBasisCandidateError,
  analyzeBasisCandidate,
  extractBasisExample,
} from './basisDimension';

export type {
  BasisCandidateAnalysis,
  BasisCandidateValidationCode,
  BasisFailureReason,
} from './basisDimension';

export { analyzeBasisCoordinates } from './basisCoordinates';

export type {
  BasisCoordinateAnalysis,
  BasisCoordinateStatus,
} from './basisCoordinates';

export {
  createPolynomialTerms,
  formatPolynomialExpression,
  polynomialCoefficientLabel,
} from './polynomial';

export type { PolynomialTerm } from './polynomial';

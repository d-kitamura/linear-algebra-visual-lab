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
  VectorSpaceDimension,
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
  BasisAnalysisOptions,
  BasisTargetSpace,
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

export {
  MAX_ABSOLUTE_LINEAR_MAP_INPUT,
  InvalidLinearMapError,
  analyzeLinearMap,
  analyzeLinearMapLinearity,
  applyLinearMap,
} from './linearMap';

export type {
  LinearMapAnalysis,
  LinearMapDefinition,
  LinearMapLinearityAnalysis,
  LinearMapValidationCode,
} from './linearMap';

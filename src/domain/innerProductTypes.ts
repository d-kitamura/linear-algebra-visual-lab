/** 第7Labの数学的結果。全ベクトル配列は基準基底での列成分、行列は行配列。 */
export type MetricId = 'euclidean' | 'coefficient' | 'integral';
export type MetricDefinition = Readonly<{ dimension: 0 | 1 | 2 | 3; metric: MetricId }>;
export type OrderedInput = Readonly<{ id: number; components: readonly number[] }>;
export type ExactScalar = Readonly<{ numerator: bigint; denominator: bigint }>;
export type InnerProductIssue = 'rational-budget' | 'unrepresentable-result' | 'residual-too-large' | 'inconsistent-analysis';
export type Value<T> = Readonly<{ status: 'ready'; value: T }> |
  Readonly<{ status: 'unavailable'; reason: 'unrepresentable-result' | 'residual-too-large' }>;
export type StageKey =
  Readonly<{ inputId: number; phase: 'input' | 'residual' | 'normalize' | 'skip' | 'hold' }> |
  Readonly<{ inputId: number; phase: 'projection'; count: number }>;
export interface InnerProductMetric {
  readonly definition: MetricDefinition;
  readonly gram: readonly (readonly ExactScalar[])[];
  readonly transform: readonly (readonly number[])[];
  readonly inverseTransform: readonly (readonly number[])[];
  readonly axes: readonly string[];
}
export interface ScalarResult { readonly exact: ExactScalar; readonly numeric: Value<number> }
export interface VectorResult { readonly exact: readonly ExactScalar[]; readonly numeric: Value<readonly number[]> }
export interface InnerProductDiagnostics {
  readonly operations: number;
  readonly remainders: number;
  readonly tolerance: number;
  readonly maxResidual: number;
}
export type AngleResult = Readonly<{ status: 'ready'; degrees: number }> |
  Readonly<{ status: 'undefined-zero-vector' }> |
  Readonly<{ status: 'inconclusive'; reason: InnerProductIssue }>;
export interface PairAnalysis {
  readonly definition: MetricDefinition;
  readonly u: readonly number[];
  readonly v: readonly number[];
  readonly status: 'complete' | 'partial' | 'numerical-failure';
  readonly innerProduct: ScalarResult | null;
  readonly uNormSquared: ScalarResult | null;
  readonly vNormSquared: ScalarResult | null;
  readonly uNorm: Value<number> | null;
  readonly vNorm: Value<number> | null;
  readonly angle: AngleResult | null;
  readonly projection: Readonly<{ kind: 'line' | 'zero-subspace'; coefficient: ScalarResult | null;
    vector: VectorResult; residual: VectorResult }> | null;
  readonly issues: readonly InnerProductIssue[];
  readonly diagnostics: InnerProductDiagnostics;
}
export interface ProjectionStep {
  readonly ontoSourceId: number;
  readonly coefficient: ScalarResult;
  readonly vector: VectorResult;
  readonly cumulativeResidual: VectorResult;
}
export interface AcceptedOrthogonalVector {
  readonly sourceId: number;
  readonly outputIndex: number;
  readonly w: VectorResult;
  readonly normSquared: ScalarResult;
  readonly norm: Value<number>;
  readonly q: readonly number[];
}
export interface GramSchmidtStep {
  readonly sourceId: number;
  readonly inputPosition: number;
  readonly previousSourceIds: readonly number[];
  readonly projections: readonly ProjectionStep[];
  readonly residual: VectorResult | null;
  readonly normSquared: ScalarResult | null;
  readonly norm: Value<number> | null;
  readonly outcome: 'accepted' | 'skipped-zero-input' | 'skipped-dependent' | 'inconclusive' | 'numerical-failure';
  readonly outputIndex: number | null;
  readonly q: readonly number[] | null;
}
export interface GramSchmidtAnalysis {
  readonly definition: MetricDefinition;
  readonly inputs: readonly OrderedInput[];
  readonly steps: readonly GramSchmidtStep[];
  readonly accepted: readonly AcceptedOrthogonalVector[];
  readonly availableStages: readonly StageKey[];
  readonly status: 'complete' | 'inconclusive' | 'numerical-failure';
  readonly issues: readonly InnerProductIssue[];
  readonly processedCount: number;
  readonly basisOfSpan: true | null;
  readonly basisOfAmbient: boolean | null;
  readonly diagnostics: InnerProductDiagnostics;
}
export class InvalidInnerProductInputError extends Error {}

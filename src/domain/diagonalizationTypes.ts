import type { EigenIssue, EigenMapAnalysis, EigenMapDefinition } from './eigenTypes';

export type DiagonalizationIssue = EigenIssue | 'non-real-spectrum' | 'insufficient-eigenvectors'
  | 'incomplete-eigenspaces' | 'ill-conditioned-basis' | 'basis-solve-failed' | 'inconsistent-analysis';
export interface DiagonalizationCriterion {
  readonly status: 'satisfied' | 'not-satisfied' | 'undetermined';
  readonly reason: 'empty-space' | 'full-eigenbasis' | 'non-real-spectrum' | 'insufficient-eigenvectors'
    | 'incomplete-eigenspaces' | 'inconsistent-analysis';
  /** 未確認空間を0次元として足さない。 */
  readonly realSpaceDimensionSum: number | null;
}
export interface DiagonalizationBasis {
  /** 実根昇順・空間内のAPI順の列配列。order適用前。 */
  readonly canonicalColumns: readonly (readonly number[])[];
  /** canonicalColumnsの各列に対応する、eigenAnalysis.realEigenvaluesの序数。 */
  readonly eigenvalueIndices: readonly number[];
  /** 現在の表示列→基準順の列番号。直前の順序に対する置換ではない。 */
  readonly order: readonly number[];
  /** p、d、inversePはn×nの行配列。 */
  readonly p: readonly (readonly number[])[];
  readonly d: readonly (readonly number[])[];
  readonly inverseP: readonly (readonly number[])[];
  readonly conditionInfinity: number;
  readonly residuals: {
    /** canonicalColumnsと同じ基準順。ほかの行列残差は現在のorder適用後。 */
    readonly eigenColumns: readonly number[];
    readonly intertwining: number;
    readonly leftInverse: number;
    readonly rightInverse: number;
  };
}
interface AnalysisBase {
  readonly definition: EigenMapDefinition;
  readonly eigenAnalysis: EigenMapAnalysis;
  readonly criterion: DiagonalizationCriterion;
  readonly issues: readonly DiagonalizationIssue[];
}
export type DiagonalizationAnalysis = AnalysisBase & (
  | { readonly status: 'ready'; readonly basis: DiagonalizationBasis }
  | { readonly status: 'not-diagonalizable' | 'inconclusive' | 'numerical-failure'; readonly basis: null }
);
export interface DiagonalizationCoordinates {
  readonly inputCoordinates: readonly number[]; // c: P c=u
  readonly imageCoordinates: readonly number[]; // d: P d=Au（独立に解く）
  readonly imageCoordinatesViaDiagonal: readonly number[]; // D c
  readonly inputViaCoordinates: readonly number[]; // P c
  readonly imageViaCoordinates: readonly number[]; // P(D c)
  readonly residuals: {
    readonly input: number;
    readonly image: number;
    readonly solvedImage: number;
    readonly coordinateAgreement: number;
  };
}
interface InputBase {
  readonly inputVector: readonly number[];
  readonly imageVector: readonly number[] | null;
  readonly issues: readonly DiagonalizationIssue[];
}
export type DiagonalizationInputAnalysis = InputBase & (
  | { readonly status: 'ready'; readonly coordinates: DiagonalizationCoordinates }
  | { readonly status: 'unavailable-basis' | 'inconclusive' | 'numerical-failure'; readonly coordinates: null }
);
export class InvalidDiagonalizationInputError extends Error {
  constructor(readonly code: 'INVALID_ORDER' | 'UNAVAILABLE_BASIS' | 'INVALID_ANALYSIS', message: string) {
    super(message); this.name = 'InvalidDiagonalizationInputError';
  }
}

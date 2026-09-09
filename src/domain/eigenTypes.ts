import type { VectorSpaceDimension } from './vectorSet';

export interface EigenMapDefinition {
  readonly dimension: VectorSpaceDimension;
  /** n×nの行配列。0Dは[]。 */
  readonly matrix: readonly (readonly number[])[];
}
export type EigenIssue = 'unresolved-cluster' | 'ambiguous-realness' | 'ambiguous-multiplicity'
  | 'unstable-nullity' | 'residual-too-large' | 'incomplete-spectrum' | 'iteration-limit'
  | 'non-finite-result' | 'precision-limit' | 'unrepresentable-result';
export interface EigenSpace {
  readonly dimension: number;
  /** 正規直交化した列ベクトルの配列。共有せず、所属・描画用に使う。 */
  readonly basis: readonly (readonly number[])[];
  readonly maxRelativeResidual: number;
}
export interface RealEigenvalue {
  readonly value: number;
  readonly algebraicMultiplicity: number | null;
  readonly eigenspace: EigenSpace | null;
  readonly issues: readonly EigenIssue[];
}
export interface EigenMapAnalysis {
  readonly definition: EigenMapDefinition;
  readonly status: 'ready' | 'no-real-eigenvalues' | 'inconclusive' | 'numerical-failure';
  readonly characteristicCoefficients: readonly number[] | null;
  readonly spectrumComplete: boolean;
  readonly nonRealRootCount: number | null;
  readonly realEigenvalues: readonly RealEigenvalue[];
  readonly issues: readonly EigenIssue[];
}
export interface EigenInputAnalysis {
  readonly status: 'ready' | 'numerical-failure';
  readonly inputVector: readonly number[];
  readonly imageVector: readonly number[] | null;
  readonly zeroStatus: 'zero' | 'nonzero';
  readonly selectionRelation: 'no-selection' | 'member' | 'not-member' | 'inconclusive';
  readonly eigenvectorStatus: 'zero-input' | 'eigenvector' | 'not-eigenvector' | 'inconclusive';
  readonly matchingEigenvalueIndices: readonly number[];
  readonly selectedRelativeResidual: number | null;
  readonly selectedRelativeDistance: number | null;
  readonly issues: readonly EigenIssue[];
}
export type EigenValidationCode = 'INVALID_DIMENSION' | 'INVALID_MATRIX' | 'INVALID_INPUT'
  | 'NON_FINITE_ENTRY' | 'ENTRY_OUT_OF_RANGE' | 'INVALID_SELECTION';
export class InvalidEigenInputError extends Error {
  constructor(readonly code: EigenValidationCode, message: string) {
    super(message); this.name = 'InvalidEigenInputError';
  }
}

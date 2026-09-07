import { analyzeBasisCandidate, type BasisCandidateAnalysis } from './basisDimension';
import { analyzeBasisCoordinates } from './basisCoordinates';
import { applyLinearMap, type LinearMapDefinition } from './linearMap';
import {
  analyzeVectorSet,
  InvalidVectorSetError,
  DEFAULT_RELATIVE_TOLERANCE,
  type RankOptions,
  type VectorSet,
  type VectorSpaceDimension,
} from './vectorSet';

export type RepresentationBasisFailureReason =
  | 'dimension-mismatch'
  | 'too-few-vectors'
  | 'too-many-vectors'
  | 'linearly-dependent';

export interface RepresentationBasisCheck {
  readonly isBasis: boolean;
  readonly failureReasons: readonly RepresentationBasisFailureReason[];
  /** 次元不一致では解析できない。0Dの有効な空基底とは区別する。 */
  readonly analysis: BasisCandidateAnalysis | null;
}

interface RepresentationAnalysisBase {
  readonly sourceDimension: VectorSpaceDimension;
  readonly targetDimension: VectorSpaceDimension;
  readonly inputVector: readonly number[];
  /** 基準座標での像。基底不成立時にも利用できる。 */
  readonly imageVector: readonly number[];
  readonly sourceBasis: RepresentationBasisCheck;
  readonly targetBasis: RepresentationBasisCheck;
}

export interface RepresentationCoordinates {
  /** M u_i。配列順は定義域基底の順序、各要素は列ベクトル。 */
  readonly basisImages: readonly (readonly number[])[];
  /** Aの列を終域基底で解いた係数。保存用行配列とは区別する。 */
  readonly columnCoordinates: readonly (readonly number[])[];
  /** m×nの行配列。0×nの場合も次元は結果の別フィールドに保持する。 */
  readonly matrix: readonly (readonly number[])[];
  readonly inputCoordinates: readonly number[];
  readonly imageCoordinates: readonly number[];
  readonly imageCoordinatesViaMatrix: readonly number[];
  readonly imageViaCoordinates: readonly number[];
  readonly pathsAgree: true;
}

/** 失敗時は派生値をnullにし、直前の有効値との取り違えを型でも防ぐ。 */
export type RepresentationMatrixAnalysis = RepresentationAnalysisBase & (
  | { readonly status: 'ready'; readonly representation: RepresentationCoordinates }
  | { readonly status: 'invalid-basis'; readonly representation: null }
  | {
    readonly status: 'numerical-failure';
    readonly representation: null;
    readonly failureReason: 'non-finite-result' | 'coordinate-solve-failed' | 'residual-too-large';
  }
);

/**
 * D-092: 固定した基準行列Mから、順序付き基底B→Cの表現行列Aを列ごとに導出する。
 * 入力は基準座標のw。数ベクトルも多項式の標準単項式係数も同じAPIで扱う。
 * 構造不正・非有限入力は既存API同様に例外、教材上の基底不成立は理由付きの結果。
 */
export function analyzeRepresentationMatrix(
  definition: LinearMapDefinition,
  sourceBasis: VectorSet,
  targetBasis: VectorSet,
  inputVector: readonly number[],
  options: RankOptions = {},
): RepresentationMatrixAnalysis {
  // 既存の入力次元・有限値・上限検証を利用する。ただし導出値は表示用の微小値
  // 整理をせず計算する。小さい基底に関する座標やAは入力上限を超え得る。
  applyLinearMap(definition, inputVector);
  const sourceCheck = checkBasis(sourceBasis, definition.sourceDimension, options);
  const targetCheck = checkBasis(targetBasis, definition.targetDimension, options);
  const imageVector = multiply(definition.matrix, inputVector);
  const base: RepresentationAnalysisBase = {
    sourceDimension: definition.sourceDimension,
    targetDimension: definition.targetDimension,
    inputVector: [...inputVector],
    imageVector,
    sourceBasis: sourceCheck,
    targetBasis: targetCheck,
  };
  if (!sourceCheck.isBasis || !targetCheck.isBasis) {
    return { ...base, status: 'invalid-basis', representation: null };
  }

  const tolerance = options.relativeTolerance ?? DEFAULT_RELATIVE_TOLERANCE;
  const numericalFailure = (failureReason: 'non-finite-result' | 'coordinate-solve-failed' | 'residual-too-large') =>
    ({ ...base, status: 'numerical-failure', representation: null, failureReason } as const);
  const basisImages = sourceBasis.vectors.map((vector) => multiply(definition.matrix, vector.coordinates));
  if (![imageVector, ...basisImages].every(isFiniteVector)) {
    return numericalFailure('non-finite-result');
  }

  // 逆行列を作らず、各列をCの一次結合として解く。必ずambientを指定する。
  const solve = (basis: VectorSet, target: readonly number[]) => analyzeBasisCoordinates(
    basis, basis.vectors.map((vector) => vector.id), target, { ...options, targetSpace: 'ambient' },
  ).coordinateVector;
  const columns = basisImages.map((image) => solve(targetBasis, image));
  const inputCoordinates = solve(sourceBasis, inputVector);
  const imageCoordinates = solve(targetBasis, imageVector);
  if (columns.some((column) => column === null) || inputCoordinates === null || imageCoordinates === null) {
    return numericalFailure('coordinate-solve-failed');
  }
  const columnCoordinates = columns as readonly (readonly number[])[];
  const matrix = Array.from({ length: definition.targetDimension }, (_, row) =>
    columnCoordinates.map((column) => column[row]));
  const imageCoordinatesViaMatrix = multiply(matrix, inputCoordinates);
  const imageViaCoordinates = reconstruct(targetBasis, imageCoordinatesViaMatrix);
  const reconstructedInput = reconstruct(sourceBasis, inputCoordinates);
  const reconstructedImages = columnCoordinates.map((column) => reconstruct(targetBasis, column));
  if (![
    ...columnCoordinates, inputCoordinates, imageCoordinates, imageCoordinatesViaMatrix,
    imageViaCoordinates, reconstructedInput, ...reconstructedImages,
  ].every(isFiniteVector)) {
    return numericalFailure('non-finite-result');
  }

  // D-009のrank判定を緩めず、実際の再構成残差を別に検査する。
  // 特に悪条件の基底・桁落ちでは、両経路が一致したと無条件に断言しない。
  if (!approximatelyEqual(inputVector, reconstructedInput, tolerance)
    || !approximatelyEqual(imageVector, imageViaCoordinates, tolerance)
    || !approximatelyEqual(imageCoordinates, imageCoordinatesViaMatrix, tolerance)
    || !basisImages.every((image, index) => approximatelyEqual(image, reconstructedImages[index], tolerance))) {
    return numericalFailure('residual-too-large');
  }
  return {
    ...base,
    status: 'ready',
    representation: {
      basisImages, columnCoordinates, matrix, inputCoordinates, imageCoordinates,
      imageCoordinatesViaMatrix, imageViaCoordinates, pathsAgree: true,
    },
  };
}

/**
 * 同一空間の恒等写像: P_(C←B) [w]_B = [w]_C。
 * 逆方向はB,Cを交換して呼ぶ。異なる空間種別の同型を恒等写像と呼ばないことは
 * 呼出側の責務（この数学APIは空間種別を持たず基準座標だけを扱う）。
 */
export function analyzeBasisChange(
  dimension: VectorSpaceDimension,
  sourceBasis: VectorSet,
  targetBasis: VectorSet,
  inputVector: readonly number[],
  options: RankOptions = {},
): RepresentationMatrixAnalysis {
  return analyzeRepresentationMatrix({
    sourceDimension: dimension,
    targetDimension: dimension,
    matrix: Array.from({ length: dimension }, (_, row) =>
      Array.from({ length: dimension }, (_, column) => row === column ? 1 : 0)),
  }, sourceBasis, targetBasis, inputVector, options);
}

export interface BasisChangeRoundTripAnalysis {
  readonly status: RepresentationMatrixAnalysis['status'];
  readonly forward: RepresentationMatrixAnalysis;
  readonly reverse: RepresentationMatrixAnalysis;
  readonly roundTrip: {
    /** P_(B←C) P_(C←B) と逆順の積。表示丸め前の値を検証する。 */
    readonly productOnB: readonly (readonly number[])[];
    readonly productOnC: readonly (readonly number[])[];
    readonly returnedToB: readonly number[];
    readonly returnedToC: readonly number[];
  } | null;
}

/** 両向きの座標変換に加え、実際の行列積と往復残差も確認する。 */
export function analyzeBasisChangeRoundTrip(dimension: VectorSpaceDimension, source: VectorSet, target: VectorSet, input: readonly number[], options: RankOptions = {}): BasisChangeRoundTripAnalysis {
  const forward = analyzeBasisChange(dimension, source, target, input, options);
  const reverse = analyzeBasisChange(dimension, target, source, input, options);
  const f = forward.representation;
  const r = reverse.representation;
  if (!f || !r) return { forward, reverse, roundTrip: null,
    status: forward.status === 'invalid-basis' || reverse.status === 'invalid-basis' ? 'invalid-basis' : 'numerical-failure' };
  const product = (left: readonly (readonly number[])[], right: readonly (readonly number[])[]) => left.map((row) =>
    Array.from({ length: dimension }, (_, c) => row.reduce((sum, entry, k) => sum + entry * right[k][c], 0)));
  const productOnB = product(r.matrix, f.matrix);
  const productOnC = product(f.matrix, r.matrix);
  const returnedToB = multiply(r.matrix, f.imageCoordinatesViaMatrix);
  const returnedToC = multiply(f.matrix, r.imageCoordinatesViaMatrix);
  const identity = Array.from({ length: dimension }, (_, row) => Array.from({ length: dimension }, (_, c) => row === c ? 1 : 0));
  const tolerance = options.relativeTolerance ?? DEFAULT_RELATIVE_TOLERANCE;
  const pairs = [[productOnB.flat(), identity.flat()], [productOnC.flat(), identity.flat()],
    [returnedToB, f.inputCoordinates], [returnedToC, r.inputCoordinates]] as const;
  if (!pairs.every(([actual, expected]) => isFiniteVector(actual) && approximatelyEqual(actual, expected, tolerance))) {
    return { status: 'numerical-failure', forward, reverse, roundTrip: null };
  }
  return { status: 'ready', forward, reverse, roundTrip: { productOnB, productOnC, returnedToB, returnedToC } };
}

function checkBasis(basis: VectorSet, dimension: VectorSpaceDimension, options: RankOptions): RepresentationBasisCheck {
  const failureReasons: RepresentationBasisFailureReason[] = [];
  try {
    analyzeVectorSet(basis, options);
  } catch (error) {
    if (error instanceof InvalidVectorSetError && error.code === 'DIMENSION_MISMATCH') {
      return { isBasis: false, failureReasons: ['dimension-mismatch'], analysis: null };
    }
    throw error;
  }
  if (basis.dimension !== dimension) {
    return { isBasis: false, failureReasons: ['dimension-mismatch'], analysis: null };
  }
  if (basis.vectors.length < dimension) failureReasons.push('too-few-vectors');
  if (basis.vectors.length > dimension) failureReasons.push('too-many-vectors');
  const analysis = analyzeBasisCandidate(basis, basis.vectors.map((vector) => vector.id), {
    ...options, targetSpace: 'ambient',
  });
  if (!analysis.isLinearlyIndependent) failureReasons.push('linearly-dependent');
  return { isBasis: analysis.isBasis, failureReasons, analysis };
}

function multiply(matrix: readonly (readonly number[])[], vector: readonly number[]): number[] {
  return matrix.map((row) => row.reduce((sum, entry, index) => sum + entry * vector[index], 0));
}

function reconstruct(basis: VectorSet, coordinates: readonly number[]): number[] {
  return multiply(Array.from({ length: basis.dimension }, (_, row) =>
    basis.vectors.map((vector) => vector.coordinates[row])), coordinates);
}

function isFiniteVector(vector: readonly number[]): boolean {
  return vector.every(Number.isFinite);
}

function approximatelyEqual(first: readonly number[], second: readonly number[], tolerance: number): boolean {
  const scale = Math.max(0, ...first.map(Math.abs), ...second.map(Math.abs));
  return first.length === second.length && (scale === 0
    || first.every((value, index) => Math.abs(value / scale - second[index] / scale) <= tolerance));
}

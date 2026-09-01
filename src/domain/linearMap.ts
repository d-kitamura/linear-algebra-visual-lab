import { extractBasisExample } from './basisDimension';
import { analyzeLinearCombination } from './linearCombination';
import {
  analyzeVectorSet,
  type RankOptions,
  type VectorDimension,
  type VectorSet,
  type VectorValue,
} from './vectorSet';

export const MAX_ABSOLUTE_LINEAR_MAP_INPUT = 1_000_000;

export interface LinearMapDefinition {
  readonly sourceDimension: VectorDimension;
  readonly targetDimension: VectorDimension;
  /** m rows and n columns for T: R^n -> R^m. */
  readonly matrix: readonly (readonly number[])[];
}

export interface LinearMapAnalysis {
  readonly sourceDimension: VectorDimension;
  readonly targetDimension: VectorDimension;
  readonly inputVector: readonly number[];
  readonly imageVector: readonly number[];
  readonly rank: number;
  readonly nullity: number;
  readonly imageDimension: number;
  readonly kernelDimension: number;
  readonly kernelBasis: readonly (readonly number[])[];
  readonly imageBasis: readonly (readonly number[])[];
  readonly imageBasisColumnIndices: readonly number[];
  readonly rankNullitySum: number;
  readonly satisfiesDimensionTheorem: boolean;
  readonly isInjective: boolean;
  readonly isSurjective: boolean;
  readonly isBijective: boolean;
}

export interface LinearMapLinearityAnalysis {
  readonly firstInput: readonly number[];
  readonly secondInput: readonly number[];
  readonly scalar: number;
  readonly inputSum: readonly number[];
  readonly imageOfFirstInput: readonly number[];
  readonly imageOfSecondInput: readonly number[];
  readonly imageOfInputSum: readonly number[];
  readonly sumOfImages: readonly number[];
  readonly scaledInput: readonly number[];
  readonly imageOfScaledInput: readonly number[];
  readonly scaledImage: readonly number[];
  readonly preservesAddition: boolean;
  readonly preservesScalarMultiplication: boolean;
}

export type LinearMapValidationCode =
  | 'INVALID_SOURCE_DIMENSION'
  | 'INVALID_TARGET_DIMENSION'
  | 'INVALID_MATRIX'
  | 'MATRIX_ROW_COUNT_MISMATCH'
  | 'INVALID_MATRIX_ROW'
  | 'MATRIX_COLUMN_COUNT_MISMATCH'
  | 'NON_FINITE_MATRIX_ENTRY'
  | 'MATRIX_ENTRY_OUT_OF_RANGE'
  | 'INPUT_DIMENSION_MISMATCH'
  | 'NON_FINITE_INPUT_COORDINATE'
  | 'INPUT_COORDINATE_OUT_OF_RANGE'
  | 'NON_FINITE_SCALAR'
  | 'SCALAR_OUT_OF_RANGE';

export class InvalidLinearMapError extends Error {
  readonly code: LinearMapValidationCode;

  constructor(code: LinearMapValidationCode, message: string) {
    super(message);
    this.name = 'InvalidLinearMapError';
    this.code = code;
  }
}

/**
 * T_A(u) = Au を計算する。像は状態として保持せず、この関数で常に導出する。
 */
export function applyLinearMap(
  definition: LinearMapDefinition,
  inputVector: readonly number[],
): readonly number[] {
  validateLinearMapInput(definition, inputVector);

  return multiplyMatrix(definition.matrix, inputVector);
}

/**
 * 2つの入力とスカラーについて、行列による写像が和とスカラー倍を
 * 保つことを、教材表示に必要な両辺の値とともに導出する。
 */
export function analyzeLinearMapLinearity(
  definition: LinearMapDefinition,
  firstInput: readonly number[],
  secondInput: readonly number[],
  scalar: number,
): LinearMapLinearityAnalysis {
  validateLinearMapInput(definition, firstInput);
  validateLinearMapInput(definition, secondInput);
  validateScalar(
    scalar,
    'NON_FINITE_SCALAR',
    'SCALAR_OUT_OF_RANGE',
    'スカラー',
  );

  const inputSum = firstInput.map((value, index) => cleanNumber(value + secondInput[index]));
  const scaledInput = firstInput.map((value) => cleanNumber(scalar * value));
  const imageOfFirstInput = multiplyMatrix(definition.matrix, firstInput);
  const imageOfSecondInput = multiplyMatrix(definition.matrix, secondInput);
  const imageOfInputSum = multiplyMatrix(definition.matrix, inputSum);
  const sumOfImages = imageOfFirstInput.map((value, index) =>
    cleanNumber(value + imageOfSecondInput[index]));
  const imageOfScaledInput = multiplyMatrix(definition.matrix, scaledInput);
  const scaledImage = imageOfFirstInput.map((value) => cleanNumber(scalar * value));

  return {
    firstInput: [...firstInput],
    secondInput: [...secondInput],
    scalar,
    inputSum,
    imageOfFirstInput,
    imageOfSecondInput,
    imageOfInputSum,
    sumOfImages,
    scaledInput,
    imageOfScaledInput,
    scaledImage,
    preservesAddition: vectorsApproximatelyEqual(imageOfInputSum, sumOfImages),
    preservesScalarMultiplication: vectorsApproximatelyEqual(imageOfScaledInput, scaledImage),
  };
}

/**
 * 行列による線形写像について、像、核・像の基底、rank、nullity、
 * 次元定理を同じ D-009 の相対許容誤差から解析する。
 */
export function analyzeLinearMap(
  definition: LinearMapDefinition,
  inputVector: readonly number[],
  options: RankOptions = {},
): LinearMapAnalysis {
  const imageVector = applyLinearMap(definition, inputVector);
  const columnVectorSet = createColumnVectorSet(definition);
  const vectorAnalysis = analyzeVectorSet(columnVectorSet, options);
  const kernelAnalysis = analyzeLinearCombination(
    columnVectorSet,
    Array.from({ length: definition.targetDimension }, () => 0),
    options,
  );
  const imageBasisIds = extractBasisExample(columnVectorSet, options);
  const columnsById = new Map(
    columnVectorSet.vectors.map((vector, columnIndex) => [
      vector.id,
      { vector, columnIndex },
    ]),
  );
  const imageBasisEntries = imageBasisIds.map((id) => columnsById.get(id));

  if (imageBasisEntries.some((entry) => entry === undefined)) {
    throw new Error('列空間基底の内部IDを解決できませんでした。');
  }

  const resolvedImageBasisEntries = imageBasisEntries as readonly {
    readonly vector: VectorValue;
    readonly columnIndex: number;
  }[];
  const rank = vectorAnalysis.rank;
  const nullity = definition.sourceDimension - rank;
  const rankNullitySum = rank + nullity;
  const isInjective = nullity === 0;
  const isSurjective = rank === definition.targetDimension;

  return {
    sourceDimension: definition.sourceDimension,
    targetDimension: definition.targetDimension,
    inputVector: [...inputVector],
    imageVector,
    rank,
    nullity,
    imageDimension: rank,
    kernelDimension: nullity,
    kernelBasis: kernelAnalysis.nullspaceBasis.map((vector) => [...vector]),
    imageBasis: resolvedImageBasisEntries.map(({ vector }) => [...vector.coordinates]),
    imageBasisColumnIndices: resolvedImageBasisEntries.map(({ columnIndex }) => columnIndex),
    rankNullitySum,
    satisfiesDimensionTheorem: rankNullitySum === definition.sourceDimension,
    isInjective,
    isSurjective,
    isBijective: isInjective && isSurjective,
  };
}

function validateLinearMapInput(
  definition: LinearMapDefinition,
  inputVector: readonly number[],
): void {
  validateDimension(definition.sourceDimension, 'source');
  validateDimension(definition.targetDimension, 'target');

  if (!Array.isArray(definition.matrix)) {
    throw new InvalidLinearMapError('INVALID_MATRIX', '行列は行の配列である必要があります。');
  }
  if (definition.matrix.length !== definition.targetDimension) {
    throw new InvalidLinearMapError(
      'MATRIX_ROW_COUNT_MISMATCH',
      '行列の行数は終域の次元と一致する必要があります。',
    );
  }

  definition.matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      throw new InvalidLinearMapError(
        'INVALID_MATRIX_ROW',
        `行列の第${rowIndex + 1}行は配列である必要があります。`,
      );
    }
    if (row.length !== definition.sourceDimension) {
      throw new InvalidLinearMapError(
        'MATRIX_COLUMN_COUNT_MISMATCH',
        '行列の列数は定義域の次元と一致する必要があります。',
      );
    }

    row.forEach((entry) => validateScalar(
      entry,
      'NON_FINITE_MATRIX_ENTRY',
      'MATRIX_ENTRY_OUT_OF_RANGE',
      '行列の成分',
    ));
  });

  if (!Array.isArray(inputVector) || inputVector.length !== definition.sourceDimension) {
    throw new InvalidLinearMapError(
      'INPUT_DIMENSION_MISMATCH',
      '入力ベクトルの成分数は定義域の次元と一致する必要があります。',
    );
  }
  inputVector.forEach((coordinate) => validateScalar(
    coordinate,
    'NON_FINITE_INPUT_COORDINATE',
    'INPUT_COORDINATE_OUT_OF_RANGE',
    '入力ベクトルの成分',
  ));
}

function validateDimension(dimension: unknown, kind: 'source' | 'target'): asserts dimension is VectorDimension {
  if (dimension === 2 || dimension === 3) {
    return;
  }

  const source = kind === 'source';
  throw new InvalidLinearMapError(
    source ? 'INVALID_SOURCE_DIMENSION' : 'INVALID_TARGET_DIMENSION',
    `${source ? '定義域' : '終域'}の次元は2または3である必要があります。`,
  );
}

function validateScalar(
  value: unknown,
  nonFiniteCode: Extract<LinearMapValidationCode,
    'NON_FINITE_MATRIX_ENTRY' | 'NON_FINITE_INPUT_COORDINATE' | 'NON_FINITE_SCALAR'>,
  outOfRangeCode: Extract<LinearMapValidationCode,
    'MATRIX_ENTRY_OUT_OF_RANGE' | 'INPUT_COORDINATE_OUT_OF_RANGE' | 'SCALAR_OUT_OF_RANGE'>,
  label: string,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidLinearMapError(nonFiniteCode, `${label}は有限の数である必要があります。`);
  }
  if (Math.abs(value) > MAX_ABSOLUTE_LINEAR_MAP_INPUT) {
    throw new InvalidLinearMapError(
      outOfRangeCode,
      `${label}の絶対値は${MAX_ABSOLUTE_LINEAR_MAP_INPUT.toLocaleString('ja-JP')}以下である必要があります。`,
    );
  }
}

function createColumnVectorSet(definition: LinearMapDefinition): VectorSet {
  return {
    dimension: definition.targetDimension,
    vectors: Array.from({ length: definition.sourceDimension }, (_, columnIndex) => ({
      id: `column-${columnIndex + 1}`,
      name: `T(e${columnIndex + 1})`,
      coordinates: definition.matrix.map((row) => row[columnIndex]),
    })),
  };
}

function cleanNumber(value: number): number {
  return Object.is(value, -0) || Math.abs(value) <= Number.EPSILON * 16 ? 0 : value;
}

function multiplyMatrix(
  matrix: readonly (readonly number[])[],
  inputVector: readonly number[],
): readonly number[] {
  return matrix.map((row) =>
    cleanNumber(row.reduce(
      (sum, entry, columnIndex) => sum + entry * inputVector[columnIndex],
      0,
    )),
  );
}

function vectorsApproximatelyEqual(
  first: readonly number[],
  second: readonly number[],
): boolean {
  const scale = Math.max(1, ...first.map(Math.abs), ...second.map(Math.abs));
  return first.length === second.length
    && first.every((value, index) => Math.abs(value - second[index]) <= scale * 1e-10);
}

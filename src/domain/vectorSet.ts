/** 数学ロジックが扱う有限次元。描画対応次元とは分離して段階的に広げる。 */
export type VectorSpaceDimension = 0 | 1 | 2 | 3;

/** 10.2時点で既存画面が直接描画できる次元。0D/1D描画は10.3以降で追加する。 */
export type VectorDimension = 2 | 3;

export interface VectorValue {
  readonly id: string;
  readonly name: string;
  readonly coordinates: readonly number[];
}

export interface VectorSet {
  readonly dimension: VectorSpaceDimension;
  readonly vectors: readonly VectorValue[];
}

export interface RankOptions {
  readonly relativeTolerance?: number;
}

export interface VectorSetAnalysis {
  readonly ambientDimension: VectorSpaceDimension;
  readonly vectorCount: number;
  readonly rank: number;
  readonly spanDimension: number;
  readonly isLinearlyIndependent: boolean;
  readonly relation: 'linearly-independent' | 'linearly-dependent';
}

export type VectorSetValidationCode =
  | 'INVALID_DIMENSION'
  | 'INVALID_VECTOR_COLLECTION'
  | 'INVALID_VECTOR_ID'
  | 'DUPLICATE_VECTOR_ID'
  | 'INVALID_VECTOR_NAME'
  | 'DIMENSION_MISMATCH'
  | 'NON_FINITE_COORDINATE'
  | 'INVALID_TOLERANCE';

export class InvalidVectorSetError extends Error {
  readonly code: VectorSetValidationCode;

  constructor(code: VectorSetValidationCode, message: string) {
    super(message);
    this.name = 'InvalidVectorSetError';
    this.code = code;
  }
}

/**
 * 画面上ほぼ同じ方向に見えるベクトルを丸め誤差だけで独立としないための既定値。
 * 各ベクトルを個別に正規化した後の相対値として使用する。
 */
export const DEFAULT_RELATIVE_TOLERANCE = 1e-10;

export function analyzeVectorSet(
  vectorSet: VectorSet,
  options: RankOptions = {},
): VectorSetAnalysis {
  const tolerance = options.relativeTolerance ?? DEFAULT_RELATIVE_TOLERANCE;

  validateVectorSet(vectorSet);
  validateTolerance(tolerance);

  const rank = calculateNormalizedRank(vectorSet, tolerance);
  const isLinearlyIndependent = rank === vectorSet.vectors.length;

  return {
    ambientDimension: vectorSet.dimension,
    vectorCount: vectorSet.vectors.length,
    rank,
    spanDimension: rank,
    isLinearlyIndependent,
    relation: isLinearlyIndependent ? 'linearly-independent' : 'linearly-dependent',
  };
}

function validateVectorSet(vectorSet: VectorSet): void {
  if (
    vectorSet.dimension !== 0
    && vectorSet.dimension !== 1
    && vectorSet.dimension !== 2
    && vectorSet.dimension !== 3
  ) {
    throw new InvalidVectorSetError(
      'INVALID_DIMENSION',
      'ベクトル空間の次元は 0 以上 3 以下である必要があります。',
    );
  }

  if (!Array.isArray(vectorSet.vectors)) {
    throw new InvalidVectorSetError(
      'INVALID_VECTOR_COLLECTION',
      'ベクトル集合は配列である必要があります。',
    );
  }

  const ids = new Set<string>();

  vectorSet.vectors.forEach((vector, vectorIndex) => {
    if (typeof vector.id !== 'string' || vector.id.trim().length === 0) {
      throw new InvalidVectorSetError(
        'INVALID_VECTOR_ID',
        `${vectorIndex + 1} 番目のベクトルには空でない ID が必要です。`,
      );
    }

    if (ids.has(vector.id)) {
      throw new InvalidVectorSetError(
        'DUPLICATE_VECTOR_ID',
        `ベクトル ID "${vector.id}" が重複しています。`,
      );
    }
    ids.add(vector.id);

    if (typeof vector.name !== 'string' || vector.name.trim().length === 0) {
      throw new InvalidVectorSetError(
        'INVALID_VECTOR_NAME',
        `${vectorIndex + 1} 番目のベクトルには空でない表示名が必要です。`,
      );
    }

    if (
      !Array.isArray(vector.coordinates) ||
      vector.coordinates.length !== vectorSet.dimension
    ) {
      throw new InvalidVectorSetError(
        'DIMENSION_MISMATCH',
        `ベクトル "${vector.id}" の座標数が空間の次元と一致しません。`,
      );
    }

    vector.coordinates.forEach((coordinate: unknown) => {
      if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) {
        throw new InvalidVectorSetError(
          'NON_FINITE_COORDINATE',
          `ベクトル "${vector.id}" の座標は有限の数である必要があります。`,
        );
      }
    });
  });
}

function validateTolerance(tolerance: number): void {
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance >= 1) {
    throw new InvalidVectorSetError(
      'INVALID_TOLERANCE',
      '相対許容誤差は 0 より大きく 1 より小さい有限値である必要があります。',
    );
  }
}

function calculateNormalizedRank(vectorSet: VectorSet, tolerance: number): number {
  if (vectorSet.dimension === 0 || vectorSet.vectors.length === 0) {
    return 0;
  }

  const normalizedColumns = vectorSet.vectors.map(({ coordinates }) => {
    const scale = Math.max(...coordinates.map((coordinate) => Math.abs(coordinate)));

    if (scale === 0) {
      return coordinates.map(() => 0);
    }

    return coordinates.map((coordinate) => coordinate / scale);
  });

  const matrix = Array.from({ length: vectorSet.dimension }, (_, rowIndex) =>
    normalizedColumns.map((column) => column[rowIndex]),
  );

  return rowEchelonRank(matrix, tolerance);
}

function rowEchelonRank(matrix: number[][], tolerance: number): number {
  const rowCount = matrix.length;
  const columnCount = matrix[0]?.length ?? 0;
  let pivotRow = 0;

  for (let column = 0; column < columnCount && pivotRow < rowCount; column += 1) {
    let bestRow = pivotRow;
    let bestMagnitude = Math.abs(matrix[pivotRow][column]);

    for (let row = pivotRow + 1; row < rowCount; row += 1) {
      const magnitude = Math.abs(matrix[row][column]);
      if (magnitude > bestMagnitude) {
        bestMagnitude = magnitude;
        bestRow = row;
      }
    }

    if (bestMagnitude <= tolerance) {
      continue;
    }

    if (bestRow !== pivotRow) {
      [matrix[pivotRow], matrix[bestRow]] = [matrix[bestRow], matrix[pivotRow]];
    }

    const pivot = matrix[pivotRow][column];

    for (let row = pivotRow + 1; row < rowCount; row += 1) {
      const factor = matrix[row][column] / pivot;
      matrix[row][column] = 0;

      for (let remainingColumn = column + 1; remainingColumn < columnCount; remainingColumn += 1) {
        matrix[row][remainingColumn] -= factor * matrix[pivotRow][remainingColumn];
      }
    }

    pivotRow += 1;
  }

  return pivotRow;
}

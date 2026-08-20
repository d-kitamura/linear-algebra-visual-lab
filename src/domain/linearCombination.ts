import {
  DEFAULT_RELATIVE_TOLERANCE,
  analyzeVectorSet,
  type RankOptions,
  type VectorSet,
  type VectorValue,
} from './vectorSet';

export type LinearCombinationStatus = 'none' | 'unique' | 'infinite';

export type LinearCombinationValidationCode =
  | 'TARGET_DIMENSION_MISMATCH'
  | 'NON_FINITE_TARGET_COORDINATE';

export class InvalidLinearCombinationError extends Error {
  readonly code: LinearCombinationValidationCode;

  constructor(code: LinearCombinationValidationCode, message: string) {
    super(message);
    this.name = 'InvalidLinearCombinationError';
    this.code = code;
  }
}

export interface LinearCombinationAnalysis {
  readonly ambientDimension: 2 | 3;
  readonly coefficientCount: number;
  readonly rank: number;
  readonly augmentedRank: number;
  readonly status: LinearCombinationStatus;
  readonly freeParameterCount: number;
  readonly particularSolution: readonly number[] | null;
  readonly exampleSolutions: readonly (readonly number[])[];
  readonly nullspaceBasis: readonly (readonly number[])[];
}

interface ReducedSystem {
  readonly matrix: number[][];
  readonly pivotColumns: readonly number[];
}

/**
 * 選択したベクトルを列に持つ行列 A について Ac = v を解析する。
 * D-009 と同じ列ごとの正規化と相対許容誤差を使い、描画には依存しない。
 */
export function analyzeLinearCombination(
  vectorSet: VectorSet,
  target: readonly number[],
  options: RankOptions = {},
): LinearCombinationAnalysis {
  const tolerance = options.relativeTolerance ?? DEFAULT_RELATIVE_TOLERANCE;
  const vectorAnalysis = analyzeVectorSet(vectorSet, options);
  validateTarget(target, vectorSet.dimension);

  const augmentedAnalysis = analyzeVectorSet(
    {
      dimension: vectorSet.dimension,
      vectors: [
        ...vectorSet.vectors,
        {
          id: createTargetId(vectorSet.vectors),
          name: 'v',
          coordinates: target,
        },
      ],
    },
    options,
  );

  const coefficientCount = vectorSet.vectors.length;
  const baseResult = {
    ambientDimension: vectorSet.dimension,
    coefficientCount,
    rank: vectorAnalysis.rank,
    augmentedRank: augmentedAnalysis.rank,
  } as const;

  if (augmentedAnalysis.rank > vectorAnalysis.rank) {
    return {
      ...baseResult,
      status: 'none',
      freeParameterCount: 0,
      particularSolution: null,
      exampleSolutions: [],
      nullspaceBasis: [],
    };
  }

  const columnScales = vectorSet.vectors.map((vector) => maxAbsolute(vector.coordinates));
  const targetScale = maxAbsolute(target) || 1;
  const normalizedRows = Array.from({ length: vectorSet.dimension }, (_, rowIndex) => [
    ...vectorSet.vectors.map((vector, columnIndex) => {
      const scale = columnScales[columnIndex];
      return scale === 0 ? 0 : vector.coordinates[rowIndex] / scale;
    }),
    target[rowIndex] / targetScale,
  ]);
  const reduced = reduceSystem(normalizedRows, coefficientCount, tolerance);
  const pivotColumns = new Set(reduced.pivotColumns);
  const freeColumns = Array.from({ length: coefficientCount }, (_, index) => index).filter(
    (index) => !pivotColumns.has(index),
  );

  const normalizedParticular = Array.from({ length: coefficientCount }, () => 0);
  reduced.pivotColumns.forEach((column, row) => {
    normalizedParticular[column] = reduced.matrix[row][coefficientCount];
  });
  const particularSolution = normalizedParticular.map((value, index) =>
    cleanNumber(
      columnScales[index] === 0 ? value : (value * targetScale) / columnScales[index],
    ),
  );

  const nullspaceBasis = freeColumns.map((freeColumn) => {
    const normalizedDirection = Array.from({ length: coefficientCount }, () => 0);
    normalizedDirection[freeColumn] = 1;
    reduced.pivotColumns.forEach((pivotColumn, row) => {
      normalizedDirection[pivotColumn] = -reduced.matrix[row][freeColumn];
    });

    const coefficientDirection = normalizedDirection.map((value, index) =>
      columnScales[index] === 0 ? value : value / columnScales[index],
    );
    return normalizeDirection(coefficientDirection);
  });

  const status = vectorAnalysis.rank === coefficientCount ? 'unique' : 'infinite';
  const exampleSolutions =
    status === 'unique'
      ? [particularSolution]
      : [
          particularSolution,
          particularSolution.map((value, index) =>
            cleanNumber(value + nullspaceBasis[0][index]),
          ),
        ];

  return {
    ...baseResult,
    status,
    freeParameterCount: coefficientCount - vectorAnalysis.rank,
    particularSolution,
    exampleSolutions,
    nullspaceBasis,
  };
}

function validateTarget(target: readonly number[], dimension: 2 | 3): void {
  if (!Array.isArray(target) || target.length !== dimension) {
    throw new InvalidLinearCombinationError(
      'TARGET_DIMENSION_MISMATCH',
      'ターゲットベクトルの座標数が空間の次元と一致しません。',
    );
  }

  target.forEach((coordinate) => {
    if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) {
      throw new InvalidLinearCombinationError(
        'NON_FINITE_TARGET_COORDINATE',
        'ターゲットベクトルの座標は有限の数である必要があります。',
      );
    }
  });
}

function createTargetId(vectors: readonly VectorValue[]): string {
  const ids = new Set(vectors.map((vector) => vector.id));
  let id = '__linear_combination_target__';

  while (ids.has(id)) {
    id += '_';
  }

  return id;
}

function reduceSystem(
  input: readonly (readonly number[])[],
  variableCount: number,
  tolerance: number,
): ReducedSystem {
  const matrix = input.map((row) => [...row]);
  const pivotColumns: number[] = [];
  let pivotRow = 0;

  for (let column = 0; column < variableCount && pivotRow < matrix.length; column += 1) {
    let bestRow = pivotRow;
    let bestMagnitude = Math.abs(matrix[pivotRow][column]);

    for (let row = pivotRow + 1; row < matrix.length; row += 1) {
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
    for (let currentColumn = column; currentColumn <= variableCount; currentColumn += 1) {
      matrix[pivotRow][currentColumn] /= pivot;
    }

    for (let row = 0; row < matrix.length; row += 1) {
      if (row === pivotRow) {
        continue;
      }

      const factor = matrix[row][column];
      if (Math.abs(factor) <= tolerance) {
        matrix[row][column] = 0;
        continue;
      }

      for (let currentColumn = column; currentColumn <= variableCount; currentColumn += 1) {
        matrix[row][currentColumn] -= factor * matrix[pivotRow][currentColumn];
        if (Math.abs(matrix[row][currentColumn]) <= tolerance) {
          matrix[row][currentColumn] = 0;
        }
      }
    }

    pivotColumns.push(column);
    pivotRow += 1;
  }

  return { matrix, pivotColumns };
}

function maxAbsolute(values: readonly number[]): number {
  return values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
}

function normalizeDirection(values: readonly number[]): readonly number[] {
  const scale = maxAbsolute(values);
  if (scale === 0) {
    return values.map(() => 0);
  }

  return values.map((value) => cleanNumber(value / scale));
}

function cleanNumber(value: number): number {
  return Object.is(value, -0) || Math.abs(value) <= Number.EPSILON * 16 ? 0 : value;
}

import { describe, expect, it } from 'vitest';
import {
  MAX_ABSOLUTE_LINEAR_MAP_INPUT,
  InvalidLinearMapError,
  InvalidVectorSetError,
  analyzeLinearMap,
  analyzeLinearMapLinearity,
  applyLinearMap,
  type LinearMapDefinition,
  type LinearMapValidationCode,
  type VectorSpaceDimension,
} from '../../src/domain';

const linearMap = (
  sourceDimension: VectorSpaceDimension,
  targetDimension: VectorSpaceDimension,
  matrix: readonly (readonly number[])[],
): LinearMapDefinition => ({ sourceDimension, targetDimension, matrix });

const expectLinearMapError = (
  operation: () => unknown,
  code: LinearMapValidationCode,
): void => {
  expect(operation).toThrowError(
    expect.objectContaining<Partial<InvalidLinearMapError>>({ code }),
  );
};

const expectMapsToZero = (
  definition: LinearMapDefinition,
  basis: readonly (readonly number[])[],
): void => {
  basis.forEach((vector) => {
    applyLinearMap(definition, vector).forEach((coordinate) =>
      expect(coordinate).toBeCloseTo(0, 10),
    );
  });
};

describe('applyLinearMap', () => {
  it('multiplies a rectangular matrix by a source vector', () => {
    const definition = linearMap(2, 3, [
      [1, 2],
      [0, -1],
      [3, 1],
    ]);

    expect(applyLinearMap(definition, [4, -2])).toEqual([0, 2, 10]);
  });

  it('does not mutate the matrix or input vector', () => {
    const matrix = [[1, 2], [3, 4]];
    const input = [5, 6];

    applyLinearMap(linearMap(2, 2, matrix), input);

    expect(matrix).toEqual([[1, 2], [3, 4]]);
    expect(input).toEqual([5, 6]);
  });
});

describe('analyzeLinearMap', () => {
  it('analyzes the identity map as bijective', () => {
    const result = analyzeLinearMap(linearMap(2, 2, [[1, 0], [0, 1]]), [3, -2]);

    expect(result).toEqual({
      sourceDimension: 2,
      targetDimension: 2,
      inputVector: [3, -2],
      imageVector: [3, -2],
      rank: 2,
      nullity: 0,
      imageDimension: 2,
      kernelDimension: 0,
      kernelBasis: [],
      imageBasis: [[1, 0], [0, 1]],
      imageBasisColumnIndices: [0, 1],
      rankNullitySum: 2,
      satisfiesDimensionTheorem: true,
      isInjective: true,
      isSurjective: true,
      isBijective: true,
    });
  });

  it('analyzes a 3D-to-2D zero map', () => {
    const definition = linearMap(3, 2, [[0, 0, 0], [0, 0, 0]]);
    const result = analyzeLinearMap(definition, [2, -1, 4]);

    expect(result).toMatchObject({
      imageVector: [0, 0],
      rank: 0,
      nullity: 3,
      imageDimension: 0,
      kernelDimension: 3,
      imageBasis: [],
      imageBasisColumnIndices: [],
      rankNullitySum: 3,
      satisfiesDimensionTheorem: true,
      isInjective: false,
      isSurjective: false,
      isBijective: false,
    });
    expect(result.kernelBasis).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    expectMapsToZero(definition, result.kernelBasis);
  });

  it('finds the kernel and image bases of a projection', () => {
    const definition = linearMap(3, 3, [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]);
    const result = analyzeLinearMap(definition, [2, -3, 5]);

    expect(result).toMatchObject({
      imageVector: [2, -3, 0],
      rank: 2,
      nullity: 1,
      imageBasis: [[1, 0, 0], [0, 1, 0]],
      imageBasisColumnIndices: [0, 1],
      isInjective: false,
      isSurjective: false,
    });
    expect(result.kernelBasis).toEqual([[0, 0, 1]]);
    expectMapsToZero(definition, result.kernelBasis);
  });

  it.each([
    {
      name: '90-degree rotation',
      matrix: [[0, -1], [1, 0]],
      expectedImage: [3, 2],
    },
    {
      name: 'reflection across the x-axis',
      matrix: [[1, 0], [0, -1]],
      expectedImage: [2, 3],
    },
    {
      name: 'horizontal shear',
      matrix: [[1, 2], [0, 1]],
      expectedImage: [-4, -3],
    },
  ])('analyzes $name as a bijective full-rank map', ({ matrix, expectedImage }) => {
    const result = analyzeLinearMap(linearMap(2, 2, matrix), [2, -3]);

    expect(result).toMatchObject({
      imageVector: expectedImage,
      rank: 2,
      nullity: 0,
      kernelBasis: [],
      imageBasisColumnIndices: [0, 1],
      isInjective: true,
      isSurjective: true,
      isBijective: true,
      satisfiesDimensionTheorem: true,
    });
  });

  it('distinguishes a 2D-to-3D injection from a surjection', () => {
    const result = analyzeLinearMap(
      linearMap(2, 3, [[1, 0], [0, 1], [1, 1]]),
      [2, -1],
    );

    expect(result).toMatchObject({
      imageVector: [2, -1, 1],
      rank: 2,
      nullity: 0,
      isInjective: true,
      isSurjective: false,
      isBijective: false,
      satisfiesDimensionTheorem: true,
    });
  });

  it('finds a kernel direction for a 3D-to-2D surjection', () => {
    const definition = linearMap(3, 2, [[1, 0, 1], [0, 1, 1]]);
    const result = analyzeLinearMap(definition, [2, 3, 4]);

    expect(result).toMatchObject({
      imageVector: [6, 7],
      rank: 2,
      nullity: 1,
      imageBasis: [[1, 0], [0, 1]],
      imageBasisColumnIndices: [0, 1],
      isInjective: false,
      isSurjective: true,
      isBijective: false,
    });
    expect(result.kernelBasis).toHaveLength(1);
    expect(result.kernelBasis[0][0]).toBeCloseTo(-1, 12);
    expect(result.kernelBasis[0][1]).toBeCloseTo(-1, 12);
    expect(result.kernelBasis[0][2]).toBeCloseTo(1, 12);
    expectMapsToZero(definition, result.kernelBasis);
  });

  it('uses the D-009 relative tolerance for near-dependent columns', () => {
    const definition = linearMap(2, 2, [[1, 1], [1, 1 + 1e-7]]);

    expect(analyzeLinearMap(definition, [1, 1], { relativeTolerance: 1e-6 })).toMatchObject({
      rank: 1,
      nullity: 1,
    });
    expect(analyzeLinearMap(definition, [1, 1], { relativeTolerance: 1e-9 })).toMatchObject({
      rank: 2,
      nullity: 0,
    });
  });
});

describe('analyzeLinearMapLinearity', () => {
  it('derives both sides of addition preservation for a rectangular map', () => {
    const result = analyzeLinearMapLinearity(
      linearMap(3, 2, [[1, 2, 0], [0, -1, 3]]),
      [2, -1, 4],
      [-3, 5, 1],
      2,
    );

    expect(result).toMatchObject({
      inputSum: [-1, 4, 5],
      imageOfFirstInput: [0, 13],
      imageOfSecondInput: [7, -2],
      imageOfInputSum: [7, 11],
      sumOfImages: [7, 11],
      preservesAddition: true,
    });
  });

  it('derives both sides of scalar-multiplication preservation', () => {
    const result = analyzeLinearMapLinearity(
      linearMap(2, 3, [[1, 0], [0, 1], [1, -1]]),
      [2, -3],
      [4, 1],
      -1.5,
    );

    expect(result.scaledInput).toEqual([-3, 4.5]);
    expect(result.imageOfScaledInput).toEqual([-3, 4.5, -7.5]);
    expect(result.scaledImage).toEqual([-3, 4.5, -7.5]);
    expect(result.preservesScalarMultiplication).toBe(true);
  });

  it('does not mutate either input and validates the scalar', () => {
    const first = [1, 2];
    const second = [-3, 4];
    analyzeLinearMapLinearity(linearMap(2, 2, [[1, 1], [0, 1]]), first, second, 3);

    expect(first).toEqual([1, 2]);
    expect(second).toEqual([-3, 4]);
    expectLinearMapError(
      () => analyzeLinearMapLinearity(linearMap(2, 2, [[1, 0], [0, 1]]), first, second, Number.NaN),
      'NON_FINITE_SCALAR',
    );
    expectLinearMapError(
      () => analyzeLinearMapLinearity(
        linearMap(2, 2, [[1, 0], [0, 1]]),
        first,
        second,
        MAX_ABSOLUTE_LINEAR_MAP_INPUT + 1,
      ),
      'SCALAR_OUT_OF_RANGE',
    );
  });
});

describe('linear-map validation', () => {
  it('rejects unsupported source and target dimensions', () => {
    expectLinearMapError(
      () => analyzeLinearMap({ sourceDimension: 4, targetDimension: 2, matrix: [] } as unknown as LinearMapDefinition, []),
      'INVALID_SOURCE_DIMENSION',
    );
    expectLinearMapError(
      () => analyzeLinearMap({ sourceDimension: 2, targetDimension: -1, matrix: [] } as unknown as LinearMapDefinition, []),
      'INVALID_TARGET_DIMENSION',
    );
  });

  it('rejects a non-array matrix and the wrong row count', () => {
    expectLinearMapError(
      () => applyLinearMap({ sourceDimension: 2, targetDimension: 2, matrix: null } as unknown as LinearMapDefinition, [0, 0]),
      'INVALID_MATRIX',
    );
    expectLinearMapError(
      () => applyLinearMap(linearMap(2, 3, [[1, 0], [0, 1]]), [0, 0]),
      'MATRIX_ROW_COUNT_MISMATCH',
    );
  });

  it('rejects a non-array row and the wrong column count', () => {
    expectLinearMapError(
      () => applyLinearMap(linearMap(2, 2, [[1, 0], null as unknown as number[]]), [0, 0]),
      'INVALID_MATRIX_ROW',
    );
    expectLinearMapError(
      () => applyLinearMap(linearMap(3, 2, [[1, 0], [0, 1]]), [0, 0, 0]),
      'MATRIX_COLUMN_COUNT_MISMATCH',
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects the non-finite matrix entry %s',
    (entry) => {
      expectLinearMapError(
        () => applyLinearMap(linearMap(2, 2, [[entry, 0], [0, 1]]), [0, 0]),
        'NON_FINITE_MATRIX_ENTRY',
      );
    },
  );

  it('accepts the input limit and rejects matrix entries beyond it', () => {
    expect(applyLinearMap(
      linearMap(2, 2, [[MAX_ABSOLUTE_LINEAR_MAP_INPUT, 0], [0, 1]]),
      [1, 0],
    )).toEqual([MAX_ABSOLUTE_LINEAR_MAP_INPUT, 0]);
    expectLinearMapError(
      () => applyLinearMap(
        linearMap(2, 2, [[MAX_ABSOLUTE_LINEAR_MAP_INPUT + 1, 0], [0, 1]]),
        [0, 0],
      ),
      'MATRIX_ENTRY_OUT_OF_RANGE',
    );
  });

  it('rejects an input with the wrong dimension or a non-finite coordinate', () => {
    const definition = linearMap(2, 2, [[1, 0], [0, 1]]);

    expectLinearMapError(() => applyLinearMap(definition, [1, 2, 3]), 'INPUT_DIMENSION_MISMATCH');
    expectLinearMapError(() => applyLinearMap(definition, [Number.NaN, 0]), 'NON_FINITE_INPUT_COORDINATE');
  });

  it('rejects input coordinates beyond the shared absolute limit', () => {
    expectLinearMapError(
      () => applyLinearMap(
        linearMap(2, 2, [[1, 0], [0, 1]]),
        [MAX_ABSOLUTE_LINEAR_MAP_INPUT + 1, 0],
      ),
      'INPUT_COORDINATE_OUT_OF_RANGE',
    );
  });

  it('reuses the existing tolerance validation', () => {
    expect(() => analyzeLinearMap(
      linearMap(2, 2, [[1, 0], [0, 1]]),
      [0, 0],
      { relativeTolerance: 0 },
    )).toThrowError(
      expect.objectContaining<Partial<InvalidVectorSetError>>({ code: 'INVALID_TOLERANCE' }),
    );
  });
});

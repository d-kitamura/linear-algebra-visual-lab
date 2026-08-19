import { describe, expect, it } from 'vitest';
import {
  InvalidLinearCombinationError,
  analyzeLinearCombination,
  type VectorDimension,
  type VectorSet,
  type VectorValue,
} from '../../src/domain';

function vector(id: string, coordinates: readonly number[]): VectorValue {
  return { id, name: id, coordinates };
}

function vectorSet(dimension: VectorDimension, vectors: readonly VectorValue[]): VectorSet {
  return { dimension, vectors };
}

function expectRepresents(
  vectors: readonly VectorValue[],
  coefficients: readonly number[],
  target: readonly number[],
): void {
  target.forEach((coordinate, row) => {
    const reconstructed = vectors.reduce(
      (sum, currentVector, column) =>
        sum + currentVector.coordinates[row] * coefficients[column],
      0,
    );
    expect(reconstructed).toBeCloseTo(coordinate, 10);
  });
}

describe('analyzeLinearCombination', () => {
  it('finds the unique coefficients for the standard basis', () => {
    const vectors = [vector('v1', [1, 0]), vector('v2', [0, 1])];
    const result = analyzeLinearCombination(vectorSet(2, vectors), [3, 2]);

    expect(result).toMatchObject({
      rank: 2,
      augmentedRank: 2,
      status: 'unique',
      freeParameterCount: 0,
      particularSolution: [3, 2],
    });
    expect(result.exampleSolutions).toHaveLength(1);
    expect(result.nullspaceBasis).toEqual([]);
  });

  it('finds non-obvious unique coefficients for an independent pair', () => {
    const vectors = [vector('v1', [1, 2]), vector('v2', [3, 1])];
    const result = analyzeLinearCombination(vectorSet(2, vectors), [3, 2]);

    expect(result.status).toBe('unique');
    expect(result.particularSolution?.[0]).toBeCloseTo(0.6, 12);
    expect(result.particularSolution?.[1]).toBeCloseTo(0.8, 12);
    expectRepresents(vectors, result.particularSolution ?? [], [3, 2]);
  });

  it('reports no solution when the target is outside a dependent span', () => {
    const result = analyzeLinearCombination(
      vectorSet(2, [vector('v1', [1, 2]), vector('v2', [2, 4])]),
      [1, 0],
    );

    expect(result).toMatchObject({
      rank: 1,
      augmentedRank: 2,
      status: 'none',
      particularSolution: null,
      exampleSolutions: [],
      nullspaceBasis: [],
    });
  });

  it('returns two distinct examples and a general direction for infinitely many solutions', () => {
    const vectors = [vector('v1', [1, 2]), vector('v2', [2, 4])];
    const target = [3, 6];
    const result = analyzeLinearCombination(vectorSet(2, vectors), target);

    expect(result.status).toBe('infinite');
    expect(result.freeParameterCount).toBe(1);
    expect(result.exampleSolutions).toHaveLength(2);
    expect(result.exampleSolutions[1]).not.toEqual(result.exampleSolutions[0]);
    result.exampleSolutions.forEach((coefficients) =>
      expectRepresents(vectors, coefficients, target),
    );
    expectRepresents(vectors, result.nullspaceBasis[0], [0, 0]);
  });

  it('keeps all selected vectors and exposes the free parameter for three vectors in 2D', () => {
    const vectors = [
      vector('v1', [1, 0]),
      vector('v2', [0, 1]),
      vector('v3', [1, 1]),
    ];
    const target = [2, 3];
    const result = analyzeLinearCombination(vectorSet(2, vectors), target);

    expect(result).toMatchObject({
      coefficientCount: 3,
      rank: 2,
      status: 'infinite',
      freeParameterCount: 1,
    });
    result.exampleSolutions.forEach((coefficients) =>
      expectRepresents(vectors, coefficients, target),
    );
    expect(result.nullspaceBasis).toHaveLength(1);
  });

  it('supports the shared upper limit of eight selected vectors', () => {
    const vectors = [
      vector('v1', [1, 0]),
      vector('v2', [0, 1]),
      vector('v3', [1, 1]),
      vector('v4', [2, -1]),
      vector('v5', [-1, 3]),
      vector('v6', [4, 2]),
      vector('v7', [0, 2]),
      vector('v8', [-3, 0]),
    ];
    const target = [5, -2];
    const result = analyzeLinearCombination(vectorSet(2, vectors), target);

    expect(result).toMatchObject({
      coefficientCount: 8,
      rank: 2,
      status: 'infinite',
      freeParameterCount: 6,
    });
    expect(result.nullspaceBasis).toHaveLength(6);
    result.exampleSolutions.forEach((coefficients) =>
      expectRepresents(vectors, coefficients, target),
    );
    result.nullspaceBasis.forEach((direction) =>
      expectRepresents(vectors, direction, [0, 0]),
    );
  });

  it('classifies one nonzero vector as unique on its line', () => {
    const vectors = [vector('v1', [2, -1])];
    const result = analyzeLinearCombination(vectorSet(2, vectors), [6, -3]);

    expect(result.status).toBe('unique');
    expect(result.particularSolution?.[0]).toBeCloseTo(3, 12);
  });

  it('classifies a zero-vector coefficient as free when the target is zero', () => {
    const vectors = [vector('v1', [0, 0])];
    const result = analyzeLinearCombination(vectorSet(2, vectors), [0, 0]);

    expect(result).toMatchObject({ status: 'infinite', freeParameterCount: 1 });
    expect(result.exampleSolutions).toEqual([[0], [1]]);
  });

  it('handles the empty set for zero and nonzero targets', () => {
    const emptySet = vectorSet(2, []);

    expect(analyzeLinearCombination(emptySet, [0, 0])).toMatchObject({
      status: 'unique',
      particularSolution: [],
    });
    expect(analyzeLinearCombination(emptySet, [1, 0]).status).toBe('none');
  });

  it('supports the same analysis in 3D for the later 3D explorer', () => {
    const vectors = [
      vector('v1', [1, 0, 0]),
      vector('v2', [0, 1, 0]),
      vector('v3', [0, 0, 1]),
      vector('v4', [1, 1, 1]),
    ];
    const target = [2, -1, 4];
    const result = analyzeLinearCombination(vectorSet(3, vectors), target);

    expect(result).toMatchObject({ rank: 3, status: 'infinite', freeParameterCount: 1 });
    result.exampleSolutions.forEach((coefficients) =>
      expectRepresents(vectors, coefficients, target),
    );
  });

  it('uses the configured D-009 tolerance for near-dependent vectors', () => {
    const vectors = vectorSet(2, [
      vector('v1', [1, 1]),
      vector('v2', [1, 1 + 1e-7]),
    ]);

    expect(
      analyzeLinearCombination(vectors, [0, 1], { relativeTolerance: 1e-6 }).status,
    ).toBe('none');
    expect(
      analyzeLinearCombination(vectors, [0, 1], { relativeTolerance: 1e-9 }).status,
    ).toBe('unique');
  });
});

describe('linear-combination target validation', () => {
  it('rejects a target with the wrong dimension', () => {
    expect(() => analyzeLinearCombination(vectorSet(2, []), [1, 2, 3])).toThrowError(
      expect.objectContaining<Partial<InvalidLinearCombinationError>>({
        code: 'TARGET_DIMENSION_MISMATCH',
      }),
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects the non-finite target coordinate %s',
    (coordinate) => {
      expect(() =>
        analyzeLinearCombination(vectorSet(2, []), [coordinate, 0]),
      ).toThrowError(
        expect.objectContaining<Partial<InvalidLinearCombinationError>>({
          code: 'NON_FINITE_TARGET_COORDINATE',
        }),
      );
    },
  );
});

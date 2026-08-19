import { describe, expect, it } from 'vitest';
import {
  InvalidVectorSetError,
  analyzeVectorSet,
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

describe('analyzeVectorSet', () => {
  it('treats the empty set as independent with a zero-dimensional span', () => {
    const result = analyzeVectorSet(vectorSet(2, []));

    expect(result).toMatchObject({
      rank: 0,
      spanDimension: 0,
      isLinearlyIndependent: true,
      relation: 'linearly-independent',
    });
  });

  it('detects a zero vector as dependent', () => {
    const result = analyzeVectorSet(vectorSet(2, [vector('v1', [0, 0])]));

    expect(result.rank).toBe(0);
    expect(result.isLinearlyIndependent).toBe(false);
  });

  it('gives one nonzero vector rank one', () => {
    const result = analyzeVectorSet(vectorSet(3, [vector('v1', [2, -3, 4])]));

    expect(result.rank).toBe(1);
    expect(result.isLinearlyIndependent).toBe(true);
  });

  it('detects duplicate and scalar-multiple vectors as dependent', () => {
    const duplicate = analyzeVectorSet(
      vectorSet(2, [vector('v1', [1, 2]), vector('v2', [1, 2])]),
    );
    const scalarMultiple = analyzeVectorSet(
      vectorSet(2, [vector('v1', [1, 2]), vector('v2', [-3, -6])]),
    );

    expect(duplicate.rank).toBe(1);
    expect(scalarMultiple.rank).toBe(1);
    expect(scalarMultiple.isLinearlyIndependent).toBe(false);
  });

  it('finds two independent vectors in 2D', () => {
    const result = analyzeVectorSet(
      vectorSet(2, [vector('v1', [1, 2]), vector('v2', [-2, 1])]),
    );

    expect(result).toMatchObject({
      ambientDimension: 2,
      vectorCount: 2,
      rank: 2,
      spanDimension: 2,
      isLinearlyIndependent: true,
    });
  });

  it('finds a two-dimensional span from two independent vectors in 3D', () => {
    const result = analyzeVectorSet(
      vectorSet(3, [vector('v1', [1, 0, 1]), vector('v2', [0, 1, 1])]),
    );

    expect(result.rank).toBe(2);
    expect(result.spanDimension).toBe(2);
    expect(result.isLinearlyIndependent).toBe(true);
  });

  it('finds three independent vectors in 3D', () => {
    const result = analyzeVectorSet(
      vectorSet(3, [
        vector('v1', [1, 0, 0]),
        vector('v2', [0, 1, 0]),
        vector('v3', [0, 0, 1]),
      ]),
    );

    expect(result.rank).toBe(3);
    expect(result.isLinearlyIndependent).toBe(true);
  });

  it('marks a set larger than its ambient dimension as dependent', () => {
    const result = analyzeVectorSet(
      vectorSet(3, [
        vector('v1', [1, 0, 0]),
        vector('v2', [0, 1, 0]),
        vector('v3', [0, 0, 1]),
        vector('v4', [1, 1, 1]),
      ]),
    );

    expect(result.rank).toBe(3);
    expect(result.isLinearlyIndependent).toBe(false);
  });

  it('keeps the result invariant under very different vector scales', () => {
    const result = analyzeVectorSet(
      vectorSet(2, [vector('v1', [1e-14, 0]), vector('v2', [0, 1e14])]),
    );

    expect(result.rank).toBe(2);
    expect(result.isLinearlyIndependent).toBe(true);
  });

  it('treats vectors closer than the default tolerance as dependent', () => {
    const result = analyzeVectorSet(
      vectorSet(2, [vector('v1', [1, 1]), vector('v2', [1, 1 + 1e-12])]),
    );

    expect(result.rank).toBe(1);
    expect(result.isLinearlyIndependent).toBe(false);
  });

  it('distinguishes vectors separated beyond the default tolerance', () => {
    const result = analyzeVectorSet(
      vectorSet(2, [vector('v1', [1, 1]), vector('v2', [1, 1 + 1e-8])]),
    );

    expect(result.rank).toBe(2);
    expect(result.isLinearlyIndependent).toBe(true);
  });

  it('allows the relative tolerance to be configured', () => {
    const vectors = vectorSet(2, [vector('v1', [1, 1]), vector('v2', [1, 1 + 1e-7])]);

    expect(analyzeVectorSet(vectors, { relativeTolerance: 1e-6 }).rank).toBe(1);
    expect(analyzeVectorSet(vectors, { relativeTolerance: 1e-9 }).rank).toBe(2);
  });
});

describe('vector-set validation', () => {
  it('rejects an unsupported ambient dimension at runtime', () => {
    const invalidSet = { dimension: 4, vectors: [] } as unknown as VectorSet;

    expect(() => analyzeVectorSet(invalidSet)).toThrowError(
      expect.objectContaining<Partial<InvalidVectorSetError>>({ code: 'INVALID_DIMENSION' }),
    );
  });

  it('rejects a coordinate count that differs from the ambient dimension', () => {
    expect(() => analyzeVectorSet(vectorSet(3, [vector('v1', [1, 2])]))).toThrowError(
      expect.objectContaining<Partial<InvalidVectorSetError>>({ code: 'DIMENSION_MISMATCH' }),
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects the non-finite coordinate %s',
    (coordinate) => {
      expect(() =>
        analyzeVectorSet(vectorSet(2, [vector('v1', [coordinate, 0])])),
      ).toThrowError(
        expect.objectContaining<Partial<InvalidVectorSetError>>({
          code: 'NON_FINITE_COORDINATE',
        }),
      );
    },
  );

  it('rejects duplicate vector IDs', () => {
    expect(() =>
      analyzeVectorSet(vectorSet(2, [vector('v1', [1, 0]), vector('v1', [0, 1])])),
    ).toThrowError(
      expect.objectContaining<Partial<InvalidVectorSetError>>({ code: 'DUPLICATE_VECTOR_ID' }),
    );
  });

  it('rejects an empty vector ID', () => {
    expect(() =>
      analyzeVectorSet(vectorSet(2, [{ id: '  ', name: 'v₁', coordinates: [1, 0] }])),
    ).toThrowError(
      expect.objectContaining<Partial<InvalidVectorSetError>>({ code: 'INVALID_VECTOR_ID' }),
    );
  });

  it('rejects an empty display name', () => {
    expect(() =>
      analyzeVectorSet(vectorSet(2, [{ id: 'v1', name: '', coordinates: [1, 0] }])),
    ).toThrowError(
      expect.objectContaining<Partial<InvalidVectorSetError>>({ code: 'INVALID_VECTOR_NAME' }),
    );
  });

  it.each([0, -1e-10, 1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the invalid tolerance %s',
    (relativeTolerance) => {
      expect(() =>
        analyzeVectorSet(vectorSet(2, []), { relativeTolerance }),
      ).toThrowError(
        expect.objectContaining<Partial<InvalidVectorSetError>>({ code: 'INVALID_TOLERANCE' }),
      );
    },
  );
});

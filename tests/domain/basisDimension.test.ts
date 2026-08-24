import { describe, expect, it } from 'vitest';
import {
  InvalidBasisCandidateError,
  InvalidVectorSetError,
  analyzeBasisCandidate,
  extractBasisExample,
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

describe('analyzeBasisCandidate', () => {
  it('recognizes an ordered independent pair that generates the 2D target space', () => {
    const result = analyzeBasisCandidate(
      vectorSet(2, [
        vector('a1', [1, 0]),
        vector('a2', [0, 1]),
        vector('a3', [1, 1]),
      ]),
      ['a2', 'a1'],
    );

    expect(result).toMatchObject({
      ambientDimension: 2,
      sourceVectorCount: 3,
      sourceRank: 2,
      targetDimension: 2,
      maximumIndependentCount: 2,
      candidateVectorIds: ['a2', 'a1'],
      candidateVectorCount: 2,
      candidateRank: 2,
      isLinearlyIndependent: true,
      spansTargetSpace: true,
      isBasis: true,
      failureReasons: [],
    });
  });

  it('separates an independent candidate that does not generate the target space', () => {
    const result = analyzeBasisCandidate(
      vectorSet(2, [vector('a1', [1, 0]), vector('a2', [0, 1])]),
      ['a1'],
    );

    expect(result).toMatchObject({
      isLinearlyIndependent: true,
      spansTargetSpace: false,
      isBasis: false,
      failureReasons: ['does-not-span-target'],
    });
  });

  it('separates a dependent candidate that still generates the target space', () => {
    const result = analyzeBasisCandidate(
      vectorSet(2, [
        vector('a1', [1, 0]),
        vector('a2', [0, 1]),
        vector('a3', [1, 1]),
      ]),
      ['a1', 'a2', 'a3'],
    );

    expect(result).toMatchObject({
      candidateRank: 2,
      isLinearlyIndependent: false,
      spansTargetSpace: true,
      isBasis: false,
      failureReasons: ['linearly-dependent'],
    });
  });

  it('reports both reasons when a dependent candidate also fails to generate the target space', () => {
    const result = analyzeBasisCandidate(
      vectorSet(3, [
        vector('a1', [1, 0, 0]),
        vector('a2', [2, 0, 0]),
        vector('a3', [0, 1, 0]),
        vector('a4', [0, 0, 1]),
      ]),
      ['a1', 'a2'],
    );

    expect(result).toMatchObject({
      targetDimension: 3,
      candidateRank: 1,
      isLinearlyIndependent: false,
      spansTargetSpace: false,
      isBasis: false,
      failureReasons: ['linearly-dependent', 'does-not-span-target'],
    });
  });

  it('uses rank as both the target dimension and the maximum independent count', () => {
    const result = analyzeBasisCandidate(
      vectorSet(3, [
        vector('a1', [1, 0, 1]),
        vector('a2', [0, 1, 1]),
        vector('a3', [1, 1, 2]),
      ]),
      ['a1', 'a2'],
    );

    expect(result.sourceRank).toBe(2);
    expect(result.targetDimension).toBe(2);
    expect(result.maximumIndependentCount).toBe(2);
    expect(result.isBasis).toBe(true);
  });

  it('treats the empty tuple as the basis of the zero-dimensional target space', () => {
    expect(analyzeBasisCandidate(vectorSet(2, []), [])).toMatchObject({
      targetDimension: 0,
      maximumIndependentCount: 0,
      isLinearlyIndependent: true,
      spansTargetSpace: true,
      isBasis: true,
      failureReasons: [],
      basisExampleVectorIds: [],
    });
  });

  it('distinguishes a zero-vector candidate from the empty basis of the same space', () => {
    const source = vectorSet(2, [vector('a1', [0, 0])]);

    expect(analyzeBasisCandidate(source, ['a1'])).toMatchObject({
      targetDimension: 0,
      isLinearlyIndependent: false,
      spansTargetSpace: true,
      isBasis: false,
      failureReasons: ['linearly-dependent'],
    });
    expect(analyzeBasisCandidate(source, []).isBasis).toBe(true);
  });

  it('uses the same configurable relative tolerance as the existing rank analysis', () => {
    const source = vectorSet(2, [
      vector('a1', [1, 1]),
      vector('a2', [1, 1 + 1e-7]),
    ]);

    expect(
      analyzeBasisCandidate(source, ['a1'], { relativeTolerance: 1e-6 }).isBasis,
    ).toBe(true);
    expect(
      analyzeBasisCandidate(source, ['a1'], { relativeTolerance: 1e-9 }).isBasis,
    ).toBe(false);
  });
});

describe('extractBasisExample', () => {
  it('returns the first rank-increasing vectors and skips zero and dependent vectors', () => {
    const source = vectorSet(3, [
      vector('a1', [0, 0, 0]),
      vector('a2', [1, 0, 0]),
      vector('a3', [2, 0, 0]),
      vector('a4', [0, 1, 0]),
      vector('a5', [1, 1, 0]),
    ]);

    expect(extractBasisExample(source)).toEqual(['a2', 'a4']);
    expect(analyzeBasisCandidate(source, ['a2', 'a4']).isBasis).toBe(true);
  });

  it('returns one deterministic example without claiming it is the only basis', () => {
    const source = vectorSet(2, [
      vector('a1', [1, 0]),
      vector('a2', [0, 1]),
      vector('a3', [1, 1]),
    ]);

    const result = analyzeBasisCandidate(source, ['a2', 'a3']);

    expect(result.isBasis).toBe(true);
    expect(result.basisExampleVectorIds).toEqual(['a1', 'a2']);
    expect(result.basisExampleVectorIds).not.toEqual(result.candidateVectorIds);
  });
});

describe('basis-candidate validation', () => {
  it.each([
    ['DUPLICATE_CANDIDATE_ID', ['a1', 'a1']],
    ['UNKNOWN_CANDIDATE_ID', ['missing']],
    ['INVALID_CANDIDATE_ID', ['']],
  ] as const)('rejects %s', (code, candidateIds) => {
    const source = vectorSet(2, [vector('a1', [1, 0])]);

    expect(() => analyzeBasisCandidate(source, candidateIds)).toThrowError(
      expect.objectContaining<Partial<InvalidBasisCandidateError>>({ code }),
    );
  });

  it('rejects a non-array candidate collection at runtime', () => {
    const source = vectorSet(2, [vector('a1', [1, 0])]);

    expect(() =>
      analyzeBasisCandidate(source, 'a1' as unknown as readonly string[]),
    ).toThrowError(
      expect.objectContaining<Partial<InvalidBasisCandidateError>>({
        code: 'INVALID_CANDIDATE_COLLECTION',
      }),
    );
  });

  it('keeps the existing vector-set validation as the source of truth', () => {
    const invalidSource = { dimension: 4, vectors: [] } as unknown as VectorSet;

    expect(() => analyzeBasisCandidate(invalidSource, [])).toThrowError(
      expect.objectContaining<Partial<InvalidVectorSetError>>({ code: 'INVALID_DIMENSION' }),
    );
  });
});

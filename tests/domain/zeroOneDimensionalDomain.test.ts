import { describe, expect, it } from 'vitest';
import {
  InvalidLinearMapError,
  InvalidVectorSetError,
  analyzeBasisCandidate,
  analyzeBasisCoordinates,
  analyzeLinearCombination,
  analyzeLinearMap,
  analyzeLinearMapLinearity,
  analyzeVectorSet,
  applyLinearMap,
  extractBasisExample,
  type LinearMapDefinition,
  type VectorSet,
  type VectorSpaceDimension,
  type VectorValue,
} from '../../src/domain';

const vector = (id: string, coordinates: readonly number[]): VectorValue => ({
  id,
  name: id,
  coordinates,
});

const vectorSet = (
  dimension: VectorSpaceDimension,
  vectors: readonly VectorValue[],
): VectorSet => ({ dimension, vectors });

const linearMap = (
  sourceDimension: VectorSpaceDimension,
  targetDimension: VectorSpaceDimension,
  matrix: readonly (readonly number[])[],
): LinearMapDefinition => ({ sourceDimension, targetDimension, matrix });

describe('0D・1Dのベクトル集合と一次結合', () => {
  it('0Dでは空集合だけが一次独立で、どのベクトル集合もrank 0になる', () => {
    expect(analyzeVectorSet(vectorSet(0, []))).toMatchObject({
      ambientDimension: 0,
      vectorCount: 0,
      rank: 0,
      spanDimension: 0,
      isLinearlyIndependent: true,
    });
    expect(analyzeVectorSet(vectorSet(0, [vector('a1', [])]))).toMatchObject({
      rank: 0,
      isLinearlyIndependent: false,
    });
    expect(analyzeVectorSet(vectorSet(0, [vector('a1', []), vector('a2', [])]))).toMatchObject({
      rank: 0,
      isLinearlyIndependent: false,
    });
  });

  it('1Dでは非零ベクトル1本だけが一次独立になる', () => {
    expect(analyzeVectorSet(vectorSet(1, [vector('a1', [2])]))).toMatchObject({
      ambientDimension: 1,
      rank: 1,
      isLinearlyIndependent: true,
    });
    expect(analyzeVectorSet(vectorSet(1, [vector('a1', [2]), vector('a2', [-3])]))).toMatchObject({
      rank: 1,
      isLinearlyIndependent: false,
    });
    expect(analyzeVectorSet(vectorSet(1, [vector('zero', [0])]))).toMatchObject({
      rank: 0,
      isLinearlyIndependent: false,
    });
  });

  it('0Dの空の一次結合には唯一の空係数があり、生成元があれば係数は無数にある', () => {
    expect(analyzeLinearCombination(vectorSet(0, []), [])).toMatchObject({
      ambientDimension: 0,
      status: 'unique',
      freeParameterCount: 0,
      particularSolution: [],
      exampleSolutions: [[]],
      nullspaceBasis: [],
    });
    expect(analyzeLinearCombination(vectorSet(0, [vector('a1', [])]), [])).toMatchObject({
      status: 'infinite',
      freeParameterCount: 1,
      particularSolution: [0],
      exampleSolutions: [[0], [1]],
      nullspaceBasis: [[1]],
    });
  });

  it('1Dの一次結合を解なし・一意・無数に分類する', () => {
    expect(analyzeLinearCombination(vectorSet(1, [vector('a1', [2])]), [6])).toMatchObject({
      status: 'unique',
      particularSolution: [3],
    });

    const infinite = analyzeLinearCombination(
      vectorSet(1, [vector('a1', [2]), vector('a2', [3])]),
      [7],
    );
    expect(infinite).toMatchObject({ status: 'infinite', freeParameterCount: 1 });
    infinite.exampleSolutions.forEach(([c1, c2]) => {
      expect(2 * c1 + 3 * c2).toBeCloseTo(7, 10);
    });

    expect(analyzeLinearCombination(vectorSet(1, [vector('zero', [0])]), [1]).status)
      .toBe('none');
  });
});

describe('0D・1Dの基底と座標', () => {
  it('空の組を0D零空間の唯一の基底として解析する', () => {
    const zeroSpace = vectorSet(0, []);

    expect(analyzeBasisCandidate(zeroSpace, [])).toMatchObject({
      ambientDimension: 0,
      sourceRank: 0,
      targetDimension: 0,
      maximumIndependentCount: 0,
      candidateVectorCount: 0,
      isLinearlyIndependent: true,
      spansTargetSpace: true,
      isBasis: true,
      basisExampleVectorIds: [],
    });
    expect(extractBasisExample(zeroSpace)).toEqual([]);
    expect(analyzeBasisCoordinates(zeroSpace, [], [])).toMatchObject({
      status: 'coordinate-vector',
      coordinateVector: [],
    });
  });

  it('0Dの零ベクトルを含む組と空の基底を区別する', () => {
    const zeroSpaceWithNamedVector = vectorSet(0, [vector('a1', [])]);

    expect(analyzeBasisCandidate(zeroSpaceWithNamedVector, ['a1'])).toMatchObject({
      candidateRank: 0,
      isLinearlyIndependent: false,
      spansTargetSpace: true,
      isBasis: false,
      failureReasons: ['linearly-dependent'],
    });
    expect(analyzeBasisCandidate(zeroSpaceWithNamedVector, []).isBasis).toBe(true);
  });

  it('1Dでは任意の非零ベクトル1本が基底になり、基底により座標が変わる', () => {
    const line = vectorSet(1, [vector('a1', [2]), vector('a2', [-3])]);

    expect(analyzeBasisCandidate(line, ['a1'])).toMatchObject({
      targetDimension: 1,
      isBasis: true,
      basisExampleVectorIds: ['a1'],
    });
    expect(analyzeBasisCandidate(line, ['a1', 'a2'])).toMatchObject({
      isLinearlyIndependent: false,
      spansTargetSpace: true,
      isBasis: false,
    });
    expect(analyzeBasisCoordinates(line, ['a1'], [6]).coordinateVector).toEqual([3]);
    expect(analyzeBasisCoordinates(line, ['a2'], [6]).coordinateVector).toEqual([-2]);
  });
});

describe('0D・1Dを含む線形写像', () => {
  it('0Dから0Dへの唯一の写像を全単射として解析する', () => {
    expect(analyzeLinearMap(linearMap(0, 0, []), [])).toEqual({
      sourceDimension: 0,
      targetDimension: 0,
      inputVector: [],
      imageVector: [],
      rank: 0,
      nullity: 0,
      imageDimension: 0,
      kernelDimension: 0,
      kernelBasis: [],
      imageBasis: [],
      imageBasisColumnIndices: [],
      rankNullitySum: 0,
      satisfiesDimensionTheorem: true,
      isInjective: true,
      isSurjective: true,
      isBijective: true,
    });
  });

  it('0Dから正次元への唯一の写像は単射だが全射ではない', () => {
    expect(analyzeLinearMap(linearMap(0, 2, [[], []]), [])).toMatchObject({
      imageVector: [0, 0],
      rank: 0,
      nullity: 0,
      kernelBasis: [],
      isInjective: true,
      isSurjective: false,
      isBijective: false,
      satisfiesDimensionTheorem: true,
    });
  });

  it('正次元から0Dへの唯一の写像は全射だが単射ではない', () => {
    const definition = linearMap(2, 0, []);
    const result = analyzeLinearMap(definition, [2, -1]);

    expect(applyLinearMap(definition, [2, -1])).toEqual([]);
    expect(result).toMatchObject({
      imageVector: [],
      rank: 0,
      nullity: 2,
      imageBasis: [],
      isInjective: false,
      isSurjective: true,
      isBijective: false,
      satisfiesDimensionTheorem: true,
    });
    expect(result.kernelBasis).toEqual([[1, 0], [0, 1]]);
  });

  it('1Dから1Dへの非零スカラー倍と零写像を区別する', () => {
    expect(analyzeLinearMap(linearMap(1, 1, [[-3]]), [2])).toMatchObject({
      imageVector: [-6],
      rank: 1,
      nullity: 0,
      isInjective: true,
      isSurjective: true,
      isBijective: true,
    });
    expect(analyzeLinearMap(linearMap(1, 1, [[0]]), [2])).toMatchObject({
      imageVector: [0],
      rank: 0,
      nullity: 1,
      kernelBasis: [[1]],
      isInjective: false,
      isSurjective: false,
      isBijective: false,
    });
  });

  it('1Dの埋め込みと1Dへの線形汎関数を解析する', () => {
    expect(analyzeLinearMap(linearMap(1, 3, [[2], [0], [-1]]), [4])).toMatchObject({
      imageVector: [8, 0, -4],
      rank: 1,
      nullity: 0,
      isInjective: true,
      isSurjective: false,
    });
    expect(analyzeLinearMap(linearMap(3, 1, [[1, -2, 3]]), [2, 4, -1])).toMatchObject({
      imageVector: [-9],
      rank: 1,
      nullity: 2,
      isInjective: false,
      isSurjective: true,
    });
  });

  it('空ベクトルでも和とスカラー倍を保つことを導出する', () => {
    expect(analyzeLinearMapLinearity(linearMap(0, 0, []), [], [], 2)).toMatchObject({
      firstInput: [],
      secondInput: [],
      inputSum: [],
      imageOfInputSum: [],
      sumOfImages: [],
      scaledInput: [],
      imageOfScaledInput: [],
      scaledImage: [],
      preservesAddition: true,
      preservesScalarMultiplication: true,
    });
  });
});

describe('0〜3次元の境界検証', () => {
  it('0と1を受理し、範囲外の次元を拒否する', () => {
    expect(() => analyzeVectorSet(vectorSet(0, []))).not.toThrow();
    expect(() => analyzeVectorSet(vectorSet(1, []))).not.toThrow();
    expect(() => analyzeVectorSet({ dimension: -1, vectors: [] } as unknown as VectorSet))
      .toThrowError(expect.objectContaining<Partial<InvalidVectorSetError>>({
        code: 'INVALID_DIMENSION',
      }));
    expect(() => analyzeLinearMap(
      { sourceDimension: 4, targetDimension: 0, matrix: [] } as unknown as LinearMapDefinition,
      [],
    )).toThrowError(expect.objectContaining<Partial<InvalidLinearMapError>>({
      code: 'INVALID_SOURCE_DIMENSION',
    }));
  });

  it('0D・1Dでも座標数と行列形状を厳密に検証する', () => {
    expect(() => analyzeVectorSet(vectorSet(0, [vector('a1', [0])])))
      .toThrowError(expect.objectContaining<Partial<InvalidVectorSetError>>({
        code: 'DIMENSION_MISMATCH',
      }));
    expect(() => applyLinearMap(linearMap(0, 1, [[1]]), []))
      .toThrowError(expect.objectContaining<Partial<InvalidLinearMapError>>({
        code: 'MATRIX_COLUMN_COUNT_MISMATCH',
      }));
    expect(() => applyLinearMap(linearMap(1, 0, []), []))
      .toThrowError(expect.objectContaining<Partial<InvalidLinearMapError>>({
        code: 'INPUT_DIMENSION_MISMATCH',
      }));
  });
});

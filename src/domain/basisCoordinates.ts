import {
  analyzeBasisCandidate,
  type BasisCandidateAnalysis,
} from './basisDimension';
import {
  analyzeLinearCombination,
  type LinearCombinationAnalysis,
} from './linearCombination';
import type { RankOptions, VectorSet, VectorValue } from './vectorSet';

export type BasisCoordinateStatus =
  | 'coordinate-vector'
  | 'not-representable'
  | 'non-unique'
  | 'not-a-basis';

export interface BasisCoordinateAnalysis {
  readonly status: BasisCoordinateStatus;
  readonly basisAnalysis: BasisCandidateAnalysis;
  readonly combinationAnalysis: LinearCombinationAnalysis;
  readonly coordinateVector: readonly number[] | null;
}

/**
 * 順序付き候補 B とターゲット v について一次結合を解析し、
 * 係数を B に関する座標ベクトルと呼べるかを区別する。
 */
export function analyzeBasisCoordinates(
  vectorSet: VectorSet,
  candidateVectorIds: readonly string[],
  target: readonly number[],
  options: RankOptions = {},
): BasisCoordinateAnalysis {
  const basisAnalysis = analyzeBasisCandidate(vectorSet, candidateVectorIds, options);
  const candidateVectors = resolveCandidateVectors(vectorSet.vectors, candidateVectorIds);
  const combinationAnalysis = analyzeLinearCombination(
    { dimension: vectorSet.dimension, vectors: candidateVectors },
    target,
    options,
  );

  if (basisAnalysis.isBasis && combinationAnalysis.status === 'unique') {
    return {
      status: 'coordinate-vector',
      basisAnalysis,
      combinationAnalysis,
      coordinateVector: combinationAnalysis.particularSolution,
    };
  }
  if (combinationAnalysis.status === 'none') {
    return {
      status: 'not-representable',
      basisAnalysis,
      combinationAnalysis,
      coordinateVector: null,
    };
  }
  if (combinationAnalysis.status === 'infinite') {
    return {
      status: 'non-unique',
      basisAnalysis,
      combinationAnalysis,
      coordinateVector: null,
    };
  }
  return {
    status: 'not-a-basis',
    basisAnalysis,
    combinationAnalysis,
    coordinateVector: null,
  };
}

function resolveCandidateVectors(
  vectors: readonly VectorValue[],
  candidateVectorIds: readonly string[],
): readonly VectorValue[] {
  const vectorsById = new Map(vectors.map((vector) => [vector.id, vector]));
  return candidateVectorIds.map((id) => vectorsById.get(id) as VectorValue);
}

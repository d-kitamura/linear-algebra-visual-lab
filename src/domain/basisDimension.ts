import {
  analyzeVectorSet,
  type RankOptions,
  type VectorSpaceDimension,
  type VectorSet,
  type VectorValue,
} from './vectorSet';

export type BasisFailureReason = 'linearly-dependent' | 'does-not-span-target';

export type BasisCandidateValidationCode =
  | 'INVALID_CANDIDATE_COLLECTION'
  | 'INVALID_CANDIDATE_ID'
  | 'DUPLICATE_CANDIDATE_ID'
  | 'UNKNOWN_CANDIDATE_ID';

export class InvalidBasisCandidateError extends Error {
  readonly code: BasisCandidateValidationCode;

  constructor(code: BasisCandidateValidationCode, message: string) {
    super(message);
    this.name = 'InvalidBasisCandidateError';
    this.code = code;
  }
}

/**
 * 全ベクトルの集合 S が生成する対象空間 V = span(S) に対し、
 * candidateVectorIds の順序付きの組が基底かどうかを表す。
 */
export interface BasisCandidateAnalysis {
  readonly ambientDimension: VectorSpaceDimension;
  readonly sourceVectorCount: number;
  readonly sourceRank: number;
  readonly targetDimension: number;
  readonly maximumIndependentCount: number;
  readonly candidateVectorIds: readonly string[];
  readonly candidateVectorCount: number;
  readonly candidateRank: number;
  readonly isLinearlyIndependent: boolean;
  readonly spansTargetSpace: boolean;
  readonly isBasis: boolean;
  readonly failureReasons: readonly BasisFailureReason[];
  readonly basisExampleVectorIds: readonly string[];
}

/**
 * 入力順を保った貪欲選択により、S から span(S) の基底となる一例を返す。
 * 返すのは一例であり、基底の一意性を主張しない。
 */
export function extractBasisExample(
  vectorSet: VectorSet,
  options: RankOptions = {},
): readonly string[] {
  const sourceAnalysis = analyzeVectorSet(vectorSet, options);
  const selected: VectorValue[] = [];
  let selectedRank = 0;

  for (const vector of vectorSet.vectors) {
    const nextVectors = [...selected, vector];
    const nextRank = analyzeVectorSet(
      { dimension: vectorSet.dimension, vectors: nextVectors },
      options,
    ).rank;

    if (nextRank > selectedRank) {
      selected.push(vector);
      selectedRank = nextRank;
    }

    if (selectedRank === sourceAnalysis.rank) {
      break;
    }
  }

  return selected.map((vector) => vector.id);
}

/**
 * S の部分列として指定した順序付きの組について、一次独立性と
 * V = span(S) の生成条件を別々に評価する。
 */
export function analyzeBasisCandidate(
  vectorSet: VectorSet,
  candidateVectorIds: readonly string[],
  options: RankOptions = {},
): BasisCandidateAnalysis {
  const sourceAnalysis = analyzeVectorSet(vectorSet, options);
  const candidateVectors = resolveCandidateVectors(vectorSet, candidateVectorIds);
  const candidateAnalysis = analyzeVectorSet(
    { dimension: vectorSet.dimension, vectors: candidateVectors },
    options,
  );
  const spansTargetSpace = candidateAnalysis.rank === sourceAnalysis.rank;
  const isBasis = candidateAnalysis.isLinearlyIndependent && spansTargetSpace;
  const failureReasons: BasisFailureReason[] = [];

  if (!candidateAnalysis.isLinearlyIndependent) {
    failureReasons.push('linearly-dependent');
  }
  if (!spansTargetSpace) {
    failureReasons.push('does-not-span-target');
  }

  return {
    ambientDimension: vectorSet.dimension,
    sourceVectorCount: vectorSet.vectors.length,
    sourceRank: sourceAnalysis.rank,
    targetDimension: sourceAnalysis.spanDimension,
    maximumIndependentCount: sourceAnalysis.rank,
    candidateVectorIds: [...candidateVectorIds],
    candidateVectorCount: candidateVectors.length,
    candidateRank: candidateAnalysis.rank,
    isLinearlyIndependent: candidateAnalysis.isLinearlyIndependent,
    spansTargetSpace,
    isBasis,
    failureReasons,
    basisExampleVectorIds: extractBasisExample(vectorSet, options),
  };
}

function resolveCandidateVectors(
  vectorSet: VectorSet,
  candidateVectorIds: readonly string[],
): readonly VectorValue[] {
  if (!Array.isArray(candidateVectorIds)) {
    throw new InvalidBasisCandidateError(
      'INVALID_CANDIDATE_COLLECTION',
      '基底候補はベクトル ID の配列である必要があります。',
    );
  }

  const vectorsById = new Map(vectorSet.vectors.map((vector) => [vector.id, vector]));
  const selectedIds = new Set<string>();

  return candidateVectorIds.map((candidateId, index) => {
    if (typeof candidateId !== 'string' || candidateId.trim().length === 0) {
      throw new InvalidBasisCandidateError(
        'INVALID_CANDIDATE_ID',
        `${index + 1} 番目の基底候補には空でないベクトル ID が必要です。`,
      );
    }
    if (selectedIds.has(candidateId)) {
      throw new InvalidBasisCandidateError(
        'DUPLICATE_CANDIDATE_ID',
        `基底候補のベクトル ID "${candidateId}" が重複しています。`,
      );
    }

    const vector = vectorsById.get(candidateId);
    if (!vector) {
      throw new InvalidBasisCandidateError(
        'UNKNOWN_CANDIDATE_ID',
        `基底候補のベクトル ID "${candidateId}" は集合 S に存在しません。`,
      );
    }

    selectedIds.add(candidateId);
    return vector;
  });
}

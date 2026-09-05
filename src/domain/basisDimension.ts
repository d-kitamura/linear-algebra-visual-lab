import {
  analyzeVectorSet,
  type RankOptions,
  type VectorSpaceDimension,
  type VectorSet,
  type VectorValue,
} from './vectorSet';

export type BasisFailureReason = 'linearly-dependent' | 'does-not-span-target';

export type BasisTargetSpace = 'source-span' | 'ambient';

export interface BasisAnalysisOptions extends RankOptions {
  /** 既定は従来のspan(S)。空間全体の基底を調べるLabはambientを明示する。 */
  readonly targetSpace?: BasisTargetSpace;
}

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
 * 明示した対象空間に対し、candidateVectorIdsの順序付きの組が基底かを表す。
 * 全ベクトルのrank（選べる最大一次独立本数）と、対象空間の次元は区別する。
 */
export interface BasisCandidateAnalysis {
  readonly ambientDimension: VectorSpaceDimension;
  readonly targetSpace: BasisTargetSpace;
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
  /** nullはSから対象空間の基底を選べない場合。[]は0次元の有効な空の基底。 */
  readonly basisExampleVectorIds: readonly string[] | null;
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
 * 対象空間の生成条件を別々に評価する。source-spanはV=span(S)、
 * ambientは周囲の空間全体。像・核の基底抽出の意味は変更しない。
 */
export function analyzeBasisCandidate(
  vectorSet: VectorSet,
  candidateVectorIds: readonly string[],
  options: BasisAnalysisOptions = {},
): BasisCandidateAnalysis {
  const sourceAnalysis = analyzeVectorSet(vectorSet, options);
  const candidateVectors = resolveCandidateVectors(vectorSet, candidateVectorIds);
  const candidateAnalysis = analyzeVectorSet(
    { dimension: vectorSet.dimension, vectors: candidateVectors },
    options,
  );
  const targetSpace = options.targetSpace ?? 'source-span';
  const targetDimension = targetSpace === 'ambient'
    ? vectorSet.dimension
    : sourceAnalysis.spanDimension;
  const spansTargetSpace = candidateAnalysis.rank === targetDimension;
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
    targetSpace,
    sourceVectorCount: vectorSet.vectors.length,
    sourceRank: sourceAnalysis.rank,
    targetDimension,
    maximumIndependentCount: sourceAnalysis.rank,
    candidateVectorIds: [...candidateVectorIds],
    candidateVectorCount: candidateVectors.length,
    candidateRank: candidateAnalysis.rank,
    isLinearlyIndependent: candidateAnalysis.isLinearlyIndependent,
    spansTargetSpace,
    isBasis,
    failureReasons,
    basisExampleVectorIds: sourceAnalysis.rank === targetDimension
      ? extractBasisExample(vectorSet, options)
      : null,
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

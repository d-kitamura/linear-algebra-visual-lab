import type { VectorDimension, VectorValue } from '../../domain';

export interface BasisDimensionScene {
  readonly dimension: VectorDimension;
  readonly vectors: readonly VectorValue[];
  readonly candidateVectorIds: readonly string[];
}

export const DEFAULT_BASIS_SCENES: Readonly<Record<VectorDimension, BasisDimensionScene>> = {
  2: {
    dimension: 2,
    vectors: [
      { id: 'a1', name: 'a1', coordinates: [2, 1] },
      { id: 'a2', name: 'a2', coordinates: [1, 2] },
      { id: 'a3', name: 'a3', coordinates: [3, 3] },
    ],
    candidateVectorIds: ['a1', 'a2'],
  },
  3: {
    dimension: 3,
    vectors: [
      { id: 'a1', name: 'a1', coordinates: [1, 0, 0] },
      { id: 'a2', name: 'a2', coordinates: [0, 1, 0] },
      { id: 'a3', name: 'a3', coordinates: [0, 0, 1] },
      { id: 'a4', name: 'a4', coordinates: [1, 1, 1] },
    ],
    candidateVectorIds: ['a1', 'a2', 'a3'],
  },
};

export function createDefaultBasisScene(dimension: VectorDimension): BasisDimensionScene {
  const source = DEFAULT_BASIS_SCENES[dimension];
  return {
    ...source,
    vectors: source.vectors.map((vector) => ({
      ...vector,
      coordinates: [...vector.coordinates],
    })),
    candidateVectorIds: [...source.candidateVectorIds],
  };
}

export function toggleBasisCandidate(
  candidateVectorIds: readonly string[],
  vectorId: string,
): readonly string[] {
  return candidateVectorIds.includes(vectorId)
    ? candidateVectorIds.filter((candidateId) => candidateId !== vectorId)
    : [...candidateVectorIds, vectorId];
}

export function moveBasisCandidate(
  candidateVectorIds: readonly string[],
  vectorId: string,
  offset: -1 | 1,
): readonly string[] {
  const currentIndex = candidateVectorIds.indexOf(vectorId);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= candidateVectorIds.length) {
    return [...candidateVectorIds];
  }

  const result = [...candidateVectorIds];
  [result[currentIndex], result[nextIndex]] = [result[nextIndex], result[currentIndex]];
  return result;
}

export function updateBasisVectorCoordinates(
  scene: BasisDimensionScene,
  vectorId: string,
  coordinates: readonly number[],
): BasisDimensionScene {
  return {
    ...scene,
    vectors: scene.vectors.map((vector) => vector.id === vectorId
      ? { ...vector, coordinates: [...coordinates] }
      : vector),
  };
}

export function createCoordinateDrafts(
  vectors: readonly VectorValue[],
): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(
    vectors.map((vector) => [vector.id, vector.coordinates.map(String)]),
  );
}

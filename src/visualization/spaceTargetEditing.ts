import {
  analyzeLinearCombination,
  type LinearCombinationStatus,
  type VectorValue,
} from '../domain';
import {
  createSpaceCombinationGeometry,
  type SpaceCombinationGeometry,
} from './spaceCombinationGeometry';

export interface SpaceTargetDragPreview {
  readonly status: LinearCombinationStatus;
  readonly geometry: SpaceCombinationGeometry | null;
}

export function createSpaceTargetDragPreview(
  coordinates: readonly [number, number, number],
  spanVectors: readonly VectorValue[],
): SpaceTargetDragPreview {
  const analysis = analyzeLinearCombination(
    { dimension: 3, vectors: spanVectors },
    coordinates,
  );
  return {
    status: analysis.status,
    geometry: analysis.particularSolution
      ? createSpaceCombinationGeometry(spanVectors, analysis.particularSolution)
      : null,
  };
}

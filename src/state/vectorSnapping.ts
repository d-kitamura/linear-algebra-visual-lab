import type { VectorValue } from '../domain';
import { MAX_ABSOLUTE_COORDINATE } from '../sharing';
import { isWithinOriginSnapDistance } from './originSnapping';

export const REFERENCE_PARALLEL_SNAP_VIEW_WIDTH = 10;
export const DEFAULT_PARALLEL_SNAP_DISTANCE = 1e-1;

export interface ParallelSnapResult {
  readonly coordinates: readonly [number, number];
  readonly targetVectorId: string | null;
}

export function snapDraggedVectorToParallel(
  draggedVectorId: string,
  coordinates: readonly [number, number],
  vectors: readonly VectorValue[],
  maximumDistance = DEFAULT_PARALLEL_SNAP_DISTANCE,
): ParallelSnapResult {
  if (!Number.isFinite(maximumDistance) || maximumDistance <= 0) {
    throw new RangeError('平行スナップの距離は 0 より大きい有限値である必要があります。');
  }

  if (isWithinOriginSnapDistance(coordinates, maximumDistance)) {
    return { coordinates: [0, 0], targetVectorId: null };
  }

  let closestTarget: VectorValue | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const vector of vectors) {
    if (vector.id === draggedVectorId || vector.coordinates.length !== 2) {
      continue;
    }

    const [targetX, targetY] = vector.coordinates;
    const targetLength = Math.hypot(targetX, targetY);
    if (targetLength === 0) {
      continue;
    }

    const distanceToTargetLine = Math.abs(
      coordinates[0] * targetY - coordinates[1] * targetX,
    ) / targetLength;

    if (distanceToTargetLine <= maximumDistance && distanceToTargetLine < closestDistance) {
      closestTarget = vector;
      closestDistance = distanceToTargetLine;
    }
  }

  if (!closestTarget) {
    return { coordinates, targetVectorId: null };
  }

  const [targetX, targetY] = closestTarget.coordinates;
  const targetLengthSquared = targetX * targetX + targetY * targetY;
  const projectionScale = (
    coordinates[0] * targetX + coordinates[1] * targetY
  ) / targetLengthSquared;
  const projected: readonly [number, number] = [
    projectionScale * targetX,
    projectionScale * targetY,
  ];
  const largestCoordinate = Math.max(Math.abs(projected[0]), Math.abs(projected[1]));
  const safetyScale = largestCoordinate > MAX_ABSOLUTE_COORDINATE
    ? MAX_ABSOLUTE_COORDINATE / largestCoordinate
    : 1;

  return {
    coordinates: [
      normalizeZero(projected[0] * safetyScale),
      normalizeZero(projected[1] * safetyScale),
    ],
    targetVectorId: closestTarget.id,
  };
}

export function parallelSnapDistanceForViewWidth(viewWidth: number): number {
  if (!Number.isFinite(viewWidth) || viewWidth <= 0) {
    throw new RangeError('表示幅は 0 より大きい有限値である必要があります。');
  }

  return DEFAULT_PARALLEL_SNAP_DISTANCE
    * viewWidth
    / REFERENCE_PARALLEL_SNAP_VIEW_WIDTH;
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

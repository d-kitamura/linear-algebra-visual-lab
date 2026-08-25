import type { VectorValue } from '../domain';
import { MAX_ABSOLUTE_COORDINATE } from '../sharing';
import { isWithinOriginSnapDistance } from './originSnapping';
import { DEFAULT_PARALLEL_SNAP_DISTANCE } from './vectorSnapping';

export type TargetSnapKind = 'origin' | 'span-line' | null;

export interface TargetSnapResult {
  readonly coordinates: readonly [number, number];
  readonly snapKind: TargetSnapKind;
}

export function snapTargetToSelectedSpan(
  coordinates: readonly [number, number],
  spanVectors: readonly VectorValue[],
  spanDimension: number,
  maximumDistance = DEFAULT_PARALLEL_SNAP_DISTANCE,
): TargetSnapResult {
  if (!coordinates.every(Number.isFinite)) {
    throw new TypeError('ターゲット座標は有限値である必要があります。');
  }
  if (!Number.isFinite(maximumDistance) || maximumDistance <= 0) {
    throw new RangeError('ターゲット吸着距離は 0 より大きい有限値である必要があります。');
  }

  if (isWithinOriginSnapDistance(coordinates, maximumDistance)) {
    return { coordinates: [0, 0], snapKind: 'origin' };
  }

  if (spanDimension === 0) {
    return { coordinates, snapKind: null };
  }

  if (spanDimension !== 1) {
    return { coordinates, snapKind: null };
  }

  const direction = spanVectors.find((vector) => (
    vector.coordinates.length === 2
    && (vector.coordinates[0] !== 0 || vector.coordinates[1] !== 0)
  ));
  if (!direction) {
    return { coordinates, snapKind: null };
  }

  const [directionX, directionY] = direction.coordinates;
  const directionLength = Math.hypot(directionX, directionY);
  const unitX = directionX / directionLength;
  const unitY = directionY / directionLength;
  const distanceToLine = Math.abs(
    coordinates[0] * unitY - coordinates[1] * unitX,
  );

  if (distanceToLine > maximumDistance) {
    return { coordinates, snapKind: null };
  }

  const projectionScale = (
    coordinates[0] * unitX + coordinates[1] * unitY
  );
  const projected: readonly [number, number] = [
    projectionScale * unitX,
    projectionScale * unitY,
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
    snapKind: 'span-line',
  };
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

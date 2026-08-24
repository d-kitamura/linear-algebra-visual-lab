import { analyzeVectorSet, type VectorValue } from '../domain';
import { MAX_ABSOLUTE_COORDINATE } from '../sharing';

export const SPACE_SNAP_DISTANCE_RATIO = 0.03;

export type SpaceVectorSnapKind = 'parallel' | 'coplanar' | null;

export interface SpaceVectorSnapResult {
  readonly coordinates: readonly [number, number, number];
  readonly snapKind: SpaceVectorSnapKind;
  readonly targetVectorIds: readonly string[];
}

interface SnapCandidate {
  readonly coordinates: readonly [number, number, number];
  readonly distance: number;
  readonly targetVectorIds: readonly string[];
}

export function spaceSnapDistanceForViewWidth(viewWidth: number): number {
  if (!Number.isFinite(viewWidth) || viewWidth <= 0) {
    throw new RangeError('3D表示幅は 0 より大きい有限値である必要があります。');
  }
  return viewWidth * SPACE_SNAP_DISTANCE_RATIO;
}

export function snapDraggedSpaceVectorToDependentPosition(
  draggedVectorId: string,
  coordinates: readonly [number, number, number],
  vectors: readonly VectorValue[],
  maximumDistance: number,
): SpaceVectorSnapResult {
  if (!Number.isFinite(maximumDistance) || maximumDistance <= 0) {
    throw new RangeError('3Dスナップの距離は 0 より大きい有限値である必要があります。');
  }
  if (coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new TypeError('3Dスナップの座標は有限値である必要があります。');
  }
  if (length(coordinates) === 0) {
    return withoutSnap(coordinates);
  }

  const targets = vectors.filter((vector) => (
    vector.id !== draggedVectorId
    && vector.coordinates.length === 3
    && vector.coordinates.every(Number.isFinite)
    && length(vector.coordinates) > 0
  ));

  const lineCandidate = findClosestLineCandidate(coordinates, targets, maximumDistance);
  if (lineCandidate) {
    return {
      coordinates: applyCoordinateSafetyLimit(lineCandidate.coordinates),
      snapKind: 'parallel',
      targetVectorIds: lineCandidate.targetVectorIds,
    };
  }

  const planeCandidate = findClosestPlaneCandidate(coordinates, targets, maximumDistance);
  if (planeCandidate) {
    return {
      coordinates: applyCoordinateSafetyLimit(planeCandidate.coordinates),
      snapKind: 'coplanar',
      targetVectorIds: planeCandidate.targetVectorIds,
    };
  }

  return withoutSnap(coordinates);
}

function findClosestLineCandidate(
  coordinates: readonly [number, number, number],
  targets: readonly VectorValue[],
  maximumDistance: number,
): SnapCandidate | null {
  let closest: SnapCandidate | null = null;

  targets.forEach((target) => {
    const targetCoordinates = asSpaceCoordinates(target.coordinates);
    const scale = dot(coordinates, targetCoordinates) / dot(targetCoordinates, targetCoordinates);
    const projected = multiply(targetCoordinates, scale);
    const distance = distanceBetween(coordinates, projected);
    if (distance <= maximumDistance && (!closest || distance < closest.distance)) {
      closest = {
        coordinates: projected,
        distance,
        targetVectorIds: [target.id],
      };
    }
  });

  return closest;
}

function findClosestPlaneCandidate(
  coordinates: readonly [number, number, number],
  targets: readonly VectorValue[],
  maximumDistance: number,
): SnapCandidate | null {
  let closest: SnapCandidate | null = null;

  for (let firstIndex = 0; firstIndex < targets.length - 1; firstIndex += 1) {
    const first = asSpaceCoordinates(targets[firstIndex].coordinates);
    for (let secondIndex = firstIndex + 1; secondIndex < targets.length; secondIndex += 1) {
      const second = asSpaceCoordinates(targets[secondIndex].coordinates);
      if (analyzeVectorSet({
        dimension: 3,
        vectors: [targets[firstIndex], targets[secondIndex]],
      }).rank < 2) {
        continue;
      }
      const normal = cross(first, second);
      const normalLength = length(normal);

      const signedDistance = dot(coordinates, normal) / normalLength;
      const distance = Math.abs(signedDistance);
      if (distance > maximumDistance || (closest && distance >= closest.distance)) {
        continue;
      }
      const unitNormal = multiply(normal, 1 / normalLength);
      closest = {
        coordinates: subtract(coordinates, multiply(unitNormal, signedDistance)),
        distance,
        targetVectorIds: [targets[firstIndex].id, targets[secondIndex].id],
      };
    }
  }

  return closest;
}

function applyCoordinateSafetyLimit(
  coordinates: readonly [number, number, number],
): readonly [number, number, number] {
  const largestCoordinate = Math.max(...coordinates.map(Math.abs));
  const safetyScale = largestCoordinate > MAX_ABSOLUTE_COORDINATE
    ? MAX_ABSOLUTE_COORDINATE / largestCoordinate
    : 1;
  return coordinates.map((coordinate) => normalizeZero(coordinate * safetyScale)) as [
    number,
    number,
    number,
  ];
}

function withoutSnap(
  coordinates: readonly [number, number, number],
): SpaceVectorSnapResult {
  return { coordinates, snapKind: null, targetVectorIds: [] };
}

function asSpaceCoordinates(coordinates: readonly number[]): readonly [number, number, number] {
  return [coordinates[0], coordinates[1], coordinates[2]];
}

function dot(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number {
  return first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
}

function cross(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): readonly [number, number, number] {
  return [
    first[1] * second[2] - first[2] * second[1],
    first[2] * second[0] - first[0] * second[2],
    first[0] * second[1] - first[1] * second[0],
  ];
}

function multiply(
  coordinates: readonly [number, number, number],
  scale: number,
): readonly [number, number, number] {
  return [coordinates[0] * scale, coordinates[1] * scale, coordinates[2] * scale];
}

function subtract(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): readonly [number, number, number] {
  return [first[0] - second[0], first[1] - second[1], first[2] - second[2]];
}

function distanceBetween(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number {
  return Math.hypot(
    first[0] - second[0],
    first[1] - second[1],
    first[2] - second[2],
  );
}

function length(coordinates: readonly number[]): number {
  return Math.hypot(...coordinates);
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

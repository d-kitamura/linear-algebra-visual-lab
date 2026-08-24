import { analyzeVectorSet, type VectorValue } from '../domain';
import { MAX_ABSOLUTE_COORDINATE } from '../sharing';
import { DEFAULT_PARALLEL_SNAP_DISTANCE } from './vectorSnapping';

export type SpaceTargetSnapKind = 'span-plane' | null;

export interface SpaceTargetSnapResult {
  readonly coordinates: readonly [number, number, number];
  readonly snapKind: SpaceTargetSnapKind;
  readonly basisVectorIds: readonly string[];
}

export function snapSpaceTargetToSelectedSpan(
  coordinates: readonly [number, number, number],
  spanVectors: readonly VectorValue[],
  spanRank: number,
  maximumDistance = DEFAULT_PARALLEL_SNAP_DISTANCE,
): SpaceTargetSnapResult {
  if (!coordinates.every(Number.isFinite)) {
    throw new TypeError('3Dターゲット座標は有限値である必要があります。');
  }
  if (!Number.isFinite(maximumDistance) || maximumDistance <= 0) {
    throw new RangeError('3Dターゲット吸着距離は 0 より大きい有限値である必要があります。');
  }
  if (spanRank !== 2) {
    return withoutSnap(coordinates);
  }

  const validVectors = spanVectors.filter((vector) => (
    vector.coordinates.length === 3
    && vector.coordinates.every(Number.isFinite)
  ));
  if (analyzeVectorSet({ dimension: 3, vectors: validVectors }).rank !== 2) {
    return withoutSnap(coordinates);
  }

  const basis = findIndependentPair(validVectors);
  if (!basis) {
    return withoutSnap(coordinates);
  }

  const first = asSpaceCoordinates(basis[0].coordinates);
  const second = asSpaceCoordinates(basis[1].coordinates);
  const normal = cross(first, second);
  const normalLength = length(normal);
  const signedDistance = dot(coordinates, normal) / normalLength;
  if (Math.abs(signedDistance) > maximumDistance) {
    return withoutSnap(coordinates);
  }

  const unitNormal = multiply(normal, 1 / normalLength);
  const projected = subtract(coordinates, multiply(unitNormal, signedDistance));
  return {
    coordinates: applyCoordinateSafetyLimit(projected),
    snapKind: 'span-plane',
    basisVectorIds: basis.map((vector) => vector.id),
  };
}

function findIndependentPair(
  vectors: readonly VectorValue[],
): readonly [VectorValue, VectorValue] | null {
  for (let firstIndex = 0; firstIndex < vectors.length - 1; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < vectors.length; secondIndex += 1) {
      const pair = [vectors[firstIndex], vectors[secondIndex]] as const;
      if (analyzeVectorSet({ dimension: 3, vectors: pair }).rank === 2) {
        return pair;
      }
    }
  }
  return null;
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
): SpaceTargetSnapResult {
  return { coordinates, snapKind: null, basisVectorIds: [] };
}

function asSpaceCoordinates(
  coordinates: readonly number[],
): readonly [number, number, number] {
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

function length(coordinates: readonly number[]): number {
  return Math.hypot(...coordinates);
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

import { analyzeVectorSet, type VectorValue } from '../domain';
import { MAX_ABSOLUTE_COORDINATE } from '../sharing';

export interface WorldPoint3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SpaceSpanDragPreview {
  readonly vectors: readonly VectorValue[];
  readonly rank: number;
}

export function vectorTipHitRadius(pointerType: string): number {
  if (pointerType === 'touch') {
    return 24;
  }
  if (pointerType === 'pen') {
    return 19;
  }
  return 15;
}

export function coordinatesFromScreenPlaneDrag(
  initialCoordinates: readonly [number, number, number],
  startPoint: WorldPoint3D,
  currentPoint: WorldPoint3D,
  maximumAbsoluteCoordinate = MAX_ABSOLUTE_COORDINATE,
): [number, number, number] {
  const delta = [
    currentPoint.x - startPoint.x,
    currentPoint.y - startPoint.y,
    currentPoint.z - startPoint.z,
  ];

  return initialCoordinates.map((coordinate, index) => {
    const clamped = Math.min(
      maximumAbsoluteCoordinate,
      Math.max(-maximumAbsoluteCoordinate, coordinate + delta[index]),
    );
    const rounded = Number(clamped.toFixed(6));
    return Object.is(rounded, -0) ? 0 : rounded;
  }) as [number, number, number];
}

export function coordinatesFromWorldPoint(
  point: WorldPoint3D,
  maximumAbsoluteCoordinate = MAX_ABSOLUTE_COORDINATE,
): [number, number, number] {
  if (!Number.isFinite(maximumAbsoluteCoordinate) || maximumAbsoluteCoordinate <= 0) {
    throw new RangeError('座標上限は 0 より大きい有限値である必要があります。');
  }
  const coordinates = [point.x, point.y, point.z];
  if (coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new TypeError('3D座標は有限値である必要があります。');
  }
  return coordinates.map((coordinate) => {
    const clamped = Math.min(
      maximumAbsoluteCoordinate,
      Math.max(-maximumAbsoluteCoordinate, coordinate),
    );
    const rounded = Number(clamped.toFixed(6));
    return Object.is(rounded, -0) ? 0 : rounded;
  }) as [number, number, number];
}

export function createSpaceSpanDragPreview(
  draggedVectorId: string,
  coordinates: readonly [number, number, number],
  spanVectors: readonly VectorValue[],
): SpaceSpanDragPreview | null {
  if (!spanVectors.some((vector) => vector.id === draggedVectorId)) {
    return null;
  }

  const previewVectors = spanVectors.map((vector) => (
    vector.id === draggedVectorId
      ? { ...vector, coordinates }
      : vector
  ));
  return {
    vectors: previewVectors,
    rank: analyzeVectorSet({ dimension: 3, vectors: previewVectors }).rank,
  };
}

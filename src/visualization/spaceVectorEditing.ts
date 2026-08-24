import { MAX_ABSOLUTE_COORDINATE } from '../sharing';

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export type ThreeDimensionalInteractionMode = 'camera' | 'vector';

const MIN_PROJECTED_AXIS_LENGTH_SQUARED = 1e-8;

export function coordinateFromAxisConstrainedDrag(
  initialCoordinate: number,
  startPointer: ScreenPoint,
  currentPointer: ScreenPoint,
  projectedPixelsPerCoordinate: ScreenPoint,
  maximumAbsoluteCoordinate = MAX_ABSOLUTE_COORDINATE,
): number | null {
  const axisLengthSquared = projectedPixelsPerCoordinate.x ** 2
    + projectedPixelsPerCoordinate.y ** 2;
  if (axisLengthSquared < MIN_PROJECTED_AXIS_LENGTH_SQUARED) {
    return null;
  }

  const pointerDelta = {
    x: currentPointer.x - startPointer.x,
    y: currentPointer.y - startPointer.y,
  };
  const coordinateDelta = (
    pointerDelta.x * projectedPixelsPerCoordinate.x
    + pointerDelta.y * projectedPixelsPerCoordinate.y
  ) / axisLengthSquared;
  const clamped = Math.min(
    maximumAbsoluteCoordinate,
    Math.max(-maximumAbsoluteCoordinate, initialCoordinate + coordinateDelta),
  );
  const rounded = Number(clamped.toFixed(6));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function nudgeCoordinate(
  coordinate: number,
  delta: number,
  maximumAbsoluteCoordinate = MAX_ABSOLUTE_COORDINATE,
): number {
  const clamped = Math.min(
    maximumAbsoluteCoordinate,
    Math.max(-maximumAbsoluteCoordinate, coordinate + delta),
  );
  const rounded = Number(clamped.toFixed(10));
  return Object.is(rounded, -0) ? 0 : rounded;
}

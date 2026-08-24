import { MAX_ABSOLUTE_COORDINATE } from '../sharing';

export interface WorldPoint3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
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

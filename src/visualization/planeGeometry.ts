export interface PlaneViewport {
  readonly width: number;
  readonly height: number;
  readonly padding: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export type SvgPoint = readonly [x: number, y: number];

export const DEFAULT_PLANE_VIEWPORT: PlaneViewport = {
  width: 640,
  height: 640,
  padding: 52,
  minX: -5,
  maxX: 5,
  minY: -5,
  maxY: 5,
};

export function toSvgPoint(
  coordinates: readonly [number, number],
  viewport: PlaneViewport = DEFAULT_PLANE_VIEWPORT,
): SvgPoint {
  const plotWidth = viewport.width - viewport.padding * 2;
  const plotHeight = viewport.height - viewport.padding * 2;
  const xRatio = (coordinates[0] - viewport.minX) / (viewport.maxX - viewport.minX);
  const yRatio = (viewport.maxY - coordinates[1]) / (viewport.maxY - viewport.minY);

  return [
    viewport.padding + xRatio * plotWidth,
    viewport.padding + yRatio * plotHeight,
  ];
}

export function createIntegerTicks(minimum: number, maximum: number): number[] {
  const first = Math.ceil(minimum);
  const last = Math.floor(maximum);

  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
}

export function createArrowHeadPoints(
  start: SvgPoint,
  end: SvgPoint,
  length = 18,
  halfWidth = 8,
): readonly [SvgPoint, SvgPoint, SvgPoint] | null {
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const magnitude = Math.hypot(deltaX, deltaY);

  if (magnitude === 0) {
    return null;
  }

  const unitX = deltaX / magnitude;
  const unitY = deltaY / magnitude;
  const baseX = end[0] - unitX * length;
  const baseY = end[1] - unitY * length;
  const perpendicularX = -unitY * halfWidth;
  const perpendicularY = unitX * halfWidth;

  return [
    end,
    [baseX + perpendicularX, baseY + perpendicularY],
    [baseX - perpendicularX, baseY - perpendicularY],
  ];
}

export function pointsToSvg(points: readonly SvgPoint[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

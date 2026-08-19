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

export const MIN_VIEWPORT_HALF_RANGE = 0.1;
export const MAX_VIEWPORT_HALF_RANGE = 2_000_000;
export const MAX_VIEWPORT_CENTER_ABSOLUTE = 2_000_000;

export const DEFAULT_PLANE_VIEWPORT: PlaneViewport = {
  width: 640,
  height: 640,
  padding: 52,
  minX: -5,
  maxX: 5,
  minY: -5,
  maxY: 5,
};

export interface TickScale {
  readonly values: readonly number[];
  readonly step: number;
}

const DEFAULT_AUTO_FIT_MARGIN_RATIO = 0.15;
const DEFAULT_TARGET_TICK_INTERVALS = 10;

export function createAutoFitViewport(
  vectors: readonly { readonly coordinates: readonly number[] }[],
  baseHalfRange = 5,
  marginRatio = DEFAULT_AUTO_FIT_MARGIN_RATIO,
): PlaneViewport {
  const largestCoordinate = vectors.reduce(
    (largest, vector) => Math.max(
      largest,
      Math.abs(vector.coordinates[0] ?? 0),
      Math.abs(vector.coordinates[1] ?? 0),
    ),
    0,
  );
  const halfRange = Math.max(baseHalfRange, largestCoordinate * (1 + marginRatio));

  return {
    ...DEFAULT_PLANE_VIEWPORT,
    minX: -halfRange,
    maxX: halfRange,
    minY: -halfRange,
    maxY: halfRange,
  };
}

export function createAdaptiveTicks(
  minimum: number,
  maximum: number,
  targetIntervals = DEFAULT_TARGET_TICK_INTERVALS,
): TickScale {
  const range = maximum - minimum;
  const roughStep = range / Math.max(1, targetIntervals);
  const step = createNiceStep(roughStep);
  const firstIndex = Math.ceil(minimum / step - Number.EPSILON);
  const lastIndex = Math.floor(maximum / step + Number.EPSILON);
  const values = Array.from(
    { length: Math.max(0, lastIndex - firstIndex + 1) },
    (_, index) => normalizeTick((firstIndex + index) * step),
  );

  return { values, step };
}

export function formatTickValue(value: number, step: number): string {
  const normalized = normalizeTick(value);
  const absolute = Math.abs(normalized);

  if (absolute >= 10_000 || (absolute > 0 && absolute < 0.001)) {
    return normalized.toExponential(0).replace('e+', 'e');
  }

  const decimalPlaces = step >= 1
    ? 0
    : Math.min(8, Math.max(0, Math.ceil(-Math.log10(step))));

  return normalized.toFixed(decimalPlaces).replace(/\.0+$/u, '');
}

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

export function fromSvgPoint(
  point: SvgPoint,
  viewport: PlaneViewport = DEFAULT_PLANE_VIEWPORT,
): readonly [x: number, y: number] {
  const plotWidth = viewport.width - viewport.padding * 2;
  const plotHeight = viewport.height - viewport.padding * 2;
  const xRatio = (point[0] - viewport.padding) / plotWidth;
  const yRatio = (point[1] - viewport.padding) / plotHeight;

  return [
    viewport.minX + xRatio * (viewport.maxX - viewport.minX),
    viewport.maxY - yRatio * (viewport.maxY - viewport.minY),
  ];
}

export function vectorCoordinatesFromSvgPoint(
  point: SvgPoint,
  viewport: PlaneViewport = DEFAULT_PLANE_VIEWPORT,
): readonly [x: number, y: number] {
  const coordinates = fromSvgPoint(point, viewport);

  return [
    roundCoordinateForViewport(coordinates[0], viewport),
    roundCoordinateForViewport(coordinates[1], viewport),
  ];
}

export function roundCoordinateForViewport(
  value: number,
  viewport: PlaneViewport,
): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  const plotWidth = viewport.width - viewport.padding * 2;
  const unitsPerSvgPixel = (viewport.maxX - viewport.minX) / plotWidth;
  const step = 10 ** Math.floor(Math.log10(unitsPerSvgPixel));
  const rounded = Math.round(value / step) * step;

  return normalizeTick(rounded);
}

export function zoomViewportAt(
  viewport: PlaneViewport,
  anchor: readonly [x: number, y: number],
  requestedFactor: number,
): PlaneViewport {
  if (!Number.isFinite(requestedFactor) || requestedFactor <= 0) {
    return viewport;
  }

  const currentHalfRange = (viewport.maxX - viewport.minX) / 2;
  const nextHalfRange = clamp(
    currentHalfRange * requestedFactor,
    MIN_VIEWPORT_HALF_RANGE,
    MAX_VIEWPORT_HALF_RANGE,
  );
  const factor = nextHalfRange / currentHalfRange;
  const nextViewport = {
    ...viewport,
    minX: anchor[0] + (viewport.minX - anchor[0]) * factor,
    maxX: anchor[0] + (viewport.maxX - anchor[0]) * factor,
    minY: anchor[1] + (viewport.minY - anchor[1]) * factor,
    maxY: anchor[1] + (viewport.maxY - anchor[1]) * factor,
  };

  return clampViewportCenter(nextViewport);
}

export function zoomViewportAtCenter(
  viewport: PlaneViewport,
  factor: number,
): PlaneViewport {
  return zoomViewportAt(viewport, getViewportCenter(viewport), factor);
}

export function translateViewport(
  viewport: PlaneViewport,
  deltaX: number,
  deltaY: number,
): PlaneViewport {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
    return viewport;
  }

  return clampViewportCenter({
    ...viewport,
    minX: viewport.minX + deltaX,
    maxX: viewport.maxX + deltaX,
    minY: viewport.minY + deltaY,
    maxY: viewport.maxY + deltaY,
  });
}

export function panViewportBySvgDelta(
  viewport: PlaneViewport,
  delta: SvgPoint,
): PlaneViewport {
  const plotWidth = viewport.width - viewport.padding * 2;
  const plotHeight = viewport.height - viewport.padding * 2;
  const unitsPerSvgX = (viewport.maxX - viewport.minX) / plotWidth;
  const unitsPerSvgY = (viewport.maxY - viewport.minY) / plotHeight;

  return translateViewport(
    viewport,
    -delta[0] * unitsPerSvgX,
    delta[1] * unitsPerSvgY,
  );
}

export function createIntegerTicks(minimum: number, maximum: number): number[] {
  const first = Math.ceil(minimum);
  const last = Math.floor(maximum);

  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
}

function createNiceStep(roughStep: number): number {
  if (!Number.isFinite(roughStep) || roughStep <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceNormalized = normalized <= 1
    ? 1
    : normalized <= 2
      ? 2
      : normalized <= 5
        ? 5
        : 10;

  return niceNormalized * magnitude;
}

function normalizeTick(value: number): number {
  return Math.abs(value) < Number.EPSILON * 10 ? 0 : Number(value.toPrecision(12));
}

function getViewportCenter(viewport: PlaneViewport): readonly [number, number] {
  return [
    (viewport.minX + viewport.maxX) / 2,
    (viewport.minY + viewport.maxY) / 2,
  ];
}

function clampViewportCenter(viewport: PlaneViewport): PlaneViewport {
  const [centerX, centerY] = getViewportCenter(viewport);
  const clampedCenterX = clamp(
    centerX,
    -MAX_VIEWPORT_CENTER_ABSOLUTE,
    MAX_VIEWPORT_CENTER_ABSOLUTE,
  );
  const clampedCenterY = clamp(
    centerY,
    -MAX_VIEWPORT_CENTER_ABSOLUTE,
    MAX_VIEWPORT_CENTER_ABSOLUTE,
  );

  return {
    ...viewport,
    minX: viewport.minX + clampedCenterX - centerX,
    maxX: viewport.maxX + clampedCenterX - centerX,
    minY: viewport.minY + clampedCenterY - centerY,
    maxY: viewport.maxY + clampedCenterY - centerY,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
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

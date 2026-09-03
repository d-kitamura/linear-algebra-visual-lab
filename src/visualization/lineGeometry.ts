export interface LineViewport {
  readonly width: number;
  readonly height: number;
  readonly padding: number;
  readonly min: number;
  readonly max: number;
}

export const MIN_LINE_VIEWPORT_HALF_RANGE = 0.1;
export const MAX_LINE_VIEWPORT_HALF_RANGE = 2_000_000;
export const MAX_LINE_VIEWPORT_CENTER_ABSOLUTE = 2_000_000;

export const DEFAULT_LINE_VIEWPORT: LineViewport = {
  width: 640,
  height: 240,
  padding: 52,
  min: -5,
  max: 5,
};

const DEFAULT_AUTO_FIT_MARGIN_RATIO = 0.15;

/** 1Dの表示対象を原点対称の範囲へ収める。手動表示状態は呼出側が管理する。 */
export function createAutoFitLineViewport(
  values: readonly number[],
  baseHalfRange = 5,
  marginRatio = DEFAULT_AUTO_FIT_MARGIN_RATIO,
): LineViewport {
  const largestMagnitude = values.reduce(
    (largest, value) => Number.isFinite(value) ? Math.max(largest, Math.abs(value)) : largest,
    0,
  );
  const halfRange = Math.max(baseHalfRange, largestMagnitude * (1 + marginRatio));

  return { ...DEFAULT_LINE_VIEWPORT, min: -halfRange, max: halfRange };
}

export function toLineSvgX(
  value: number,
  viewport: LineViewport = DEFAULT_LINE_VIEWPORT,
): number {
  const plotWidth = viewport.width - viewport.padding * 2;
  return viewport.padding + (value - viewport.min) / (viewport.max - viewport.min) * plotWidth;
}

export function fromLineSvgX(
  svgX: number,
  viewport: LineViewport = DEFAULT_LINE_VIEWPORT,
): number {
  const plotWidth = viewport.width - viewport.padding * 2;
  return viewport.min + (svgX - viewport.padding) / plotWidth * (viewport.max - viewport.min);
}

export function lineCoordinateFromSvgX(svgX: number, viewport: LineViewport): number {
  return roundLineCoordinateForViewport(fromLineSvgX(svgX, viewport), viewport);
}

export function roundLineCoordinateForViewport(value: number, viewport: LineViewport): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  const plotWidth = viewport.width - viewport.padding * 2;
  const unitsPerSvgPixel = (viewport.max - viewport.min) / plotWidth;
  const step = 10 ** Math.floor(Math.log10(unitsPerSvgPixel));
  const rounded = Math.round(value / step) * step;

  return normalizeLineValue(rounded);
}

export function zoomLineViewportAt(
  viewport: LineViewport,
  anchor: number,
  requestedFactor: number,
): LineViewport {
  if (!Number.isFinite(requestedFactor) || requestedFactor <= 0) {
    return viewport;
  }

  const currentHalfRange = (viewport.max - viewport.min) / 2;
  const nextHalfRange = clamp(
    currentHalfRange * requestedFactor,
    MIN_LINE_VIEWPORT_HALF_RANGE,
    MAX_LINE_VIEWPORT_HALF_RANGE,
  );
  const factor = nextHalfRange / currentHalfRange;

  return clampLineViewportCenter({
    ...viewport,
    min: anchor + (viewport.min - anchor) * factor,
    max: anchor + (viewport.max - anchor) * factor,
  });
}

export function zoomLineViewportAtCenter(
  viewport: LineViewport,
  factor: number,
): LineViewport {
  return zoomLineViewportAt(viewport, (viewport.min + viewport.max) / 2, factor);
}

export function translateLineViewport(viewport: LineViewport, delta: number): LineViewport {
  if (!Number.isFinite(delta)) {
    return viewport;
  }

  return clampLineViewportCenter({
    ...viewport,
    min: viewport.min + delta,
    max: viewport.max + delta,
  });
}

export function panLineViewportBySvgDelta(
  viewport: LineViewport,
  svgDeltaX: number,
): LineViewport {
  const plotWidth = viewport.width - viewport.padding * 2;
  const unitsPerSvgPixel = (viewport.max - viewport.min) / plotWidth;
  return translateLineViewport(viewport, -svgDeltaX * unitsPerSvgPixel);
}

function clampLineViewportCenter(viewport: LineViewport): LineViewport {
  const center = (viewport.min + viewport.max) / 2;
  const clampedCenter = clamp(
    center,
    -MAX_LINE_VIEWPORT_CENTER_ABSOLUTE,
    MAX_LINE_VIEWPORT_CENTER_ABSOLUTE,
  );

  return {
    ...viewport,
    min: viewport.min + clampedCenter - center,
    max: viewport.max + clampedCenter - center,
  };
}

function normalizeLineValue(value: number): number {
  return Math.abs(value) < Number.EPSILON * 10 ? 0 : Number(value.toPrecision(12));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

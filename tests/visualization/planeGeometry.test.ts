import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLANE_VIEWPORT,
  createAdaptiveTicks,
  createAutoFitViewport,
  createArrowHeadPoints,
  createIntegerTicks,
  formatTickValue,
  fromSvgPoint,
  panViewportBySvgDelta,
  pointsToSvg,
  roundCoordinateForViewport,
  toSvgPoint,
  vectorCoordinatesFromSvgPoint,
  zoomViewportAt,
  zoomViewportAtCenter,
} from '../../src/visualization';

describe('2D plane geometry', () => {
  it('maps the origin to the center of the default viewport', () => {
    expect(toSvgPoint([0, 0])).toEqual([320, 320]);
  });

  it('maps the plot bounds to the padded SVG bounds', () => {
    const viewport = DEFAULT_PLANE_VIEWPORT;

    expect(toSvgPoint([viewport.minX, viewport.maxY])).toEqual([
      viewport.padding,
      viewport.padding,
    ]);
    expect(toSvgPoint([viewport.maxX, viewport.minY])).toEqual([
      viewport.width - viewport.padding,
      viewport.height - viewport.padding,
    ]);
  });

  it('inverts the mathematical y direction for SVG coordinates', () => {
    const [, positiveY] = toSvgPoint([0, 2]);
    const [, negativeY] = toSvgPoint([0, -2]);

    expect(positiveY).toBeLessThan(320);
    expect(negativeY).toBeGreaterThan(320);
  });

  it('converts SVG points back to mathematical coordinates', () => {
    const point = toSvgPoint([2.5, -1.25]);

    expect(fromSvgPoint(point)[0]).toBeCloseTo(2.5);
    expect(fromSvgPoint(point)[1]).toBeCloseTo(-1.25);
  });

  it('creates inclusive integer ticks', () => {
    expect(createIntegerTicks(-2.4, 2.4)).toEqual([-2, -1, 0, 1, 2]);
  });

  it('keeps the default range when every vector fits inside it', () => {
    const viewport = createAutoFitViewport([
      { coordinates: [2, 1] },
      { coordinates: [-3, 2] },
    ]);

    expect(viewport.minX).toBe(-5);
    expect(viewport.maxX).toBe(5);
    expect(viewport.minY).toBe(-5);
    expect(viewport.maxY).toBe(5);
  });

  it('expands symmetrically with margin for an out-of-range vector', () => {
    const viewport = createAutoFitViewport([{ coordinates: [8, -2] }]);

    expect(viewport.maxX).toBeCloseTo(9.2);
    expect(viewport.minX).toBeCloseTo(-9.2);
    expect(viewport.maxY).toBeCloseTo(9.2);
    expect(viewport.minY).toBeCloseTo(-9.2);
  });

  it('chooses readable 1-2-5 tick steps for changing ranges', () => {
    expect(createAdaptiveTicks(-5, 5)).toEqual({
      values: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5],
      step: 1,
    });
    expect(createAdaptiveTicks(-11.5, 11.5)).toEqual({
      values: [-10, -5, 0, 5, 10],
      step: 5,
    });
  });

  it('formats ordinary and large tick values without negative zero', () => {
    expect(formatTickValue(-0, 1)).toBe('0');
    expect(formatTickValue(0.4, 0.2)).toBe('0.4');
    expect(formatTickValue(20_000, 10_000)).toBe('2e4');
  });

  it('zooms around a fixed mathematical anchor', () => {
    const anchor = [2, 1] as const;
    const anchorSvgBefore = toSvgPoint(anchor, DEFAULT_PLANE_VIEWPORT);
    const zoomed = zoomViewportAt(DEFAULT_PLANE_VIEWPORT, anchor, 0.5);
    const anchorSvgAfter = toSvgPoint(anchor, zoomed);

    expect(zoomed.maxX - zoomed.minX).toBeCloseTo(5);
    expect(anchorSvgAfter[0]).toBeCloseTo(anchorSvgBefore[0]);
    expect(anchorSvgAfter[1]).toBeCloseTo(anchorSvgBefore[1]);
  });

  it('zooms around the viewport center for button controls', () => {
    const zoomed = zoomViewportAtCenter(DEFAULT_PLANE_VIEWPORT, 2);

    expect(zoomed.minX).toBe(-10);
    expect(zoomed.maxX).toBe(10);
    expect(zoomed.minY).toBe(-10);
    expect(zoomed.maxY).toBe(10);
  });

  it('pans in the direction of an SVG background drag', () => {
    const panned = panViewportBySvgDelta(DEFAULT_PLANE_VIEWPORT, [53.6, 107.2]);

    expect(panned.minX).toBeCloseTo(-6);
    expect(panned.maxX).toBeCloseTo(4);
    expect(panned.minY).toBeCloseTo(-3);
    expect(panned.maxY).toBeCloseTo(7);
  });

  it('rounds dragged coordinates at the visible screen resolution', () => {
    expect(roundCoordinateForViewport(1.234, DEFAULT_PLANE_VIEWPORT)).toBe(1.23);
    expect(roundCoordinateForViewport(-2.346, DEFAULT_PLANE_VIEWPORT)).toBe(-2.35);

    const zoomed = zoomViewportAtCenter(DEFAULT_PLANE_VIEWPORT, 0.02);
    expect(roundCoordinateForViewport(0.01234, zoomed)).toBe(0.0123);
  });

  it('converts a dragged SVG point into rounded vector coordinates', () => {
    const point = toSvgPoint([1.234, -2.346]);

    expect(vectorCoordinatesFromSvgPoint(point)).toEqual([1.23, -2.35]);
  });

  it('creates a triangular arrow head and serializes its points', () => {
    const points = createArrowHeadPoints([0, 0], [100, 0], 20, 5);

    expect(points).toEqual([
      [100, 0],
      [80, 5],
      [80, -5],
    ]);
    expect(pointsToSvg(points ?? [])).toBe('100,0 80,5 80,-5');
  });

  it('omits an arrow head for a zero-length vector', () => {
    expect(createArrowHeadPoints([10, 10], [10, 10])).toBeNull();
  });
});

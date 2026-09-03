import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LINE_VIEWPORT,
  MAX_LINE_VIEWPORT_HALF_RANGE,
  MIN_LINE_VIEWPORT_HALF_RANGE,
  createAutoFitLineViewport,
  fromLineSvgX,
  lineCoordinateFromSvgX,
  panLineViewportBySvgDelta,
  toLineSvgX,
  translateLineViewport,
  zoomLineViewportAt,
  zoomLineViewportAtCenter,
} from '../../src/visualization';

describe('1D number-line geometry', () => {
  it('maps the visible interval to the padded SVG width and back', () => {
    expect(toLineSvgX(-5)).toBe(DEFAULT_LINE_VIEWPORT.padding);
    expect(toLineSvgX(5)).toBe(DEFAULT_LINE_VIEWPORT.width - DEFAULT_LINE_VIEWPORT.padding);
    expect(toLineSvgX(0)).toBe(DEFAULT_LINE_VIEWPORT.width / 2);
    expect(fromLineSvgX(toLineSvgX(2.5))).toBeCloseTo(2.5, 12);
  });

  it('rounds dragged values according to the visible units per pixel', () => {
    expect(lineCoordinateFromSvgX(toLineSvgX(1.234), DEFAULT_LINE_VIEWPORT))
      .toBeCloseTo(1.23, 12);
  });

  it('auto-fits vectors and target around the origin with the existing 15% margin', () => {
    expect(createAutoFitLineViewport([])).toMatchObject({ min: -5, max: 5 });
    expect(createAutoFitLineViewport([10, -3])).toMatchObject({ min: -11.5, max: 11.5 });
    expect(createAutoFitLineViewport([Number.NaN, 2])).toMatchObject({ min: -5, max: 5 });
  });

  it('zooms around the pointer anchor and preserves that coordinate on screen', () => {
    const anchor = 2;
    const anchorX = toLineSvgX(anchor, DEFAULT_LINE_VIEWPORT);
    const zoomed = zoomLineViewportAt(DEFAULT_LINE_VIEWPORT, anchor, 0.5);

    expect(toLineSvgX(anchor, zoomed)).toBeCloseTo(anchorX, 12);
    expect(zoomed.max - zoomed.min).toBeCloseTo(5, 12);
    expect(zoomLineViewportAtCenter(DEFAULT_LINE_VIEWPORT, 2)).toMatchObject({ min: -10, max: 10 });
  });

  it('clamps zoom and translation to the same safety scale as 2D', () => {
    const minimum = zoomLineViewportAtCenter(DEFAULT_LINE_VIEWPORT, 1e-12);
    const maximum = zoomLineViewportAtCenter(DEFAULT_LINE_VIEWPORT, 1e12);
    const translated = translateLineViewport(DEFAULT_LINE_VIEWPORT, 9e9);

    expect((minimum.max - minimum.min) / 2).toBe(MIN_LINE_VIEWPORT_HALF_RANGE);
    expect((maximum.max - maximum.min) / 2).toBe(MAX_LINE_VIEWPORT_HALF_RANGE);
    expect((translated.min + translated.max) / 2).toBe(2_000_000);
  });

  it('pans in the same direction as a background drag', () => {
    const plotWidth = DEFAULT_LINE_VIEWPORT.width - DEFAULT_LINE_VIEWPORT.padding * 2;
    const moved = panLineViewportBySvgDelta(DEFAULT_LINE_VIEWPORT, plotWidth / 10);
    expect(moved.min).toBeCloseTo(-6, 12);
    expect(moved.max).toBeCloseTo(4, 12);
  });
});

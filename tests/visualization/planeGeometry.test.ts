import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLANE_VIEWPORT,
  createArrowHeadPoints,
  createIntegerTicks,
  pointsToSvg,
  toSvgPoint,
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

  it('creates inclusive integer ticks', () => {
    expect(createIntegerTicks(-2.4, 2.4)).toEqual([-2, -1, 0, 1, 2]);
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

import { describe, expect, it } from 'vitest';
import { createLinearMapGridSegments } from '../../src/visualization';
import { DEFAULT_PLANE_VIEWPORT } from '../../src/visualization/planeGeometry';

describe('linear-map transformed grid', () => {
  it('maps both coordinate-line families through the matrix', () => {
    const segments = createLinearMapGridSegments({
      sourceDimension: 2,
      targetDimension: 2,
      matrix: [[1, 1], [0, 1]],
    }, DEFAULT_PLANE_VIEWPORT);
    const verticalAtZero = segments.find((segment) =>
      segment.family === 'first-coordinate' && segment.sourceValue === 0);
    const horizontalAtZero = segments.find((segment) =>
      segment.family === 'second-coordinate' && segment.sourceValue === 0);

    expect(verticalAtZero).toEqual({
      family: 'first-coordinate',
      sourceValue: 0,
      start: [-5, -5],
      end: [5, 5],
    });
    expect(horizontalAtZero).toEqual({
      family: 'second-coordinate',
      sourceValue: 0,
      start: [-5, 0],
      end: [5, 0],
    });
  });

  it('keeps the ordinary grid unchanged for the identity map', () => {
    const segments = createLinearMapGridSegments({
      sourceDimension: 2,
      targetDimension: 2,
      matrix: [[1, 0], [0, 1]],
    }, DEFAULT_PLANE_VIEWPORT);

    expect(segments).toContainEqual({
      family: 'first-coordinate',
      sourceValue: 2,
      start: [2, -5],
      end: [2, 5],
    });
    expect(segments).toContainEqual({
      family: 'second-coordinate',
      sourceValue: -1,
      start: [-5, -1],
      end: [5, -1],
    });
  });

  it('collapses both grid families onto one direction for a rank-one map', () => {
    const segments = createLinearMapGridSegments({
      sourceDimension: 2,
      targetDimension: 2,
      matrix: [[1, 2], [0.5, 1]],
    }, DEFAULT_PLANE_VIEWPORT);

    segments.forEach((segment) => {
      expect(segment.start[1]).toBeCloseTo(segment.start[0] * 0.5, 12);
      expect(segment.end[1]).toBeCloseTo(segment.end[0] * 0.5, 12);
    });
  });

  it('rejects dimensions outside the 2D-to-2D visual boundary', () => {
    expect(() => createLinearMapGridSegments({
      sourceDimension: 2,
      targetDimension: 3,
      matrix: [[1, 0], [0, 1], [0, 0]],
    }, DEFAULT_PLANE_VIEWPORT)).toThrow(RangeError);
  });
});

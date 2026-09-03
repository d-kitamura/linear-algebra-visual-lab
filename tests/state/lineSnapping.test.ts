import { describe, expect, it } from 'vitest';
import {
  LINE_SNAP_DISTANCE_RATIO,
  lineSnapDistanceForViewWidth,
  snapLineCoordinateToOrigin,
} from '../../src/state';

describe('1D origin snapping', () => {
  it('uses 2% of the current visible width', () => {
    expect(LINE_SNAP_DISTANCE_RATIO).toBe(0.02);
    expect(lineSnapDistanceForViewWidth(10)).toBe(0.2);
    expect(lineSnapDistanceForViewWidth(100)).toBe(2);
  });

  it('gives the origin priority inside the screen-relative distance', () => {
    expect(snapLineCoordinateToOrigin(0.19, 0.2))
      .toEqual({ coordinate: 0, snappedToOrigin: true });
    expect(snapLineCoordinateToOrigin(-0.2, 0.2))
      .toEqual({ coordinate: 0, snappedToOrigin: true });
    expect(snapLineCoordinateToOrigin(0.21, 0.2))
      .toEqual({ coordinate: 0.21, snappedToOrigin: false });
  });

  it('rejects invalid coordinates and distances', () => {
    expect(() => snapLineCoordinateToOrigin(Number.NaN, 0.2)).toThrow(TypeError);
    expect(() => snapLineCoordinateToOrigin(1, 0)).toThrow(RangeError);
    expect(() => lineSnapDistanceForViewWidth(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

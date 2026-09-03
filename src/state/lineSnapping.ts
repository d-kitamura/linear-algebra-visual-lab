/** 1Dの原点吸着距離。2Dと同じく現在の表示幅に対する2%を初期値とする。 */
export const LINE_SNAP_DISTANCE_RATIO = 0.02;

export interface LineOriginSnapResult {
  readonly coordinate: number;
  readonly snappedToOrigin: boolean;
}

export function lineSnapDistanceForViewWidth(viewWidth: number): number {
  if (!Number.isFinite(viewWidth) || viewWidth <= 0) {
    throw new RangeError('1D表示幅は正の有限値である必要があります。');
  }
  return viewWidth * LINE_SNAP_DISTANCE_RATIO;
}

export function snapLineCoordinateToOrigin(
  coordinate: number,
  maximumDistance: number,
): LineOriginSnapResult {
  if (!Number.isFinite(coordinate)) {
    throw new TypeError('1D座標は有限値である必要があります。');
  }
  if (!Number.isFinite(maximumDistance) || maximumDistance <= 0) {
    throw new RangeError('1D吸着距離は正の有限値である必要があります。');
  }

  return Math.abs(coordinate) <= maximumDistance
    ? { coordinate: 0, snappedToOrigin: true }
    : { coordinate, snappedToOrigin: false };
}

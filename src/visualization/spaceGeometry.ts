import type { VectorValue } from '../domain';
import {
  DEFAULT_3D_CAMERA_STATE,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  type SharedCameraState,
} from '../sharing';

export const DEFAULT_SPACE_HALF_RANGE = 5;
export const SPACE_FIT_PADDING = 1.25;
export const SPACE_CAMERA_DISTANCE_FACTOR = 3.2;
export const SPACE_SPAN_BOUNDARY_PADDING = 1.08;
export const SPACE_SPAN_PLANE_SIZE_FACTOR = 0.92;

export type CameraPreset = 'isometric' | 'front' | 'right' | 'top';

export interface ThreeDimensionalPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface CameraPose {
  readonly position: ThreeDimensionalPoint;
  readonly up: ThreeDimensionalPoint;
}

export interface SpaceExtent {
  readonly halfRange: number;
  readonly gridHalfSize: number;
  readonly cameraDistance: number;
}

export interface CameraStateSource {
  readonly position: ThreeDimensionalPoint;
  readonly target: ThreeDimensionalPoint;
  readonly up: ThreeDimensionalPoint;
  readonly zoom: number;
}

export type SpaceSpanGeometry =
  | { readonly kind: 'origin' }
  | {
    readonly kind: 'line';
    readonly direction: ThreeDimensionalPoint;
    readonly start: ThreeDimensionalPoint;
    readonly end: ThreeDimensionalPoint;
  }
  | {
    readonly kind: 'plane';
    readonly basisU: ThreeDimensionalPoint;
    readonly basisV: ThreeDimensionalPoint;
    readonly normal: ThreeDimensionalPoint;
    readonly halfSize: number;
  }
  | {
    readonly kind: 'space';
    readonly halfSize: number;
  };

export function createSpaceExtent(vectors: readonly VectorValue[]): SpaceExtent {
  const maximumCoordinate = vectors.reduce(
    (maximum, vector) => Math.max(
      maximum,
      ...vector.coordinates.map((coordinate) => Math.abs(coordinate)),
    ),
    0,
  );
  const halfRange = Math.max(
    DEFAULT_SPACE_HALF_RANGE,
    maximumCoordinate * SPACE_FIT_PADDING,
  );

  return {
    halfRange,
    gridHalfSize: Math.ceil(halfRange),
    cameraDistance: halfRange * SPACE_CAMERA_DISTANCE_FACTOR,
  };
}

export function createSpaceSpanGeometry(
  vectors: readonly VectorValue[],
  rank: number,
  halfRange: number,
  gridHalfSize = halfRange,
): SpaceSpanGeometry {
  if (!Number.isInteger(rank) || rank < 0 || rank > 3) {
    throw new RangeError('3Dのspanのrankは0以上3以下の整数である必要があります。');
  }
  if (!Number.isFinite(halfRange) || halfRange <= 0) {
    throw new RangeError('spanの表示半径は正の有限値である必要があります。');
  }
  if (!Number.isFinite(gridHalfSize) || gridHalfSize <= 0) {
    throw new RangeError('格子の表示半径は正の有限値である必要があります。');
  }

  if (rank === 0) {
    return { kind: 'origin' };
  }

  if (rank === 3) {
    return {
      kind: 'space',
      halfSize: halfRange * SPACE_SPAN_BOUNDARY_PADDING,
    };
  }

  const points = vectors.map(vectorToPoint);

  if (rank === 1) {
    const source = points.reduce<ThreeDimensionalPoint | null>((longest, point) => {
      if (pointLength(point) === 0) {
        return longest;
      }
      return !longest || pointLength(point) > pointLength(longest) ? point : longest;
    }, null);

    if (!source) {
      throw new RangeError('rank 1のspanには非零ベクトルが必要です。');
    }

    const direction = normalizePoint(source);
    const boundary = halfRange * SPACE_SPAN_BOUNDARY_PADDING;
    const scale = boundary / Math.max(
      Math.abs(direction.x),
      Math.abs(direction.y),
      Math.abs(direction.z),
    );

    return {
      kind: 'line',
      direction,
      start: scalePoint(direction, -scale),
      end: scalePoint(direction, scale),
    };
  }

  const normalizedPoints = points
    .filter((point) => pointLength(point) > 0)
    .map(normalizePoint);
  let bestPair: readonly [ThreeDimensionalPoint, ThreeDimensionalPoint] | null = null;
  let bestCrossLength = 0;

  for (let firstIndex = 0; firstIndex < normalizedPoints.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < normalizedPoints.length;
      secondIndex += 1
    ) {
      const crossLength = pointLength(crossPoint(
        normalizedPoints[firstIndex],
        normalizedPoints[secondIndex],
      ));
      if (crossLength > bestCrossLength) {
        bestCrossLength = crossLength;
        bestPair = [normalizedPoints[firstIndex], normalizedPoints[secondIndex]];
      }
    }
  }

  if (!bestPair || bestCrossLength === 0) {
    throw new RangeError('rank 2のspanには一次独立な2本のベクトルが必要です。');
  }

  const basisU = normalizePoint(bestPair[0]);
  const normal = normalizePoint(crossPoint(bestPair[0], bestPair[1]));
  const basisV = normalizePoint(crossPoint(normal, basisU));

  return {
    kind: 'plane',
    basisU,
    basisV,
    normal,
    halfSize: gridHalfSize * SPACE_SPAN_PLANE_SIZE_FACTOR,
  };
}

export function createCameraPose(
  preset: CameraPreset,
  distance: number,
): CameraPose {
  if (!Number.isFinite(distance) || distance <= 0) {
    throw new RangeError('カメラ距離は正の有限値である必要があります。');
  }

  switch (preset) {
    case 'front':
      return {
        position: { x: 0, y: -distance, z: 0 },
        up: { x: 0, y: 0, z: 1 },
      };
    case 'right':
      return {
        position: { x: distance, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 },
      };
    case 'top':
      return {
        position: { x: 0, y: 0, z: distance },
        up: { x: 0, y: 1, z: 0 },
      };
    case 'isometric':
      return {
        position: {
          x: distance * DEFAULT_3D_CAMERA_STATE.direction[0],
          y: distance * DEFAULT_3D_CAMERA_STATE.direction[1],
          z: distance * DEFAULT_3D_CAMERA_STATE.direction[2],
        },
        up: { x: 0, y: 0, z: 1 },
      };
  }
}

export function createSharedCameraState(source: CameraStateSource): SharedCameraState {
  const direction = normalizePoint({
    x: source.position.x - source.target.x,
    y: source.position.y - source.target.y,
    z: source.position.z - source.target.z,
  });
  const up = normalizePoint(source.up);

  return {
    direction: pointToTuple(direction, 8),
    target: pointToTuple(source.target, 6),
    up: pointToTuple(up, 8),
    zoom: roundFinite(
      Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, source.zoom)),
      8,
    ),
  };
}

export function orthographicHalfHeight(
  halfRange: number,
  aspectRatio: number,
): number {
  if (!Number.isFinite(halfRange) || halfRange <= 0) {
    throw new RangeError('表示半径は正の有限値である必要があります。');
  }
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new RangeError('アスペクト比は正の有限値である必要があります。');
  }

  const paddedHalfRange = halfRange * 1.4;
  return aspectRatio < 1 ? paddedHalfRange / aspectRatio : paddedHalfRange;
}

function normalizePoint(point: ThreeDimensionalPoint): ThreeDimensionalPoint {
  const length = Math.hypot(point.x, point.y, point.z);
  if (!Number.isFinite(length) || length === 0) {
    throw new RangeError('向きを表すベクトルは非零の有限値である必要があります。');
  }

  return {
    x: point.x / length,
    y: point.y / length,
    z: point.z / length,
  };
}

function vectorToPoint(vector: VectorValue): ThreeDimensionalPoint {
  return {
    x: vector.coordinates[0] ?? 0,
    y: vector.coordinates[1] ?? 0,
    z: vector.coordinates[2] ?? 0,
  };
}

function pointLength(point: ThreeDimensionalPoint): number {
  return Math.hypot(point.x, point.y, point.z);
}

function scalePoint(
  point: ThreeDimensionalPoint,
  scale: number,
): ThreeDimensionalPoint {
  return {
    x: point.x * scale,
    y: point.y * scale,
    z: point.z * scale,
  };
}

function crossPoint(
  first: ThreeDimensionalPoint,
  second: ThreeDimensionalPoint,
): ThreeDimensionalPoint {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

function pointToTuple(
  point: ThreeDimensionalPoint,
  fractionDigits: number,
): [number, number, number] {
  return [
    roundFinite(point.x, fractionDigits),
    roundFinite(point.y, fractionDigits),
    roundFinite(point.z, fractionDigits),
  ];
}

function roundFinite(value: number, fractionDigits: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError('カメラ状態は有限値である必要があります。');
  }
  const rounded = Number(value.toFixed(fractionDigits));
  return Object.is(rounded, -0) ? 0 : rounded;
}

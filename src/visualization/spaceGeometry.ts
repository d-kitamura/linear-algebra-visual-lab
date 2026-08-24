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

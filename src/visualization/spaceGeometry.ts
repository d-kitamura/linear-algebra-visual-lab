import type { VectorValue } from '../domain';

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
          x: distance * 0.85,
          y: -distance * 1.15,
          z: distance * 0.9,
        },
        up: { x: 0, y: 0, z: 1 },
      };
  }
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

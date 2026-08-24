import { describe, expect, it } from 'vitest';
import type { VectorValue } from '../../src/domain';
import {
  DEFAULT_SPACE_HALF_RANGE,
  createCameraPose,
  createSharedCameraState,
  createSpaceExtent,
  orthographicHalfHeight,
} from '../../src/visualization';

describe('3D表示範囲', () => {
  it('小さな固定例では基準半径5を維持する', () => {
    const vectors: readonly VectorValue[] = [
      { id: 'a1', name: 'a₁', coordinates: [2, 0, 1] },
      { id: 'a2', name: 'a₂', coordinates: [0, 2, 1] },
    ];

    expect(createSpaceExtent(vectors)).toEqual({
      halfRange: DEFAULT_SPACE_HALF_RANGE,
      gridHalfSize: 5,
      cameraDistance: 16,
    });
  });

  it('大きな座標を余白付きで収める', () => {
    const extent = createSpaceExtent([
      { id: 'a1', name: 'a₁', coordinates: [-12, 3, 2] },
    ]);

    expect(extent.halfRange).toBe(15);
    expect(extent.gridHalfSize).toBe(15);
    expect(extent.cameraDistance).toBe(48);
  });

  it('縦長画面では横方向が欠けないよう視野の高さを広げる', () => {
    expect(orthographicHalfHeight(5, 2)).toBeCloseTo(7);
    expect(orthographicHalfHeight(5, 0.5)).toBeCloseTo(14);
  });
});

describe('3D視点プリセット', () => {
  it('等角視点ではx正側・y負側・z正側から原点を見る', () => {
    const pose = createCameraPose('isometric', 10);

    expect(pose.position.x).toBeGreaterThan(0);
    expect(pose.position.y).toBeLessThan(0);
    expect(pose.position.z).toBeGreaterThan(0);
    expect(pose.up).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('正面・右・上の各視点を右手座標系に配置する', () => {
    expect(createCameraPose('front', 10)).toEqual({
      position: { x: 0, y: -10, z: 0 },
      up: { x: 0, y: 0, z: 1 },
    });
    expect(createCameraPose('right', 10)).toEqual({
      position: { x: 10, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
    });
    expect(createCameraPose('top', 10)).toEqual({
      position: { x: 0, y: 0, z: 10 },
      up: { x: 0, y: 1, z: 0 },
    });
  });

  it('不正なカメラ距離を拒否する', () => {
    expect(() => createCameraPose('isometric', 0)).toThrow(RangeError);
    expect(() => orthographicHalfHeight(5, Number.NaN)).toThrow(RangeError);
  });

  it('位置・注視点・上方向・拡大率を共有用カメラ状態へ変換する', () => {
    expect(createSharedCameraState({
      position: { x: 12, y: 0, z: 0 },
      target: { x: 2, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 2 },
      zoom: 2.5,
    })).toEqual({
      direction: [1, 0, 0],
      target: [2, 0, 0],
      up: [0, 0, 1],
      zoom: 2.5,
    });
  });
});

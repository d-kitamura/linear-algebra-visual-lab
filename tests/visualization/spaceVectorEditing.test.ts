import { describe, expect, it } from 'vitest';
import {
  coordinatesFromScreenPlaneDrag,
  coordinatesFromWorldPoint,
  createSpaceSpanDragPreview,
  vectorTipHitRadius,
} from '../../src/visualization/spaceVectorEditing';

describe('3Dベクトルの画面平行面編集', () => {
  it('操作面上の3次元変位を元の矢先へ加える', () => {
    expect(coordinatesFromScreenPlaneDrag(
      [1, 2, 3],
      { x: 4, y: 5, z: 6 },
      { x: 6, y: 4, z: 6 },
    )).toEqual([3, 1, 3]);
  });

  it('斜め視点に対応する3成分の同時変化を保持する', () => {
    expect(coordinatesFromScreenPlaneDrag(
      [-1, 0, 2],
      { x: 0, y: 0, z: 0 },
      { x: 1.25, y: -0.5, z: 0.75 },
    )).toEqual([0.25, -0.5, 2.75]);
  });

  it('共有状態が許す座標範囲へ各成分を収める', () => {
    expect(coordinatesFromScreenPlaneDrag(
      [9, -9, 0],
      { x: 0, y: 0, z: 0 },
      { x: 4, y: -4, z: -1e-8 },
      10,
    )).toEqual([10, -10, 0]);
  });

  it('タッチとペンにはマウスより広い矢先操作領域を使う', () => {
    expect(vectorTipHitRadius('mouse')).toBe(15);
    expect(vectorTipHitRadius('pen')).toBe(19);
    expect(vectorTipHitRadius('touch')).toBe(24);
  });

  it('画面平行面との交点を共有可能な3Dターゲット座標へ変換する', () => {
    expect(coordinatesFromWorldPoint(
      { x: 1.23456789, y: -2.34567891, z: -1e-9 },
    )).toEqual([1.234568, -2.345679, 0]);
    expect(coordinatesFromWorldPoint(
      { x: 12, y: -12, z: 3 },
      10,
    )).toEqual([10, -10, 3]);
  });

  it('3Dターゲット配置の不正な交点と座標上限を拒否する', () => {
    expect(() => coordinatesFromWorldPoint({ x: Number.NaN, y: 0, z: 0 }))
      .toThrow(TypeError);
    expect(() => coordinatesFromWorldPoint({ x: 0, y: 0, z: 0 }, 0))
      .toThrow(RangeError);
  });

  it('span対象の3本目を平面へ吸着したプレビューではrankを3から2へ更新する', () => {
    const spanVectors = [
      { id: 'a1', name: 'a₁', coordinates: [1, 0, 0] },
      { id: 'a2', name: 'a₂', coordinates: [0, 1, 0] },
      { id: 'a3', name: 'a₃', coordinates: [0, 0, 1] },
    ];

    expect(createSpaceSpanDragPreview('a3', [0.5, 0.25, 0], spanVectors)).toMatchObject({
      rank: 2,
      vectors: [
        spanVectors[0],
        spanVectors[1],
        { id: 'a3', name: 'a₃', coordinates: [0.5, 0.25, 0] },
      ],
    });
  });

  it('ドラッグ対象がspanに含まれなければプレビューを変更しない', () => {
    expect(createSpaceSpanDragPreview(
      'a3',
      [0.5, 0.25, 0],
      [
        { id: 'a1', name: 'a₁', coordinates: [1, 0, 0] },
        { id: 'a2', name: 'a₂', coordinates: [0, 1, 0] },
      ],
    )).toBeNull();
  });
});

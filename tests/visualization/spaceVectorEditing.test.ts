import { describe, expect, it } from 'vitest';
import {
  coordinatesFromScreenPlaneDrag,
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

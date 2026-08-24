import { describe, expect, it } from 'vitest';
import {
  coordinateFromAxisConstrainedDrag,
  nudgeCoordinate,
} from '../../src/visualization/spaceVectorEditing';

describe('3Dベクトルの軸拘束編集', () => {
  it('投影された軸方向へのポインター移動だけを成分へ反映する', () => {
    expect(coordinateFromAxisConstrainedDrag(
      1,
      { x: 10, y: 20 },
      { x: 30, y: 45 },
      { x: 10, y: 0 },
    )).toBe(3);
  });

  it('斜めに投影された軸への射影から成分を求める', () => {
    expect(coordinateFromAxisConstrainedDrag(
      -1,
      { x: 0, y: 0 },
      { x: 15, y: 15 },
      { x: 5, y: 5 },
    )).toBe(2);
  });

  it('画面に投影できない軸では編集を開始しない', () => {
    expect(coordinateFromAxisConstrainedDrag(
      1,
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 0 },
    )).toBeNull();
  });

  it('共有状態が許す座標範囲へ収める', () => {
    expect(coordinateFromAxisConstrainedDrag(
      9,
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 1, y: 0 },
      10,
    )).toBe(10);
    expect(nudgeCoordinate(-9.95, -0.1, 10)).toBe(-10);
  });
});

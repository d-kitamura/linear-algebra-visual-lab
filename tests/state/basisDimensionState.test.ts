import { describe, expect, it } from 'vitest';
import { analyzeBasisCandidate } from '../../src/domain';
import {
  createCoordinateDrafts,
  createDefaultBasisScene,
  moveBasisCandidate,
  toggleBasisCandidate,
  updateBasisPlaneVectorDrag,
  updateBasisVectorCoordinates,
} from '../../src/labs/basis-dimension/basisDimensionState';

describe('基底・次元Labの画面状態', () => {
  it('2Dと3Dの初期状態を独立したコピーとして作る', () => {
    const first = createDefaultBasisScene(2);
    const second = createDefaultBasisScene(2);
    const space = createDefaultBasisScene(3);

    expect(first.candidateVectorIds).toEqual(['a1', 'a2']);
    expect(space.candidateVectorIds).toEqual(['a1', 'a2', 'a3']);
    expect(first).not.toBe(second);
    expect(first.vectors).not.toBe(second.vectors);
  });

  it('チェックした順序で候補へ追加し、再選択で除外する', () => {
    expect(toggleBasisCandidate(['a2'], 'a1')).toEqual(['a2', 'a1']);
    expect(toggleBasisCandidate(['a2', 'a1'], 'a2')).toEqual(['a1']);
  });

  it('候補の順序を1つずつ変更し、端では変更しない', () => {
    expect(moveBasisCandidate(['a1', 'a2', 'a3'], 'a2', -1)).toEqual(['a2', 'a1', 'a3']);
    expect(moveBasisCandidate(['a1', 'a2', 'a3'], 'a2', 1)).toEqual(['a1', 'a3', 'a2']);
    expect(moveBasisCandidate(['a1', 'a2'], 'a1', -1)).toEqual(['a1', 'a2']);
  });

  it('座標更新時も候補順序と他のベクトルを保つ', () => {
    const scene = createDefaultBasisScene(3);
    const updated = updateBasisVectorCoordinates(scene, 'a2', [2, 3, 4]);

    expect(updated.vectors.find((vector) => vector.id === 'a2')?.coordinates).toEqual([2, 3, 4]);
    expect(updated.vectors.find((vector) => vector.id === 'a1')?.coordinates).toEqual([1, 0, 0]);
    expect(updated.candidateVectorIds).toEqual(scene.candidateVectorIds);
  });

  it('数値入力用の下書きをベクトルIDごとに作る', () => {
    const drafts = createCoordinateDrafts(createDefaultBasisScene(2).vectors);
    expect(drafts.a1).toEqual(['2', '1']);
    expect(drafts.a3).toEqual(['3', '3']);
  });

  it('2D矢先ドラッグを表示幅1%で他のベクトルへ平行吸着させる', () => {
    const scene = createDefaultBasisScene(2);
    const before = analyzeBasisCandidate(scene, scene.candidateVectorIds);
    const result = updateBasisPlaneVectorDrag(scene, 'a2', [4, 2.05], 10);
    const after = analyzeBasisCandidate(result.scene, result.scene.candidateVectorIds);

    expect(before.candidateRank).toBe(2);
    expect(result.snapTargetVectorId).toBe('a1');
    expect(result.coordinates[1] / result.coordinates[0]).toBeCloseTo(0.5);
    expect(after.candidateRank).toBe(1);
  });

  it('2D平行吸着の距離を現在の表示幅に比例させる', () => {
    const scene = createDefaultBasisScene(2);

    expect(updateBasisPlaneVectorDrag(scene, 'a2', [4, 2.15], 10).snapTargetVectorId)
      .toBeNull();
    expect(updateBasisPlaneVectorDrag(scene, 'a2', [4, 2.15], 20).snapTargetVectorId)
      .toBe('a1');
  });
});

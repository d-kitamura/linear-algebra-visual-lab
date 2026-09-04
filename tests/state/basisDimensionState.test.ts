import { describe, expect, it } from 'vitest';
import { analyzeBasisCandidate } from '../../src/domain';
import {
  createCoordinateDrafts,
  createDefaultBasisScene,
  moveBasisCandidate,
  toggleBasisCandidate,
  updateBasisPlaneVectorDrag,
  updateBasisTarget,
  updateBasisVectorCoordinates,
} from '../../src/labs/basis-dimension/basisDimensionState';

describe('基底・次元Labの画面状態', () => {
  it('0Dから3Dまでの初期状態を独立したコピーとして作る', () => {
    const zero = createDefaultBasisScene(0);
    const line = createDefaultBasisScene(1);
    const first = createDefaultBasisScene(2);
    const second = createDefaultBasisScene(2);
    const space = createDefaultBasisScene(3);

    expect(zero.vectors).toEqual([]);
    expect(zero.candidateVectorIds).toEqual([]);
    expect(line.vectors.map((vector) => vector.coordinates)).toEqual([[2], [-3], [0]]);
    expect(line.candidateVectorIds).toEqual(['a1']);
    expect(first.candidateVectorIds).toEqual(['a1', 'a2']);
    expect(space.candidateVectorIds).toEqual(['a1', 'a2', 'a3']);
    expect(first.target).toBeNull();
    expect(space.target).toBeNull();
    expect(first).not.toBe(second);
    expect(first.vectors).not.toBe(second.vectors);
  });

  it('1Dの非零候補と空候補を基底の2条件で区別する', () => {
    const scene = createDefaultBasisScene(1);

    expect(analyzeBasisCandidate(scene, ['a1'])).toMatchObject({
      candidateRank: 1,
      maximumIndependentCount: 1,
      isLinearlyIndependent: true,
      spansTargetSpace: true,
      isBasis: true,
    });
    expect(analyzeBasisCandidate(scene, [])).toMatchObject({
      candidateRank: 0,
      isLinearlyIndependent: true,
      spansTargetSpace: false,
      isBasis: false,
    });
  });

  it('0Dでは空の組が一次独立かつ零ベクトル空間を生成する基底になる', () => {
    const scene = createDefaultBasisScene(0);

    expect(analyzeBasisCandidate(scene, [])).toMatchObject({
      targetDimension: 0,
      candidateVectorCount: 0,
      candidateRank: 0,
      isLinearlyIndependent: true,
      spansTargetSpace: true,
      isBasis: true,
      maximumIndependentCount: 0,
    });
  });

  it('座標ターゲットを次元と安全上限を保って更新する', () => {
    const scene = createDefaultBasisScene(2);
    expect(updateBasisTarget(scene, [4, -2]).target).toEqual([4, -2]);
    expect(updateBasisTarget(scene, [2_000_000, 0]).target).toEqual([1_000_000, 0]);
    expect(() => updateBasisTarget(scene, [1, 2, 3])).toThrow(RangeError);
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

  it('2D矢先ドラッグを表示幅2%で他のベクトルへ平行吸着させる', () => {
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

    expect(updateBasisPlaneVectorDrag(scene, 'a2', [4, 2.3], 10).snapTargetVectorId)
      .toBeNull();
    expect(updateBasisPlaneVectorDrag(scene, 'a2', [4, 2.3], 20).snapTargetVectorId)
      .toBe('a1');
  });

  it('2D基底候補の矢先を原点へ吸着して零ベクトルにする', () => {
    const scene = createDefaultBasisScene(2);
    const result = updateBasisPlaneVectorDrag(scene, 'a2', [0.06, 0.04], 10);

    expect(result.coordinates).toEqual([0, 0]);
    expect(result.scene.vectors.find((vector) => vector.id === 'a2')?.coordinates)
      .toEqual([0, 0]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  analyzeBasisCandidate,
  analyzeBasisCoordinates,
  extractBasisExample,
  type VectorSet,
  type VectorSpaceDimension,
} from '../../src/domain';

const ambient = { targetSpace: 'ambient' } as const;
function set(dimension: VectorSpaceDimension, coordinates: number[][]): VectorSet {
  return { dimension, vectors: coordinates.map((values, index) => ({
    id: `a${index + 1}`, name: `a${index + 1}`, coordinates: values,
  })) };
}
const lineInPlane = set(2, [[1, 1], [2, 2], [3, 3]]);

describe('D-087 対象空間全体の基底とspan(S)の基底を区別する', () => {
  it.each([['a1'], ['a1', 'a2'], ['a1', 'a2', 'a3']])(
    '2Dで全ベクトルが一直線なら選択数によらず平面を生成しない (%s)',
    (...ids) => {
      const result = analyzeBasisCandidate(lineInPlane, ids, ambient);
      expect(result).toMatchObject({
        targetSpace: 'ambient', targetDimension: 2, sourceRank: 1,
        maximumIndependentCount: 1, spansTargetSpace: false, isBasis: false,
        isLinearlyIndependent: ids.length === 1, basisExampleVectorIds: null,
      });
      expect(result.failureReasons).toContain('does-not-span-target');
    },
  );

  it.each([
    { dimension: 1 as const, coordinates: [[0], [0]], ids: [], rank: 0 },
    { dimension: 2 as const, coordinates: [[0, 0]], ids: [], rank: 0 },
    { dimension: 3 as const, coordinates: [[1, 1, 1], [2, 2, 2]], ids: ['a1'], rank: 1 },
    { dimension: 3 as const, coordinates: [[1, 0, 0], [0, 1, 0], [1, 1, 0]], ids: ['a1', 'a2'], rank: 2 },
  ])('$dimension Dの低rank集合を空間全体の基底としない', ({ dimension, coordinates, ids, rank }) => {
    expect(analyzeBasisCandidate(set(dimension, coordinates), ids, ambient)).toMatchObject({
      targetDimension: dimension, sourceRank: rank, maximumIndependentCount: rank,
      isLinearlyIndependent: true, spansTargetSpace: false, isBasis: false,
      basisExampleVectorIds: null,
    });
  });

  it('基底例が存在しないnullと、0Dの有効な空の基底[]を区別する', () => {
    expect(analyzeBasisCandidate(set(0, []), [], ambient)).toMatchObject({
      isBasis: true, targetDimension: 0, basisExampleVectorIds: [],
    });
    expect(analyzeBasisCandidate(set(0, [[]]), ['a1'], ambient)).toMatchObject({
      isBasis: false, isLinearlyIndependent: false, spansTargetSpace: true,
      basisExampleVectorIds: [],
    });
    expect(analyzeBasisCandidate(set(1, [[0]]), [], ambient).basisExampleVectorIds).toBeNull();
  });

  it('Sが空間全体を生成すれば候補の成否と独立に正しい基底例を返す', () => {
    const plane = set(2, [[1, 0], [0, 1], [1, 1]]);
    expect(analyzeBasisCandidate(plane, ['a1'], ambient)).toMatchObject({
      isBasis: false, basisExampleVectorIds: ['a1', 'a2'],
    });
    expect(analyzeBasisCandidate(plane, ['a2', 'a1'], ambient).isBasis).toBe(true);
    expect(analyzeBasisCandidate(set(1, [[0], [2]]), ['a2'], ambient).isBasis).toBe(true);
  });

  it('部分空間上のターゲットへの一意な係数を空間全体の基底座標と呼ばない', () => {
    expect(analyzeBasisCoordinates(lineInPlane, ['a1'], [2, 2], ambient)).toMatchObject({
      status: 'not-a-basis', coordinateVector: null,
      combinationAnalysis: { status: 'unique', particularSolution: [2] },
    });
    expect(analyzeBasisCoordinates(lineInPlane, ['a1', 'a2'], [2, 2], ambient).status).toBe('non-unique');
    expect(analyzeBasisCoordinates(lineInPlane, ['a1'], [1, 0], ambient).status).toBe('not-representable');
  });

  it('記録済みの基底も成分の変更でrankが落ちたら座標を定義しない', () => {
    const ids = ['a1', 'a2'];
    const before = set(3, [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    expect(analyzeBasisCoordinates(before, [...ids, 'a3'], [1, 1, 0], ambient).status).toBe('coordinate-vector');
    const after = set(3, [[1, 0, 0], [0, 1, 0], [1, 1, 0]]);
    expect(analyzeBasisCoordinates(after, ids, [1, 1, 0], ambient).status).toBe('not-a-basis');
    expect(analyzeBasisCoordinates(after, [...ids, 'a3'], [1, 1, 0], ambient).status).toBe('non-unique');
  });

  it('既存APIのspan(S)基底と像の基底抽出の意味は維持する', () => {
    expect(analyzeBasisCandidate(lineInPlane, ['a1'])).toMatchObject({
      targetSpace: 'source-span', targetDimension: 1, isBasis: true,
      basisExampleVectorIds: ['a1'],
    });
    expect(extractBasisExample(lineInPlane)).toEqual(['a1']);
    expect(analyzeBasisCoordinates(lineInPlane, ['a1'], [2, 2]).status).toBe('coordinate-vector');
  });
});

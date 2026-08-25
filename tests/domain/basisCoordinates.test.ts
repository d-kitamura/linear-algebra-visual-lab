import { describe, expect, it } from 'vitest';
import {
  analyzeBasisCoordinates,
  type VectorDimension,
  type VectorSet,
  type VectorValue,
} from '../../src/domain';

function vector(id: string, coordinates: readonly number[]): VectorValue {
  return { id, name: id, coordinates };
}

function vectorSet(dimension: VectorDimension, vectors: readonly VectorValue[]): VectorSet {
  return { dimension, vectors };
}

const plane = vectorSet(2, [
  vector('a1', [2, 1]),
  vector('a2', [1, 2]),
  vector('a3', [3, 3]),
]);

describe('analyzeBasisCoordinates', () => {
  it('基底による一意な係数を座標ベクトルとして返す', () => {
    expect(analyzeBasisCoordinates(plane, ['a1', 'a2'], [3, 0])).toMatchObject({
      status: 'coordinate-vector',
      coordinateVector: [2, -1],
      combinationAnalysis: { status: 'unique' },
    });
  });

  it('同じベクトルでも基底または順序を変えると座標が変わる', () => {
    const standard = analyzeBasisCoordinates(plane, ['a1', 'a2'], [3, 0]);
    const alternative = analyzeBasisCoordinates(plane, ['a1', 'a3'], [3, 0]);
    const reversed = analyzeBasisCoordinates(plane, ['a2', 'a1'], [3, 0]);

    expect(standard.coordinateVector).toEqual([2, -1]);
    expect(alternative.coordinateVector).toEqual([3, -1]);
    expect(reversed.coordinateVector).toEqual([-1, 2]);
  });

  it('一次従属な生成系では係数が無数にあるため座標と呼ばない', () => {
    const result = analyzeBasisCoordinates(plane, ['a1', 'a2', 'a3'], [3, 0]);

    expect(result.status).toBe('non-unique');
    expect(result.coordinateVector).toBeNull();
    expect(result.combinationAnalysis.exampleSolutions).toHaveLength(2);
  });

  it('候補がターゲットを表現できない場合を区別する', () => {
    expect(analyzeBasisCoordinates(plane, ['a1'], [0, 1])).toMatchObject({
      status: 'not-representable',
      coordinateVector: null,
      combinationAnalysis: { status: 'none' },
    });
  });

  it('このターゲットだけは一意に表せても基底でなければ座標と呼ばない', () => {
    expect(analyzeBasisCoordinates(plane, ['a1'], [4, 2])).toMatchObject({
      status: 'not-a-basis',
      coordinateVector: null,
      combinationAnalysis: { status: 'unique', particularSolution: [2] },
    });
  });

  it('3D基底と零空間の空基底にも同じ規則を使う', () => {
    const space = vectorSet(3, [
      vector('a1', [1, 0, 0]),
      vector('a2', [0, 1, 0]),
      vector('a3', [0, 0, 1]),
    ]);
    expect(analyzeBasisCoordinates(space, ['a1', 'a2', 'a3'], [1, 2, 3])
      .coordinateVector).toEqual([1, 2, 3]);
    expect(analyzeBasisCoordinates(vectorSet(2, []), [], [0, 0])).toMatchObject({
      status: 'coordinate-vector',
      coordinateVector: [],
    });
  });
});

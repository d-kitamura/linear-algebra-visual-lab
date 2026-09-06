import { describe, expect, it } from 'vitest';
import {
  analyzeRepresentationMatrix, analyzeBasisChange, InvalidLinearMapError, InvalidVectorSetError,
  type LinearMapDefinition, type RepresentationMatrixAnalysis, type VectorSet, type VectorSpaceDimension,
} from '../../src/domain';

function basis(dimension: VectorSpaceDimension, columns: readonly (readonly number[])[]): VectorSet {
  return { dimension, vectors: columns.map((coordinates, index) => ({ id: `b${index}`, name: `b${index}`, coordinates })) };
}

function standard(dimension: VectorSpaceDimension): VectorSet {
  return basis(dimension, Array.from({ length: dimension }, (_, column) =>
    Array.from({ length: dimension }, (_, row) => row === column ? 1 : 0)));
}

function ready(result: RepresentationMatrixAnalysis) {
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error(JSON.stringify(result));
  return result.representation;
}

function close(actual: readonly number[], expected: readonly number[]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 9));
}

const map: LinearMapDefinition = { sourceDimension: 2, targetDimension: 2, matrix: [[1, 1], [0, 1]] };
const source = basis(2, [[1, 0], [1, 1]]);
const target = basis(2, [[1, 1], [0, 1]]);

describe('表現行列: D-092の各列と座標経路', () => {
  it('承認された数値例を列構成・両経路の途中値付きで返す', () => {
    const result = analyzeRepresentationMatrix(map, source, target, [3, 2]);
    expect(result.imageVector).toEqual([5, 2]);
    expect(ready(result)).toEqual({
      basisImages: [[1, 0], [2, 1]], columnCoordinates: [[1, -1], [2, -1]],
      matrix: [[1, 2], [-1, -1]], inputCoordinates: [1, 2], imageCoordinates: [5, -3],
      imageCoordinatesViaMatrix: [5, -3], imageViaCoordinates: [5, 2], pathsAgree: true,
    });
  });

  // 空行列を含む16組。0×nとm×0を行配列だけから推測しない。
  const dimensions = [0, 1, 2, 3] as const;
  for (const n of dimensions) for (const m of dimensions) {
    it(`${n}→${m}: 標準基底では表現行列は基準行列そのもの`, () => {
      const matrix = Array.from({ length: m }, (_, row) =>
        Array.from({ length: n }, (_, column) => row + column + 1));
      const input = Array.from({ length: n }, (_, index) => index + 1);
      const result = analyzeRepresentationMatrix({ sourceDimension: n, targetDimension: m, matrix }, standard(n), standard(m), input);
      expect(result).toMatchObject({ sourceDimension: n, targetDimension: m });
      const derived = ready(result);
      derived.matrix.forEach((row, index) => close(row, matrix[index]));
      expect(derived.matrix).toHaveLength(m);
      close(derived.inputCoordinates, input);
      close(derived.imageViaCoordinates, result.imageVector);
    });
  }

  it('定義域の順序交換はAの列、終域の順序交換はAの行を交換する', () => {
    const reverse = (value: VectorSet): VectorSet => ({ ...value, vectors: [...value.vectors].reverse() });
    const first = analyzeRepresentationMatrix(map, reverse(source), target, [3, 2]);
    const second = analyzeRepresentationMatrix(map, source, reverse(target), [3, 2]);
    expect(ready(first).matrix).toEqual([[2, 1], [-1, -1]]);
    expect(ready(first).inputCoordinates).toEqual([2, 1]);
    expect(ready(second).matrix).toEqual([[-1, -1], [1, 2]]);
    expect(first.imageVector).toEqual(second.imageVector);
  });

  for (const n of [1, 2, 3] as const) for (const m of [1, 2, 3] as const) {
    it(`${n}→${m}: 非標準基底の各列と入力の2経路を再構成する`, () => {
      const skew = (dimension: VectorSpaceDimension) => basis(dimension,
        Array.from({ length: dimension }, (_, column) =>
          Array.from({ length: dimension }, (_, row) => row === column ? 2 : row < column ? 1 : 0)));
      const definition = {
        sourceDimension: n, targetDimension: m,
        matrix: Array.from({ length: m }, (_, row) =>
          Array.from({ length: n }, (_, column) => (row + 1) * (column + 1))),
      };
      const input = Array.from({ length: n }, () => 2);
      const result = analyzeRepresentationMatrix(definition, skew(n), skew(m), input);
      const derived = ready(result);
      close(derived.imageViaCoordinates, result.imageVector);
      close(derived.imageCoordinatesViaMatrix, derived.imageCoordinates);
      derived.columnCoordinates.forEach((column, index) => {
        const reconstructed = Array.from({ length: m }, (_, row) => column.reduce(
          (sum, value, k) => sum + value * skew(m).vectors[k].coordinates[row], 0));
        close(reconstructed, derived.basisImages[index]);
      });
    });
  }

  it('非標準の3D→2D基底、退化写像、零写像を区別する', () => {
    const b = basis(3, [[2, 0, 0], [1, 1, 0], [0, 0, 2]]);
    const projection = ready(analyzeRepresentationMatrix({ sourceDimension: 3, targetDimension: 2, matrix: [[1, 0, 0], [0, 1, 0]] }, b, target, [3, 1, 2]));
    expect(projection.matrix).toEqual([[2, 1, 0], [-2, 0, 0]]);
    expect(projection.inputCoordinates).toEqual([1, 1, 1]);
    expect(ready(analyzeRepresentationMatrix({ ...map, matrix: [[0, 0], [0, 0]] }, source, target, [3, 2])).matrix).toEqual([[0, 0], [0, 0]]);
  });

  it('入力・基底・行列を変更せず、結果の配列にも入力参照を持たせない', () => {
    const snapshot = JSON.stringify([map, source, target]);
    const result = ready(analyzeRepresentationMatrix(map, source, target, [3, 2]));
    (result.matrix[0] as number[])[0] = 100;
    expect(JSON.stringify([map, source, target])).toBe(snapshot);
    expect(ready(analyzeRepresentationMatrix(map, source, target, [3, 2])).matrix[0][0]).toBe(1);
  });
});

describe('基底変換の方向', () => {
  it('B→CとC→Bは逆向きで、変換して戻すと同じ座標になる', () => {
    const forward = ready(analyzeBasisChange(2, source, target, [3, 2]));
    const backward = ready(analyzeBasisChange(2, target, source, [3, 2]));
    expect(forward.matrix).toEqual([[1, 1], [-1, 0]]);
    expect(backward.matrix).toEqual([[0, -1], [1, 1]]);
    expect(forward.imageCoordinatesViaMatrix).toEqual(backward.inputCoordinates);
    expect(backward.imageCoordinatesViaMatrix).toEqual(forward.inputCoordinates);
    const product = forward.matrix.map((row) => backward.matrix.map((_, j) =>
      row.reduce((sum, entry, k) => sum + entry * backward.matrix[k][j], 0)));
    expect(product).toEqual([[1, 0], [0, 1]]);
  });
  it('同じ基底なら単位行列、順序交換なら置換行列、0Dなら空行列', () => {
    expect(ready(analyzeBasisChange(2, source, source, [3, 2])).matrix).toEqual([[1, 0], [0, 1]]);
    expect(ready(analyzeBasisChange(2, source, { ...source, vectors: [...source.vectors].reverse() }, [3, 2])).matrix).toEqual([[0, 1], [1, 0]]);
    expect(ready(analyzeBasisChange(0, standard(0), standard(0), [])).matrix).toEqual([]);
  });
});

describe('多項式の標準単項式係数と基底座標', () => {
  it('D: R[x]_2→R[x]_1、終域基底(1,1+x)の承認例', () => {
    const result = analyzeRepresentationMatrix({ sourceDimension: 3, targetDimension: 2, matrix: [[0, 1, 0], [0, 0, 2]] }, standard(3), basis(2, [[1, 0], [1, 1]]), [1, 2, 3]);
    expect(result.imageVector).toEqual([2, 6]);
    const derived = ready(result);
    expect(derived.matrix).toEqual([[0, 1, -2], [0, 0, 2]]);
    expect(derived.imageCoordinates).toEqual([-4, 6]);
  });
  it('x倍: R[x]_1→R[x]_2では係数を昇べき順に1つずらす', () => {
    const result = analyzeRepresentationMatrix({ sourceDimension: 2, targetDimension: 3, matrix: [[0, 0], [1, 0], [0, 1]] }, source, standard(3), [2, 3]);
    expect(result.imageVector).toEqual([0, 2, 3]);
    expect(ready(result).matrix).toEqual([[0, 0], [1, 1], [0, 1]]);
  });
});

describe('不正基底と数値境界', () => {
  it.each([
    [basis(2, [[1, 0]]), 'too-few-vectors'],
    [basis(2, [[1, 0], [0, 1], [1, 1]]), 'too-many-vectors'],
    [basis(2, [[1, 1], [2, 2]]), 'linearly-dependent'],
    [standard(3), 'dimension-mismatch'],
    [basis(2, [[1], [2]]), 'dimension-mismatch'],
  ] as const)('%s: 両側の失敗理由を示し、表現行列を返さない', (invalid, reason) => {
    const result = analyzeRepresentationMatrix(map, invalid, invalid, [3, 2]);
    expect(result.status).toBe('invalid-basis');
    expect(result.representation).toBeNull();
    expect(result.sourceBasis.failureReasons).toContain(reason);
    expect(result.targetBasis.failureReasons).toContain(reason);
    expect(result.imageVector).toEqual([5, 2]);
  });
  it('ターゲットを表せても空間全体の基底でなければ座標を返さない', () => {
    const result = analyzeRepresentationMatrix(map, source, basis(2, [[1, 0]]), [1, 0]);
    expect(result).toMatchObject({ status: 'invalid-basis', representation: null });
    expect(result.targetBasis.analysis?.targetDimension).toBe(2);
  });
  it('0Dの零ベクトル1本は空の基底ではない', () => {
    expect(analyzeBasisChange(0, basis(0, [[]]), standard(0), [])).toMatchObject({
      status: 'invalid-basis', sourceBasis: { failureReasons: ['too-many-vectors', 'linearly-dependent'] },
    });
  });
  it('D-009の1e-10付近で基底判定し、オプションも引き継ぐ', () => {
    const near = (epsilon: number) => basis(2, [[1, 0], [1, epsilon]]);
    expect(analyzeBasisChange(2, near(0.5e-10), standard(2), [1, 0]).status).toBe('invalid-basis');
    expect(analyzeBasisChange(2, near(2e-10), standard(2), [1, 0]).status).toBe('ready');
    expect(analyzeBasisChange(2, near(2e-10), standard(2), [1, 0], { relativeTolerance: 1e-9 }).status).toBe('invalid-basis');
  });
  it('列スケールを変えても独立性は保ち、導出係数には入力上限を適用しない', () => {
    const result = ready(analyzeBasisChange(1, basis(1, [[1e-12]]), standard(1), [1]));
    expect(result.inputCoordinates).toEqual([1e12]);
    expect(result.matrix).toEqual([[1e-12]]);
    expect(result.imageCoordinatesViaMatrix).toEqual([1]);
  });
  it('丸めで微小係数が失われた場合、経路一致を偽って返さない', () => {
    const result = analyzeBasisChange(1, standard(1), standard(1), [1e-16]);
    expect(result).toMatchObject({ status: 'numerical-failure', failureReason: 'residual-too-large', representation: null });
    expect(result.imageVector).toEqual([1e-16]);
  });
  it('有限入力からのオーバーフローも正常な座標として公開しない', () => {
    expect(analyzeBasisChange(1, basis(1, [[1e-310]]), standard(1), [1])).toMatchObject({
      status: 'numerical-failure', failureReason: 'non-finite-result', representation: null,
    });
    expect(analyzeRepresentationMatrix({ sourceDimension: 1, targetDimension: 1, matrix: [[1e6]] }, basis(1, [[1e308]]), standard(1), [1])).toMatchObject({ status: 'numerical-failure', failureReason: 'non-finite-result' });
  });
  it('構造不正・非有限値・入力上限・許容誤差の既存検証を維持する', () => {
    expect(() => analyzeRepresentationMatrix({ ...map, matrix: [[1]] }, source, target, [1, 2])).toThrow(InvalidLinearMapError);
    expect(() => analyzeRepresentationMatrix(map, source, target, [Infinity, 0])).toThrow(InvalidLinearMapError);
    expect(() => analyzeRepresentationMatrix(map, source, target, [1e7, 0])).toThrow(InvalidLinearMapError);
    expect(() => analyzeRepresentationMatrix(map, basis(2, [[NaN, 0], [0, 1]]), target, [1, 2])).toThrow(InvalidVectorSetError);
    expect(() => analyzeRepresentationMatrix(map, source, target, [1, 2], { relativeTolerance: 0 })).toThrow(InvalidVectorSetError);
  });
});

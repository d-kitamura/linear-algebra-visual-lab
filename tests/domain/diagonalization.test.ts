import { describe, expect, it, vi } from 'vitest';
import * as eigenApi from '../../src/domain/eigen';
import * as numerics from '../../src/domain/diagonalizationNumerics';
import { EigenPrecisionLimit } from '../../src/domain/eigenExact';
import { analyzeDiagonalization, analyzeDiagonalizationInput, reorderDiagonalization,
  InvalidDiagonalizationInputError, InvalidEigenInputError, type EigenMapDefinition } from '../../src/domain';

const analyze = (matrix: number[][]) => analyzeDiagonalization({ dimension: matrix.length as EigenMapDefinition['dimension'], matrix });
const expectVector = (actual: readonly number[], expected: readonly number[]) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((x, i) => expect(x).toBeCloseTo(expected[i], 10));
};
const expectMatrix = (actual: readonly (readonly number[])[], expected: number[][]) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((row, i) => expectVector(row, expected[i]));
};

describe('13.2 対角化数学API', () => {
  it('初期例のP/D/逆行列・入力座標を独立した期待値で確認する', () => {
    const analysis = analyze([[4, 1], [0, 2]]);
    expect(analysis.status).toBe('ready');
    expect(analysis.criterion).toEqual({ status: 'satisfied', reason: 'full-eigenbasis', realSpaceDimensionSum: 2 });
    expectMatrix(analysis.basis!.p, [[-0.5, 1], [1, 0]]);
    expectMatrix(analysis.basis!.d, [[2, 0], [0, 4]]);
    expectMatrix(analysis.basis!.inverseP, [[0, 1], [1, 0.5]]);
    expect(analysis.basis!.conditionInfinity).toBeCloseTo(2.25);
    const input = analyzeDiagonalizationInput(analysis, [1, 2]);
    expect(input.status).toBe('ready');
    expectVector(input.imageVector!, [6, 4]);
    expectVector(input.coordinates!.inputCoordinates, [2, 2]);
    expectVector(input.coordinates!.imageCoordinates, [4, 8]);
    expectVector(input.coordinates!.imageCoordinatesViaDiagonal, [4, 8]);
    expectVector(input.coordinates!.imageViaCoordinates, [6, 4]);
  });

  it('列順は基準順に対する置換であり、繰り返しても相対的な交換にしない', () => {
    const initial = analyze([[4, 1], [0, 2]]);
    const swapped = reorderDiagonalization(initial, [1, 0]);
    expectMatrix(swapped.basis!.p, [[1, -0.5], [0, 1]]);
    expectMatrix(swapped.basis!.d, [[4, 0], [0, 2]]);
    const before = analyzeDiagonalizationInput(initial, [3, 2]), after = analyzeDiagonalizationInput(swapped, [3, 2]);
    expectVector(before.coordinates!.inputCoordinates, [2, 4]);
    expectVector(after.coordinates!.inputCoordinates, [4, 2]);
    expectVector(after.coordinates!.imageCoordinates, [16, 4]);
    expect(after.imageVector).toEqual(before.imageVector);
    expect(reorderDiagonalization(swapped, [1, 0]).basis).toEqual(swapped.basis);
    expect(reorderDiagonalization(swapped, [0, 1]).basis).toEqual(initial.basis);
  });

  it('0Dは空の基底でready、偽の固有値0を追加しない', () => {
    const analysis = analyze([]);
    expect(analysis.status).toBe('ready');
    expect(analysis.criterion.reason).toBe('empty-space');
    expect(analysis.eigenAnalysis.realEigenvalues).toEqual([]);
    expect(analysis.basis).toMatchObject({ p: [], d: [], inverseP: [], order: [], conditionInfinity: 1 });
    expect(analyzeDiagonalizationInput(reorderDiagonalization(analysis, []), [])).toMatchObject({
      status: 'ready', inputVector: [], imageVector: [], coordinates: { inputCoordinates: [], imageCoordinates: [] },
    });
  });

  it.each([-2, 0, 2, 1e-300, Number.MIN_VALUE])('1Dの%j倍は零や微小な非零を変えず対角化する', value => {
    const a = analyze([[value]]);
    expect(a.status).toBe('ready');
    expect(a.basis!.p).toEqual([[1]]);
    expect(a.basis!.d).toEqual([[value]]);
    expect(analyzeDiagonalizationInput(a, [1]).imageVector).toEqual([value]);
  });

  it('3Dの重根では空間内の基底順を保ち、固有値ごとに列を並べる', () => {
    const a = analyze([[2, 0, 0], [0, 2, 0], [0, 0, -1]]);
    expect(a.status).toBe('ready');
    expectMatrix(a.basis!.p, [[0, 1, 0], [0, 0, 1], [1, 0, 0]]);
    expect(a.basis!.eigenvalueIndices).toEqual([0, 1, 1]);
    const input = analyzeDiagonalizationInput(a, [1, 2, 3]);
    expectVector(input.coordinates!.inputCoordinates, [3, 1, 2]);
    expectVector(input.coordinates!.imageCoordinates, [-3, 2, 4]);
  });

  it('非対称3Dの異なる固有空間をまとめて直交化しない', () => {
    // A=P diag(2,3,5) P^-1、Pの列は(1,0,1),(1,1,0),(0,1,1)。
    const a = analyze([[2.5, 0.5, -0.5], [-1, 4, 1], [-1.5, 1.5, 3.5]]);
    expect(a.status).toBe('ready');
    expectMatrix(a.basis!.p, [[1, 1, 0], [0, 1, 1], [1, 0, 1]]);
    expectMatrix(a.basis!.d, [[2, 0, 0], [0, 3, 0], [0, 0, 5]]);
    expectVector(analyzeDiagonalizationInput(a, [3, 5, 4]).coordinates!.inputCoordinates, [1, 2, 3]);
  });

  it('非有理実根も確認済みの方向を使える', () => {
    const a = analyze([[0, 2], [1, 0]]);
    expect(a.status).toBe('ready');
    expectMatrix(a.basis!.d, [[-Math.SQRT2, 0], [0, Math.SQRT2]]);
    expect(analyzeDiagonalizationInput(a, [1, 2]).status).toBe('ready');
  });

  it.each([{ matrix: [[2, 0], [0, 2]] }, { matrix: [[0, 0], [0, 0]] }])('スカラー行列は重根でも基底を2本取れる', ({ matrix }) => {
    const a = analyze(matrix);
    expect(a.status).toBe('ready');
    expect(a.criterion.realSpaceDimensionSum).toBe(2);
    expect(analyzeDiagonalizationInput(a, [0, 0])).toMatchObject({ status: 'ready', imageVector: [0, 0] });
  });

  it.each([
    { matrix: [[2, 1], [0, 2]], reason: 'insufficient-eigenvectors', sum: 1 },
    { matrix: [[0, -1], [1, 0]], reason: 'non-real-spectrum', sum: null },
    { matrix: [[0, 1, 0], [0, 0, 2], [0, 0, 0]], reason: 'insufficient-eigenvectors', sum: 1 },
    { matrix: [[1, 1, 1], [0, 1, 2], [0, 0, 1]], reason: 'insufficient-eigenvectors', sum: 1 },
  ])('不可の理由を区別する: $reason', ({ matrix, reason, sum }) => {
    const a = analyze(matrix);
    expect(a.status).toBe('not-diagonalizable');
    expect(a.criterion).toMatchObject({ status: 'not-satisfied', reason, realSpaceDimensionSum: sum });
    expect(a.basis).toBeNull();
    expect(analyzeDiagonalizationInput(a, matrix.map(() => 1)).status).toBe('unavailable-basis');
    expect(analyzeDiagonalizationInput(a, matrix.map(() => 0)).imageVector).toEqual(matrix.map(() => 0));
  });

  it('多項式係数の次数作用は0・1・2の対角行列になる', () => {
    const a = analyze([[0, 0, 0], [0, 1, 0], [0, 0, 2]]);
    expect(a.status).toBe('ready');
    expectMatrix(a.basis!.p, [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    expect(analyzeDiagonalizationInput(a, [1, 2, 3]).imageVector).toEqual([0, 2, 6]);
  });

  it('近すぎる方向を未確認のまま保留し、次元0として不可にしない', () => {
    const a = analyze([[1, 1], [1e-24, 1]]);
    expect(a.status).toBe('inconclusive');
    expect(a.criterion.status).toBe('undetermined');
    expect(a.criterion.realSpaceDimensionSum).toBeNull();
    expect(a.basis).toBeNull();
  });

  it('方向が確認できてもPの条件数が悪い場合は次元条件を失わず保留', () => {
    const a = analyze([[1, 1], [0, 1 + 1.5e-8]]);
    expect(a.criterion.status).toBe('satisfied');
    expect(a.status).toBe('inconclusive');
    expect(a.issues).toContain('ill-conditioned-basis');
    expect(a.basis).toBeNull();
  });

  it('近接するが別方向の根は保持し、丸めで重根にしない', () => {
    const a = analyze([[1, 0], [0, 1 + 1e-12]]);
    expect(a.status).toBe('ready');
    expect(a.basis!.d[1][1]).toBe(1 + 1e-12);
    expect(a.eigenAnalysis.realEigenvalues).toHaveLength(2);
  });

  it('固有多項式だけの数値化失敗は、確認済みの空間の利用を妨げない', () => {
    const a = analyze([[1e-200, 0], [0, 2e-200]]);
    expect(a.eigenAnalysis.characteristicCoefficients).toBeNull();
    expect(a.eigenAnalysis.status).toBe('inconclusive');
    expect(a.status).toBe('ready');
    expect(analyzeDiagonalizationInput(a, [1, 1]).imageVector).toEqual([1e-200, 2e-200]);
  });

  it('非零積のunderflowでは像をnullにし、行列解析はreadyのまま残す', () => {
    const a = analyze([[1e-200]]), input = analyzeDiagonalizationInput(a, [1e-200]);
    expect(a.status).toBe('ready');
    expect(input).toMatchObject({ status: 'numerical-failure', imageVector: null, coordinates: null, issues: ['unrepresentable-result'] });
  });

  it('入力上限を超える導出値を切り捨てず、描画可否を数学APIへ持ち込まない', () => {
    const a = analyze([[1e6, 0], [0, 1e6]]);
    const input = analyzeDiagonalizationInput(a, [1e6, 0]);
    expect(input.status).toBe('ready');
    expect(input.imageVector).toEqual([1e12, 0]);
    expect(input.coordinates!.imageCoordinates).toEqual([1e12, 0]);
  });

  it('編集元の配列を保持せず、結果は深く不変にする', () => {
    const matrix = [[4, 1], [0, 2]], u = [1, 2], order = [1, 0];
    const a = analyze(matrix), reordered = reorderDiagonalization(a, order), result = analyzeDiagonalizationInput(a, u);
    matrix[0][0] = 99; u[0] = 99; order[0] = 0;
    expect(a.definition.matrix[0][0]).toBe(4);
    expect(result.inputVector).toEqual([1, 2]);
    expect(reordered.basis!.order).toEqual([1, 0]);
    expect(Object.isFrozen(a.basis!.p[0])).toBe(true);
    expect(Object.isFrozen(result.coordinates!.inputCoordinates)).toBe(true);
  });

  it('不正入力・置換・解析の復元値を拒否する', () => {
    expect(() => analyze([[1, 2]])).toThrow(InvalidEigenInputError);
    expect(() => analyze([[NaN]])).toThrow(InvalidEigenInputError);
    expect(() => analyze([[Infinity]])).toThrow(InvalidEigenInputError);
    expect(() => analyze([[1e6 + 1]])).toThrow(InvalidEigenInputError);
    const a = analyze([[4, 1], [0, 2]]);
    for (const input of [[1], [1, NaN], [1, Infinity], [1, 1e6 + 1], new Array(2)]) {
      expect(() => analyzeDiagonalizationInput(a, input)).toThrow(InvalidEigenInputError);
    }
    for (const order of [[0], [1, 1], [0, 2], [0, -1], [0, 0.5], new Array(2)]) {
      expect(() => reorderDiagonalization(a, order)).toThrow(InvalidDiagonalizationInputError);
    }
    expect(() => reorderDiagonalization(analyze([[2, 1], [0, 2]]), [0, 1])).toThrow(InvalidDiagonalizationInputError);
    expect(() => analyzeDiagonalizationInput(structuredClone(a), [1, 2])).toThrow(InvalidDiagonalizationInputError);
  });

  it('入力変更は分解・根の再計算をせず、列順変更も根を再計算しない', () => {
    const eigen = vi.spyOn(eigenApi, 'analyzeEigenMap'), factor = vi.spyOn(numerics, 'factorBasis');
    try {
      const a = analyze([[4, 1], [0, 2]]);
      expect(eigen).toHaveBeenCalledTimes(1); expect(factor).toHaveBeenCalledTimes(1);
      for (let i = 0; i < 20; i++) expect(analyzeDiagonalizationInput(a, [i, 1]).status).toBe('ready');
      expect(factor).toHaveBeenCalledTimes(1);
      reorderDiagonalization(a, [1, 0]);
      expect(eigen).toHaveBeenCalledTimes(1);
    } finally { eigen.mockRestore(); factor.mockRestore(); }
  });

  it('探索未完・演算上限・内部矛盾を不可と取り違えない', () => {
    // 既存ソルバーが返す境界statusを注入し、下流の責務を独立検証する。
    const original = eigenApi.analyzeEigenMap({ dimension: 2, matrix: [[4, 1], [0, 2]] });
    const spy = vi.spyOn(eigenApi, 'analyzeEigenMap');
    try {
      spy.mockReturnValueOnce({ ...original, spectrumComplete: false, issues: ['iteration-limit'], status: 'inconclusive' });
      expect(analyze([[4, 1], [0, 2]]).status).toBe('inconclusive');
      spy.mockReturnValueOnce({ ...original, spectrumComplete: false, nonRealRootCount: null, realEigenvalues: [], status: 'numerical-failure', issues: ['precision-limit'] });
      expect(analyze([[4, 1], [0, 2]])).toMatchObject({ status: 'numerical-failure', basis: null, criterion: { status: 'undetermined' } });
      spy.mockReturnValueOnce({ ...original, realEigenvalues: [] });
      expect(analyze([[4, 1], [0, 2]]).issues).toContain('inconsistent-analysis');
      spy.mockReturnValueOnce({ ...original, spectrumComplete: false, nonRealRootCount: 2, realEigenvalues: [], status: 'inconclusive' });
      expect(analyze([[4, 1], [0, 2]]).status).toBe('not-diagonalizable');
    } finally { spy.mockRestore(); }
  });

  it('座標残差の失敗では基準の像を残し、行列の判定は変えない', () => {
    const a = analyze([[4, 1], [0, 2]]);
    const spy = vi.spyOn(numerics, 'equationResidual');
    try {
      spy.mockReturnValue(1);
      expect(analyzeDiagonalizationInput(a, [1, 2])).toMatchObject({ status: 'inconclusive', imageVector: [6, 4], coordinates: null });
      expect(a.status).toBe('ready');
    } finally { spy.mockRestore(); }
  });

  it('基底構成の演算上限を捕捉して数値失敗とし、次元条件は維持する', () => {
    const spy = vi.spyOn(numerics, 'factorBasis').mockImplementation(() => { throw new EigenPrecisionLimit(); });
    try {
      expect(analyze([[4, 1], [0, 2]])).toMatchObject({ status: 'numerical-failure', criterion: { status: 'satisfied' }, basis: null, issues: ['precision-limit'] });
    } finally { spy.mockRestore(); }
  });
});

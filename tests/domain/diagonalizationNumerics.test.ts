import { describe, expect, it } from 'vitest';
import { EigenPrecisionLimit } from '../../src/domain/eigenExact';
import {
  agreementResidual, basisMetrics, DiagonalizationNumericalError, equationResidual,
  factorBasis, inverseFromSolver, multiplyVector, normalizeColumn, numericalIssue,
} from '../../src/domain/diagonalizationNumerics';

describe('対角化の小さい行列演算（D-116の境界）', () => {
  it('符号付き最大成分を正の1へ揃え、同率は最初の成分を使う', () => {
    expect(normalizeColumn([-2, 2])).toEqual([1, -1]);
    expect(normalizeColumn([0.5, -1])).toEqual([-0.5, 1]);
    expect(() => normalizeColumn([0, 0])).toThrow(DiagonalizationNumericalError);
  });

  it('相対ピボットが小さい場合だけ解くのを保留する', () => {
    const solve = factorBasis([[0, 2], [1, 1]]);
    expect(solve([4, 5])).toEqual([3, 2]);
    expect(inverseFromSolver(2, solve)).toEqual([[-0.5, 1], [0.5, 0]]);
    expect(() => factorBasis([[1, 1], [0, 1e-11]])).toThrow(DiagonalizationNumericalError);
    expect(factorBasis([[1e-200, 0], [0, 1e-200]])([1e-200, 2e-200])).toEqual([1, 2]);
  });

  it('相殺の途中で小さな項を失わず、偽の零を返さない', () => {
    expect(multiplyVector([[1e6, 1, -1e6]], [1e6, 1e-12, 1e6])).toEqual([1e-12]);
    expect(multiplyVector([[1, -1]], [1e-200, 1e-200])).toEqual([0]);
  });

  it('導出値のoverflow／underflowは数値化失敗にする', () => {
    expect(() => multiplyVector([[1e-200]], [1e-200])).toThrow(DiagonalizationNumericalError);
    expect(() => multiplyVector([[1e300]], [1e300])).toThrow(DiagonalizationNumericalError);
    expect(numericalIssue(new EigenPrecisionLimit())).toBe('precision-limit');
    expect(numericalIssue(new Error('bug'))).toBeNull();
  });

  it('相対残差は微小値を分母の1で消さず、巨大な中間積でも比を計算する', () => {
    expect(equationResidual([[1e-200]], [1], [2e-200])).toBeCloseTo(1 / 3);
    expect(equationResidual([[1e300]], [1e300], [0])).toBe(1);
    expect(agreementResidual([1e-300], [2e-300])).toBeCloseTo(1 / 3);
    expect(agreementResidual([0], [0])).toBe(0);
    expect(equationResidual([[0]], [0], [0])).toBe(0);
  });

  it('両側の逆行列残差と条件数を独立に確認する', () => {
    const metrics = basisMetrics([[4, 1], [0, 2]], [[-0.5, 1], [1, 0]], [[2, 0], [0, 4]], [[0, 1], [1, 0.5]]);
    expect(metrics).toEqual({ conditionInfinity: 2.25, intertwining: 0, leftInverse: 0, rightInverse: 0 });
    const wrong = basisMetrics([[4, 1], [0, 2]], [[-0.5, 1], [1, 0]], [[2, 0], [0, 4]], [[1, 1], [1, 0.5]]);
    expect(wrong.leftInverse).toBeGreaterThan(1e-8);
    expect(wrong.rightInverse).toBeGreaterThan(1e-8);
  });
});

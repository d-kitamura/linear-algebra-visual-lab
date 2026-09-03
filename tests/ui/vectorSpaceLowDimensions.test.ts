import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../src/labs/vector-space/VectorSpaceLab.tsx', import.meta.url),
  'utf8',
);

describe('ベクトル空間Labの0D・1D接続', () => {
  it('0Dは固定の一点表示と空集合のspanを説明する', () => {
    expect(source).toContain('<ZeroSpace0D idPrefix="vector-space-zero" />');
    expect(source).toContain('空集合と零ベクトルの集合は異なります');
    expect(source).toContain('0Dでは追加・削除・成分・ターゲットを編集せず');
  });

  it('1Dは数直線へベクトル、span、ターゲットを接続する', () => {
    expect(source).toContain('<VectorLine1D');
    expect(source).toContain('spanDimension={oneDimensionalSpanAnalysis.rank as 0 | 1}');
    expect(source).toContain('linearCombinationVisible={oneDimensionalState.linearCombinationVisible}');
    expect(source).toContain('target={oneDimensionalState.target}');
  });

  it('1Dの追加・削除・成分・span選択を個別状態へ反映する', () => {
    expect(source).toContain('handleOneDimensionalAddVector');
    expect(source).toContain('handleOneDimensionalRemoveVector');
    expect(source).toContain('handleOneDimensionalCoordinateChange');
    expect(source).toContain('handleOneDimensionalSpanSelection');
  });

  it('1Dの一次結合は共通解析と係数表示を使う', () => {
    expect(source).toContain('{ dimension: 1, vectors: oneDimensionalSpanVectors }');
    expect(source).toContain('ambientDimension={1}');
    expect(source).toContain('非零の生成元が1本だけなら任意のターゲットの係数は一意です');
  });

  it('0D・1DのResetを個別に扱い共有は10.7まで停止する', () => {
    expect(source).toContain('if (activeDimension === 0)');
    expect(source).toContain('if (activeDimension === 1)');
    expect(source).toContain('setOneDimensionalState(initialOneDimensionalState)');
    expect(source).toContain('shareIsDeferredForDimension');
  });
});

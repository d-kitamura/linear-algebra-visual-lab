import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../src/labs/basis-dimension/BasisDimensionLab.tsx', import.meta.url),
  'utf8',
);
const css = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');

describe('8.4 基底・次元エクスプローラ', () => {
  it('2Dと3Dで同じ基底候補解析を使う', () => {
    expect(source).toContain('analyzeBasisCandidate(scene, scene.candidateVectorIds)');
    expect(source).toContain('<VectorPlane2D');
    expect(source).toContain('<VectorSpace3D');
    expect(source).toContain('spanRank={analysis.candidateRank}');
    expect(source).toContain('spanDimension={analysis.candidateRank}');
  });

  it('候補の選択順と順序変更を明示する', () => {
    expect(source).toContain('基底は集合ではなく順序付きの組です');
    expect(source).toContain('toggleBasisCandidate');
    expect(source).toContain('moveBasisCandidate');
    expect(source).toContain('を前へ移動');
    expect(source).toContain('を後ろへ移動');
  });

  it('基底の2条件を別々に示し、失敗理由も併記する', () => {
    expect(source).toContain('条件1：一次独立である');
    expect(source).toContain('条件2：対象空間 <MathSpaceName /> を生成する');
    expect(source).toContain("failureReasons.includes('linearly-dependent')");
    expect(source).toContain("failureReasons.includes('does-not-span-target')");
  });

  it('対象空間と現在の候補を示し、基底例の非一意性を説明する', () => {
    expect(source).toContain('<MathSpaceName /> = <MathRealCoordinateSpace dimension={scene.dimension} />');
    expect(source).toContain('<MathBasisName /> = <VectorTuple ids={scene.candidateVectorIds}');
    expect(source).toContain('この例以外にも基底の取り方があり得る可能性があります');
    expect(source).toContain('maximumIndependentCount');
  });

  it('集合Sを候補Bの上に示し、成分を転置した行表示にする', () => {
    expect(source).toContain('<MathSetName /> = <VectorCollection vectors={vectors} />');
    expect(source).toContain('<MathTransposedRowVector values={vector.coordinates.map(formatCoordinate)} />');
    expect(source).not.toContain("join(' ; ')");
  });

  it('成分入力と矢先ドラッグの両方で再計算できる', () => {
    expect(source).toContain('onVectorChange={handlePlaneVectorDrag}');
    expect(source).toContain('parallelSnapTargetId={parallelSnapTargetId}');
    expect(source).toContain('updateBasisPlaneVectorDrag');
    expect(source).toContain('onVectorCoordinatesCommit={commitVectorCoordinates}');
    expect(source).toContain('onCoordinateChange(vector.id, coordinateIndex');
    expect(source).toContain('aria-invalid={!valid}');
  });

  it('2D・3Dとも原点優先の共通吸着経路へ接続する', () => {
    expect(source).toContain('updateBasisPlaneVectorDrag');
    expect(source).toContain('<VectorSpace3D');
    expect(source).toContain('onVectorCoordinatesCommit={commitVectorCoordinates}');
  });

  it('共有未対応を明示し、狭い画面では1列にする', () => {
    expect(source).toContain('このLabの共有URLは8.7で追加します');
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*?\.basis-dimension-workspace\s*\{[^}]*grid-template-columns:\s*1fr;/su);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.basis-vector-input-grid\s*\{[^}]*grid-template-columns:\s*1fr;/su);
  });

  it('基底候補だけを常時表示し、他の詳細カードを既存Labと同じタブ形式にする', () => {
    expect(source).toContain('className="inspector-tablist basis-inspector-tablist"');
    expect(source).toContain("{ id: 'vectors', label: '全ベクトルの集合'");
    expect(source).toContain("{ id: 'basis', label: '基底・次元の判定'");
    expect(source).toContain("{ id: 'coordinates', label: '基底に関する座標'");
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain('hidden={!active}');
    expect(source).toContain("[activeDimension]: 'vectors'");
  });

  it('8.5で同じターゲットを2D・3Dの基底座標解析へ接続する', () => {
    expect(source).toContain('analyzeBasisCoordinates(scene, scene.candidateVectorIds, scene.target)');
    expect(source).toContain('linearCombinationVisible');
    expect(source).toContain('target={scene.target as readonly [number, number]}');
    expect(source).toContain('linearCombinationTarget={scene.target as readonly [number, number, number]}');
    expect(source).toContain('onLinearCombinationTargetPlacement={commitTarget}');
    expect(source).toContain('ターゲットvの第${index + 1}成分');
    expect(source).toContain('snapTargetToSelectedSpan(');
    expect(source).toContain('targetSnapKind={targetSnapKind}');
    expect(source).toContain('onTargetChange={updatePlaneTargetFromPointer}');
  });

  it('基底・無数・表現不能・基底でない一意表現を別々に説明する', () => {
    expect(source).toContain("case 'coordinate-vector'");
    expect(source).toContain("case 'not-representable'");
    expect(source).toContain("case 'non-unique'");
    expect(source).toContain("case 'not-a-basis'");
    expect(source).toContain('座標ベクトルが唯一に定まります');
    expect(source).toContain('これを基底に関する座標とは呼びません');
  });

  it('現在の基底を記録して同じvの座標を別の基底と比較する', () => {
    expect(source).toContain('現在の基底を比較用に記録');
    expect(source).toContain('setComparisonBasisIds');
    expect(source).toContain('<MathCoordinateName comparison />');
    expect(source).toContain('基底の選び方と順序によって座標ベクトルは変わります');
    expect(css).toMatch(/\.basis-coordinate-comparison\s*\{/su);
  });

  it('列ベクトル表示と狭い画面のターゲット入力を枠内に保つ', () => {
    expect(source).toContain('<MathColumnVector values={coordinateValues} />');
    expect(source).toContain('className="display-column-vector basis-column-vector"');
    expect(css).toMatch(/\.basis-coordinate-inputs::before,[\s\S]*?border-top:\s*1\.5px solid currentColor;/su);
    expect(css).toMatch(/\.basis-coordinate-inputs::before\s*\{[^}]*border-left:\s*1\.5px solid currentColor;/su);
    expect(css).toMatch(/\.basis-coordinate-inputs::after\s*\{[^}]*border-right:\s*1\.5px solid currentColor;/su);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.basis-target-editor,[\s\S]*?grid-template-columns:\s*1fr;/su);
  });

  it('一次結合係数を太字斜体cで示し、無数の場合も各例へcを付ける', () => {
    expect(source).toContain('<MathVectorName name="c" /> = <MathColumnVector values={coordinateValues} />');
    expect(source).toContain('例{index + 1}：<MathVectorName name="c" />');
    expect(source).toContain('この一意な係数ベクトル <MathVectorName name="c" />');
  });
});

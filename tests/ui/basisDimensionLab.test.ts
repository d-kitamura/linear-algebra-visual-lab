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

  it('共有未対応を明示し、狭い画面では1列にする', () => {
    expect(source).toContain('このLabの共有URLは8.7で追加します');
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*?\.basis-dimension-workspace\s*\{[^}]*grid-template-columns:\s*1fr;/su);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.basis-vector-input-grid\s*\{[^}]*grid-template-columns:\s*1fr;/su);
  });
});

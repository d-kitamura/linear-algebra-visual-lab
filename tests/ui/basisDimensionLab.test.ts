import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../src/labs/basis-dimension/BasisDimensionLab.tsx', import.meta.url),
  'utf8',
);
const css = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');

describe('8.4 基底・次元エクスプローラ', () => {
  it('0Dから3Dまでを切り替え、1Dから3Dで同じ基底候補解析を使う', () => {
    expect(source).toContain("{ dimension: 0 as const, label: '0次元'");
    expect(source).toContain("{ dimension: 1 as const, label: '1次元'");
    expect(source).toContain('<ZeroDimensionalBasisWorkspace />');
    expect(source).toContain('<VectorLine1D');
    expect(source).toContain('analyzeBasisCandidate(scene, scene.candidateVectorIds, BASIS_ANALYSIS_OPTIONS)');
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
    expect(source).toContain('<MathPolynomialSpace degree={scene.dimension - 1} />');
    expect(source).toContain('<MathRealCoordinateSpace dimension={scene.dimension} />');
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

  it('共有URL・QR・Resetを提供し、狭い画面では1列にする', () => {
    expect(source).toContain('createBasisDimensionShareState');
    expect(source).toContain('createShareQrCodeDataUrl');
    expect(source).toContain('共有URLをエクスポート');
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*?\.basis-dimension-workspace\s*\{[^}]*grid-template-columns:\s*1fr;/su);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.basis-vector-input-grid\s*\{[^}]*grid-template-columns:\s*1fr;/su);
  });

  it('基底候補だけを常時表示し、他の詳細カードを既存Labと同じタブ形式にする', () => {
    expect(source).toContain('className="inspector-tablist basis-inspector-tablist"');
    expect(source).toContain("{ id: 'vectors', label: '全ベクトルの集合'");
    expect(source).toContain("{ id: 'basis', label: '基底・次元の判定'");
    expect(source).toContain("{ id: 'polynomial', label: '多項式と係数ベクトル'");
    expect(source).toContain("{ id: 'combination', label: '一次結合'");
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain('hidden={!active}');
    expect(source).toContain("initialState.linearCombinationVisible ? 'combination' : 'vectors'");
  });

  it('8.5で同じターゲットを2D・3Dの基底座標解析へ接続する', () => {
    expect(source).toContain('? analyzeBasisCoordinates(scene, scene.candidateVectorIds, scene.target, BASIS_ANALYSIS_OPTIONS)');
    expect(source).toContain('linearCombinationVisible={linearCombinationVisible}');
    expect(source).toContain('target={scene.target as readonly [number, number] | null}');
    expect(source).toContain('linearCombinationTarget={scene.target as readonly [number, number, number] | null}');
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

  it('数ベクトルと多項式を同じ係数・基底解析で切り替える', () => {
    expect(source).toContain('type BasisRepresentation,');
    expect(source).toContain('aria-label="対象の見方"');
    expect(source).toContain('>数ベクトル</button>');
    expect(source).toContain('>多項式</button>');
    expect(source).toContain('<PolynomialCorrespondenceCard');
    expect(source).toContain('標準基底：');
    expect(source).toContain('係数は定数項から昇べき順です。');
    expect(source).toContain('[activeDimension]: initialState.representation');
  });

  it('ターゲットを一次結合モードだけで配置・表示する', () => {
    expect(source).toContain('Record<BasisLabDimension, boolean>');
    expect(source).toContain('initial2DState.linearCombinationVisible');
    expect(source).toContain("tab.id !== 'combination' || linearCombinationVisible");
    expect(source).toMatch(/nextVisible\s*\? 'combination'/u);
    expect(source).toContain("current[activeDimension] === 'combination'");
    expect(source).toMatch(/current\[activeDimension\] === 'combination'[\s\S]*?\? 'basis'/u);
    expect(source).toContain('一次結合モードを終了');
    expect(source).toContain('一次結合を調べる');
    expect(source).toContain('onClearTarget={handleClearTarget}');
    expect(source).toContain('グラフをクリックまたはタップするか、成分を入力してターゲット');
  });

  it('1Dの定数多項式・ターゲット座標・比較基底を既存タブへ接続する', () => {
    expect(source).toContain("axisLabel={polynomialMode ? 'b₀' : 'x'}");
    expect(source).toContain('<MathPolynomialSpace degree={activeDimension - 1} />');
    expect(source).toContain('<GenericPolynomial dimension={scene.dimension} />');
    expect(source).toContain('onTargetPlacement={handleLineTargetChange}');
    expect(source).toContain('onTargetChange={handleLineTargetChange}');
    expect(source).toContain('saveComparisonBasis');
  });

  it('0Dを空の基底の2条件として説明し、通常の編集UIへ押し込まない', () => {
    expect(source).toContain('<MathBasisName /> = ()');
    expect(source).toContain('空の組は基底です');
    expect(source).toContain('一次従属にする非自明な係数の選び方がないため');
    expect(source).toContain('ベクトルを1本も足さない空和を零ベクトルと定めるため');
    expect(source).toContain('<MathOperator name="dim" />(<MathSpaceName />) = 0');
    expect(source).toContain('通常の列ベクトル入力には押し込まず');
  });

  it('0D・1D共有は10.7まで停止し、既存2D・3D共有を維持する', () => {
    expect(source).toContain('exportDisabled={hasInvalidCoordinateDraft || activeDimension <= 1}');
    expect(source).toContain('activeDimension === 0 || activeDimension === 1');
    expect(source).toContain('0D・1Dの共有URLは、3つのLabの共有形式を更新する10.7で有効になります');
    expect(source).toContain('const shareScene: BasisDimensionScene<VectorDimension>');
  });

  it('新しいグラフ見出しと多項式の数式表記を使う', () => {
    expect(source).toContain('基底候補の数ベクトルが生成する空間');
    expect(source).toContain('基底候補の係数が生成する係数空間');
    expect(source).toContain('<MathFunctionName /> = <GenericPolynomial');
    expect(source).toContain('<MathSymbolicTransposedRowVector degrees={genericCoefficients} />');
    expect(source).toContain("const base = target ? 'g' : 'f';");
    expect(source).toContain('<span aria-hidden="true"> ⇔ </span>');
    expect(source).toContain('className="math-scalar-base">x</span>');
    expect(source).toContain('className="math-scalar-base">b</span>');
    expect(source).toContain('<MathPolynomialCoefficientName degree={degree} />');
    expect(source).toContain('tab.id !== \'polynomial\' || polynomialMode');
  });
});

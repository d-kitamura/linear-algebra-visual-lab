import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8');
const menuSource = readFileSync(new URL('../../src/app/LabMenu.tsx', import.meta.url), 'utf8');
const labSource = readFileSync(
  new URL('../../src/labs/linear-map/LinearMapLab.tsx', import.meta.url),
  'utf8',
);
const initializationSource = readFileSync(
  new URL('../../src/labs/linear-map/linearMapInitialization.ts', import.meta.url),
  'utf8',
);
const planeSource = readFileSync(
  new URL('../../src/visualization/VectorPlane2D.tsx', import.meta.url),
  'utf8',
);
const spaceSource = readFileSync(
  new URL('../../src/visualization/VectorSpace3D.tsx', import.meta.url),
  'utf8',
);
const cssSource = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');

describe('9.3 2Dから2Dへの線形写像Lab', () => {
  it('adds the third Lab while preserving each mounted Lab state', () => {
    expect(menuSource).toContain("id: 'linear-map'");
    expect(menuSource).toContain("export type LabId = 'vector-space' | 'basis-dimension' | 'linear-map'");
    expect(appSource).toContain('<LinearMapLab active={activeLabId === \'linear-map\'} />');
    expect(appSource).toContain("hidden={activeLabId !== 'linear-map'}");
    expect(labSource).toContain('data-lab-id="linear-map"');
  });

  it('shows domain and codomain as separate responsive coordinate planes', () => {
    expect(labSource).toContain('name={name} dimension={dimension}');
    expect(labSource).toContain('idPrefix="linear-map-domain-plane"');
    expect(labSource).toContain('idPrefix="linear-map-codomain-plane"');
    expect(cssSource).toMatch(/\.linear-map-diagram-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,/su);
    expect(cssSource).toMatch(/@media \(max-width: 980px\)[\s\S]*?\.linear-map-diagram-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;/su);
  });

  it('edits u only in the domain and derives T(u) in the codomain', () => {
    expect(labSource).toContain('analyzeLinearMap(definition, scene.inputVector)');
    expect(labSource).toContain('onVectorChange={(_, coordinates) => handlePlaneInputDrag(coordinates)}');
    expect(labSource).toContain('name: \'T(u)\'');
    expect(labSource).not.toContain('は導出値なので直接編集しません');
    expect(labSource).not.toContain('赤と緑は標準基底の像');
    expect(labSource).not.toMatch(/idPrefix="linear-map-codomain-plane"[\s\S]{0,500}onVectorChange=/u);
  });

  it('connects matrix editing to every standard-basis image', () => {
    expect(labSource).toContain('updateLinearMapMatrixEntry');
    expect(labSource).toContain('name: `T(e${columnIndex + 1})`');
    expect(labSource).toContain('<MathStandardBasisVector subscript={columnIndex + 1} />');
    expect(labSource).toContain('<MathColumnVector values={standardBasis(scene.sourceDimension, columnIndex)} />');
    expect(labSource).toContain('<MathMatrixName /> = [');
    expect(labSource).toContain('<MathMapValue argument="e" subscript={index + 1} />');
    expect(labSource).toContain('scene.matrix.map((row) => row[columnIndex])');
  });

  it('switches the expanded representative maps and can hide the grid image', () => {
    expect(labSource).toContain('availablePresets.map');
    expect(labSource).toContain('setTransformedGridVisibility');
    expect(labSource).toContain('終域に格子の像を表示');
    expect(labSource).toContain('transformedGridSegments={transformedGridSegments}');
    expect(planeSource).toContain('className="linear-map-grid-image"');
    expect(cssSource).toContain('.linear-map-grid-image .is-first-coordinate');
    expect(cssSource).toContain('.linear-map-grid-image .is-second-coordinate');
  });

  it('shares and restores the linear-map state with QR export and shared-state Reset', () => {
    expect(labSource).toContain('createLinearMapInitialization(window.location.href)');
    expect(labSource).toContain('createLinearMapShareState');
    expect(labSource).toContain('<LabActionControls');
    expect(labSource).toContain('共有URLのQRコード');
    expect(labSource).toContain('QRコードを保存');
    expect(labSource).toContain('initialization.initialStates[activeShapeId]');
    expect(initializationSource).toContain("source: 'shared'");
    expect(initializationSource).toContain('result.state.lab !== \'linear-map\'');
  });

  it('keeps zoom, pan, pinch, fit, and mobile touch policy on both figures', () => {
    expect(labSource).toContain('onViewportChange={setDomainManualViewport}');
    expect(labSource).toContain('onViewportChange={setCodomainManualViewport}');
    expect(labSource).toContain('setDomainManualViewport(null)');
    expect(labSource).toContain('setCodomainManualViewport(null)');
    expect(cssSource).toMatch(/\.vector-plane\s*\{[^}]*touch-action:\s*none;/su);
  });

  it('keeps the mobile fit buttons beside the plot headings without the domain help line', () => {
    expect(labSource).not.toContain('入力 <MathVectorName name="u" /> の矢先をドラッグできます');
    expect(cssSource).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.linear-map-plot-card \.card-heading\s*\{[^}]*display:\s*flex;/su);
    expect(cssSource).toMatch(/\.linear-map-plot-card \.basis-fit-button\s*\{[^}]*width:\s*auto;/su);
  });

  it('extends the Lab to every 2D and 3D domain-codomain pair', () => {
    expect(labSource).toContain('LINEAR_MAP_SHAPES.map');
    expect(labSource).toContain('useState<LinearMapShapeId>(initialization.activeShapeId)');
    expect(labSource).toContain('<VectorSpace3D');
    expect(labSource).toContain('spaceTitle="定義域 U = ℝ³"');
    expect(labSource).toContain('spaceTitle="終域 V = ℝ³"');
    expect(labSource).toContain('editableVectorIds={NO_EDITABLE_VECTOR_IDS}');
  });

  it('shows Ker(T) and Im(T) from the analyzer in both 2D and 3D', () => {
    expect(labSource).toContain('spanVectors={kernelBasisVectors}');
    expect(labSource).toContain('spanDimension={analysis.kernelDimension}');
    expect(labSource).toContain('spanRank={analysis.kernelDimension}');
    expect(labSource).toContain('spanLabel="Ker(T)"');
    expect(labSource).toContain('spanVectors={imageBasisVectors}');
    expect(labSource).toContain('spanDimension={analysis.imageDimension}');
    expect(labSource).toContain('spanRank={analysis.imageDimension}');
    expect(labSource).toContain('spanLabel="Im(T)"');
    expect(planeSource).toContain("spanLabel ?? '生成する空間'");
    expect(spaceSource).toContain("spanLabel ?? '選択したベクトルが生成する空間'");
  });

  it('snaps editable inputs to Ker(T) while keeping codomain vectors derived', () => {
    expect(labSource).toContain('snapTargetToSelectedSpan(');
    expect(labSource).toContain('snapEditableVectorsToSpan');
    expect(labSource).toContain('const DOMAIN_VECTOR_COLORS = [DOMAIN_VECTOR_COLOR] as const');
    expect(labSource).toContain('colors={DOMAIN_VECTOR_COLORS}');
    expect(spaceSource).toContain('snapEditableVectorsToSpan');
    expect(spaceSource).toContain('const editableVectors = vectors.filter');
  });

  it('keeps u and T(u) opaque while color-coding Ker(T) and Im(T)', () => {
    expect(labSource).toContain("const KERNEL_SPAN_COLOR = '#82b6d3'");
    expect(labSource).toContain("const IMAGE_SPAN_COLOR = '#d9a0ad'");
    expect(labSource).toContain('alwaysOpaqueVectorIds={DOMAIN_ALWAYS_OPAQUE_VECTOR_IDS}');
    expect(labSource).toContain('alwaysOpaqueVectorIds={CODOMAIN_ALWAYS_OPAQUE_VECTOR_IDS}');
    expect(planeSource).toContain('alwaysOpaqueVectorIdSet.has(vector.id)');
    expect(spaceSource).toContain('isSpanSelected || isAlwaysOpaque');
  });

  it('previews T(u) during 3D domain dragging without rebuilding the domain canvas', () => {
    expect(labSource).toContain('onVectorCoordinatesPreview={(_, coordinates) => setInputCoordinatePreview(coordinates)}');
    expect(labSource).toContain('vectorCoordinatePreview={codomainSpaceVectorPreview}');
    expect(spaceSource).toContain('onVectorCoordinatesPreview(activeVectorDrag.vector.id, activeVectorDrag.coordinates)');
    expect(spaceSource).toContain('setVectorCoordinatePreview(vectorCoordinatePreview)');
  });

  it('hides lower 3D help in both map figures and starts the 2D grid image off', () => {
    expect(labSource.match(/showHelpText=\{false\}/gu)).toHaveLength(2);
    expect(labSource).toContain('終域に格子の像を表示');
    expect(labSource).toContain('checked={scene.showTransformedGrid}');
  });

  it('shows an editable w and scalar c with both linearity laws', () => {
    expect(labSource).toContain('analyzeLinearMapLinearity(');
    expect(labSource).toContain('写像の線形性の確認');
    expect(labSource).toContain('<MathColumnVector values={analysis.firstInput} />');
    expect(labSource).toContain('name="w" drafts={secondaryInputDrafts}');
    expect(labSource).toContain('aria-label="線形性確認用スカラーc"');
    expect(labSource).toContain('title="和について"');
    expect(labSource).toContain('title="スカラー倍について"');
    expect(labSource).toContain("expression=\"u+w\"");
    expect(labSource).toContain('expression="cu"');
    expect(labSource).toContain('両辺が一致します');
    expect(cssSource).toMatch(/\.linear-map-linearity-inputs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,/su);
    expect(cssSource).toMatch(/\.linear-map-law-flow p\s*\{[^}]*flex-wrap:\s*nowrap;/su);
  });

  it('connects the dimension theorem to rank, nullity, Ker, and Im', () => {
    expect(labSource).toContain('<DimensionTheoremCard analysis={analysis} active={activeInspectorTab === \'dimension\'} />');
    expect(labSource).toContain('analysis.sourceDimension');
    expect(labSource).toContain('analysis.rank');
    expect(labSource).toContain('analysis.nullity');
    expect(labSource).toContain('analysis.isInjective');
    expect(labSource).toContain('analysis.isSurjective');
    expect(labSource).toContain('analysis.isBijective');
    expect(labSource).toContain('標準基底の像と行列');
    expect(cssSource).toContain('.linear-map-dimension-bar > span.is-rank');
    expect(cssSource).toContain('.linear-map-dimension-bar > span.is-nullity');
  });

  it('shows one full-width detail card at a time through accessible tabs', () => {
    expect(labSource).toContain('LINEAR_MAP_INSPECTOR_TABS.map');
    expect(labSource).toContain('aria-label="線形写像の編集・解析の詳細"');
    expect(labSource).toContain("hidden={activeInspectorTab !== 'control'}");
    expect(labSource).toContain("hidden={activeInspectorTab !== 'reading'}");
    expect(labSource).toContain("active={activeInspectorTab === 'linearity'}");
    expect(labSource).toContain("active={activeInspectorTab === 'dimension'}");
    expect(labSource).toContain('handleInspectorTabKeyDown');
    expect(cssSource).toContain('.linear-map-inspector-tablist');
    expect(cssSource).not.toContain('.linear-map-detail-grid');
    expect(cssSource).not.toContain('.linear-map-concept-grid');
  });

  it('offers keyboard tab navigation and a numeric non-graph alternative', () => {
    expect(labSource).toContain('handleShapeTabKeyDown');
    expect(labSource).toContain('tabIndex={activeShapeId === shape.id ? 0 : -1}');
    expect(labSource).toContain('className="visually-hidden" aria-live="polite"');
    expect(labSource).toContain('図を使わなくても');
  });
});

import {
  lazy,
  Suspense,
  useMemo,
  useState,
} from 'react';
import {
  MAX_ABSOLUTE_LINEAR_MAP_INPUT,
  analyzeLinearMap,
  type LinearMapAnalysis,
  type VectorValue,
} from '../../domain';
import {
  DEFAULT_3D_CAMERA_STATE,
  type SharedCameraState,
} from '../../sharing';
import {
  parallelSnapDistanceForViewWidth,
  snapTargetToSelectedSpan,
} from '../../state';
import { formatMathNumber } from '../../ui';
import {
  VectorPlane2D,
  createAutoFitViewport,
  createLinearMapGridSegments,
  type PlaneViewport,
} from '../../visualization';
import {
  LINEAR_MAP_PRESETS,
  LINEAR_MAP_SHAPES,
  createDefaultLinearMapScene,
  createDefaultLinearMapScenes,
  createLinearMapDefinition,
  createLinearMapSceneFromPreset,
  findMatchingLinearMapPreset,
  presetsForLinearMapScene,
  setTransformedGridVisibility,
  updateLinearMapInputFromDrag,
  updateLinearMapInputVector,
  updateLinearMapMatrixEntry,
  type LinearMapPresetId,
  type LinearMapScene,
  type LinearMapShapeId,
} from './linearMapState';

const VectorSpace3D = lazy(async () => {
  const module = await import('../../visualization/VectorSpace3D');
  return { default: module.VectorSpace3D };
});

const DOMAIN_VECTOR_COLOR = '#245b8d';
const DOMAIN_VECTOR_COLORS = [DOMAIN_VECTOR_COLOR] as const;
const COLUMN_VECTOR_COLORS = ['#d55535', '#13877e', '#7661b5'] as const;
const INPUT_VECTOR_ID = 'linear-map-input-u';
const DOMAIN_EDITABLE_VECTOR_IDS = [INPUT_VECTOR_ID] as const;
const NO_EDITABLE_VECTOR_IDS: readonly string[] = [];

interface LinearMapLabProps {
  readonly active: boolean;
}

type MatrixDrafts = string[][];
type VectorDrafts = string[];

export function LinearMapLab({ active }: LinearMapLabProps) {
  const [scenes, setScenes] = useState(createDefaultLinearMapScenes);
  const [activeShapeId, setActiveShapeId] = useState<LinearMapShapeId>('2-to-2');
  const scene = scenes[activeShapeId];
  const [matrixDrafts, setMatrixDrafts] = useState<MatrixDrafts>(() =>
    createMatrixDrafts(createDefaultLinearMapScene().matrix));
  const [inputDrafts, setInputDrafts] = useState<VectorDrafts>(() =>
    createVectorDrafts(createDefaultLinearMapScene().inputVector));
  const [domainManualViewport, setDomainManualViewport] = useState<PlaneViewport | null>(null);
  const [codomainManualViewport, setCodomainManualViewport] = useState<PlaneViewport | null>(null);
  const [dragViewport, setDragViewport] = useState<PlaneViewport | null>(null);
  const [domainCamera, setDomainCamera] = useState<SharedCameraState>(DEFAULT_3D_CAMERA_STATE);
  const [codomainCamera, setCodomainCamera] = useState<SharedCameraState>(DEFAULT_3D_CAMERA_STATE);
  const [domainSpaceResetKey, setDomainSpaceResetKey] = useState(0);
  const [codomainSpaceResetKey, setCodomainSpaceResetKey] = useState(0);

  const definition = useMemo(() => createLinearMapDefinition(scene), [scene]);
  const analysis = useMemo(
    () => analyzeLinearMap(definition, scene.inputVector),
    [definition, scene.inputVector],
  );
  const domainVectors = useMemo<readonly VectorValue[]>(() => [{
    id: INPUT_VECTOR_ID,
    name: 'u',
    coordinates: scene.inputVector,
  }], [scene.inputVector]);
  const kernelBasisVectors = useMemo(
    () => analysis.kernelBasis.map((coordinates, index): VectorValue => ({
      id: `linear-map-kernel-basis-${index + 1}`,
      name: `k${index + 1}`,
      coordinates,
    })),
    [analysis.kernelBasis],
  );
  const codomainVectors = useMemo<readonly VectorValue[]>(() => [
    ...Array.from({ length: scene.sourceDimension }, (_, columnIndex): VectorValue => ({
      id: `linear-map-column-${columnIndex + 1}`,
      name: `T(e${columnIndex + 1})`,
      coordinates: scene.matrix.map((row) => row[columnIndex]),
    })),
    {
      id: 'linear-map-image-u',
      name: 'T(u)',
      coordinates: analysis.imageVector,
    },
  ], [analysis.imageVector, scene.matrix, scene.sourceDimension]);
  const codomainColors = useMemo(
    () => [...COLUMN_VECTOR_COLORS.slice(0, scene.sourceDimension), DOMAIN_VECTOR_COLOR],
    [scene.sourceDimension],
  );
  const imageBasisVectors = useMemo(
    () => analysis.imageBasis.map((coordinates, index): VectorValue => ({
      id: `linear-map-image-basis-${index + 1}`,
      name: `w${index + 1}`,
      coordinates,
    })),
    [analysis.imageBasis],
  );
  const domainAutoViewport = useMemo(
    () => createAutoFitViewport([...domainVectors, ...kernelBasisVectors]),
    [domainVectors, kernelBasisVectors],
  );
  const codomainAutoViewport = useMemo(
    () => createAutoFitViewport(codomainVectors),
    [codomainVectors],
  );
  const domainViewport = dragViewport ?? domainManualViewport ?? domainAutoViewport;
  const codomainViewport = codomainManualViewport ?? codomainAutoViewport;
  const transformedGridSegments = useMemo(
    () => scene.sourceDimension === 2
      && scene.targetDimension === 2
      && scene.showTransformedGrid
      ? createLinearMapGridSegments(definition, domainViewport)
      : [],
    [definition, domainViewport, scene.showTransformedGrid, scene.sourceDimension, scene.targetDimension],
  );
  const matchingPresetId = findMatchingLinearMapPreset(scene);
  const availablePresets = presetsForLinearMapScene(scene);
  const selectedPreset = LINEAR_MAP_PRESETS.find((preset) => preset.id === matchingPresetId);
  const invalidDraftCount = countInvalidDrafts(matrixDrafts.flat(), inputDrafts);
  const imageIsZero = analysis.imageVector.every((coordinate) => Math.abs(coordinate) <= 1e-10);

  function replaceActiveScene(nextScene: LinearMapScene): void {
    setScenes((current) => ({ ...current, [activeShapeId]: nextScene }));
  }

  function handleShapeChange(nextShapeId: LinearMapShapeId): void {
    const nextScene = scenes[nextShapeId];
    setActiveShapeId(nextShapeId);
    setMatrixDrafts(createMatrixDrafts(nextScene.matrix));
    setInputDrafts(createVectorDrafts(nextScene.inputVector));
    setDomainManualViewport(null);
    setCodomainManualViewport(null);
    setDragViewport(null);
  }

  function handlePresetChange(presetId: LinearMapPresetId): void {
    const nextScene = createLinearMapSceneFromPreset(
      presetId,
      scene.inputVector,
      scene.showTransformedGrid,
    );
    replaceActiveScene(nextScene);
    setMatrixDrafts(createMatrixDrafts(nextScene.matrix));
    resetViewports();
  }

  function handleMatrixDraftChange(rowIndex: number, columnIndex: number, text: string): void {
    setMatrixDrafts((current) => current.map((row, currentRowIndex) =>
      row.map((draft, currentColumnIndex) =>
        currentRowIndex === rowIndex && currentColumnIndex === columnIndex ? text : draft)));
    const parsed = parseEditableNumber(text);
    if (parsed !== null) {
      replaceActiveScene(updateLinearMapMatrixEntry(scene, rowIndex, columnIndex, parsed));
    }
  }

  function handleInputDraftChange(index: number, text: string): void {
    setInputDrafts((current) => current.map((draft, currentIndex) =>
      currentIndex === index ? text : draft));
    const parsed = parseEditableNumber(text);
    if (parsed !== null) {
      const nextCoordinates = scene.inputVector.map((coordinate, coordinateIndex) =>
        coordinateIndex === index ? parsed : coordinate);
      replaceActiveScene(updateLinearMapInputVector(scene, nextCoordinates));
    }
  }

  function commitInputCoordinates(coordinates: readonly number[]): void {
    const next = updateLinearMapInputFromDrag(scene, coordinates);
    replaceActiveScene(next);
    setInputDrafts(createVectorDrafts(next.inputVector));
  }

  function handlePlaneInputDrag(coordinates: readonly [number, number]): void {
    const snapResult = snapTargetToSelectedSpan(
      coordinates,
      kernelBasisVectors,
      analysis.kernelDimension,
      parallelSnapDistanceForViewWidth(domainViewport.maxX - domainViewport.minX),
    );
    commitInputCoordinates(snapResult.coordinates);
  }

  function handleReset(): void {
    const nextScene = createDefaultLinearMapScene(scene.sourceDimension, scene.targetDimension);
    replaceActiveScene(nextScene);
    setMatrixDrafts(createMatrixDrafts(nextScene.matrix));
    setInputDrafts(createVectorDrafts(nextScene.inputVector));
    setDomainCamera(DEFAULT_3D_CAMERA_STATE);
    setCodomainCamera(DEFAULT_3D_CAMERA_STATE);
    setDomainSpaceResetKey((current) => current + 1);
    setCodomainSpaceResetKey((current) => current + 1);
    resetViewports();
  }

  function resetViewports(): void {
    setDomainManualViewport(null);
    setCodomainManualViewport(null);
    setDragViewport(null);
  }

  return (
    <div className="linear-map-lab" data-lab-id="linear-map" aria-hidden={!active}>
      <a className="skip-link" href="#linear-map-workspace">線形写像の操作領域へ移動</a>
      <main className="lab-page">
        <nav className="linear-map-shape-switcher" aria-label="線形写像の定義域と終域の次元">
          <div className="linear-map-shape-tablist" role="tablist" aria-label="入出力次元の切替">
            {LINEAR_MAP_SHAPES.map((shape) => (
              <button
                key={shape.id}
                type="button"
                role="tab"
                aria-selected={activeShapeId === shape.id}
                onClick={() => handleShapeChange(shape.id)}
              >{shape.label}</button>
            ))}
          </div>
          <p>定義域と終域の次元ごとに教材状態を保持します。</p>
        </nav>

        <div className="linear-map-scope" aria-label="現在の対象">
          <span>現在の対象</span>
          <strong><MathMapSignature sourceDimension={scene.sourceDimension} targetDimension={scene.targetDimension} /></strong>
          <small>{scene.sourceDimension}次元から{scene.targetDimension}次元への線形写像</small>
        </div>

        <section className="lab-intro" aria-labelledby="linear-map-title">
          <div>
            <p className="eyebrow">線形写像 / {scene.sourceDimension}D → {scene.targetDimension}D</p>
            <h1 id="linear-map-title">入力を動かして、像の動きを見る。</h1>
          </div>
          <div className="lab-intro-side">
            <p className="lab-intro-copy">
              定義域の入力 <MathVectorName name="u" /> と行列 <MathMatrixName /> を変えると、
              終域の像 <MathMapValue argument="u" /> がリアルタイムに決まります。
              灰色の部分空間で核 <MathNamedSubspace name="Ker" /> と像 <MathNamedSubspace name="Im" /> を比較できます。
            </p>
            <div className="lab-actions" aria-label="線形写像Labの教材状態を操作">
              <button className="reset-button" type="button" onClick={handleReset}>Reset</button>
            </div>
          </div>
        </section>

        <div className="linear-map-workspace" id="linear-map-workspace">
          <div className="linear-map-diagram-grid">
            {scene.sourceDimension === 2 ? (
              <section className="plot-card linear-map-plot-card" aria-labelledby="linear-map-domain-title">
                <PlotHeading id="linear-map-domain-title" kind="Domain" name="U" dimension={2} onFit={() => setDomainManualViewport(null)} />
                <VectorPlane2D
                  idPrefix="linear-map-domain-plane"
                  vectors={domainVectors}
                  colors={DOMAIN_VECTOR_COLORS}
                  viewport={domainViewport}
                  onViewportChange={setDomainManualViewport}
                  onVectorDragStart={() => setDragViewport(domainViewport)}
                  onVectorChange={(_, coordinates) => handlePlaneInputDrag(coordinates)}
                  onVectorDragEnd={() => setDragViewport(null)}
                  spanVectors={kernelBasisVectors}
                  spanDimension={analysis.kernelDimension}
                  showSpan
                  spanLabel="Ker(T)"
                />
              </section>
            ) : (
              <Suspense fallback={<SpaceLoading label="定義域" />}>
                <VectorSpace3D
                  idPrefix="linear-map-domain-space"
                  spaceTitle="定義域 U = ℝ³"
                  vectors={domainVectors}
                  colors={DOMAIN_VECTOR_COLORS}
                  spanVectors={kernelBasisVectors}
                  spanRank={analysis.kernelDimension}
                  showSpan
                  spanLabel="Ker(T)"
                  editableVectorIds={DOMAIN_EDITABLE_VECTOR_IDS}
                  snapEditableVectorsToSpan
                  linearCombinationVisible={false}
                  linearCombinationTarget={null}
                  linearCombinationCoefficients={null}
                  active={active && scene.sourceDimension === 3}
                  resetKey={domainSpaceResetKey}
                  camera={domainCamera}
                  onCameraChange={setDomainCamera}
                  onVectorCoordinatesCommit={(_, coordinates) => commitInputCoordinates(coordinates)}
                  onLinearCombinationTargetPlacement={() => undefined}
                  onLinearCombinationVisibility={() => undefined}
                  showLinearCombinationControl={false}
                  assistiveDescription="入力uの成分、像、核の次元は後続の数値入力と解析表示でも確認できます。"
                />
              </Suspense>
            )}

            {scene.targetDimension === 2 ? (
              <section className="plot-card linear-map-plot-card" aria-labelledby="linear-map-codomain-title">
                <PlotHeading id="linear-map-codomain-title" kind="Codomain" name="V" dimension={2} onFit={() => setCodomainManualViewport(null)} />
                <VectorPlane2D
                  idPrefix="linear-map-codomain-plane"
                  vectors={codomainVectors}
                  colors={codomainColors}
                  viewport={codomainViewport}
                  onViewportChange={setCodomainManualViewport}
                  spanVectors={imageBasisVectors}
                  spanDimension={analysis.imageDimension}
                  showSpan
                  spanLabel="Im(T)"
                  transformedGridSegments={transformedGridSegments}
                />
              </section>
            ) : (
              <Suspense fallback={<SpaceLoading label="終域" />}>
                <VectorSpace3D
                  idPrefix="linear-map-codomain-space"
                  spaceTitle="終域 V = ℝ³"
                  vectors={codomainVectors}
                  colors={codomainColors}
                  spanVectors={imageBasisVectors}
                  spanRank={analysis.imageDimension}
                  showSpan
                  spanLabel="Im(T)"
                  editableVectorIds={NO_EDITABLE_VECTOR_IDS}
                  linearCombinationVisible={false}
                  linearCombinationTarget={null}
                  linearCombinationCoefficients={null}
                  active={active && scene.targetDimension === 3}
                  resetKey={codomainSpaceResetKey}
                  camera={codomainCamera}
                  onCameraChange={setCodomainCamera}
                  onVectorCoordinatesCommit={() => undefined}
                  onLinearCombinationTargetPlacement={() => undefined}
                  onLinearCombinationVisibility={() => undefined}
                  showLinearCombinationControl={false}
                  assistiveDescription="標準基底の像、入力の像、像空間の次元は後続の数値表示でも確認できます。"
                />
              </Suspense>
            )}
          </div>

          <div className="linear-map-detail-grid">
            <section className="linear-map-control-card" aria-labelledby="linear-map-control-title">
              <p className="panel-kicker">Edit transformation</p>
              <h2 id="linear-map-control-title">行列と入力</h2>
              <label className="linear-map-preset-field">
                <span>代表例</span>
                <select
                  value={matchingPresetId ?? 'custom'}
                  onChange={(event) => {
                    if (event.target.value !== 'custom') {
                      handlePresetChange(event.target.value as LinearMapPresetId);
                    }
                  }}
                >
                  <option value="custom" disabled>成分を編集中</option>
                  {availablePresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.label}</option>
                  ))}
                </select>
              </label>
              <p className="linear-map-preset-description">
                {selectedPreset?.description ?? '行列の成分を直接編集した写像です。'}
              </p>
              <div className="linear-map-editor-row">
                <div className="linear-map-editor-block">
                  <strong><MathMatrixName /> =</strong>
                  <MatrixInput drafts={matrixDrafts} onChange={handleMatrixDraftChange} />
                </div>
                <div className="linear-map-editor-block">
                  <strong><MathVectorName name="u" /> =</strong>
                  <VectorInput drafts={inputDrafts} onChange={handleInputDraftChange} />
                </div>
              </div>
              {scene.sourceDimension === 2 && scene.targetDimension === 2 ? (
                <label className="linear-map-grid-toggle">
                  <input
                    type="checkbox"
                    checked={scene.showTransformedGrid}
                    onChange={(event) => replaceActiveScene(
                      setTransformedGridVisibility(scene, event.target.checked),
                    )}
                  />
                  <span>終域に格子の像を表示</span>
                </label>
              ) : null}
              {invalidDraftCount > 0 ? (
                <p className="linear-map-input-warning" role="status">
                  未確定の成分が{invalidDraftCount}か所あります。図には直前の有効な値を使っています。
                </p>
              ) : null}
            </section>

            <section className="linear-map-reading-card" aria-labelledby="linear-map-reading-title" aria-live="polite">
              <p className="panel-kicker">Read kernel and image</p>
              <h2 id="linear-map-reading-title">行列の列・核・像</h2>
              <div className="linear-map-equation">
                <MathMatrixName /> = [
                {Array.from({ length: scene.sourceDimension }, (_, index) => (
                  <span key={index} className="linear-map-equation-column">
                    {index > 0 ? ', ' : ''}<MathMapValue argument="e" subscript={index + 1} />
                  </span>
                ))}]
                {' '}= <MathMatrix values={scene.matrix} columns={scene.sourceDimension} />
              </div>
              <div className="linear-map-column-list">
                {Array.from({ length: scene.sourceDimension }, (_, columnIndex) => (
                  <p key={columnIndex} className={`is-column-${columnIndex + 1}`}>
                    <MathStandardBasisVector subscript={columnIndex + 1} /> ={' '}
                    <MathColumnVector values={standardBasis(scene.sourceDimension, columnIndex)} />,
                    {' '}<MathMapValue argument="e" subscript={columnIndex + 1} /> ={' '}
                    <MathColumnVector values={scene.matrix.map((row) => row[columnIndex])} />
                  </p>
                ))}
              </div>
              <SubspaceSummary analysis={analysis} imageIsZero={imageIsZero} />
              <div className="linear-map-current-value">
                <p>
                  <MathMapValue argument="u" /> = <MathMatrixName /><MathVectorName name="u" /> ={' '}
                  <MathColumnVector values={analysis.imageVector} />
                </p>
                <strong>{imageIsZero
                  ? <><MathVectorName name="u" /> は <MathNamedSubspace name="Ker" /> に属し、原点へ写ります。</>
                  : <><MathVectorName name="u" /> は <MathNamedSubspace name="Ker" /> に属さず、青い像へ写ります。</>}
                </strong>
                <small><span className="math-roman">rank</span>(<span className="math-scalar-base">T</span>) = {analysis.rank}</small>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function PlotHeading({
  id,
  kind,
  name,
  dimension,
  onFit,
}: {
  readonly id: string;
  readonly kind: 'Domain' | 'Codomain';
  readonly name: 'U' | 'V';
  readonly dimension: 2 | 3;
  readonly onFit: () => void;
}) {
  return (
    <div className="card-heading">
      <div>
        <p className="panel-kicker">{kind}</p>
        <h2 id={id}>{kind === 'Domain' ? '定義域' : '終域'} <MathRealSpace name={name} dimension={dimension} /></h2>
      </div>
      <button className="basis-fit-button" type="button" onClick={onFit}>全体を表示</button>
    </div>
  );
}

function MatrixInput({
  drafts,
  onChange,
}: {
  readonly drafts: MatrixDrafts;
  readonly onChange: (row: number, column: number, text: string) => void;
}) {
  const columns = drafts[0]?.length ?? 1;
  return (
    <span
      className="linear-map-matrix-input"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(42px, 1fr))` }}
      aria-label="行列Aの成分"
    >
      {drafts.flatMap((row, rowIndex) => row.map((draft, columnIndex) => (
        <input
          key={`${rowIndex}-${columnIndex}`}
          type="text"
          inputMode="decimal"
          value={draft}
          aria-label={`行列Aの第${rowIndex + 1}行第${columnIndex + 1}列`}
          aria-invalid={parseEditableNumber(draft) === null}
          onChange={(event) => onChange(rowIndex, columnIndex, event.target.value)}
        />
      )))}
    </span>
  );
}

function VectorInput({ drafts, onChange }: {
  readonly drafts: VectorDrafts;
  readonly onChange: (index: number, text: string) => void;
}) {
  return (
    <span className="linear-map-vector-input" aria-label="入力ベクトルuの成分">
      {drafts.map((draft, index) => (
        <input
          key={index}
          type="text"
          inputMode="decimal"
          value={draft}
          aria-label={`入力ベクトルuの第${index + 1}成分`}
          aria-invalid={parseEditableNumber(draft) === null}
          onChange={(event) => onChange(index, event.target.value)}
        />
      ))}
    </span>
  );
}

function SubspaceSummary({ analysis, imageIsZero }: {
  readonly analysis: LinearMapAnalysis;
  readonly imageIsZero: boolean;
}) {
  return (
    <div className="linear-map-subspace-summary">
      <div>
        <strong><MathNamedSubspace name="Ker" /></strong>
        <span>{describeSubspace(analysis.kernelDimension, analysis.sourceDimension)}</span>
        <small><span className="math-roman">dim</span>(<MathNamedSubspace name="Ker" />) = {analysis.kernelDimension}</small>
      </div>
      <div>
        <strong><MathNamedSubspace name="Im" /></strong>
        <span>{describeSubspace(analysis.imageDimension, analysis.targetDimension)}</span>
        <small><span className="math-roman">dim</span>(<MathNamedSubspace name="Im" />) = {analysis.imageDimension}</small>
      </div>
      <p className={imageIsZero ? 'is-in-kernel' : undefined}>
        灰色の <MathNamedSubspace name="Ker" /> 上の入力は、すべて終域の原点へ写ります。灰色の <MathNamedSubspace name="Im" /> は、実際に像として現れるベクトル全体です。
      </p>
    </div>
  );
}

function MathMapSignature({ sourceDimension, targetDimension }: {
  readonly sourceDimension: 2 | 3;
  readonly targetDimension: 2 | 3;
}) {
  return <span className="linear-map-math"><span className="math-scalar-base">T</span>: ℝ<sup>{sourceDimension}</sup> → ℝ<sup>{targetDimension}</sup></span>;
}

function MathRealSpace({ name, dimension }: { readonly name: 'U' | 'V'; readonly dimension: 2 | 3 }) {
  return <span className="linear-map-math"><span className="math-scalar-base">{name}</span> = ℝ<sup>{dimension}</sup></span>;
}

function MathMatrixName() {
  return <span className="math-matrix">A</span>;
}

function MathVectorName({ name }: { readonly name: string }) {
  return <span className="math-vector"><span className="math-vector-base">{name}</span></span>;
}

function MathStandardBasisVector({ subscript }: { readonly subscript: number }) {
  return <span className="math-vector"><span className="math-vector-base">e</span><sub className="math-vector-subscript">{subscript}</sub></span>;
}

function MathNamedSubspace({ name }: { readonly name: 'Ker' | 'Im' }) {
  return <span className="linear-map-math"><span className="math-roman">{name}</span>(<span className="math-scalar-base">T</span>)</span>;
}

function MathMapValue({ argument, subscript }: {
  readonly argument: 'u' | 'e';
  readonly subscript?: number;
}) {
  return (
    <span className="linear-map-math math-map-value">
      <span className="math-scalar-base">T</span>(<span className="math-vector-base">{argument}</span>
      {subscript ? <sub className="math-vector-subscript">{subscript}</sub> : null})
    </span>
  );
}

function MathMatrix({ values, columns }: { readonly values: readonly (readonly number[])[]; readonly columns: number }) {
  return (
    <span
      className="linear-map-display-matrix"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(32px, 1fr))` }}
      aria-label={`行列 ${values.flat().join('、')}`}
    >
      {values.flatMap((row, rowIndex) => row.map((value, columnIndex) => (
        <span key={`${rowIndex}-${columnIndex}`} aria-hidden="true">{formatMathNumber(value).text}</span>
      )))}
    </span>
  );
}

function MathColumnVector({ values }: { readonly values: readonly number[] }) {
  return (
    <span className="display-column-vector linear-map-column-vector" aria-label={`列ベクトル ${values.join('、')}`}>
      {values.map((value, index) => <span key={index} aria-hidden="true">{formatMathNumber(value).text}</span>)}
    </span>
  );
}

function SpaceLoading({ label }: { readonly label: string }) {
  return <section className="three-dimensional-plot-card"><p className="panel-kicker">3D coordinate space</p><h2>{label}の3D表示を準備しています</h2></section>;
}

function standardBasis(dimension: number, columnIndex: number): number[] {
  return Array.from({ length: dimension }, (_, index) => index === columnIndex ? 1 : 0);
}

function describeSubspace(dimension: number, ambientDimension: number): string {
  if (dimension === 0) return '原点だけ';
  if (dimension === 1) return '原点を通る直線';
  if (dimension === 2) return ambientDimension === 2 ? '2次元空間全体' : '原点を通る平面';
  return '3次元空間全体';
}

function createMatrixDrafts(matrix: readonly (readonly number[])[]): MatrixDrafts {
  return matrix.map((row) => row.map(formatDraft));
}

function createVectorDrafts(vector: readonly number[]): VectorDrafts {
  return vector.map(formatDraft);
}

function formatDraft(value: number): string {
  return String(Number(value.toPrecision(10)));
}

function parseEditableNumber(text: string): number | null {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= MAX_ABSOLUTE_LINEAR_MAP_INPUT ? value : null;
}

function countInvalidDrafts(...groups: readonly (readonly string[])[]): number {
  return groups.flat().filter((draft) => parseEditableNumber(draft) === null).length;
}

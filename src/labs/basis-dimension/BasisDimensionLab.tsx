import {
  lazy,
  Suspense,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  analyzeBasisCoordinates,
  analyzeBasisCandidate,
  type BasisCandidateAnalysis,
  type BasisCoordinateAnalysis,
  type VectorDimension,
  type VectorValue,
} from '../../domain';
import { DEFAULT_3D_CAMERA_STATE, type SharedCameraState } from '../../sharing';
import { parseCoordinateInput } from '../../state';
import { VectorPlane2D } from '../../visualization/VectorPlane2D';
import {
  DEFAULT_PLANE_VIEWPORT,
  createAutoFitViewport,
  type PlaneViewport,
} from '../../visualization/planeGeometry';
import { LabActionControls } from '../../app/LabActionControls';
import {
  createCoordinateDrafts,
  createDefaultBasisScene,
  moveBasisCandidate,
  toggleBasisCandidate,
  updateBasisTarget,
  updateBasisVectorCoordinates,
  updateBasisPlaneVectorDrag,
  type BasisDimensionScene,
} from './basisDimensionState';

const VectorSpace3D = lazy(async () => {
  const module = await import('../../visualization/VectorSpace3D');
  return { default: module.VectorSpace3D };
});

const VECTOR_COLORS = [
  '#d95838',
  '#0f8b82',
  '#7257b2',
  '#c98b19',
  '#2f6690',
  '#a64b78',
  '#4c7a3e',
  '#86553c',
] as const;

const DIMENSION_TABS = [
  { dimension: 2 as const, label: '2次元', shortLabel: '2D' },
  { dimension: 3 as const, label: '3次元', shortLabel: '3D' },
];

const BASIS_INSPECTOR_TABS = [
  { id: 'vectors', label: '全ベクトルの集合', shortLabel: '成分' },
  { id: 'basis', label: '基底・次元の判定', shortLabel: '判定' },
  { id: 'coordinates', label: '基底に関する座標', shortLabel: '座標' },
] as const;

type BasisInspectorTabId = typeof BASIS_INSPECTOR_TABS[number]['id'];

interface BasisDimensionLabProps {
  readonly active: boolean;
}

export function BasisDimensionLab({ active }: BasisDimensionLabProps) {
  const [activeDimension, setActiveDimension] = useState<VectorDimension>(2);
  const [scenes, setScenes] = useState<Record<VectorDimension, BasisDimensionScene>>({
    2: createDefaultBasisScene(2),
    3: createDefaultBasisScene(3),
  });
  const [coordinateDrafts, setCoordinateDrafts] = useState<
    Record<VectorDimension, Readonly<Record<string, readonly string[]>>>
  >({
    2: createCoordinateDrafts(createDefaultBasisScene(2).vectors),
    3: createCoordinateDrafts(createDefaultBasisScene(3).vectors),
  });
  const [targetDrafts, setTargetDrafts] = useState<Record<VectorDimension, readonly string[]>>({
    2: createDefaultBasisScene(2).target.map(String),
    3: createDefaultBasisScene(3).target.map(String),
  });
  const [comparisonBasisIds, setComparisonBasisIds] = useState<
    Record<VectorDimension, readonly string[] | null>
  >({ 2: null, 3: null });
  const [activeInspectorTabs, setActiveInspectorTabs] = useState<
    Record<VectorDimension, BasisInspectorTabId>
  >({ 2: 'vectors', 3: 'vectors' });
  const [planeViewport, setPlaneViewport] = useState<PlaneViewport>(DEFAULT_PLANE_VIEWPORT);
  const [parallelSnapTargetId, setParallelSnapTargetId] = useState<string | null>(null);
  const [camera, setCamera] = useState<SharedCameraState>(DEFAULT_3D_CAMERA_STATE);
  const [spaceResetKey, setSpaceResetKey] = useState(0);
  const scene = scenes[activeDimension];
  const analysis = useMemo(
    () => analyzeBasisCandidate(scene, scene.candidateVectorIds),
    [scene],
  );
  const candidateVectors = useMemo(
    () => resolveVectors(scene.vectors, scene.candidateVectorIds),
    [scene],
  );
  const coordinateAnalysis = useMemo(
    () => analyzeBasisCoordinates(scene, scene.candidateVectorIds, scene.target),
    [scene],
  );
  const comparisonAnalysis = useMemo(() => {
    const ids = comparisonBasisIds[activeDimension];
    return ids ? analyzeBasisCoordinates(scene, ids, scene.target) : null;
  }, [activeDimension, comparisonBasisIds, scene]);

  function updateScene(
    dimension: VectorDimension,
    update: (current: BasisDimensionScene) => BasisDimensionScene,
  ): void {
    setScenes((current) => ({ ...current, [dimension]: update(current[dimension]) }));
  }

  function handleDimensionChange(dimension: VectorDimension): void {
    setParallelSnapTargetId(null);
    setActiveDimension(dimension);
  }

  function handleDimensionTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const nextDimension = event.key === 'ArrowLeft' || event.key === 'Home' ? 2 : 3;
    handleDimensionChange(nextDimension);
    document.getElementById(`basis-dimension-tab-${nextDimension}`)?.focus();
  }

  function setActiveInspectorTab(tab: BasisInspectorTabId): void {
    setActiveInspectorTabs((current) => ({ ...current, [activeDimension]: tab }));
  }

  function handleInspectorTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const activeTab = activeInspectorTabs[activeDimension];
    const currentIndex = BASIS_INSPECTOR_TABS.findIndex((tab) => tab.id === activeTab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? BASIS_INSPECTOR_TABS.length - 1
        : event.key === 'ArrowRight'
          ? (currentIndex + 1) % BASIS_INSPECTOR_TABS.length
          : (currentIndex - 1 + BASIS_INSPECTOR_TABS.length) % BASIS_INSPECTOR_TABS.length;
    const nextTab = BASIS_INSPECTOR_TABS[nextIndex];
    setActiveInspectorTab(nextTab.id);
    document.getElementById(`basis-inspector-tab-${nextTab.id}`)?.focus();
  }

  function handleCandidateToggle(vectorId: string): void {
    updateScene(activeDimension, (current) => ({
      ...current,
      candidateVectorIds: toggleBasisCandidate(current.candidateVectorIds, vectorId),
    }));
  }

  function handleCandidateMove(vectorId: string, offset: -1 | 1): void {
    updateScene(activeDimension, (current) => ({
      ...current,
      candidateVectorIds: moveBasisCandidate(current.candidateVectorIds, vectorId, offset),
    }));
  }

  function commitVectorCoordinates(vectorId: string, coordinates: readonly number[]): void {
    updateScene(activeDimension, (current) =>
      updateBasisVectorCoordinates(current, vectorId, coordinates));
    setCoordinateDrafts((current) => ({
      ...current,
      [activeDimension]: {
        ...current[activeDimension],
        [vectorId]: coordinates.map(formatCoordinate),
      },
    }));
  }

  function handlePlaneVectorDrag(
    vectorId: string,
    coordinates: readonly [number, number],
  ): void {
    const result = updateBasisPlaneVectorDrag(
      scenes[2],
      vectorId,
      coordinates,
      planeViewport.maxX - planeViewport.minX,
    );
    setScenes((current) => ({ ...current, 2: result.scene }));
    setCoordinateDrafts((current) => ({
      ...current,
      2: {
        ...current[2],
        [vectorId]: result.coordinates.map(formatCoordinate),
      },
    }));
    setParallelSnapTargetId(result.snapTargetVectorId);
  }

  function handleCoordinateChange(vectorId: string, coordinateIndex: number, value: string): void {
    const nextDrafts = [...(coordinateDrafts[activeDimension][vectorId] ?? [])];
    nextDrafts[coordinateIndex] = value;
    setCoordinateDrafts((current) => ({
      ...current,
      [activeDimension]: { ...current[activeDimension], [vectorId]: nextDrafts },
    }));

    const parsed = nextDrafts.map(parseCoordinateInput);
    if (parsed.every((result) => result.ok)) {
      updateScene(activeDimension, (current) => updateBasisVectorCoordinates(
        current,
        vectorId,
        parsed.map((result) => result.ok ? result.value : 0),
      ));
    }
  }

  function handleCoordinateBlur(vector: VectorValue, coordinateIndex: number): void {
    const draft = coordinateDrafts[activeDimension][vector.id]?.[coordinateIndex] ?? '';
    if (parseCoordinateInput(draft).ok) {
      return;
    }
    const nextDrafts = [...(coordinateDrafts[activeDimension][vector.id] ?? [])];
    nextDrafts[coordinateIndex] = formatCoordinate(vector.coordinates[coordinateIndex]);
    setCoordinateDrafts((current) => ({
      ...current,
      [activeDimension]: { ...current[activeDimension], [vector.id]: nextDrafts },
    }));
  }

  function commitTarget(target: readonly number[]): void {
    updateScene(activeDimension, (current) => updateBasisTarget(current, target));
    setTargetDrafts((current) => ({
      ...current,
      [activeDimension]: target.map(formatCoordinate),
    }));
  }

  function handleTargetCoordinateChange(coordinateIndex: number, value: string): void {
    const nextDrafts = [...targetDrafts[activeDimension]];
    nextDrafts[coordinateIndex] = value;
    setTargetDrafts((current) => ({ ...current, [activeDimension]: nextDrafts }));
    const parsed = nextDrafts.map(parseCoordinateInput);
    if (parsed.every((result) => result.ok)) {
      updateScene(activeDimension, (current) => updateBasisTarget(
        current,
        parsed.map((result) => result.ok ? result.value : 0),
      ));
    }
  }

  function handleTargetCoordinateBlur(coordinateIndex: number): void {
    const draft = targetDrafts[activeDimension][coordinateIndex] ?? '';
    if (parseCoordinateInput(draft).ok) {
      return;
    }
    const nextDrafts = [...targetDrafts[activeDimension]];
    nextDrafts[coordinateIndex] = formatCoordinate(scene.target[coordinateIndex]);
    setTargetDrafts((current) => ({ ...current, [activeDimension]: nextDrafts }));
  }

  function saveComparisonBasis(): void {
    setComparisonBasisIds((current) => ({
      ...current,
      [activeDimension]: [...scene.candidateVectorIds],
    }));
  }

  function handleReset(): void {
    const resetScene = createDefaultBasisScene(activeDimension);
    setScenes((current) => ({ ...current, [activeDimension]: resetScene }));
    setCoordinateDrafts((current) => ({
      ...current,
      [activeDimension]: createCoordinateDrafts(resetScene.vectors),
    }));
    setTargetDrafts((current) => ({
      ...current,
      [activeDimension]: resetScene.target.map(String),
    }));
    setComparisonBasisIds((current) => ({ ...current, [activeDimension]: null }));
    setActiveInspectorTabs((current) => ({ ...current, [activeDimension]: 'vectors' }));
    if (activeDimension === 2) {
      setPlaneViewport(createBasisAutoFitViewport(resetScene));
      setParallelSnapTargetId(null);
    } else {
      setCamera(DEFAULT_3D_CAMERA_STATE);
      setSpaceResetKey((current) => current + 1);
    }
  }

  return (
    <div className="basis-dimension-lab" data-lab-id="basis-dimension">
      <a className="skip-link" href={`#basis-dimension-panel-${activeDimension}`}>
        基底候補の操作領域へ移動
      </a>
      <main className="lab-page">
        <nav className="dimension-switcher" aria-label="基底・次元Labの次元">
          <div className="dimension-tablist" role="tablist" aria-label="2Dと3Dの切替">
            {DIMENSION_TABS.map((tab) => (
              <button
                key={tab.dimension}
                id={`basis-dimension-tab-${tab.dimension}`}
                type="button"
                role="tab"
                aria-selected={activeDimension === tab.dimension}
                aria-controls={`basis-dimension-panel-${tab.dimension}`}
                tabIndex={activeDimension === tab.dimension ? 0 : -1}
                onClick={() => handleDimensionChange(tab.dimension)}
                onKeyDown={handleDimensionTabKeyDown}
              >
                <span className="dimension-tab-label-wide">{tab.label}</span>
                <span className="dimension-tab-label-short">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
          <p aria-live="polite">{activeDimension}次元の基底候補と座標を調べています。</p>
        </nav>

        <section className="lab-intro" aria-labelledby="basis-dimension-title">
          <div>
            <p className="eyebrow">基底・次元 / {activeDimension}D</p>
            <h1 id="basis-dimension-title">基底を選んで、座標を読み解く。</h1>
          </div>
          <div className="lab-intro-side">
            <p className="lab-intro-copy">
              集合 <MathSetName /> のベクトルから順序付きの基底候補 <MathBasisName /> を選びます。
              2つの基底条件を確かめ、ターゲット <MathVectorName name="v" /> の座標が一意に定まる理由と、基底を変えたときの違いを比べます。
            </p>
            <LabActionControls
              exportDisabled
              exportDescriptionId="basis-share-unavailable"
              onExport={() => undefined}
              onReset={handleReset}
            />
            <p className="lab-action-help" id="basis-share-unavailable">
              このLabの共有URLは8.7で追加します。現在はResetのみ利用できます。
            </p>
          </div>
        </section>

        <div
          className="basis-dimension-workspace"
          id={`basis-dimension-panel-${activeDimension}`}
          role="tabpanel"
          aria-labelledby={`basis-dimension-tab-${activeDimension}`}
          tabIndex={-1}
        >
          <div className="basis-visual-column">
            {activeDimension === 2 ? (
              <section className="plot-card" aria-labelledby="basis-plane-title">
                <div className="card-heading">
                  <div>
                    <p className="panel-kicker">Candidate span</p>
                    <h2 id="basis-plane-title">候補が生成する空間</h2>
                  </div>
                  <button
                    className="basis-fit-button"
                    type="button"
                    onClick={() => setPlaneViewport(createBasisAutoFitViewport(scene))}
                  >
                    全体を表示
                  </button>
                </div>
                <VectorPlane2D
                  idPrefix="basis-vector-plane"
                  vectors={scene.vectors}
                  colors={VECTOR_COLORS}
                  viewport={planeViewport}
                  onViewportChange={setPlaneViewport}
                  onVectorDragStart={() => setParallelSnapTargetId(null)}
                  onVectorChange={handlePlaneVectorDrag}
                  onVectorDragEnd={() => setParallelSnapTargetId(null)}
                  parallelSnapTargetId={parallelSnapTargetId}
                  spanVectors={candidateVectors}
                  spanDimension={analysis.candidateRank}
                  showSpan
                  linearCombinationVisible
                  target={scene.target as readonly [number, number]}
                  linearCombinationCoefficients={
                    coordinateAnalysis.status === 'coordinate-vector'
                    && coordinateAnalysis.coordinateVector?.length === 2
                      ? coordinateAnalysis.coordinateVector as readonly [number, number]
                      : null
                  }
                  onTargetPlacement={commitTarget}
                  onTargetChange={commitTarget}
                />
                <p className="viewport-help">
                  灰色は基底候補 <MathBasisName /> が生成する空間です。通常ベクトルとターゲット <MathVectorName name="v" /> の矢先をドラッグできます。
                </p>
              </section>
            ) : (
              <Suspense fallback={<BasisSpaceLoading />}>
                <VectorSpace3D
                  idPrefix="basis-space-3d"
                  showLinearCombinationControl={false}
                  vectors={scene.vectors}
                  colors={VECTOR_COLORS}
                  spanVectors={candidateVectors}
                  spanRank={analysis.candidateRank}
                  showSpan
                  linearCombinationVisible
                  linearCombinationTarget={scene.target as readonly [number, number, number]}
                  linearCombinationCoefficients={
                    coordinateAnalysis.status === 'coordinate-vector'
                      ? coordinateAnalysis.coordinateVector
                      : null
                  }
                  active={active && activeDimension === 3}
                  resetKey={spaceResetKey}
                  camera={camera}
                  onCameraChange={setCamera}
                  onVectorCoordinatesCommit={commitVectorCoordinates}
                  onLinearCombinationTargetPlacement={commitTarget}
                  onLinearCombinationVisibility={() => undefined}
                  assistiveDescription="ベクトルの座標、候補の一次独立性、生成条件、ターゲットの座標ベクトルは、この後の数値入力と判定カードでも確認できます。3D表示を利用できない場合も、候補選択、数値入力、座標判定、Resetは利用できます。"
                  unavailableFallbackDescription="候補選択、数値入力、基底と座標の判定カード、Resetはそのまま利用できます。"
                />
              </Suspense>
            )}

          </div>

          <aside className="basis-analysis-column" aria-label="基底候補の選択、判定、座標の比較">
            <CandidateSelector
              vectors={scene.vectors}
              candidateVectorIds={scene.candidateVectorIds}
              onToggle={handleCandidateToggle}
              onMove={handleCandidateMove}
            />

            <div className="inspector-tablist basis-inspector-tablist" role="tablist" aria-label="基底・次元Labの編集・解析の詳細">
              {BASIS_INSPECTOR_TABS.map((tab) => (
                <button
                  key={tab.id}
                  id={`basis-inspector-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeInspectorTabs[activeDimension] === tab.id}
                  aria-controls={`basis-inspector-panel-${tab.id}`}
                  tabIndex={activeInspectorTabs[activeDimension] === tab.id ? 0 : -1}
                  onClick={() => setActiveInspectorTab(tab.id)}
                  onKeyDown={handleInspectorTabKeyDown}
                >
                  <span className="tab-label-wide">{tab.label}</span>
                  <span className="tab-label-short">{tab.shortLabel}</span>
                </button>
              ))}
            </div>

            <VectorSourceEditor
              scene={scene}
              drafts={coordinateDrafts[activeDimension]}
              active={activeInspectorTabs[activeDimension] === 'vectors'}
              onCoordinateChange={handleCoordinateChange}
              onCoordinateBlur={handleCoordinateBlur}
            />
            <BasisAnalysisCard
              scene={scene}
              analysis={analysis}
              active={activeInspectorTabs[activeDimension] === 'basis'}
            />
            <CoordinateExplorerCard
              scene={scene}
              analysis={coordinateAnalysis}
              targetDrafts={targetDrafts[activeDimension]}
              comparisonBasisIds={comparisonBasisIds[activeDimension]}
              comparisonAnalysis={comparisonAnalysis}
              onTargetCoordinateChange={handleTargetCoordinateChange}
              onTargetCoordinateBlur={handleTargetCoordinateBlur}
              onSaveComparisonBasis={saveComparisonBasis}
              active={activeInspectorTabs[activeDimension] === 'coordinates'}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

function VectorSourceEditor({
  scene,
  drafts,
  active,
  onCoordinateChange,
  onCoordinateBlur,
}: {
  readonly scene: BasisDimensionScene;
  readonly drafts: Readonly<Record<string, readonly string[]>>;
  readonly active: boolean;
  readonly onCoordinateChange: (vectorId: string, index: number, value: string) => void;
  readonly onCoordinateBlur: (vector: VectorValue, index: number) => void;
}) {
  return (
    <section
      className="basis-source-card inspector-panel"
      id="basis-inspector-panel-vectors"
      role="tabpanel"
      aria-labelledby="basis-inspector-tab-vectors basis-source-title"
      hidden={!active}
    >
      <p className="panel-kicker">Vector set</p>
      <h2 id="basis-source-title">全ベクトルの集合 <MathSetName /></h2>
      <div className="basis-vector-input-grid">
        {scene.vectors.map((vector, vectorIndex) => (
          <div className="basis-vector-input" key={vector.id}>
            <span className="basis-vector-number" style={{ background: VECTOR_COLORS[vectorIndex] }}>
              {vectorIndex + 1}
            </span>
            <MathVectorName name={vector.name} />
            <span aria-hidden="true">=</span>
            <span className="basis-coordinate-inputs" aria-label={`${vector.name}の成分`}>
              {vector.coordinates.map((coordinate, coordinateIndex) => {
                const draft = drafts[vector.id]?.[coordinateIndex] ?? formatCoordinate(coordinate);
                const valid = parseCoordinateInput(draft).ok;
                return (
                  <input
                    key={coordinateIndex}
                    value={draft}
                    inputMode="decimal"
                    aria-label={`${vector.name}の第${coordinateIndex + 1}成分`}
                    aria-invalid={!valid}
                    onChange={(event) =>
                      onCoordinateChange(vector.id, coordinateIndex, event.target.value)}
                    onBlur={() => onCoordinateBlur(vector, coordinateIndex)}
                  />
                );
              })}
            </span>
          </div>
        ))}
      </div>
      <p className="basis-card-note">成分を変えると、対象空間と候補の判定を同時に再計算します。</p>
    </section>
  );
}

function CandidateSelector({
  vectors,
  candidateVectorIds,
  onToggle,
  onMove,
}: {
  readonly vectors: readonly VectorValue[];
  readonly candidateVectorIds: readonly string[];
  readonly onToggle: (vectorId: string) => void;
  readonly onMove: (vectorId: string, offset: -1 | 1) => void;
}) {
  return (
    <section className="basis-candidate-card" aria-labelledby="basis-candidate-title">
      <p className="panel-kicker">Ordered candidate</p>
      <h2 id="basis-candidate-title">基底候補 <MathBasisName /></h2>
      <div className="basis-tuple" aria-live="polite">
        <p><MathSetName /> = <VectorCollection vectors={vectors} /></p>
        <p><MathBasisName /> = <VectorTuple ids={candidateVectorIds} vectors={vectors} /></p>
      </div>
      <div className="basis-candidate-options">
        {vectors.map((vector) => {
          const orderIndex = candidateVectorIds.indexOf(vector.id);
          const selected = orderIndex >= 0;
          return (
            <div className={`basis-candidate-option ${selected ? 'is-selected' : ''}`} key={vector.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(vector.id)}
                />
                <MathVectorName name={vector.name} />
                <small className="basis-candidate-coordinates">
                  <MathTransposedRowVector values={vector.coordinates.map(formatCoordinate)} />
                </small>
              </label>
              {selected ? (
                <div className="basis-order-controls" aria-label={`${vector.name}の候補内の順序`}>
                  <span>{orderIndex + 1}番目</span>
                  <button
                    type="button"
                    aria-label={`${vector.name}を前へ移動`}
                    disabled={orderIndex === 0}
                    onClick={() => onMove(vector.id, -1)}
                  >↑</button>
                  <button
                    type="button"
                    aria-label={`${vector.name}を後ろへ移動`}
                    disabled={orderIndex === candidateVectorIds.length - 1}
                    onClick={() => onMove(vector.id, 1)}
                  >↓</button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="basis-card-note">基底は集合ではなく順序付きの組です。矢印で順序を変更できます。</p>
    </section>
  );
}

function BasisAnalysisCard({
  scene,
  analysis,
  active,
}: {
  readonly scene: BasisDimensionScene;
  readonly analysis: BasisCandidateAnalysis;
  readonly active: boolean;
}) {
  return (
    <section
      className={`basis-result-card inspector-panel ${analysis.isBasis ? 'is-basis' : 'is-not-basis'}`}
      id="basis-inspector-panel-basis"
      role="tabpanel"
      aria-labelledby="basis-inspector-tab-basis basis-result-title"
      hidden={!active}
    >
      <p className="panel-kicker">Basis &amp; dimension</p>
      <h2 id="basis-result-title">
        {analysis.isBasis ? 'この候補は基底です' : 'この候補は基底ではありません'}
      </h2>

      <div className="basis-target-summary">
        <p>
          <strong>対象としている空間：</strong>
          <MathSpaceName /> = <MathRealCoordinateSpace dimension={scene.dimension} />
        </p>
        <p>
          <strong>現在選んでいるベクトルの組：</strong>
          <MathBasisName /> = <VectorTuple ids={scene.candidateVectorIds} vectors={scene.vectors} />
        </p>
      </div>

      <div className="basis-condition-list">
        <ConditionResult
          success={analysis.isLinearlyIndependent}
          title="条件1：一次独立である"
          detail={`候補${analysis.candidateVectorCount}本のrankは${analysis.candidateRank}です。`}
        />
        <ConditionResult
          success={analysis.spansTargetSpace}
          title={<>条件2：対象空間 <MathSpaceName /> を生成する</>}
          detail={`候補のrank ${analysis.candidateRank} と対象のrank ${analysis.sourceRank}を比較します。`}
        />
      </div>

      {!analysis.isBasis ? (
        <ul className="basis-failure-reasons">
          {analysis.failureReasons.includes('linearly-dependent') ? (
            <li>候補に重複する方向があり、一次従属です。</li>
          ) : null}
          {analysis.failureReasons.includes('does-not-span-target') ? (
            <li>候補だけでは対象空間 <MathSpaceName /> 全体を生成できません。</li>
          ) : null}
        </ul>
      ) : null}

      <div className="basis-example">
        <p><strong>基底の一例</strong></p>
        <p><MathBasisName />₀ = <VectorTuple ids={analysis.basisExampleVectorIds} vectors={scene.vectors} /></p>
        <small>
          これは入力順から得た一例です。この例以外にも基底の取り方があり得る可能性があります。
          <MathSetName />から選べる一次独立なベクトルの最大個数は{analysis.maximumIndependentCount}本です。
        </small>
      </div>
    </section>
  );
}

function CoordinateExplorerCard({
  scene,
  analysis,
  targetDrafts,
  comparisonBasisIds,
  comparisonAnalysis,
  onTargetCoordinateChange,
  onTargetCoordinateBlur,
  onSaveComparisonBasis,
  active,
}: {
  readonly scene: BasisDimensionScene;
  readonly analysis: BasisCoordinateAnalysis;
  readonly targetDrafts: readonly string[];
  readonly comparisonBasisIds: readonly string[] | null;
  readonly comparisonAnalysis: BasisCoordinateAnalysis | null;
  readonly onTargetCoordinateChange: (index: number, value: string) => void;
  readonly onTargetCoordinateBlur: (index: number) => void;
  readonly onSaveComparisonBasis: () => void;
  readonly active: boolean;
}) {
  const coordinateValues = analysis.coordinateVector?.map(formatCoordinate) ?? [];
  const particularValues = analysis.combinationAnalysis.particularSolution
    ?.map(formatCoordinate) ?? [];
  const canSaveComparison = analysis.status === 'coordinate-vector';

  return (
    <section
      className={`basis-coordinate-card inspector-panel is-${analysis.status}`}
      id="basis-inspector-panel-coordinates"
      role="tabpanel"
      aria-labelledby="basis-inspector-tab-coordinates basis-coordinate-title"
      hidden={!active}
    >
      <p className="panel-kicker">Coordinates</p>
      <h2 id="basis-coordinate-title">基底に関する座標</h2>
      <p className="basis-coordinate-intro">
        同じターゲット <MathVectorName name="v" /> でも、基底の選び方と順序によって座標ベクトルは変わります。
      </p>

      <div className="basis-target-editor">
        <div>
          <strong>ターゲット</strong>
          <small>グラフ上の矢先ドラッグまたは成分入力で変更できます。</small>
        </div>
        <span className="basis-target-equation">
          <MathVectorName name="v" /><span aria-hidden="true"> = </span>
          <span className="basis-coordinate-inputs" aria-label="ターゲットvの成分">
            {scene.target.map((coordinate, index) => {
              const draft = targetDrafts[index] ?? formatCoordinate(coordinate);
              const valid = parseCoordinateInput(draft).ok;
              return (
                <input
                  key={index}
                  value={draft}
                  inputMode="decimal"
                  aria-label={`ターゲットvの第${index + 1}成分`}
                  aria-invalid={!valid}
                  onChange={(event) => onTargetCoordinateChange(index, event.target.value)}
                  onBlur={() => onTargetCoordinateBlur(index)}
                />
              );
            })}
          </span>
        </span>
      </div>

      <div className="basis-coordinate-current" aria-live="polite">
        <p className="basis-coordinate-basis-line">
          <strong>現在の候補：</strong>
          <MathBasisName /> = <VectorTuple ids={scene.candidateVectorIds} vectors={scene.vectors} />
        </p>
        <CoordinateResult
          scene={scene}
          analysis={analysis}
          coordinateValues={coordinateValues}
          particularValues={particularValues}
        />
      </div>

      <div className="basis-coordinate-comparison">
        <div className="basis-comparison-heading">
          <div>
            <strong>別の基底と比較</strong>
            <small>現在の基底を記録してから、候補の選択または順序を変えてください。</small>
          </div>
          <button
            type="button"
            disabled={!canSaveComparison}
            onClick={onSaveComparisonBasis}
          >
            現在の基底を比較用に記録
          </button>
        </div>
        {comparisonBasisIds && comparisonAnalysis ? (
          <div className="basis-coordinate-saved">
            <p>
              <MathBasisName comparison /> = <VectorTuple ids={comparisonBasisIds} vectors={scene.vectors} />
            </p>
            {comparisonAnalysis.status === 'coordinate-vector' ? (
              <>
                <p className="basis-coordinate-formula">
                  <MathVectorName name="c" /> ={' '}
                  <MathColumnVector values={comparisonAnalysis.coordinateVector?.map(formatCoordinate) ?? []} />
                </p>
                <small className="basis-coordinate-identity">
                  この係数ベクトル <MathVectorName name="c" /> が <MathCoordinateName comparison /> です。
                </small>
              </>
            ) : (
              <p className="basis-coordinate-warning">
                記録した組は現在のベクトル成分では基底でないため、比較用の座標を定義できません。
              </p>
            )}
          </div>
        ) : (
          <p className="basis-coordinate-empty">比較用の基底はまだ記録されていません。</p>
        )}
      </div>
    </section>
  );
}

function CoordinateResult({
  scene,
  analysis,
  coordinateValues,
  particularValues,
}: {
  readonly scene: BasisDimensionScene;
  readonly analysis: BasisCoordinateAnalysis;
  readonly coordinateValues: readonly string[];
  readonly particularValues: readonly string[];
}) {
  switch (analysis.status) {
    case 'coordinate-vector':
      return (
        <div className="basis-coordinate-success">
          <strong>座標ベクトルが唯一に定まります</strong>
          <p className="basis-coordinate-formula">
            <MathVectorName name="c" /> = <MathColumnVector values={coordinateValues} />
          </p>
          <p className="basis-coordinate-formula is-expansion">
            <MathVectorName name="v" /> ={' '}
            <VectorTuple ids={scene.candidateVectorIds} vectors={scene.vectors} />
            <MathVectorName name="c" />
          </p>
          <small>
            候補が基底なので、この一意な係数ベクトル <MathVectorName name="c" /> が{' '}
            <MathCoordinateName /> です。
          </small>
        </div>
      );
    case 'not-representable':
      return (
        <div className="basis-coordinate-warning">
          <strong>この組の一次結合ではターゲットを表現できません</strong>
          <p><MathVectorName name="v" /> は現在の候補が生成する空間に含まれません。</p>
          <small>表現係数が存在しないため、座標ベクトルも定義できません。</small>
        </div>
      );
    case 'non-unique':
      return (
        <div className="basis-coordinate-warning">
          <strong>一次結合係数が無数にあります</strong>
          <p>係数の例：</p>
          <div className="basis-coordinate-examples">
            {analysis.combinationAnalysis.exampleSolutions.map((values, index) => (
              <span key={index}>
                例{index + 1}：<MathVectorName name="c" /> ={' '}
                <MathColumnVector values={values.map(formatCoordinate)} />
              </span>
            ))}
          </div>
          <small>候補が一次従属なので係数が一意でなく、これを基底に関する座標とは呼びません。</small>
        </div>
      );
    case 'not-a-basis':
      return (
        <div className="basis-coordinate-warning">
          <strong>このターゲットには一意な係数がありますが、座標とは呼べません</strong>
          <p className="basis-coordinate-formula">
            <MathVectorName name="c" /> = <MathColumnVector values={particularValues} />
          </p>
          <small>現在の候補は対象空間の基底ではないため、他のベクトルには同じ表現規則を使えません。</small>
        </div>
      );
  }
}

function ConditionResult({ success, title, detail }: {
  readonly success: boolean;
  readonly title: ReactNode;
  readonly detail: string;
}) {
  return (
    <div className={`basis-condition ${success ? 'is-success' : 'is-failure'}`}>
      <span className="basis-condition-icon" aria-hidden="true">{success ? '✓' : '×'}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function BasisSpaceLoading() {
  return (
    <section className="three-dimensional-loading" aria-live="polite">
      <p className="panel-kicker">3D coordinate space</p>
      <h2>3D表示を準備しています</h2>
      <p>端末内で3D描画機能を読み込んでいます。</p>
    </section>
  );
}

function MathVectorName({ name }: { readonly name: string }) {
  const match = /^([A-Za-z]+)(\d+)$/u.exec(name);
  return (
    <span className="math-symbol math-vector">
      <span className="math-vector-base">{match?.[1] ?? name}</span>
      {match?.[2] ? <sub className="math-vector-subscript">{match[2]}</sub> : null}
    </span>
  );
}

function MathBasisName({ comparison = false }: { readonly comparison?: boolean }) {
  return (
    <span className="basis-math basis-script-symbol">
      ℬ{comparison ? <sub className="basis-comparison-subscript">0</sub> : null}
    </span>
  );
}

function MathSetName() {
  return <MathScalarName name="S" />;
}

function MathSpaceName() {
  return <MathScalarName name="V" />;
}

function MathScalarName({ name }: { readonly name: string }) {
  return (
    <span className="math-scalar">
      <span className="math-scalar-base">{name}</span>
    </span>
  );
}

function VectorTuple({ ids, vectors }: {
  readonly ids: readonly string[];
  readonly vectors: readonly VectorValue[];
}) {
  if (ids.length === 0) {
    return <span className="basis-math">()</span>;
  }
  return (
    <span className="basis-math basis-vector-tuple">
      (<span>{ids.map((id, index) => {
        const vector = vectors.find((item) => item.id === id);
        return (
          <span key={id}>
            {index > 0 ? ', ' : ''}<MathVectorName name={vector?.name ?? id} />
          </span>
        );
      })}</span>)
    </span>
  );
}

function VectorCollection({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  return (
    <span className="basis-math basis-vector-tuple">
      {'{'}{vectors.map((vector, index) => (
        <span key={vector.id}>
          {index > 0 ? ', ' : ''}<MathVectorName name={vector.name} />
        </span>
      ))}{'}'}
    </span>
  );
}

function MathRealCoordinateSpace({ dimension }: { readonly dimension: VectorDimension }) {
  return (
    <span className="basis-coordinate-space" aria-label={`${dimension}次元実数ベクトル空間`}>
      <span aria-hidden="true">ℝ</span><sup aria-hidden="true">{dimension}</sup>
    </span>
  );
}

function MathTransposedRowVector({ values }: { readonly values: readonly string[] }) {
  return (
    <span className="transposed-row-vector" aria-label={`転置した行表示 ${values.join('、')}`}>
      <sup aria-hidden="true">t</sup>
      <span aria-hidden="true">[</span>
      {values.map((value, index) => (
        <span key={index}>
          {index > 0 ? <span aria-hidden="true">, </span> : null}
          {value}
        </span>
      ))}
      <span aria-hidden="true">]</span>
    </span>
  );
}

function MathCoordinateName({ comparison = false }: { readonly comparison?: boolean }) {
  return (
    <span className="basis-coordinate-name" aria-label={`vの基底${comparison ? 'B0' : 'B'}に関する座標`}>
      [<MathVectorName name="v" />]<sub><MathBasisName comparison={comparison} /></sub>
    </span>
  );
}

function MathColumnVector({ values }: { readonly values: readonly string[] }) {
  return (
    <span
      className="display-column-vector basis-column-vector"
      aria-label={`列ベクトル ${values.join('、')}`}
    >
      {values.length === 0 ? <span aria-hidden="true"> </span> : values.map((value, index) => (
        <span key={index} aria-hidden="true">{value}</span>
      ))}
    </span>
  );
}

function resolveVectors(
  vectors: readonly VectorValue[],
  ids: readonly string[],
): readonly VectorValue[] {
  const byId = new Map(vectors.map((vector) => [vector.id, vector]));
  return ids.flatMap((id) => {
    const vector = byId.get(id);
    return vector ? [vector] : [];
  });
}

function createBasisAutoFitViewport(scene: BasisDimensionScene): PlaneViewport {
  return createAutoFitViewport([
    ...scene.vectors,
    { id: '__basis_coordinate_target__', name: 'v', coordinates: scene.target },
  ]);
}

function formatCoordinate(value: number): string {
  return String(Number(value.toPrecision(10)));
}

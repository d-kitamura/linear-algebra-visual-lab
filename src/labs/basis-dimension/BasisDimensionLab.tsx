import {
  lazy,
  Suspense,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  analyzeBasisCandidate,
  type BasisCandidateAnalysis,
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

  function handleReset(): void {
    const resetScene = createDefaultBasisScene(activeDimension);
    setScenes((current) => ({ ...current, [activeDimension]: resetScene }));
    setCoordinateDrafts((current) => ({
      ...current,
      [activeDimension]: createCoordinateDrafts(resetScene.vectors),
    }));
    if (activeDimension === 2) {
      setPlaneViewport(createAutoFitViewport(resetScene.vectors));
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
          <p aria-live="polite">{activeDimension}次元の基底候補を調べています。</p>
        </nav>

        <section className="lab-intro" aria-labelledby="basis-dimension-title">
          <div>
            <p className="eyebrow">基底・次元 / {activeDimension}D</p>
            <h1 id="basis-dimension-title">基底を選んで、2つの条件を確かめる。</h1>
          </div>
          <div className="lab-intro-side">
            <p className="lab-intro-copy">
              集合 <MathSetName /> のベクトルから順序付きの基底候補 <MathBasisName /> を選びます。
              「一次独立」と「対象空間を生成する」を分けて確かめ、次元と<span className="basis-math">rank</span>を結び付けます。
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
                    onClick={() => setPlaneViewport(createAutoFitViewport(scene.vectors))}
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
                />
                <p className="viewport-help">
                  灰色は基底候補 <MathBasisName /> が生成する空間です。矢先のドラッグまたは成分入力で判定が更新されます。
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
                  linearCombinationVisible={false}
                  linearCombinationTarget={null}
                  linearCombinationCoefficients={null}
                  active={active && activeDimension === 3}
                  resetKey={spaceResetKey}
                  camera={camera}
                  onCameraChange={setCamera}
                  onVectorCoordinatesCommit={commitVectorCoordinates}
                  onLinearCombinationTargetPlacement={() => undefined}
                  onLinearCombinationVisibility={() => undefined}
                  assistiveDescription="ベクトルの座標、候補の一次独立性、生成条件、次元とrankは、この後の数値入力と判定カードでも確認できます。3D表示を利用できない場合も、候補選択、数値入力、判定、Resetは利用できます。"
                  unavailableFallbackDescription="候補選択、数値入力、判定カード、Resetはそのまま利用できます。"
                />
              </Suspense>
            )}

            <VectorSourceEditor
              scene={scene}
              drafts={coordinateDrafts[activeDimension]}
              onCoordinateChange={handleCoordinateChange}
              onCoordinateBlur={handleCoordinateBlur}
            />
          </div>

          <aside className="basis-analysis-column" aria-label="基底候補の選択と判定">
            <CandidateSelector
              vectors={scene.vectors}
              candidateVectorIds={scene.candidateVectorIds}
              onToggle={handleCandidateToggle}
              onMove={handleCandidateMove}
            />
            <BasisAnalysisCard scene={scene} analysis={analysis} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function VectorSourceEditor({
  scene,
  drafts,
  onCoordinateChange,
  onCoordinateBlur,
}: {
  readonly scene: BasisDimensionScene;
  readonly drafts: Readonly<Record<string, readonly string[]>>;
  readonly onCoordinateChange: (vectorId: string, index: number, value: string) => void;
  readonly onCoordinateBlur: (vector: VectorValue, index: number) => void;
}) {
  return (
    <section className="basis-source-card" aria-labelledby="basis-source-title">
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
      <p className="basis-tuple" aria-live="polite">
        <MathBasisName /> = <VectorTuple ids={candidateVectorIds} vectors={vectors} />
      </p>
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
                <small>{formatColumnVector(vector.coordinates)}</small>
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
}: {
  readonly scene: BasisDimensionScene;
  readonly analysis: BasisCandidateAnalysis;
}) {
  return (
    <section className={`basis-result-card ${analysis.isBasis ? 'is-basis' : 'is-not-basis'}`} aria-labelledby="basis-result-title">
      <p className="panel-kicker">Basis &amp; dimension</p>
      <h2 id="basis-result-title">
        {analysis.isBasis ? 'この候補は基底です' : 'この候補は基底ではありません'}
      </h2>

      <div className="basis-target-summary">
        <p><MathSetName /> = <VectorCollection vectors={scene.vectors} /></p>
        <p><MathMatrixName /> = <VectorMatrixColumns vectors={scene.vectors} /></p>
        <p><MathSpaceName /> = span(<MathSetName />)</p>
        <p>
          dim(<MathSpaceName />) = rank(<MathMatrixName />) = <strong>{analysis.targetDimension}</strong>
        </p>
        <small>
          dim(<MathSpaceName />)は対象空間の次元、rank(<MathMatrixName />)は行列の階数です。
          値は同じでも意味を区別します。
        </small>
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
        <small>これは入力順から得た一例です。基底が一意であることを意味しません。</small>
      </div>
      <p className="basis-maximum-note">
        <MathSetName /> から選べる一次独立なベクトルの最大個数も {analysis.maximumIndependentCount} 本です。
      </p>
    </section>
  );
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
    <span className="basis-math basis-vector-symbol">
      <span>{match?.[1] ?? name}</span>{match?.[2] ? <sub>{match[2]}</sub> : null}
    </span>
  );
}

function MathBasisName() {
  return <span className="basis-math basis-script-symbol">ℬ</span>;
}

function MathSetName() {
  return <span className="basis-math basis-set-symbol">S</span>;
}

function MathSpaceName() {
  return <span className="basis-math basis-set-symbol">V</span>;
}

function MathMatrixName() {
  return <span className="basis-math basis-matrix-symbol">A</span>;
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

function VectorMatrixColumns({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  return (
    <span className="basis-math basis-vector-tuple">
      [ {vectors.map((vector, index) => (
        <span key={vector.id}>
          {index > 0 ? '\u2003' : ''}<MathVectorName name={vector.name} />
        </span>
      ))} ]
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

function formatCoordinate(value: number): string {
  return String(Number(value.toPrecision(10)));
}

function formatColumnVector(coordinates: readonly number[]): string {
  return `[ ${coordinates.map(formatCoordinate).join(' ; ')} ]`;
}

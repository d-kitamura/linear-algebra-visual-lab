import { useMemo, useState, type CSSProperties } from 'react';
import { analyzeVectorSet, type VectorValue } from '../domain';
import { MAX_ABSOLUTE_COORDINATE, type ShareStateV1 } from '../sharing';
import {
  DEFAULT_2D_SHARE_STATE,
  parallelSnapDistanceForViewWidth,
  parseCoordinateInput,
  selectSpanVectors,
  snapDraggedVectorToParallel,
  updateSpanSelection,
} from '../state';
import { splitVectorName } from '../ui';
import {
  VectorPlane2D,
  createAutoFitViewport,
  zoomViewportAtCenter,
  type PlaneViewport,
} from '../visualization';
import { projectInfo } from './projectInfo';
import './App.css';

const vectorColors = ['#c84c35', '#087f73'];
const coordinateNames = ['第1成分', '第2成分'] as const;

type CoordinateDrafts = Readonly<Record<string, readonly string[]>>;
type ViewMode = 'auto' | 'manual';

export function App() {
  const [state, setState] = useState<ShareStateV1>(() => DEFAULT_2D_SHARE_STATE);
  const [coordinateDrafts, setCoordinateDrafts] = useState<CoordinateDrafts>(() =>
    createCoordinateDrafts(DEFAULT_2D_SHARE_STATE.vectors),
  );
  const [viewMode, setViewMode] = useState<ViewMode>('auto');
  const [manualViewport, setManualViewport] = useState<PlaneViewport | null>(null);
  const [dragViewport, setDragViewport] = useState<PlaneViewport | null>(null);
  const [parallelSnapTargetId, setParallelSnapTargetId] = useState<string | null>(null);
  const analysis = useMemo(
    () => analyzeVectorSet({ dimension: state.dim, vectors: state.vectors }),
    [state],
  );
  const spanVectors = useMemo(
    () => selectSpanVectors(state.vectors, state.spanSelection),
    [state.vectors, state.spanSelection],
  );
  const spanAnalysis = useMemo(
    () => analyzeVectorSet({ dimension: state.dim, vectors: spanVectors }),
    [state.dim, spanVectors],
  );
  const autoViewport = useMemo(() => createAutoFitViewport(state.vectors), [state.vectors]);
  const selectedViewport = viewMode === 'auto' ? autoViewport : (manualViewport ?? autoViewport);
  const viewport = dragViewport ?? selectedViewport;
  const isIndependent = analysis.isLinearlyIndependent;
  const spanShape = describeSpanShape(spanAnalysis.rank);
  const viewportLabel = viewMode === 'auto'
    ? `自動表示 ±${formatViewportNumber((viewport.maxX - viewport.minX) / 2)}`
    : `手動表示・幅 ${formatViewportNumber(viewport.maxX - viewport.minX)}`;

  function handleManualViewportChange(nextViewport: PlaneViewport): void {
    setManualViewport(nextViewport);
    setViewMode('manual');
  }

  function handleButtonZoom(factor: number): void {
    handleManualViewportChange(zoomViewportAtCenter(viewport, factor));
  }

  function handleFitViewport(): void {
    setManualViewport(null);
    setViewMode('auto');
  }

  function handleVectorDragStart(): void {
    setDragViewport(viewport);
    setParallelSnapTargetId(null);
  }

  function handleVectorDrag(
    vectorId: string,
    coordinates: readonly [number, number],
  ): void {
    const candidateCoordinates: readonly [number, number] = [
      clampDraggedCoordinate(coordinates[0]),
      clampDraggedCoordinate(coordinates[1]),
    ];
    const snapResult = snapDraggedVectorToParallel(
      vectorId,
      candidateCoordinates,
      state.vectors,
      parallelSnapDistanceForViewWidth(viewport.maxX - viewport.minX),
    );
    const safeCoordinates = snapResult.coordinates;

    setState((current) => ({
      ...current,
      vectors: current.vectors.map((vector) =>
        vector.id === vectorId
          ? { ...vector, coordinates: safeCoordinates }
          : vector,
      ),
    }));
    setCoordinateDrafts((current) => ({
      ...current,
      [vectorId]: safeCoordinates.map(String),
    }));
    setParallelSnapTargetId(snapResult.targetVectorId);
  }

  function handleVectorDragEnd(): void {
    setDragViewport(null);
    setParallelSnapTargetId(null);
  }

  function handleSpanSelection(vectorId: string, selected: boolean): void {
    setState((current) => ({
      ...current,
      spanSelection: updateSpanSelection(
        current.vectors,
        current.spanSelection,
        vectorId,
        selected,
      ),
    }));
  }

  function handleShowSpan(showSpan: boolean): void {
    setState((current) => ({
      ...current,
      visualization: { ...current.visualization, showSpan },
    }));
  }

  function handleCoordinateChange(
    vectorId: string,
    coordinateIndex: number,
    input: string,
  ): void {
    setCoordinateDrafts((current) => ({
      ...current,
      [vectorId]: (current[vectorId] ?? []).map((value, index) =>
        index === coordinateIndex ? input : value,
      ),
    }));

    const parsed = parseCoordinateInput(input);
    if (!parsed.ok) {
      return;
    }

    setState((current) => ({
      ...current,
      vectors: current.vectors.map((vector) => {
        if (vector.id !== vectorId) {
          return vector;
        }

        return {
          ...vector,
          coordinates: vector.coordinates.map((coordinate, index) =>
            index === coordinateIndex ? parsed.value : coordinate,
          ),
        };
      }),
    }));
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Linear Algebra Visual Lab ホーム"
        >
          <span className="brand-mark" aria-hidden="true">
            LA
          </span>
          <span>{projectInfo.name}</span>
        </a>
        <span className="phase-badge">{projectInfo.phase}</span>
      </header>

      <main className="lab-page">
        <section className="lab-intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ベクトル空間 / 2D</p>
            <h1 id="page-title">ベクトルを変えて、生成する空間を見る。</h1>
          </div>
          <p>
            列ベクトルの成分を編集すると、座標平面と数学的な判定が連動します。
            ベクトルを選ぶと、その集合が生成する空間を原点、直線、座標平面として比較できます。
          </p>
        </section>

        <div className="lab-workspace">
          <section className="plot-card" aria-labelledby="plot-title">
            <div className="card-heading">
              <div>
                <p className="panel-kicker">Coordinate plane</p>
                <h2 id="plot-title">2次元座標平面</h2>
              </div>
              <div className="viewport-toolbar">
                <span className={`example-badge ${viewMode === 'manual' ? 'is-manual' : ''}`}>
                  {viewportLabel}
                </span>
                <div className="viewport-controls" role="group" aria-label="座標面の表示範囲">
                  <button
                    type="button"
                    aria-label="縮小して広い範囲を表示"
                    title="縮小"
                    onClick={() => handleButtonZoom(1.25)}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label="拡大して狭い範囲を表示"
                    title="拡大"
                    onClick={() => handleButtonZoom(0.8)}
                  >
                    ＋
                  </button>
                  <button
                    className="fit-viewport-button"
                    type="button"
                    disabled={viewMode === 'auto'}
                    onClick={handleFitViewport}
                  >
                    全体を表示
                  </button>
                </div>
              </div>
            </div>
            <VectorPlane2D
              vectors={state.vectors}
              colors={vectorColors}
              viewport={viewport}
              onViewportChange={handleManualViewportChange}
              onVectorDragStart={handleVectorDragStart}
              onVectorChange={handleVectorDrag}
              onVectorDragEnd={handleVectorDragEnd}
              parallelSnapTargetId={parallelSnapTargetId}
              spanVectors={spanVectors}
              spanDimension={spanAnalysis.rank}
              showSpan={state.visualization.showSpan}
            />
            <p className="viewport-help">
              矢印先端の丸をドラッグするとベクトルを変更できます。ほかのベクトルとほぼ平行になると吸着します。
            </p>
          </section>

          <aside className="analysis-column" aria-label="ベクトル集合の編集と解析結果">
            <section className="vector-editor-card" aria-labelledby="vector-editor-title">
              <p className="panel-kicker">Edit vectors</p>
              <h2 id="vector-editor-title">列ベクトルの成分</h2>
              <p className="editor-hint">上段が第1成分、下段が第2成分です。</p>
              <div className="vector-editor-list">
                {state.vectors.map((vector, vectorIndex) => {
                  const drafts = coordinateDrafts[vector.id] ?? vector.coordinates.map(String);
                  const results = drafts.map(parseCoordinateInput);
                  const firstError = results.find((result) => !result.ok);
                  const errorId = `${vector.id}-coordinate-error`;

                  return (
                    <div className="vector-editor" key={vector.id}>
                      <span
                        className="vector-key"
                        style={{
                          '--vector-color': vectorColors[vectorIndex % vectorColors.length],
                        } as CSSProperties}
                        aria-hidden="true"
                      >
                        {vectorIndex + 1}
                      </span>
                      <MathVectorName name={vector.name} />
                      <span className="math-equals" aria-hidden="true">=</span>
                      <div className="editable-column-vector">
                        {drafts.map((draft, coordinateIndex) => {
                          const result = results[coordinateIndex];
                          const isInvalid = !result.ok;
                          const inputId = `${vector.id}-coordinate-${coordinateIndex}`;

                          return (
                            <label className="coordinate-field" key={inputId} htmlFor={inputId}>
                              <span className="visually-hidden">
                                {`${vector.name} の${coordinateNames[coordinateIndex]}`}
                              </span>
                              <input
                                id={inputId}
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                spellCheck={false}
                                value={draft}
                                aria-invalid={isInvalid}
                                aria-describedby={isInvalid ? errorId : undefined}
                                onChange={(event) =>
                                  handleCoordinateChange(vector.id, coordinateIndex, event.target.value)
                                }
                              />
                            </label>
                          );
                        })}
                      </div>
                      <label className="span-selection-control">
                        <input
                          type="checkbox"
                          checked={state.spanSelection.includes(vector.id)}
                          aria-label={`${vector.name} を生成する空間の対象に含める`}
                          onChange={(event) =>
                            handleSpanSelection(vector.id, event.target.checked)
                          }
                        />
                        <span>
                          <MathOperator name="span" /> の対象に含める
                        </span>
                      </label>
                      <p
                        className={`coordinate-feedback ${firstError ? 'has-error' : ''}`}
                        id={errorId}
                        role={firstError ? 'alert' : undefined}
                      >
                        {firstError && !firstError.ok
                          ? `${firstError.message} 表示には直前の有効値を使います。`
                          : '入力は表示と判定へすぐに反映されます。'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={`span-card is-rank-${spanAnalysis.rank}`} aria-labelledby="span-card-title">
              <div className="span-card-heading">
                <div>
                  <p className="panel-kicker">Selected span</p>
                  <h2 id="span-card-title">選択したベクトルが生成する空間</h2>
                </div>
                <label className="span-visibility-control">
                  <input
                    type="checkbox"
                    checked={state.visualization.showSpan}
                    onChange={(event) => handleShowSpan(event.target.checked)}
                  />
                  <span>座標平面に表示</span>
                </label>
              </div>

              <VectorSetDefinition vectors={spanVectors} />
              <SelectedMatrixDefinition vectors={spanVectors} />

              <div className="span-shape-result">
                <span className="span-shape-symbol" aria-hidden="true">
                  {spanAnalysis.rank === 0 ? '⊙' : spanAnalysis.rank === 1 ? '━' : '▧'}
                </span>
                <div>
                  <strong>{spanShape.heading}</strong>
                  <p>{spanShape.explanation}</p>
                </div>
              </div>

              <p className="span-relation">
                {spanVectors.length === 0
                  ? '空集合は一次独立で、生成する空間は零部分空間です。'
                  : spanAnalysis.isLinearlyIndependent
                    ? '選択したベクトルは一次独立です。'
                    : '選択したベクトルは一次従属です。'}
              </p>

              <dl className="span-metric-grid">
                <div>
                  <dt>選択数</dt>
                  <dd>{spanAnalysis.vectorCount}</dd>
                </div>
                <div>
                  <dt>
                    <MathOperator name="rank" />(<MathMatrixName name="B" />)
                  </dt>
                  <dd>{spanAnalysis.rank}</dd>
                </div>
                <div>
                  <dt>
                    <MathOperator name="dim" />(<MathOperator name="span" />(<span className="math-set-name">X</span>))
                  </dt>
                  <dd>{spanAnalysis.spanDimension}</dd>
                </div>
              </dl>
            </section>

            <section className={`result-card ${isIndependent ? 'is-independent' : 'is-dependent'}`}>
              <p className="panel-kicker">All vectors</p>
              <MatrixDefinition vectors={state.vectors} />
              <p className="result-symbol" aria-hidden="true">{isIndependent ? '∥' : '≈'}</p>
              <h2>{isIndependent ? '全ベクトルは一次独立です' : '全ベクトルは一次従属です'}</h2>
              <p className="result-explanation">
                {isIndependent
                  ? 'どのベクトルも、他のベクトルの一次結合では表せません。'
                  : '少なくとも1本のベクトルが、他のベクトルの一次結合で表せます。'}
              </p>

              <dl className="metric-grid">
                <div>
                  <dt>ベクトル数</dt>
                  <dd>{analysis.vectorCount}</dd>
                </div>
                <div>
                  <dt>
                    <MathOperator name="rank" />
                    (<MathMatrixName />)
                  </dt>
                  <dd>{analysis.rank}</dd>
                </div>
                <div>
                  <dt>
                    生成する空間の次元
                    <small className="dimension-expression">
                      <MathOperator name="dim" />
                      (<MathOperator name="span" />(&#123;
                      {state.vectors.map((vector, index) => (
                        <span key={vector.id}>
                          {index > 0 ? ', ' : ''}
                          <MathVectorName name={vector.name} />
                        </span>
                      ))}
                      &#125;))
                    </small>
                  </dt>
                  <dd>{analysis.spanDimension}</dd>
                </div>
              </dl>
            </section>

            <p className="development-note">
              選択した集合が生成する空間と、表示中の全ベクトルの一次独立・一次従属を分けて表示しています。
            </p>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <p>{projectInfo.status} — 有効な成分は座標平面と判定へ即時反映されます。</p>
      </footer>
    </div>
  );
}

function MathVectorName({ name }: { readonly name: string }) {
  const { base, subscript } = splitVectorName(name);

  return (
    <span className="math-symbol math-vector" aria-label={name}>
      <span className="math-vector-base" aria-hidden="true">{base}</span>
      {subscript ? (
        <sub className="math-vector-subscript" aria-hidden="true">{subscript}</sub>
      ) : null}
    </span>
  );
}

function MathMatrixName({ name = 'A' }: { readonly name?: string }) {
  return <span className="math-symbol math-matrix">{name}</span>;
}

function MathOperator({ name }: { readonly name: string }) {
  return <span className="math-operator">{name}</span>;
}

function MatrixDefinition({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  const rowCount = vectors[0]?.coordinates.length ?? 0;
  const ariaDescription = vectors
    .map((vector) => `${vector.name} を第${vectors.indexOf(vector) + 1}列`)
    .join('、');

  return (
    <div
      className="matrix-definition"
      aria-label={`行列 A は、${ariaDescription}に並べた行列です。`}
    >
      <MathMatrixName />
      <span className="math-equals" aria-hidden="true">=</span>
      <span className="matrix-bracket" aria-hidden="true">
        <span
          className="matrix-values"
          style={{ '--matrix-columns': vectors.length } as CSSProperties}
        >
          {Array.from({ length: rowCount }, (_, rowIndex) =>
            vectors.map((vector) => (
              <span key={`${vector.id}-${rowIndex}`}>
                {vector.coordinates[rowIndex]}
              </span>
            )),
          )}
        </span>
      </span>
      <span className="matrix-columns-note" aria-hidden="true">
        = [
        {vectors.map((vector, index) => (
          <span key={vector.id}>
            {index > 0 ? ' ' : ''}
            <MathVectorName name={vector.name} />
          </span>
        ))}
        ]
      </span>
    </div>
  );
}

function VectorSetDefinition({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  const names = vectors.map((vector) => vector.name).join('、');

  return (
    <p
      className="span-set-definition"
      aria-label={vectors.length === 0 ? '集合 X は空集合です。' : `集合 X は ${names} からなる集合です。`}
    >
      <span className="math-set-name" aria-hidden="true">X</span>
      <span className="math-equals" aria-hidden="true">=</span>
      <span aria-hidden="true">{vectors.length === 0 ? '∅' : '{'}</span>
      {vectors.map((vector, index) => (
        <span key={vector.id} aria-hidden="true">
          {index > 0 ? ', ' : ''}
          <MathVectorName name={vector.name} />
        </span>
      ))}
      {vectors.length > 0 ? <span aria-hidden="true">&#125;</span> : null}
    </p>
  );
}

function SelectedMatrixDefinition({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  const names = vectors.map((vector) => vector.name).join('、');

  return (
    <p
      className="span-matrix-definition"
      aria-label={vectors.length === 0
        ? '行列 B は列を持たない空行列です。'
        : `行列 B は ${names} を列に並べた行列です。`}
    >
      <MathMatrixName name="B" />
      <span className="math-equals" aria-hidden="true">=</span>
      <span aria-hidden="true">[</span>
      {vectors.map((vector, index) => (
        <span key={vector.id} aria-hidden="true">
          {index > 0 ? ' ' : ''}
          <MathVectorName name={vector.name} />
        </span>
      ))}
      <span aria-hidden="true">]</span>
    </p>
  );
}

function describeSpanShape(rank: number): {
  readonly heading: string;
  readonly explanation: string;
} {
  if (rank === 0) {
    return {
      heading: '原点だけです',
      explanation: '生成する空間は、零ベクトルだけからなる零部分空間です。',
    };
  }

  if (rank === 1) {
    return {
      heading: '原点を通る直線です',
      explanation: '選択した非零ベクトルの実数倍が、この直線全体を作ります。',
    };
  }

  return {
    heading: '2次元座標平面全体です',
    explanation: '2本の一次独立な方向によって、平面上のすべてのベクトルを作れます。',
  };
}

function createCoordinateDrafts(vectors: readonly VectorValue[]): CoordinateDrafts {
  return Object.fromEntries(
    vectors.map((vector) => [vector.id, vector.coordinates.map(String)]),
  );
}

function formatViewportNumber(value: number): string {
  return new Intl.NumberFormat('ja-JP', { maximumSignificantDigits: 4 }).format(value);
}

function clampDraggedCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const clamped = Math.min(MAX_ABSOLUTE_COORDINATE, Math.max(-MAX_ABSOLUTE_COORDINATE, value));
  return Object.is(clamped, -0) ? 0 : clamped;
}

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { analyzeVectorSet, type VectorValue } from '../domain';
import {
  MAX_ABSOLUTE_COORDINATE,
  MAX_SHARE_VECTORS,
  buildShareUrl,
  createShareTextFileContents,
  createShareTextFileName,
  type ShareStateV1,
} from '../sharing';
import {
  addDefaultVector,
  createAppInitialization,
  parallelSnapDistanceForViewWidth,
  parseCoordinateInput,
  selectSpanVectors,
  snapDraggedVectorToParallel,
  updateSpanSelection,
  removeVector as removeVectorFromState,
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

const vectorColors = [
  '#c84c35',
  '#087f73',
  '#6456a8',
  '#a56a00',
  '#2f6690',
  '#9c3f72',
  '#4f772d',
  '#8a5a44',
];
const coordinateNames = ['第1成分', '第2成分'] as const;
const inspectorTabs = [
  { id: 'edit', label: 'ベクトル編集', shortLabel: '編集' },
  { id: 'span', label: '生成する空間', shortLabel: 'span' },
  { id: 'all', label: '全ベクトル', shortLabel: '全体' },
] as const;

type CoordinateDrafts = Readonly<Record<string, readonly string[]>>;
type ViewMode = 'auto' | 'manual';
type InspectorTabId = typeof inspectorTabs[number]['id'];
type ShareFeedback = {
  readonly kind: 'success' | 'error';
  readonly message: string;
} | null;

export function App() {
  const [initialization] = useState(() => createAppInitialization(window.location.href));
  const initialState = initialization.initialState;
  const [state, setState] = useState<ShareStateV1>(initialState);
  const [coordinateDrafts, setCoordinateDrafts] = useState<CoordinateDrafts>(() =>
    createCoordinateDrafts(initialState.vectors),
  );
  const [viewMode, setViewMode] = useState<ViewMode>('auto');
  const [manualViewport, setManualViewport] = useState<PlaneViewport | null>(null);
  const [dragViewport, setDragViewport] = useState<PlaneViewport | null>(null);
  const [parallelSnapTargetId, setParallelSnapTargetId] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTabId>('edit');
  const [loadErrorMessage, setLoadErrorMessage] = useState(initialization.errorMessage);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [shareFeedback, setShareFeedback] = useState<ShareFeedback>(null);
  const shareDialogRef = useRef<HTMLDialogElement>(null);
  const shareUrlFieldRef = useRef<HTMLTextAreaElement>(null);
  const addVectorButtonRef = useRef<HTMLButtonElement>(null);
  const hasInvalidCoordinateDraft = useMemo(
    () => Object.values(coordinateDrafts).some((drafts) =>
      drafts.some((draft) => !parseCoordinateInput(draft).ok),
    ),
    [coordinateDrafts],
  );
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
  const allVectorRelation = describeAllVectorRelation(
    analysis.vectorCount,
    analysis.isLinearlyIndependent,
  );
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

  function handleAddVector(): void {
    const result = addDefaultVector(state);
    if (!result.addedVector) {
      return;
    }
    const addedVector = result.addedVector;

    setState(result.state);
    setCoordinateDrafts((current) => ({
      ...current,
      [addedVector.id]: addedVector.coordinates.map(String),
    }));
    setParallelSnapTargetId(null);
    window.requestAnimationFrame(() => {
      document.getElementById(`${addedVector.id}-coordinate-0`)?.focus();
    });
  }

  function handleRemoveVector(vectorId: string): void {
    setState((current) => removeVectorFromState(current, vectorId));
    setCoordinateDrafts((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => id !== vectorId),
    ));
    setDragViewport(null);
    setParallelSnapTargetId(null);
    window.requestAnimationFrame(() => addVectorButtonRef.current?.focus());
  }

  function handleReset(): void {
    setState(initialState);
    setCoordinateDrafts(createCoordinateDrafts(initialState.vectors));
    setViewMode('auto');
    setManualViewport(null);
    setDragViewport(null);
    setParallelSnapTargetId(null);
    setActiveInspectorTab('edit');
    setExportErrorMessage(null);
    setShareUrl('');
    setShareFeedback(null);
    shareDialogRef.current?.close();
  }

  function handleOpenShareDialog(): void {
    if (hasInvalidCoordinateDraft) {
      return;
    }

    try {
      const nextShareUrl = buildShareUrl(window.location.href, state);
      setShareUrl(nextShareUrl);
      setShareFeedback(null);
      setExportErrorMessage(null);
      shareDialogRef.current?.showModal();
      window.requestAnimationFrame(() => {
        shareUrlFieldRef.current?.focus();
        shareUrlFieldRef.current?.select();
      });
    } catch {
      setExportErrorMessage('共有URLを生成できませんでした。入力内容を確認して、もう一度お試しください。');
    }
  }

  async function handleCopyShareUrl(): Promise<void> {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API is unavailable.');
      }
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback({ kind: 'success', message: 'クリップボードにコピーしました。' });
    } catch {
      shareUrlFieldRef.current?.focus();
      shareUrlFieldRef.current?.select();
      setShareFeedback({
        kind: 'error',
        message: '自動でコピーできませんでした。選択されたURLを手動でコピーしてください。',
      });
    }
  }

  function handleDownloadShareUrl(): void {
    const blob = new Blob([createShareTextFileContents(shareUrl)], {
      type: 'text/plain;charset=utf-8',
    });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = createShareTextFileName();
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    setShareFeedback({
      kind: 'success',
      message: 'URLを記載したテキストファイルのダウンロードを開始しました。',
    });
  }

  function handleCloseShareDialog(): void {
    shareDialogRef.current?.close();
  }

  function handleShareDialogClick(event: ReactMouseEvent<HTMLDialogElement>): void {
    if (event.target === event.currentTarget) {
      handleCloseShareDialog();
    }
  }

  function handleInspectorTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void {
    const currentIndex = inspectorTabs.findIndex((tab) => tab.id === activeInspectorTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % inspectorTabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + inspectorTabs.length) % inspectorTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = inspectorTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = inspectorTabs[nextIndex];
    setActiveInspectorTab(nextTab.id);
    document.getElementById(`inspector-tab-${nextTab.id}`)?.focus();
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
          <div className="lab-intro-side">
            <p className="lab-intro-copy">
              列ベクトルの成分を編集すると、座標平面と数学的な判定が連動します。
              ベクトルを選ぶと、その集合が生成する空間を原点、直線、座標平面として比較できます。
            </p>
            <div className="lab-actions" aria-label="教材状態の操作">
              <button
                className="share-export-button"
                type="button"
                disabled={hasInvalidCoordinateDraft}
                aria-describedby={hasInvalidCoordinateDraft ? 'share-export-disabled-help' : undefined}
                onClick={handleOpenShareDialog}
              >
                共有URLをエクスポート
              </button>
              <button className="reset-button" type="button" onClick={handleReset}>
                Reset
              </button>
            </div>
            {hasInvalidCoordinateDraft ? (
              <p className="lab-action-help" id="share-export-disabled-help">
                共有する前に、未確定の成分を訂正してください。
              </p>
            ) : null}
          </div>
        </section>

        {loadErrorMessage ? (
          <div className="page-alert" role="alert">
            <p>{loadErrorMessage}</p>
            <button type="button" onClick={() => setLoadErrorMessage(null)}>閉じる</button>
          </div>
        ) : null}

        {exportErrorMessage ? (
          <div className="page-alert" role="alert">
            <p>{exportErrorMessage}</p>
            <button type="button" onClick={() => setExportErrorMessage(null)}>閉じる</button>
          </div>
        ) : null}

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
            <section className="analysis-summary" aria-labelledby="analysis-summary-title">
              <h2 className="visually-hidden" id="analysis-summary-title">現在の解析要約</h2>
              <button
                className="summary-tile summary-span"
                type="button"
                onClick={() => setActiveInspectorTab('span')}
              >
                <span className="summary-label">選択集合 <span className="math-set-name">X</span></span>
                <strong>{spanShape.summary}</strong>
                <span className="summary-math">
                  <MathOperator name="dim" />(<MathOperator name="span" />(<span className="math-set-name">X</span>))
                  {' = '}{spanAnalysis.spanDimension}
                </span>
              </button>
              <button
                className="summary-tile summary-all"
                type="button"
                onClick={() => setActiveInspectorTab('all')}
              >
                <span className="summary-label">表示中の全ベクトル</span>
                <strong>{isIndependent ? '一次独立' : '一次従属'}</strong>
                <span className="summary-math">
                  <MathOperator name="rank" />(<MathMatrixName />)
                  {' = '}{analysis.rank}
                </span>
              </button>
            </section>

            <div className="inspector-tablist" role="tablist" aria-label="編集・解析の詳細">
              {inspectorTabs.map((tab) => (
                <button
                  key={tab.id}
                  id={`inspector-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeInspectorTab === tab.id}
                  aria-controls={`inspector-panel-${tab.id}`}
                  tabIndex={activeInspectorTab === tab.id ? 0 : -1}
                  onClick={() => setActiveInspectorTab(tab.id)}
                  onKeyDown={handleInspectorTabKeyDown}
                >
                  <span className="tab-label-wide">{tab.label}</span>
                  <span className="tab-label-short">{tab.shortLabel}</span>
                </button>
              ))}
            </div>

            <section
              className="vector-editor-card inspector-panel"
              id="inspector-panel-edit"
              role="tabpanel"
              aria-labelledby="inspector-tab-edit vector-editor-title"
              hidden={activeInspectorTab !== 'edit'}
            >
              <div className="vector-editor-heading">
                <div>
                  <p className="panel-kicker">Edit vectors</p>
                  <h2 id="vector-editor-title">列ベクトルの成分</h2>
                  <p className="editor-hint">
                    上段が第1成分、下段が第2成分です。追加したベクトルはspanの対象に含まれます。
                  </p>
                </div>
                <div className="vector-collection-controls">
                  <span aria-live="polite">{state.vectors.length} / {MAX_SHARE_VECTORS} 本</span>
                  <button
                    ref={addVectorButtonRef}
                    type="button"
                    disabled={state.vectors.length >= MAX_SHARE_VECTORS}
                    aria-describedby={state.vectors.length >= MAX_SHARE_VECTORS
                      ? 'vector-limit-help'
                      : undefined}
                    onClick={handleAddVector}
                  >
                    ＋ ベクトルを追加
                  </button>
                </div>
              </div>
              {state.vectors.length >= MAX_SHARE_VECTORS ? (
                <p className="vector-limit-help" id="vector-limit-help">
                  共有状態の上限である{MAX_SHARE_VECTORS}本に達しています。
                </p>
              ) : null}
              <div className="vector-editor-list">
                {state.vectors.length === 0 ? (
                  <p className="empty-vector-editor">
                    ベクトルはありません。「ベクトルを追加」から始められます。Resetで読込時の状態へ戻せます。
                  </p>
                ) : null}
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
                      <div className="vector-editor-actions">
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
                        <button
                          className="remove-vector-button"
                          type="button"
                          aria-label={`${vector.name} を削除`}
                          onClick={() => handleRemoveVector(vector.id)}
                        >
                          削除
                        </button>
                      </div>
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

            <section
              className={`span-card inspector-panel is-rank-${spanAnalysis.rank}`}
              id="inspector-panel-span"
              role="tabpanel"
              aria-labelledby="inspector-tab-span span-card-title"
              hidden={activeInspectorTab !== 'span'}
            >
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

            <section
              className={`result-card inspector-panel ${isIndependent ? 'is-independent' : 'is-dependent'}`}
              id="inspector-panel-all"
              role="tabpanel"
              aria-labelledby="inspector-tab-all"
              hidden={activeInspectorTab !== 'all'}
            >
              <p className="panel-kicker">All vectors</p>
              <MatrixDefinition vectors={state.vectors} />
              <p className="result-symbol" aria-hidden="true">{isIndependent ? '∥' : '≈'}</p>
              <h2>{allVectorRelation.heading}</h2>
              <p className="result-explanation">{allVectorRelation.explanation}</p>

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

      <dialog
        className="share-dialog"
        ref={shareDialogRef}
        aria-labelledby="share-dialog-title"
        onClick={handleShareDialogClick}
        onClose={() => setShareFeedback(null)}
      >
        <div className="share-dialog-content">
          <p className="panel-kicker">Export current state</p>
          <h2 id="share-dialog-title">共有URLをエクスポート</h2>
          <p className="share-dialog-description">
            このURLを開くと、ベクトル、spanの選択、幾何表示が復元されます。
            表示範囲はベクトル全体が見えるように自動調整されます。
          </p>
          <label className="share-url-field">
            <span>共有URL</span>
            <textarea
              ref={shareUrlFieldRef}
              rows={5}
              readOnly
              value={shareUrl}
              spellCheck={false}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <p
            className={`share-feedback ${shareFeedback?.kind === 'error' ? 'has-error' : ''}`}
            role={shareFeedback?.kind === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {shareFeedback?.message ?? 'URLはドラッグして選択し、手動でもコピーできます。'}
          </p>
          <div className="share-dialog-actions">
            <button className="copy-share-button" type="button" onClick={handleCopyShareUrl}>
              クリップボードにコピー
            </button>
            <button type="button" onClick={handleDownloadShareUrl}>
              テキストで保存
            </button>
            <button type="button" onClick={handleCloseShareDialog}>
              閉じる
            </button>
          </div>
        </div>
      </dialog>
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
  const ariaLabel = vectors.length === 0
    ? '行列 A は列を持たない空行列です。'
    : `行列 A は、${ariaDescription}に並べた行列です。`;

  return (
    <div
      className="matrix-definition"
      aria-label={ariaLabel}
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
  readonly summary: string;
} {
  if (rank === 0) {
    return {
      heading: '原点だけです',
      explanation: '生成する空間は、零ベクトルだけからなる零部分空間です。',
      summary: '原点',
    };
  }

  if (rank === 1) {
    return {
      heading: '原点を通る直線です',
      explanation: '選択した非零ベクトルの実数倍が、この直線全体を作ります。',
      summary: '原点を通る直線',
    };
  }

  return {
    heading: '2次元座標平面全体です',
    explanation: '2本の一次独立な方向によって、平面上のすべてのベクトルを作れます。',
    summary: '2次元座標平面全体',
  };
}

function describeAllVectorRelation(
  vectorCount: number,
  isIndependent: boolean,
): { readonly heading: string; readonly explanation: string } {
  if (vectorCount === 0) {
    return {
      heading: '空集合は一次独立です',
      explanation: 'ベクトルを含まないため、一次関係は自明なものだけです。',
    };
  }

  return isIndependent
    ? {
        heading: '全ベクトルは一次独立です',
        explanation: 'どのベクトルも、他のベクトルの一次結合では表せません。',
      }
    : {
        heading: '全ベクトルは一次従属です',
        explanation: '少なくとも1本のベクトルが、他のベクトルの一次結合で表せます。',
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

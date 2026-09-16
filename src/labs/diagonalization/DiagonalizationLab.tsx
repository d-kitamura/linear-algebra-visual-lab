import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { LabActionControls } from '../../app/LabActionControls';
import { analyzeDiagonalization, analyzeDiagonalizationInput, reorderDiagonalization, type VectorValue } from '../../domain';
import { createAutoFitViewport, createAutoFitLineViewport, DEFAULT_PLANE_VIEWPORT, DEFAULT_LINE_VIEWPORT, VectorPlane2D, VectorLine1D, ZeroSpace0D, type PlaneViewport, type LineViewport } from '../../visualization';
import { inputImagePresentation } from '../../visualization/inputImagePresentation';
import { createEigenSpaceGeometries, parseEigenNumber, snapEigenInput } from '../eigenspace/eigenScene';
import { Vector } from '../representation-matrix/representationMath';
import { EigenCoordinateName, EigenPolynomialRule } from '../eigenspace/eigenPolynomialMath';
import { EIGEN_POLYNOMIAL_EXAMPLES, eigenPolynomialRule, type EigenPolynomialExample } from '../eigenspace/eigenPolynomial';
import { DIAGONALIZATION_TABS, DiagonalizationPanel, type DiagonalizationTab } from './DiagonalizationPanels';
import { applyDiagonalizationPolynomialExample, canPlotDiagonalization, createDiagonalizationScene, diagonalizationExplanation, diagonalizationPlotVectors,
  editDiagonalizationMatrix, resolvedDiagonalizationOrder, setDiagonalizationInput, swapDiagonalizationColumns, type DiagonalizationScene } from './diagonalizationScene';
import { createDiagonalizationWorkspace, diagonalizationCurrentSlot, selectDiagonalizationKind, selectDiagonalizationDimension, resetDiagonalizationWorkspace, updateDiagonalizationSlot, type DiagonalizationSlot, type DiagonalizationView } from './diagonalizationWorkspace';
import './diagonalization.css';

const INPUT_COLOR = '#245b8d', IMAGE_COLOR = '#ce5135';
const EDITABLE = ['diagonal-input'], READ_ONLY: string[] = [];
const OPAQUE = ['diagonal-input', 'diagonal-image', 'diagonal-c', 'diagonal-dc'];
const COORDINATE_AXES: readonly [string, string] = ['c₁', 'c₂'];
const POLYNOMIAL_AXES: readonly [string, string] = ['b₀', 'b₁'];
type DragViews = { reference: PlaneViewport; eigenbasis: PlaneViewport; referenceLine: LineViewport; eigenbasisLine: LineViewport };
const Space = lazy(() => import('./DiagonalizationSpace').then((m) => ({ default: m.DiagonalizationSpace })));

export function DiagonalizationLab({ active = true, initialScene }: { readonly active?: boolean; readonly initialScene?: DiagonalizationScene }) {
  const [initial] = useState(() => createDiagonalizationWorkspace(initialScene ?? createDiagonalizationScene()));
  const [workspace, setWorkspace] = useState(initial);
  const [revision, setRevision] = useState(0);
  const { dimension, kind } = workspace;
  const onSlot = useCallback((change: (slot: DiagonalizationSlot) => DiagonalizationSlot) =>
    setWorkspace((w) => updateDiagonalizationSlot(w, dimension, change, kind)), [dimension, kind]);
  const selectionControls = <div className="dimension-switcher diagonalization-dimensions">
    <div className="dimension-tablist" role="group" aria-label="対角化Labの種類">
      {([['coordinate', '数ベクトル'], ['polynomial', '多項式']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={kind === id}
        onClick={() => setWorkspace((w) => selectDiagonalizationKind(w, id))}>{label}</button>)}
    </div><div className="dimension-tablist" role="group" aria-label="対角化Labの次元">
    {(kind === 'polynomial' ? [1, 2, 3] as const : [0, 1, 2, 3] as const).map((n) => <button key={n} type="button" aria-pressed={dimension === n}
      onClick={() => setWorkspace((w) => selectDiagonalizationDimension(w, n))}>{n}D</button>)}
  </div></div>;
  return <DiagonalizationSceneView key={`${kind}-${dimension}-${revision}`} active={active} slot={diagonalizationCurrentSlot(workspace)} onSlot={onSlot}
    selectionControls={selectionControls} onReset={() => { setWorkspace((w) => resetDiagonalizationWorkspace(w, initial)); setRevision((r) => r + 1); }} />;
}

function DiagonalizationSceneView({ active, slot, onSlot, onReset, selectionControls }: { readonly active: boolean;
  readonly slot: DiagonalizationSlot; readonly onSlot: (change: (slot: DiagonalizationSlot) => DiagonalizationSlot) => void;
  readonly onReset: () => void; readonly selectionControls: ReactNode }) {
  const { scene, views } = slot;
  const dimension = scene.definition.dimension;
  const polynomial = scene.kind === 'polynomial';
  const [editorRevision, setEditorRevision] = useState(0);
  const setScene = useCallback((change: (scene: DiagonalizationScene) => DiagonalizationScene) => onSlot((s) => ({ ...s, scene: change(s.scene) })), [onSlot]);
  const setView = (side: keyof DiagonalizationSlot['views'], change: Partial<DiagonalizationView>) =>
    onSlot((s) => ({ ...s, views: { ...s.views, [side]: { ...s.views[side], ...change } } }));
  const [tab, setTab] = useState<DiagonalizationTab>('condition');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const [preview, setPreview] = useState<readonly number[] | null>(null);
  const previewRef = useRef<readonly number[] | null>(null);
  const [dragViews, setDragViews] = useState<DragViews | null>(null);
  const dragging = dragViews !== null || preview !== null;

  // 行列の解析・基底の並替え・入力解析を分離。ドラッグで根探索やPの分解を再実行しない。
  // 数学APIの結果はWeakMapで検算情報を保持するため、spreadやJSONで複製しない。
  const canonical = useMemo(() => analyzeDiagonalization(scene.definition), [scene.definition]);
  const order = resolvedDiagonalizationOrder(scene, canonical);
  const analysis = useMemo(() => canonical.status === 'ready' && order && order.some((v, i) => v !== i)
    ? reorderDiagonalization(canonical, order) : canonical, [canonical, order]);
  const committed = useMemo(() => analyzeDiagonalizationInput(analysis, scene.input), [analysis, scene.input]);
  const result = useMemo(() => preview === null ? committed : analyzeDiagonalizationInput(analysis, preview), [analysis, preview, committed]);
  const plots = useMemo(() => diagonalizationPlotVectors(result), [result]);
  const geometries = useMemo(() => createEigenSpaceGeometries(canonical.eigenAnalysis), [canonical]);
  const referenceSafe = canPlotDiagonalization(plots.reference, dimension), eigenbasisSafe = canPlotDiagonalization(plots.eigenbasis, dimension);
  const referenceView = dragViews?.reference ?? views.reference.plane ?? (dimension === 2 && referenceSafe ? createAutoFitViewport(plots.reference) : DEFAULT_PLANE_VIEWPORT);
  const eigenbasisView = dragViews?.eigenbasis ?? views.eigenbasis.plane ?? (dimension === 2 && eigenbasisSafe ? createAutoFitViewport(plots.eigenbasis) : DEFAULT_PLANE_VIEWPORT);
  const referenceLine = dragViews?.referenceLine ?? views.reference.line ?? (dimension === 1 && referenceSafe ? createAutoFitLineViewport(plots.reference.map((v) => v.coordinates[0])) : DEFAULT_LINE_VIEWPORT);
  const eigenbasisLine = dragViews?.eigenbasisLine ?? views.eigenbasis.line ?? (dimension === 1 && eigenbasisSafe ? createAutoFitLineViewport(plots.eigenbasis.map((v) => v.coordinates[0])) : DEFAULT_LINE_VIEWPORT);

  // A編集後のnullは、新しい解析が決めた自動順で確定する。不可・保留ならnullを維持。
  useEffect(() => {
    if (scene.order === null && canonical.basis) setScene((s) => s.definition === scene.definition ? { ...s, order: canonical.basis!.order } : s);
  }, [canonical, scene.definition, scene.order, setScene]);
  const cancelDrag = useCallback(() => { previewRef.current = null; setPreview(null); setDragViews(null); }, []);
  useEffect(() => { if (!active) cancelDrag(); }, [active, cancelDrag]);
  useEffect(() => {
    // 像が描画境界を越えるとSVG自体が外れる。pointerupを待たず有効な入力を確定し、
    // dragロックを解除する。値は切り捨てず、数値編集から復帰できるようにする。
    if (active && dragging && !referenceSafe && previewRef.current) {
      const input = previewRef.current; setScene((s) => setDiagonalizationInput(s, input)); cancelDrag();
    }
  }, [active, dragging, referenceSafe, cancelDrag, setScene]);
  const reportInvalid = useCallback((id: string, value: boolean) => setInvalid((previous) => {
    if (previous.has(id) === value) return previous;
    const next = new Set(previous); if (value) next.add(id); else next.delete(id); return next;
  }), []);
  function reset() {
    cancelDrag(); onReset(); // SceneViewのkeyを変更し、下書き・タブ・操作途中も初期化。
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, i: number) {
    const next = event.key === 'ArrowRight' ? (i + 1) % 3 : event.key === 'ArrowLeft' ? (i + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null;
    if (next === null) return;
    event.preventDefault(); setTab(DIAGONALIZATION_TABS[next][0]); tabRefs.current[next]?.focus();
  }
  function swap(first: number, second: number) { if (analysis.basis) setScene((s) => ({ ...s, order: swapDiagonalizationColumns(analysis.basis!.order, first, second) })); }
  function startDrag() { setDragViews({ reference: referenceView, eigenbasis: eigenbasisView, referenceLine, eigenbasisLine }); previewRef.current = scene.input; }
  function updatePreview(coordinates: readonly number[] | null) { previewRef.current = coordinates; setPreview(coordinates); }
  function commitDrag(coordinates: readonly number[] | null = previewRef.current) {
    if (coordinates) setScene((s) => setDiagonalizationInput(s, coordinates)); cancelDrag();
  }
  const unavailable = diagonalizationExplanation(analysis);

  return <main className="lab-page diagonalization-lab" data-lab-id="diagonalization" aria-hidden={!active}>
    <section className="lab-intro" aria-labelledby="diagonalization-title">
      <div><p className="panel-kicker">Diagonalization / {dimension}D</p><h1 id="diagonalization-title">行列の対角化</h1>
        <p>同じ線形変換を、基準基底と固有ベクトルの基底で見比べます。</p></div>
      <div><LabActionControls exportDisabled exportDescriptionId="diagonalization-share-help" onExport={() => {}} onReset={reset} />
        <small id="diagonalization-share-help" className="diagonalization-note">このLabの共有機能は13.6で対応予定です。</small></div>
    </section>
    {selectionControls}
    {invalid.size > 0 && <p role={active ? 'status' : undefined} className="representation-warning">入力エラーを修正してください。図と解析は直前の有効値を表示しています。</p>}
    <div className="diagonalization-workspace">
      <section className="plot-card diagonalization-plot" aria-labelledby="diagonalization-reference-title">
        <div className="card-heading"><h2 id="diagonalization-reference-title">{polynomial ? '標準単項式基底での係数' : '基準基底での表示'}</h2>
          {(dimension === 1 || dimension === 2) && <button className="basis-fit-button" type="button" disabled={dragging} onClick={() => setView('reference', { plane: null, line: null })}>全体を表示</button>}</div>
        {dimension > 0 && <label className="diagonalization-show"><input type="checkbox" checked={scene.showEigenspace} disabled={!geometries.length || dragging}
          onChange={(e) => setScene((s) => ({ ...s, showEigenspace: e.target.checked }))} />固有空間を表示</label>}
        {dimension === 0 && <ZeroSpace0D idPrefix="diagonalization-reference-zero" spaceName="U" description="零ベクトルだけの空間です。空の組が基底となり、成分や編集する矢先はありません。" />}
        {dimension === 1 && active && referenceSafe && <VectorLine1D idPrefix="diagonalization-reference-line" vectors={plots.reference}
          axisLabel={polynomial ? 'b₀' : undefined}
          colors={plots.reference.length === 2 ? [IMAGE_COLOR, INPUT_COLOR] : [INPUT_COLOR]} viewport={referenceLine}
          editableVectorIds={invalid.size ? READ_ONLY : EDITABLE} alwaysOpaqueVectorIds={OPAQUE} outlinedVectorIds={['diagonal-image']} showHelpText={false}
          onViewportChange={(line) => setView('reference', { line })} showSpan={scene.showEigenspace && geometries.length > 0} spanDimension={1} spanLabel="固有空間"
          onVectorDragStart={startDrag} onVectorChange={(_, coordinates) => updatePreview(coordinates)} onVectorDragEnd={() => commitDrag()} onVectorDragCancel={cancelDrag} />}
        {dimension === 2 && active && referenceSafe && <VectorPlane2D idPrefix="diagonalization-reference" vectors={plots.reference}
          axisLabels={polynomial ? POLYNOMIAL_AXES : undefined}
          colors={plots.reference.length === 2 ? [IMAGE_COLOR, INPUT_COLOR] : [INPUT_COLOR]} viewport={referenceView}
          vectorPresentation={presentation(plots.reference, referenceView)} editableVectorIds={invalid.size ? READ_ONLY : EDITABLE} alwaysOpaqueVectorIds={OPAQUE}
          onViewportChange={(plane) => setView('reference', { plane })}
          showSpan={scene.showEigenspace && geometries.length > 0} spanDimension={geometries[0]?.dimension ?? 0}
          spanVectors={geometries[0]?.vectors ?? []} spanLabel="固有空間"
          spanLineDirections={geometries.filter((g) => g.dimension === 1).map((g) => ({ direction: g.vectors[0].coordinates as readonly [number, number], label: `固有空間${g.index + 1}` }))}
          onVectorDragStart={startDrag}
          onVectorChange={(_, coordinates) => {
            const snapped = snapEigenInput(scene, canonical.eigenAnalysis, coordinates, referenceView.maxX - referenceView.minX);
            previewRef.current = snapped.coordinates; setPreview(snapped.coordinates);
          }}
          onVectorDragEnd={() => commitDrag()}
          onVectorDragCancel={cancelDrag} />}
        {dimension === 3 && active && referenceSafe && <Suspense fallback={<SpaceLoading />}><Space side="reference"
          scene={scene} analysis={analysis} committed={committed} current={result} hasPreview={preview !== null} camera={views.reference.camera} invalid={invalid.size > 0}
          onCamera={(camera) => setView('reference', { camera })} onPreview={updatePreview} onCommit={commitDrag} /></Suspense>}
        {!referenceSafe && <PlotLimit />}
        {!result.imageVector && <p className="representation-warning">像の数値計算を保留しています。入力のみ表示します。</p>}
        {dimension > 0 && <p className="diagonalization-legend"><span style={{ color: INPUT_COLOR }}>● <EigenCoordinateName kind={scene.kind} /></span><span style={{ color: IMAGE_COLOR }}>◇ <EigenCoordinateName kind={scene.kind} mapped /></span></p>}
      </section>
      <section className="plot-card diagonalization-plot" aria-labelledby="diagonalization-eigenbasis-title">
        <div className="card-heading"><h2 id="diagonalization-eigenbasis-title">固有ベクトル基底での座標</h2>
          {(dimension === 1 || dimension === 2) && <button className="basis-fit-button" type="button" disabled={dragging || !eigenbasisSafe} onClick={() => setView('eigenbasis', { plane: null, line: null })}>全体を表示</button>}</div>
        <p className="diagonalization-show diagonalization-note">同じ入力と像の別座標表示</p>
        {result.status === 'ready' ? <>
          {dimension === 0 && <ZeroSpace0D idPrefix="diagonalization-eigenbasis-zero" spaceName="U" spaceLabel="空の基底に関する座標" description="座標の成分は空であり、同じ零ベクトルだけを表します。" />}
          {dimension === 1 && active && eigenbasisSafe && <VectorLine1D idPrefix="diagonalization-eigenbasis-line" vectors={plots.eigenbasis}
            colors={[IMAGE_COLOR, INPUT_COLOR]} axisLabel="c₁" viewport={eigenbasisLine} editableVectorIds={READ_ONLY} alwaysOpaqueVectorIds={OPAQUE}
            outlinedVectorIds={['diagonal-dc']} showHelpText={false} onViewportChange={(line) => setView('eigenbasis', { line })} />}
          {dimension === 2 && active && eigenbasisSafe && <VectorPlane2D idPrefix="diagonalization-eigenbasis" vectors={plots.eigenbasis} colors={[IMAGE_COLOR, INPUT_COLOR]}
            axisLabels={COORDINATE_AXES} viewport={eigenbasisView} vectorPresentation={presentation(plots.eigenbasis, eigenbasisView)}
            editableVectorIds={READ_ONLY} alwaysOpaqueVectorIds={OPAQUE} onViewportChange={(plane) => setView('eigenbasis', { plane })} />}
          {dimension === 3 && active && eigenbasisSafe && <Suspense fallback={<SpaceLoading />}><Space side="eigenbasis"
            scene={scene} analysis={analysis} committed={committed} current={result} hasPreview={preview !== null} camera={views.eigenbasis.camera} invalid={false}
            onCamera={(camera) => setView('eigenbasis', { camera })} onPreview={updatePreview} onCommit={commitDrag} /></Suspense>}
          {!eigenbasisSafe && <PlotLimit />}
        </> : <p className="representation-warning">{analysis.status === 'ready' ? '入力座標の計算・検算を数値的に確かめられないため、座標の図を保留しています。' : unavailable}</p>}
        {dimension > 0 && <p className="diagonalization-legend"><span style={{ color: INPUT_COLOR }}>● <Vector name="c" /></span><span style={{ color: IMAGE_COLOR }}>◇ <Vector name="D" /><Vector name="c" /></span></p>}
      </section>
      <section className="basis-candidate-card diagonalization-editor" aria-labelledby="diagonalization-edit-title">
        <h2 id="diagonalization-edit-title">行列と入力</h2>
        {polynomial && <><label>多項式の変換例 <select aria-label="多項式の変換例" value="" disabled={dragging} onChange={(e) => {
          setScene((s) => applyDiagonalizationPolynomialExample(s, e.target.value as EigenPolynomialExample));
          // 例の適用は不正な下書きも置き換える。入力値・視点・Reset基準は維持する。
          setInvalid(new Set()); setEditorRevision((r) => r + 1);
        }}><option value="" disabled>例を選択</option>{EIGEN_POLYNOMIAL_EXAMPLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <EigenPolynomialRule rule={eigenPolynomialRule(scene)} /></>}
        {dimension === 0 ? <p>行列は0×0の空行列、入力は零ベクトルです。成分の入力欄はありません。</p> : <fieldset key={editorRevision} disabled={dragging}><legend className="visually-hidden">行列と入力の成分</legend>
          <div className="diagonalization-editor-row"><Vector name="A" /><span>=</span><span className="linear-map-matrix-input" style={{ gridTemplateColumns: `repeat(${dimension}, minmax(0, 1fr))` }}>
            {scene.definition.matrix.flatMap((row, r) => row.map((value, c) => <NumberInput key={`${r}-${c}`} value={value} label={`行列Aの第${r + 1}行第${c + 1}列`}
              reportInvalid={reportInvalid} onValue={(v) => setScene((s) => editDiagonalizationMatrix(s, r, c, v))} />))}</span></div>
          <div className="diagonalization-editor-row"><EigenCoordinateName kind={scene.kind} /><span>=</span><span className="linear-map-vector-input">
            {scene.input.map((value, i) => <NumberInput key={i} value={value} label={polynomial ? `入力多項式の係数b${i}` : `入力uの第${i + 1}成分`} reportInvalid={reportInvalid}
              onValue={(v) => setScene((s) => setDiagonalizationInput(s, s.input.map((n, j) => i === j ? v : n)))} />)}</span></div>
        </fieldset>}
      </section>
      <div className="diagonalization-inspector">
        <div className="inspector-tablist" role="tablist" aria-label="対角化Labの解析">{DIAGONALIZATION_TABS.map(([id, label], i) =>
          <button key={id} type="button" role="tab" id={`diagonalization-tab-${id}`} aria-selected={tab === id} aria-controls={`diagonalization-panel-${id}`}
            tabIndex={tab === id ? 0 : -1} ref={(node) => { tabRefs.current[i] = node; }} onKeyDown={(event) => tabKey(event, i)} onClick={() => setTab(id)}>{label}</button>)}</div>
        {DIAGONALIZATION_TABS.map(([id, label]) => <section key={id} role="tabpanel" id={`diagonalization-panel-${id}`} aria-labelledby={`diagonalization-tab-${id}`}
          className="basis-result-card inspector-panel" hidden={tab !== id} tabIndex={0}><h2>{label}</h2>
          <DiagonalizationPanel tab={id} kind={scene.kind} analysis={analysis} input={result} onSwap={swap} disabled={dragging || invalid.size > 0} />
        </section>)}
      </div>
    </div>
  </main>;
}

function presentation(vectors: readonly VectorValue[], viewport: PlaneViewport) {
  return inputImagePresentation(vectors[vectors.length - 1], vectors.length === 2 ? vectors[0] : null, viewport);
}
function PlotLimit() { return <p className="representation-warning">導出した座標が描画上限（各成分の絶対値100万）を超えるため、この図を保留しています。数値と式は「座標と作用」で確認できます。</p>; }
function SpaceLoading() { return <p role="status">3D表示を準備しています。成分と解析は下のカードで確認できます。</p>; }

function NumberInput({ value, label, onValue, reportInvalid }: { readonly value: number; readonly label: string;
  readonly onValue: (value: number) => void; readonly reportInvalid: (id: string, invalid: boolean) => void }) {
  const [draft, setDraft] = useState(String(value));
  const id = useId();
  const invalid = parseEigenNumber(draft) === null;
  useEffect(() => setDraft(String(value)), [value]);
  useEffect(() => { reportInvalid(id, invalid); return () => reportInvalid(id, false); }, [id, invalid, reportInvalid]);
  return <label className="representation-number"><input type="text" inputMode="decimal" aria-label={label} value={draft}
    aria-invalid={invalid} aria-describedby={invalid ? id : undefined} onChange={(e) => {
      setDraft(e.target.value); const next = parseEigenNumber(e.target.value); if (next !== null) onValue(next);
    }} onKeyDown={(e) => { if (e.key === 'Escape') setDraft(String(value)); }} />
    {invalid && <small id={id}>有限数（絶対値100万以下）を入力してください。</small>}</label>;
}

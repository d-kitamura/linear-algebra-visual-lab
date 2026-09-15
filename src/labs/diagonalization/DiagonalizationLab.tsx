import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { LabActionControls } from '../../app/LabActionControls';
import { analyzeDiagonalization, analyzeDiagonalizationInput, reorderDiagonalization, type VectorValue } from '../../domain';
import { createAutoFitViewport, DEFAULT_PLANE_VIEWPORT, VectorPlane2D, type PlaneViewport } from '../../visualization';
import { inputImagePresentation } from '../../visualization/inputImagePresentation';
import { createEigenSpaceGeometries, parseEigenNumber, snapEigenInput } from '../eigenspace/eigenScene';
import { MapValue, Vector } from '../representation-matrix/representationMath';
import { DIAGONALIZATION_TABS, DiagonalizationPanel, type DiagonalizationTab } from './DiagonalizationPanels';
import { canPlotDiagonalization, createDiagonalizationScene, diagonalizationExplanation, diagonalizationPlotVectors,
  editDiagonalizationMatrix, resolvedDiagonalizationOrder, setDiagonalizationInput, type DiagonalizationScene } from './diagonalizationScene';
import './diagonalization.css';

const INPUT_COLOR = '#245b8d', IMAGE_COLOR = '#ce5135';
const EDITABLE = ['diagonal-input'], READ_ONLY: string[] = [];
const OPAQUE = ['diagonal-input', 'diagonal-image', 'diagonal-c', 'diagonal-dc'];
const COORDINATE_AXES: readonly [string, string] = ['c₁', 'c₂'];
type Views = { reference: PlaneViewport | null; eigenbasis: PlaneViewport | null };
const AUTO_VIEWS: Views = { reference: null, eigenbasis: null };

export function DiagonalizationLab({ active = true, initialScene }: { readonly active?: boolean; readonly initialScene?: DiagonalizationScene }) {
  const [initial] = useState(() => initialScene ?? createDiagonalizationScene());
  const [scene, setScene] = useState(initial);
  const [views, setViews] = useState<Views>(AUTO_VIEWS);
  const [tab, setTab] = useState<DiagonalizationTab>('condition');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [editorRevision, setEditorRevision] = useState(0);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const [preview, setPreview] = useState<readonly number[] | null>(null);
  const previewRef = useRef<readonly number[] | null>(null);
  const [dragViews, setDragViews] = useState<Views | null>(null);
  const dragging = dragViews !== null;

  // 行列の解析・基底の並替え・入力解析を分離。ドラッグで根探索やPの分解を再実行しない。
  // 数学APIの結果はWeakMapで検算情報を保持するため、spreadやJSONで複製しない。
  const canonical = useMemo(() => analyzeDiagonalization(scene.definition), [scene.definition]);
  const order = resolvedDiagonalizationOrder(scene, canonical);
  const analysis = useMemo(() => canonical.status === 'ready' && order && order.some((v, i) => v !== i)
    ? reorderDiagonalization(canonical, order) : canonical, [canonical, order]);
  const result = useMemo(() => analyzeDiagonalizationInput(analysis, preview ?? scene.input), [analysis, preview, scene.input]);
  const plots = useMemo(() => diagonalizationPlotVectors(result), [result]);
  const geometries = useMemo(() => createEigenSpaceGeometries(canonical.eigenAnalysis), [canonical]);
  const referenceSafe = canPlotDiagonalization(plots.reference), eigenbasisSafe = canPlotDiagonalization(plots.eigenbasis);
  const referenceView = dragViews?.reference ?? views.reference ?? (referenceSafe ? createAutoFitViewport(plots.reference) : DEFAULT_PLANE_VIEWPORT);
  const eigenbasisView = dragViews?.eigenbasis ?? views.eigenbasis ?? (eigenbasisSafe ? createAutoFitViewport(plots.eigenbasis) : DEFAULT_PLANE_VIEWPORT);

  // A編集後のnullは、新しい解析が決めた自動順で確定する。不可・保留ならnullを維持。
  useEffect(() => {
    if (scene.order === null && canonical.basis) setScene((s) => s.definition === scene.definition ? { ...s, order: canonical.basis!.order } : s);
  }, [canonical, scene.definition, scene.order]);
  const cancelDrag = useCallback(() => { previewRef.current = null; setPreview(null); setDragViews(null); }, []);
  useEffect(() => { if (!active) cancelDrag(); }, [active, cancelDrag]);
  useEffect(() => {
    // 像が描画境界を越えるとSVG自体が外れる。pointerupを待たず有効な入力を確定し、
    // dragロックを解除する。値は切り捨てず、数値編集から復帰できるようにする。
    if (active && dragging && !referenceSafe && previewRef.current) {
      const input = previewRef.current; setScene((s) => setDiagonalizationInput(s, input)); cancelDrag();
    }
  }, [active, dragging, referenceSafe, cancelDrag]);
  const reportInvalid = useCallback((id: string, value: boolean) => setInvalid((previous) => {
    if (previous.has(id) === value) return previous;
    const next = new Set(previous); if (value) next.add(id); else next.delete(id); return next;
  }), []);
  function reset() {
    cancelDrag(); setScene(initial); setViews(AUTO_VIEWS); setTab('condition');
    setInvalid(new Set()); setEditorRevision((v) => v + 1);
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, i: number) {
    const next = event.key === 'ArrowRight' ? (i + 1) % 3 : event.key === 'ArrowLeft' ? (i + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null;
    if (next === null) return;
    event.preventDefault(); setTab(DIAGONALIZATION_TABS[next][0]); tabRefs.current[next]?.focus();
  }
  function swap() { if (analysis.basis) setScene((s) => ({ ...s, order: [...analysis.basis!.order].reverse() })); }
  const unavailable = diagonalizationExplanation(analysis);

  return <main className="lab-page diagonalization-lab" data-lab-id="diagonalization" aria-hidden={!active}>
    <section className="lab-intro" aria-labelledby="diagonalization-title">
      <div><p className="panel-kicker">Diagonalization / 2D</p><h1 id="diagonalization-title">行列の対角化</h1>
        <p>同じ線形変換を、基準基底と固有ベクトルの基底で見比べます。</p></div>
      <div><LabActionControls exportDisabled exportDescriptionId="diagonalization-share-help" onExport={() => {}} onReset={reset} />
        <small id="diagonalization-share-help" className="diagonalization-note">このLabの共有機能は13.6で対応予定です。</small></div>
    </section>
    {invalid.size > 0 && <p role={active ? 'status' : undefined} className="representation-warning">入力エラーを修正してください。図と解析は直前の有効値を表示しています。</p>}
    <div className="diagonalization-workspace">
      <section className="plot-card diagonalization-plot" aria-labelledby="diagonalization-reference-title">
        <div className="card-heading"><h2 id="diagonalization-reference-title">基準基底での表示</h2>
          <button className="basis-fit-button" type="button" disabled={dragging} onClick={() => setViews((v) => ({ ...v, reference: null }))}>全体を表示</button></div>
        <label className="diagonalization-show"><input type="checkbox" checked={scene.showEigenspace} disabled={!geometries.length || dragging}
          onChange={(e) => setScene((s) => ({ ...s, showEigenspace: e.target.checked }))} />固有空間を表示</label>
        {active && referenceSafe && <VectorPlane2D key={editorRevision} idPrefix="diagonalization-reference" vectors={plots.reference}
          colors={plots.reference.length === 2 ? [IMAGE_COLOR, INPUT_COLOR] : [INPUT_COLOR]} viewport={referenceView}
          vectorPresentation={presentation(plots.reference, referenceView)} editableVectorIds={invalid.size ? READ_ONLY : EDITABLE} alwaysOpaqueVectorIds={OPAQUE}
          onViewportChange={(reference) => setViews((v) => ({ ...v, reference }))}
          showSpan={scene.showEigenspace && geometries.length > 0} spanDimension={geometries[0]?.dimension ?? 0}
          spanVectors={geometries[0]?.vectors ?? []} spanLabel="固有空間"
          spanLineDirections={geometries.filter((g) => g.dimension === 1).map((g) => ({ direction: g.vectors[0].coordinates as readonly [number, number], label: `固有空間${g.index + 1}` }))}
          onVectorDragStart={() => { setDragViews({ reference: referenceView, eigenbasis: eigenbasisView }); previewRef.current = scene.input; }}
          onVectorChange={(_, coordinates) => {
            const snapped = snapEigenInput(scene, canonical.eigenAnalysis, coordinates, referenceView.maxX - referenceView.minX);
            previewRef.current = snapped.coordinates; setPreview(snapped.coordinates);
          }}
          onVectorDragEnd={() => { const input = previewRef.current; if (input) setScene((s) => setDiagonalizationInput(s, input)); cancelDrag(); }}
          onVectorDragCancel={cancelDrag} />}
        {!referenceSafe && <PlotLimit />}
        {!result.imageVector && <p className="representation-warning">像の数値計算を保留しています。入力のみ表示します。</p>}
        <p className="diagonalization-legend"><span style={{ color: INPUT_COLOR }}>● <Vector name="u" /></span><span style={{ color: IMAGE_COLOR }}>◇ <MapValue name="u" /></span></p>
      </section>
      <section className="plot-card diagonalization-plot" aria-labelledby="diagonalization-eigenbasis-title">
        <div className="card-heading"><h2 id="diagonalization-eigenbasis-title">固有ベクトル基底での座標</h2>
          <button className="basis-fit-button" type="button" disabled={dragging || !eigenbasisSafe} onClick={() => setViews((v) => ({ ...v, eigenbasis: null }))}>全体を表示</button></div>
        <p className="diagonalization-show diagonalization-note">同じ入力と像の別座標表示</p>
        {result.status === 'ready' ? <>
          {active && eigenbasisSafe && <VectorPlane2D idPrefix="diagonalization-eigenbasis" vectors={plots.eigenbasis} colors={[IMAGE_COLOR, INPUT_COLOR]}
            axisLabels={COORDINATE_AXES} viewport={eigenbasisView} vectorPresentation={presentation(plots.eigenbasis, eigenbasisView)}
            editableVectorIds={READ_ONLY} alwaysOpaqueVectorIds={OPAQUE} onViewportChange={(eigenbasis) => setViews((v) => ({ ...v, eigenbasis }))} />}
          {!eigenbasisSafe && <PlotLimit />}
        </> : <p className="representation-warning">{analysis.status === 'ready' ? '入力座標の計算・検算を数値的に確かめられないため、座標の図を保留しています。' : unavailable}</p>}
        <p className="diagonalization-legend"><span style={{ color: INPUT_COLOR }}>● <Vector name="c" /></span><span style={{ color: IMAGE_COLOR }}>◇ <Vector name="D" /><Vector name="c" /></span></p>
      </section>
      <section className="basis-candidate-card diagonalization-editor" aria-labelledby="diagonalization-edit-title">
        <h2 id="diagonalization-edit-title">行列と入力</h2>
        <fieldset key={editorRevision} disabled={dragging}><legend className="visually-hidden">行列と入力の成分</legend>
          <div className="diagonalization-editor-row"><Vector name="A" /><span>=</span><span className="linear-map-matrix-input" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {scene.definition.matrix.flatMap((row, r) => row.map((value, c) => <NumberInput key={`${r}-${c}`} value={value} label={`行列Aの第${r + 1}行第${c + 1}列`}
              reportInvalid={reportInvalid} onValue={(v) => setScene((s) => editDiagonalizationMatrix(s, r, c, v))} />))}</span></div>
          <div className="diagonalization-editor-row"><Vector name="u" /><span>=</span><span className="linear-map-vector-input">
            {scene.input.map((value, i) => <NumberInput key={i} value={value} label={`入力uの第${i + 1}成分`} reportInvalid={reportInvalid}
              onValue={(v) => setScene((s) => setDiagonalizationInput(s, s.input.map((n, j) => i === j ? v : n)))} />)}</span></div>
        </fieldset>
      </section>
      <div className="diagonalization-inspector">
        <div className="inspector-tablist" role="tablist" aria-label="対角化Labの解析">{DIAGONALIZATION_TABS.map(([id, label], i) =>
          <button key={id} type="button" role="tab" id={`diagonalization-tab-${id}`} aria-selected={tab === id} aria-controls={`diagonalization-panel-${id}`}
            tabIndex={tab === id ? 0 : -1} ref={(node) => { tabRefs.current[i] = node; }} onKeyDown={(event) => tabKey(event, i)} onClick={() => setTab(id)}>{label}</button>)}</div>
        {DIAGONALIZATION_TABS.map(([id, label]) => <section key={id} role="tabpanel" id={`diagonalization-panel-${id}`} aria-labelledby={`diagonalization-tab-${id}`}
          className="basis-result-card inspector-panel" hidden={tab !== id} tabIndex={0}><h2>{label}</h2>
          <DiagonalizationPanel tab={id} analysis={analysis} input={result} onSwap={swap} disabled={dragging || invalid.size > 0} />
        </section>)}
      </div>
    </div>
  </main>;
}

function presentation(vectors: readonly VectorValue[], viewport: PlaneViewport) {
  return inputImagePresentation(vectors[vectors.length - 1], vectors.length === 2 ? vectors[0] : null, viewport);
}
function PlotLimit() { return <p className="representation-warning">導出した座標が描画上限（各成分の絶対値100万）を超えるため、この図を保留しています。数値と式は「座標と作用」で確認できます。</p>; }

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

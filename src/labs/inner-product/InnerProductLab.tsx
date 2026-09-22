import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type Dispatch, type SetStateAction, type ReactNode, type KeyboardEvent } from 'react';
import { LabActionControls } from '../../app/LabActionControls';
import { ShareExportDialog } from '../../app/ShareExportDialog';
import { buildShareUrl } from '../../sharing';
import { createInnerProductInitialization, createInnerProductShareState } from './innerProductSharing';
import { analyzeGramSchmidt, type StageKey } from '../../domain';
import { parseCoordinateInput } from '../../state/vectorEditing';
import { createAutoFitViewport, createAutoFitLineViewport, VectorPlane2D, VectorLine1D, ZeroSpace0D, type LineViewport, type PlaneViewport } from '../../visualization';
import { Vector } from '../representation-matrix/representationMath';
import { Formula } from '../representation-matrix/representationMath';
import { FunctionName, Polynomial } from '../representation-matrix/representationObjects';
import { InnerPolynomialCoordinates, InnerMetricExplanation, InnerPolynomialSpace } from './innerProductPolynomialMath';
import { innerInputCoordinates, innerDisplayPlots } from './innerProductCoordinates';
import { InnerProductPanel, INNER_PRODUCT_TABS, type InnerProductTab } from './InnerProductPanels';
import { InnerProductOverlay } from './InnerProductOverlay';
import { GramSchmidtOverlay } from './GramSchmidtOverlay';
import { GramSchmidtBasisPanel, GramSchmidtControls, GramSchmidtStepPanel } from './GramSchmidtPanels';
import { gramSchmidtPlots } from './gramSchmidtPresentation';
import { analyzeInnerProductScene, editInnerProductInput, innerProductPlots, innerProductPresentation,
  inputPlotId, snapInnerProductInput, innerInputColor, innerProductMetric, addInnerProductInput, removeInnerProductInput,
  moveInnerProductInput, resolveInnerProductStage, stageId, type InnerProductScene } from './innerProductScene';
import './innerProduct.css';
import { activeInnerSlot, createInnerProductWorkspace, resetInnerProductWorkspace, updateActiveInnerSlot, selectInnerScene, fitInnerProductView, type InnerProductSlot, type InnerProductView } from './innerProductWorkspace';

const InnerProductSpace = lazy(() => import('./InnerProductSpace'));
type DragPreview = { id: number; coordinates: readonly number[]; viewport?: PlaneViewport; line?: LineViewport };
export function InnerProductLab({ active = true, initialScene }: { readonly active?: boolean; readonly initialScene?: InnerProductScene }) {
  const [initialization] = useState(() => initialScene ? { initialWorkspace: createInnerProductWorkspace(initialScene), errorMessage: null }
    : createInnerProductInitialization(typeof window === 'undefined' ? 'https://example.invalid/' : window.location.href));
  const initial = initialization.initialWorkspace;
  const [workspace, setWorkspace] = useState(initial);
  const [revision, setRevision] = useState(0);
  const dimension = workspace.dimension;
  // 教材と視点は次元別に保持。切替／Resetで未確定入力・ドラッグだけ破棄する。
  return <InnerProductSceneView key={`${workspace.kind}-${dimension}-${revision}`} active={active} slot={activeInnerSlot(workspace)}
    loadError={initialization.errorMessage}
    setScene={next => setWorkspace(w => updateActiveInnerSlot(w, slot => ({ ...slot, scene: typeof next === 'function' ? next(slot.scene) : next })))}
    setView={patch => setWorkspace(w => updateActiveInnerSlot(w, slot => ({ ...slot, view: { ...slot.view, ...patch } })))}
    onReset={() => { setWorkspace(w => resetInnerProductWorkspace(w, initial)); setRevision(n => n + 1); }}
    dimensionControls={<><div className="dimension-switcher inner-kinds"><div className="dimension-tablist" role="group" aria-label="内積Labの種類">
      {(['coordinate', 'polynomial'] as const).map(kind => <button type="button" key={kind} aria-pressed={workspace.kind === kind} onClick={() => setWorkspace(w => selectInnerScene(w, kind))}>{kind === 'coordinate' ? '数ベクトル' : '多項式'}</button>)}
    </div></div><div className="dimension-switcher inner-dimensions"><div className="dimension-tablist" role="group" aria-label="内積Labの次元">
      {([0, 1, 2, 3] as const).filter(d => workspace.kind === 'coordinate' || d > 0).map(d => <button type="button" key={d} aria-pressed={dimension === d} onClick={() => setWorkspace(w => selectInnerScene(w, w.kind, d))}>{d}D</button>)}
    </div></div></>} />;
}

function InnerProductSceneView({ active, slot, setScene, setView, onReset, dimensionControls, loadError }: {
  readonly active: boolean; readonly slot: InnerProductSlot; readonly setScene: Dispatch<SetStateAction<InnerProductScene>>;
  readonly setView: (patch: Partial<InnerProductView>) => void; readonly onReset: () => void; readonly dimensionControls: ReactNode;
  readonly loadError: string | null;
}) {
  const { scene, view } = slot;
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const previewRef = useRef<DragPreview | null>(null);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const [tab, setTab] = useState<InnerProductTab>(scene.mode === 'pair' ? 'pair' : 'steps');
  const [pairDraft, setPairDraft] = useState<readonly [number | null, number | null]>(scene.pair ?? [null, null]);
  const [notice, setNotice] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState('');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const displayScene = useMemo(() => preview ? editInnerProductInput(scene, preview.id, preview.coordinates) : scene, [scene, preview]);
  // 計算は入力・pairだけを依存とし、段階／モード／タブ／視点操作では再実行しない。
  const metric = innerProductMetric(scene.dimension, scene.metric);
  const committedResult = useMemo(() => analyzeInnerProductScene(scene), [scene.inputs, scene.pair, metric]);
  const committedGs = useMemo(() => analyzeGramSchmidt(metric, scene.inputs), [scene.inputs, metric]);
  const result = useMemo(() => preview ? analyzeInnerProductScene(displayScene) : committedResult, [displayScene.inputs, displayScene.pair, committedResult]);
  const gs = useMemo(() => preview ? analyzeGramSchmidt(metric, displayScene.inputs) : committedGs, [displayScene.inputs, committedGs]);
  const stage = resolveInnerProductStage(displayScene.stage, gs);
  const stageWasReset = stageId(stage) !== stageId(displayScene.stage);
  const gsPlots = useMemo(() => gramSchmidtPlots(displayScene, gs, stage), [displayScene, gs, stage]);
  const plots = useMemo(() => innerDisplayPlots(displayScene, displayScene.mode === 'pair' ? innerProductPlots(displayScene, result) : gsPlots), [displayScene, result, gsPlots]);
  const fitVectors = plots.safe ? plots.vectors : plots.inputs;
  const viewport = preview?.viewport ?? view.plane ?? createAutoFitViewport(scene.dimension === 2 ? fitVectors : []);
  const line = preview?.line ?? view.line ?? createAutoFitLineViewport(scene.dimension === 1 ? fitVectors.map(v => v.coordinates[0]) : []);
  const cancelDrag = useCallback(() => { previewRef.current = null; setPreview(null); }, []);
  function commitDrag() {
    const pending = previewRef.current;
    if (pending) setScene(s => editInnerProductInput(s, pending.id, pending.coordinates));
    cancelDrag();
  }
  useEffect(() => { if (!active) { cancelDrag(); setShareUrl(null); } }, [active, cancelDrag]);
  useEffect(() => {
    // previewの退避は一時的。取消なら元stageへ戻し、確定した編集だけsceneへ反映する。
    if (!preview && stageWasReset) {
      setScene(s => ({ ...s, stage })); setNotice('編集により表示段階がなくなったため、先頭へ戻しました。');
    }
  }, [preview, stageWasReset, stage]);
  useEffect(() => {
    // 描画境界でSVGが外れた場合もcapture終了待ちにせず、有効な元入力を確定して復帰可能にする。
    if (preview && !plots.safe) {
      setScene(s => editInnerProductInput(s, preview.id, preview.coordinates)); cancelDrag();
    }
  }, [preview, plots.safe, cancelDrag]);
  const reportInvalid = useCallback((id: string, bad: boolean) => setInvalid(previous => {
    if (previous.has(id) === bad) return previous;
    const next = new Set(previous); if (bad) next.add(id); else next.delete(id); return next;
  }), []);
  function reset() { cancelDrag(); onReset(); }
  function openShare() {
    if (invalid.size > 0 || previewRef.current !== null) return;
    try { setShareUrl(buildShareUrl(window.location.href, createInnerProductShareState(slot))); setExportError(''); }
    catch (error) { setExportError(error instanceof Error ? error.message : '共有URLを生成できませんでした。'); }
  }
  function startDrag(plotId: string) {
    const input = scene.inputs.find(v => inputPlotId(v.id) === plotId);
    if (input) { const next = { id: input.id, coordinates: input.components, viewport, line }; previewRef.current = next; setPreview(next); }
  }
  function previewCoordinates(id: number, coordinates: readonly number[]) {
    const components = innerInputCoordinates(scene, coordinates);
    if (!components) { setNotice('逆変換後の係数が入力上限（絶対値100万）を超えるか、安全に数値化できないため、直前の有効値を維持します。'); return; }
    const next = { ...previewRef.current, id, coordinates: components, viewport, line };
    previewRef.current = next; setPreview(next); setNotice('');
  }
  function changeInputs(next: InnerProductScene) {
    setScene(next); setPairDraft(next.pair ?? [null, null]);
    setNotice('入力の組を変更し、直交化の表示段階を先頭へ戻しました。');
  }
  function choosePair(side: number, id: number | null) {
    const next = [...(scene.pair ?? pairDraft)] as [number | null, number | null]; next[side] = id;
    setPairDraft(next); setScene(s => ({ ...s, pair: next[0] !== null && next[1] !== null ? [next[0], next[1]] : null }));
  }
  function chooseStage(next: StageKey) { setScene(s => ({ ...s, stage: next })); setNotice(''); }
  function keyTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null;
    if (next === null) return;
    event.preventDefault(); setTab(INNER_PRODUCT_TABS[next][0]); tabRefs.current[next]?.focus();
  }
  return <main className="lab-page inner-product-lab" data-lab-id="inner-product" data-inner-mode={scene.mode} aria-hidden={!active}>
    <section className="lab-intro" aria-labelledby="inner-product-title">
      <div><p className="panel-kicker">Inner product / {scene.dimension}D</p><h1 id="inner-product-title">内積と正規直交基底</h1><p>ベクトルを動かし、内積・射影・直交化を調べます。</p></div>
      <div><LabActionControls exportDisabled={invalid.size > 0 || preview !== null} exportDescriptionId={invalid.size > 0 ? 'inner-share-help' : undefined} onExport={openShare} onReset={reset} /></div>
    </section>
    {loadError && <p role={active ? 'alert' : undefined} className="representation-warning">共有URLを復元できませんでした。{loadError}</p>}
    {exportError && <p role={active ? 'alert' : undefined} className="representation-warning">{exportError}</p>}
    {invalid.size > 0 && <p id="inner-share-help" className="inner-note">入力エラーを修正してから共有してください。</p>}
    {dimensionControls}
    {scene.kind === 'polynomial' && <label className="inner-metric-select">内積<select aria-label="多項式の内積" value={scene.metric} disabled={preview !== null || invalid.size > 0}
      onChange={event => { const metric = event.target.value as 'integral' | 'coefficient'; setScene(s => ({ ...s, metric })); setView(fitInnerProductView(view)); setNotice('元の多項式を保ったまま内積を変更し、図を全体表示に戻しました。'); }}>
      <option value="integral">積分内積（−1から1）</option><option value="coefficient">係数内積</option>
    </select></label>}
    <div className="inner-mode-switch" role="group" aria-label="内積Labのモード">
      {([['pair', '内積・射影'], ['gram-schmidt', 'グラム・シュミット']] as const).map(([mode, label]) => <button type="button" key={mode}
        aria-pressed={scene.mode === mode} disabled={preview !== null} onClick={() => { setScene(s => ({ ...s, mode })); setTab(mode === 'pair' ? 'pair' : 'steps'); }}>{label}</button>)}
    </div>
    <div className="inner-product-workspace">
      <section className="plot-card inner-product-plot" aria-labelledby="inner-plot-title">
        <div className="card-heading"><h2 id="inner-plot-title">{scene.kind === 'polynomial' ? <><InnerPolynomialSpace dimension={scene.dimension} />：内積を反映した座標</> : ['零ベクトル空間', '1次元数直線', '2次元座標平面', '3次元座標空間'][scene.dimension]}</h2>{(scene.dimension === 1 || scene.dimension === 2) && <button type="button" className="basis-fit-button" disabled={preview !== null} onClick={() => setView({ plane: null, line: null })}>全体を表示</button>}</div>
        {scene.kind === 'polynomial' && <p className="inner-note">{scene.metric === 'integral' ? '積分内積に対応する固定座標です。標準単項式の係数軸や、今求めている正規直交基底の座標ではありません。' : '標準単項式の係数を座標とします。この図の直角・長さは係数内積に対応します。'}</p>}
        {scene.mode === 'gram-schmidt' && scene.dimension > 0 && <GramSchmidtControls analysis={gs} stage={stage} disabled={preview !== null || invalid.size > 0} onStage={chooseStage} />}
        {(notice || stageWasReset) && <p className="inner-note" role={active ? 'status' : undefined}>{stageWasReset ? '現在の段階がなくなったため、プレビューでは先頭を表示します。' : notice}</p>}
        {scene.dimension > 0 && <label className="inner-geometry-toggle"><input type="checkbox" checked={scene.showGeometry} disabled={preview !== null}
          onChange={event => setScene(s => ({ ...s, showGeometry: event.target.checked }))} />射影・残差の補助図を表示</label>}
        {active && scene.dimension === 0 && <ZeroSpace0D idPrefix="inner-product-zero" description="零ベクトルのみの空間です。成分はなく、空の組が正規直交基底です。" />}
        {plots.safe && active && scene.dimension === 1 && <VectorLine1D idPrefix="inner-product-line" vectors={plots.vectors} colors={plots.colors} viewport={line}
          axisLabel={metric.axes[0]}
          showHelpText={false} showViewportControls={false} outlinedVectorIds={plots.vectors.filter(v => !plots.editableIds.includes(v.id)).map(v => v.id)}
          editableVectorIds={invalid.size ? [] : plots.editableIds} alwaysOpaqueVectorIds={scene.mode === 'pair' ? plots.vectors.map(v => v.id) : gsPlots.opaqueIds}
          onViewportChange={line => setView({ line })} onVectorDragStart={startDrag} onVectorChange={(_, coordinates) => {
            const pending = previewRef.current; if (!pending) return;
            previewCoordinates(pending.id, coordinates);
          }} onVectorDragEnd={commitDrag} onVectorDragCancel={cancelDrag} />}
        {plots.safe && active && scene.dimension === 3 && <Suspense fallback={<p>3D表示を準備しています。</p>}><InnerProductSpace scene={scene} committedGs={committedGs} committedResult={committedResult}
          plots={plots} gs={gs} stage={stage} result={result} camera={view.camera} disabled={invalid.size > 0} onRejected={() => setNotice('逆変換後の係数が入力上限を超えるか、安全に数値化できないため、直前の有効値を維持します。')}
          onCameraChange={camera => setView({ camera })} onPreview={(plotId, coordinates) => {
            if (!coordinates) { cancelDrag(); return; }
            const input = scene.inputs.find(v => inputPlotId(v.id) === plotId); if (!input) return;
            previewCoordinates(input.id, coordinates);
          }} onCommit={(plotId, coordinates) => {
            const input = scene.inputs.find(v => inputPlotId(v.id) === plotId);
            const components = innerInputCoordinates(scene, coordinates);
            if (input && components) setScene(s => editInnerProductInput(s, input.id, components)); cancelDrag();
          }} /></Suspense>}
        {plots.safe && active && scene.dimension === 2 && <VectorPlane2D idPrefix="inner-product-plane" vectors={plots.vectors} colors={plots.colors} viewport={viewport}
          axisLabels={metric.axes as readonly [string, string]}
          vectorPresentation={innerProductPresentation(plots.vectors, viewport)} alwaysOpaqueVectorIds={scene.mode === 'pair' ? plots.vectors.map(v => v.id) : gsPlots.opaqueIds}
          editableVectorIds={invalid.size ? [] : plots.editableIds} onViewportChange={plane => setView({ plane })}
          geometryDescription={scene.mode === 'gram-schmidt' ? '現在の入力と、この段階までの射影・残差・採用した正規直交ベクトルを表示します。' : scene.showGeometry && plots.derivedAvailable ? 'pはvのu方向への射影、rはvからpを引いた残差です。細い破線はpとrによる補助図です。' : ''}
          geometryOverlay={scene.showGeometry && plots.derivedAvailable ? scene.mode === 'gram-schmidt' ? <GramSchmidtOverlay analysis={gs} stage={stage} viewport={viewport} metric={metric} /> : result ? <InnerProductOverlay result={result} viewport={viewport} metric={metric} /> : undefined : undefined}
          onVectorDragStart={startDrag}
          onVectorChange={(_, coordinates) => {
            const pending = previewRef.current;
            if (!pending) return;
            previewCoordinates(pending.id, snapInnerProductInput(coordinates, pending.viewport!.maxX - pending.viewport!.minX));
          }} onVectorDragEnd={commitDrag} onVectorDragCancel={cancelDrag} />}
        {!plots.safe && <p className="representation-warning">表示座標を安全に数値化できないか、描画上限（絶対値100万）を超えたため図を保留しています。成分入力から変更できます。</p>}
        {scene.showGeometry && !plots.derivedAvailable && (scene.mode === 'gram-schmidt' || result) && <p className="inner-note">射影・残差の図は数値計算を保留しています。元の入力は編集できます。</p>}
        <div className="inner-legend">{plots.vectors.map((vector, i) => <span key={vector.id} style={{ color: plots.colors[i] }}>{vector.id.startsWith('inner-input-') ? '● ' : '◇ '}<Vector name={vector.name} /></span>)}</div>
      </section>
      <div className="inner-product-sidebar">
        {scene.dimension > 0 && <section className="vector-editor-card inner-product-editor" aria-labelledby="inner-editor-title">
          <p className="panel-kicker">Edit vectors</p><h2 id="inner-editor-title">{scene.kind === 'polynomial' ? '多項式の係数' : '列ベクトルの成分'}</h2>
          <fieldset disabled={preview !== null}><legend className="visually-hidden">内積Labの数ベクトル成分</legend>
            {scene.inputs.length === 0 && <p>入力は空です。ベクトルを追加できます。</p>}
            <div className="inner-inputs">{scene.inputs.map((input, i) => <div className="inner-input-item" key={input.id}><div className="inner-input-column">
              <span style={{ color: innerInputColor(input.id) }}><InnerPolynomialCoordinates polynomial={scene.kind === 'polynomial'} name={`a${input.id}`} /></span><span>=</span><span className="linear-map-vector-input">
                {input.components.map((component, axis) => <NumberInput key={axis} value={component} label={scene.kind === 'polynomial' ? `f${input.id}の係数b${axis}` : `a${input.id}の第${axis + 1}成分`} reportInvalid={reportInvalid}
                  onValue={value => setScene(s => editInnerProductInput(s, input.id, s.inputs.find(v => v.id === input.id)!.components.map((x, j) => j === axis ? value : x)))} />)}
              </span></div><div className="inner-input-actions"><span>{i + 1}番目</span>
                <button type="button" aria-label={`a${input.id}を前へ`} disabled={i === 0 || invalid.size > 0} onClick={() => changeInputs(moveInnerProductInput(scene, input.id, -1))}>↑</button>
                <button type="button" aria-label={`a${input.id}を後へ`} disabled={i === scene.inputs.length - 1 || invalid.size > 0} onClick={() => changeInputs(moveInnerProductInput(scene, input.id, 1))}>↓</button>
                <button type="button" aria-label={`a${input.id}を削除`} onClick={() => changeInputs(removeInnerProductInput(scene, input.id))}>削除</button>
              </div>{scene.kind === 'polynomial' && <Formula><Vector name={`a${input.id}`} /> = <FunctionName name={`f${input.id}`} /> = <Polynomial coefficients={displayScene.inputs.find(v => v.id === input.id)!.components} /></Formula>}</div>)}</div>
            <button className="inner-add-input" type="button" disabled={scene.inputs.length >= 8 || invalid.size > 0} onClick={() => changeInputs(addInnerProductInput(scene))}>ベクトルを追加（{scene.inputs.length}/8）</button>
            <div className="inner-pair-select">{(['u', 'v'] as const).map((name, side) => <label key={name}><Vector name={name} /> =
              <select aria-label={`${name}として使う入力`} value={(scene.pair ?? pairDraft)[side] ?? ''} onChange={event => choosePair(side, event.target.value === '' ? null : Number(event.target.value))}>
                <option value="">未選択</option>
                {scene.inputs.map(input => <option key={input.id} value={input.id}>{`a${'₀₁₂₃₄₅₆₇₈'[input.id]}`}</option>)}
              </select></label>)}</div>
          </fieldset>
          {invalid.size > 0 && <p role={active ? 'status' : undefined} className="representation-warning">図と解析は直前の有効値です。入力エラーを修正するか、Escapeで元の値へ戻してください。</p>}
        </section>}
        <div className="inner-product-inspector">
          <div className="inspector-tablist" role="tablist" aria-label="内積Labの解析">{INNER_PRODUCT_TABS.map(([id, label], index) => <button key={id} type="button" role="tab"
            id={`inner-tab-${id}`} aria-selected={tab === id} aria-controls={`inner-panel-${id}`} tabIndex={tab === id ? 0 : -1}
            ref={node => { tabRefs.current[index] = node; }} onClick={() => setTab(id)} onKeyDown={event => keyTab(event, index)}>{label}</button>)}</div>
          {INNER_PRODUCT_TABS.map(([id, label]) => <section key={id} className="basis-result-card inspector-panel" role="tabpanel" id={`inner-panel-${id}`}
            aria-labelledby={`inner-tab-${id}`} hidden={tab !== id} tabIndex={0}><h2>{label}</h2>
            {scene.kind === 'polynomial' && <InnerMetricExplanation metric={metric} details={id === 'pair'} />}
            {id === 'pair' ? <InnerProductPanel result={result} pair={scene.pair} /> : id === 'steps' ? <>{scene.mode !== 'gram-schmidt' && <p className="inner-note">グラフを段階表示するにはグラム・シュミットモードを選んでください。</p>}<GramSchmidtStepPanel analysis={gs} stage={stage} /></> : <GramSchmidtBasisPanel analysis={gs} />}</section>)}
        </div>
      </div>
    </div>
    {shareUrl && <ShareExportDialog key={shareUrl} url={shareUrl} labName="内積・正規直交基底Lab"
      description="現在の種類・次元・内積・入力の成分と順序・2本の選択・モード・計算段階・補助図・3D視点を復元します。1D・2Dは全体表示になります。Resetは開いた共有時の状態へ戻ります。"
      onClose={() => setShareUrl(null)} />}
  </main>;
}

function NumberInput({ value, label, onValue, reportInvalid }: { readonly value: number; readonly label: string;
  readonly onValue: (value: number) => void; readonly reportInvalid: (id: string, invalid: boolean) => void }) {
  const [draft, setDraft] = useState(String(value));
  const id = useId(), parsed = parseCoordinateInput(draft);
  useEffect(() => setDraft(String(value)), [value]);
  useEffect(() => { reportInvalid(id, !parsed.ok); return () => reportInvalid(id, false); }, [id, parsed.ok, reportInvalid]);
  return <label className="representation-number"><input type="text" inputMode="decimal" aria-label={label} value={draft} aria-invalid={!parsed.ok}
    aria-describedby={!parsed.ok ? id : undefined} onChange={event => {
      setDraft(event.target.value); const next = parseCoordinateInput(event.target.value); if (next.ok) onValue(next.value);
    }} onKeyDown={event => { if (event.key === 'Escape') setDraft(String(value)); }} />
    {!parsed.ok && <small id={id}>{parsed.message}</small>}</label>;
}

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { LabActionControls } from '../../app/LabActionControls';
import { parseCoordinateInput } from '../../state/vectorEditing';
import { createAutoFitViewport, VectorPlane2D, type PlaneViewport } from '../../visualization';
import { Vector } from '../representation-matrix/representationMath';
import { InnerProductPanel, INNER_PRODUCT_TABS, type InnerProductTab } from './InnerProductPanels';
import { InnerProductOverlay } from './InnerProductOverlay';
import { analyzeInnerProductScene, createInnerProductScene, editInnerProductInput, innerProductPlots, innerProductPresentation,
  inputPlotId, selectInnerProductPair, snapInnerProductInput, INNER_PRODUCT_COLORS, PROJECTION_COLOR, RESIDUAL_COLOR, type InnerProductScene } from './innerProductScene';
import './innerProduct.css';

type DragPreview = { id: number; coordinates: readonly [number, number]; viewport: PlaneViewport };
export function InnerProductLab({ active = true, initialScene }: { readonly active?: boolean; readonly initialScene?: InnerProductScene }) {
  const [initial] = useState(() => initialScene ?? createInnerProductScene());
  const [scene, setScene] = useState(initial);
  const [view, setView] = useState<PlaneViewport | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const previewRef = useRef<DragPreview | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const [tab, setTab] = useState<InnerProductTab>('pair');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const displayScene = useMemo(() => preview ? editInnerProductInput(scene, preview.id, preview.coordinates) : scene, [scene, preview]);
  // 14.3はpair解析のみ。GSは段階操作を接続する14.4まで実行しない。
  const result = useMemo(() => analyzeInnerProductScene(displayScene), [displayScene.inputs, displayScene.pair]);
  const plots = useMemo(() => innerProductPlots(displayScene, result), [displayScene, result]);
  const viewport = preview?.viewport ?? view ?? createAutoFitViewport(plots.safe ? plots.vectors : plots.inputs);
  const cancelDrag = useCallback(() => { previewRef.current = null; setPreview(null); }, []);
  function commitDrag() {
    const pending = previewRef.current;
    if (pending) setScene(s => editInnerProductInput(s, pending.id, pending.coordinates));
    cancelDrag();
  }
  useEffect(() => { if (!active) cancelDrag(); }, [active, cancelDrag]);
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
  function reset() { cancelDrag(); setScene(initial); setView(null); setInvalid(new Set()); setEditorRevision(n => n + 1); setTab('pair'); }
  function keyTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null;
    if (next === null) return;
    event.preventDefault(); setTab(INNER_PRODUCT_TABS[next][0]); tabRefs.current[next]?.focus();
  }
  return <main className="lab-page inner-product-lab" data-lab-id="inner-product" aria-hidden={!active}>
    <section className="lab-intro" aria-labelledby="inner-product-title">
      <div><p className="panel-kicker">Inner product / 2D</p><h1 id="inner-product-title">内積と正規直交基底</h1><p>2本のベクトルを動かし、内積と射影を調べます。</p></div>
      <div><LabActionControls exportDisabled exportDescriptionId="inner-share-help" onExport={() => {}} onReset={reset} />
        <p id="inner-share-help" className="inner-note">このLabの共有機能は14.7で対応予定です。</p></div>
    </section>
    <div className="inner-product-workspace">
      <section className="plot-card inner-product-plot" aria-labelledby="inner-plot-title">
        <div className="card-heading"><h2 id="inner-plot-title">2次元座標平面</h2><button type="button" className="basis-fit-button" disabled={preview !== null} onClick={() => setView(null)}>全体を表示</button></div>
        <label className="inner-geometry-toggle"><input type="checkbox" checked={scene.showGeometry} disabled={preview !== null}
          onChange={event => setScene(s => ({ ...s, showGeometry: event.target.checked }))} />射影・残差の補助図を表示</label>
        {plots.safe && active && <VectorPlane2D idPrefix="inner-product-plane" vectors={plots.vectors} colors={plots.colors} viewport={viewport}
          vectorPresentation={innerProductPresentation(plots.vectors, viewport)} alwaysOpaqueVectorIds={plots.vectors.map(v => v.id)}
          editableVectorIds={invalid.size ? [] : plots.editableIds} onViewportChange={setView}
          geometryDescription={scene.showGeometry && plots.derivedAvailable ? 'pはvのu方向への射影、rはvからpを引いた残差です。細い破線はpとrによる補助図です。' : ''}
          geometryOverlay={scene.showGeometry && plots.derivedAvailable ? <InnerProductOverlay result={result} viewport={viewport} /> : undefined}
          onVectorDragStart={plotId => {
            const input = scene.inputs.find(v => inputPlotId(v.id) === plotId);
            if (input) { const next = { id: input.id, coordinates: input.components as readonly [number, number], viewport }; previewRef.current = next; setPreview(next); }
          }}
          onVectorChange={(_, coordinates) => {
            const pending = previewRef.current;
            if (!pending) return;
            const next = { ...pending, coordinates: snapInnerProductInput(coordinates, pending.viewport.maxX - pending.viewport.minX) };
            previewRef.current = next; setPreview(next);
          }} onVectorDragEnd={commitDrag} onVectorDragCancel={cancelDrag} />}
        {!plots.safe && <p className="representation-warning">導出した成分が描画上限（絶対値100万）を超えたため図を保留しています。成分入力から変更できます。</p>}
        {scene.showGeometry && !plots.derivedAvailable && <p className="inner-note">射影・残差の図は数値計算を保留しています。元の入力は編集できます。</p>}
        <div className="inner-legend">{scene.inputs.map((input, i) => <span key={input.id} style={{ color: INNER_PRODUCT_COLORS[i % 2] }}>● <Vector name={`a${input.id}`} /></span>)}
          {scene.showGeometry && <><span style={{ color: PROJECTION_COLOR }}>◇ <Vector name="p" /></span><span style={{ color: RESIDUAL_COLOR }}>◇ <Vector name="r" /></span></>}</div>
      </section>
      <div className="inner-product-sidebar">
        <section className="vector-editor-card inner-product-editor" aria-labelledby="inner-editor-title">
          <p className="panel-kicker">Edit vectors</p><h2 id="inner-editor-title">列ベクトルの成分</h2>
          <fieldset key={editorRevision} disabled={preview !== null}><legend className="visually-hidden">内積Labの数ベクトル成分</legend>
            <div className="inner-inputs">{scene.inputs.map((input, i) => <div className="inner-input-column" key={input.id}>
              <span style={{ color: INNER_PRODUCT_COLORS[i % 2] }}><Vector name={`a${input.id}`} /></span><span>=</span><span className="linear-map-vector-input">
                {input.components.map((component, axis) => <NumberInput key={axis} value={component} label={`a${input.id}の第${axis + 1}成分`} reportInvalid={reportInvalid}
                  onValue={value => setScene(s => editInnerProductInput(s, input.id, s.inputs.find(v => v.id === input.id)!.components.map((x, j) => j === axis ? value : x)))} />)}
              </span></div>)}</div>
            <div className="inner-pair-select">{(['u', 'v'] as const).map((name, side) => <label key={name}><Vector name={name} /> =
              <select aria-label={`${name}として使う入力`} value={scene.pair[side]} onChange={event => setScene(s => selectInnerProductPair(s, side as 0 | 1, Number(event.target.value)))}>
                {scene.inputs.map(input => <option key={input.id} value={input.id}>{`a${'₀₁₂₃₄₅₆₇₈'[input.id]}`}</option>)}
              </select></label>)}</div>
          </fieldset>
          {invalid.size > 0 && <p role={active ? 'status' : undefined} className="representation-warning">図と解析は直前の有効値です。入力エラーを修正するか、Escapeで元の値へ戻してください。</p>}
        </section>
        <div className="inner-product-inspector">
          <div className="inspector-tablist" role="tablist" aria-label="内積Labの解析">{INNER_PRODUCT_TABS.map(([id, label], index) => <button key={id} type="button" role="tab"
            id={`inner-tab-${id}`} aria-selected={tab === id} aria-controls={`inner-panel-${id}`} tabIndex={tab === id ? 0 : -1}
            ref={node => { tabRefs.current[index] = node; }} onClick={() => setTab(id)} onKeyDown={event => keyTab(event, index)}>{label}</button>)}</div>
          {INNER_PRODUCT_TABS.map(([id, label]) => <section key={id} className="basis-result-card inspector-panel" role="tabpanel" id={`inner-panel-${id}`}
            aria-labelledby={`inner-tab-${id}`} hidden={tab !== id} tabIndex={0}><h2>{label}</h2><InnerProductPanel tab={id} result={result} pair={scene.pair} /></section>)}
        </div>
      </div>
    </div>
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

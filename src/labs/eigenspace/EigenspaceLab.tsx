import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { analyzeEigenInput, analyzeEigenMap, type EigenInputAnalysis, type EigenMapAnalysis, type EigenIssue, type VectorValue } from '../../domain';
import { LabActionControls } from '../../app/LabActionControls';
import { VectorPlane2D, createAutoFitViewport, type PlaneViewport } from '../../visualization';
import type { PlaneVectorPresentation } from '../../visualization/VectorPlane2D';
import { SvgVectorLabel } from '../../visualization/SvgVectorLabel';
import { toSvgPoint } from '../../visualization/planeGeometry';
import { formatMathNumber } from '../../ui';
import { Column, Equals, Formula, MapValue, Scalar, Vector } from '../representation-matrix/representationMath';
import { createEigenScene, createEigenSpaceGeometry, editEigenMatrix, firstEigenSelection, parseEigenNumber, setEigenInput, snapEigenInput, type EigenScene } from './eigenScene';
import './eigenspace.css';

const TABS = [['values', '固有値'], ['space', '固有空間'], ['input', '入力と像'], ['equation', '固有方程式']] as const;
type Tab = typeof TABS[number][0];
const INPUT_COLOR = '#245b8d', IMAGE_COLOR = '#ce5135';
const ISSUES: Record<EigenIssue, string> = {
  'unresolved-cluster': '近い固有値を数値で区別できません。',
  'ambiguous-realness': '根が実数か確認できません。',
  'ambiguous-multiplicity': '固有値の重複度を確認できません。',
  'unstable-nullity': '固有空間または入力の所属を十分な精度で確認できません。',
  'residual-too-large': '等式の残差が許容範囲を超えています。',
  'incomplete-spectrum': '固有値の一覧が完全ではありません。',
  'iteration-limit': '根を求める計算が反復上限に達しました。',
  'non-finite-result': '導出値を有限数として計算できません。',
  'precision-limit': '精度を保つための演算量上限に達しました。',
  'unrepresentable-result': '小さすぎる導出値などを数値として保持できません。',
};

/** 初期値だけをReset基準にする。Lab非表示でも確定教材状態は保持する。 */
export function EigenspaceLab({ active, initialScene }: { readonly active: boolean; readonly initialScene?: EigenScene }) {
  const [initial] = useState(() => initialScene ?? createEigenScene());
  const [scene, setScene] = useState(initial);
  const [tab, setTab] = useState<Tab>('values');
  const [resetKey, setResetKey] = useState(0);
  const [manualViewport, setManualViewport] = useState<PlaneViewport | null>(null);
  const [dragViewport, setDragViewport] = useState<PlaneViewport | null>(null);
  const [preview, setPreview] = useState<readonly [number, number] | null>(null);
  const previewRef = useRef<readonly [number, number] | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // 入力のpreview・数値編集ではこの解析を繰り返さない。
  const analysis = useMemo(() => analyzeEigenMap(scene.definition), [scene.definition]);
  const selected = firstEigenSelection(analysis, scene.selectedEigenvalueIndex);
  const current = preview ?? scene.input;
  const inputResult = useMemo(() => analyzeEigenInput(analysis, current, selected), [analysis, current, selected]);
  const geometry = createEigenSpaceGeometry(analysis, selected);
  const vectors: VectorValue[] = [
    // 像を先に描き、編集できる入力ハンドルを常に手前に残す。
    ...(inputResult.imageVector ? [{ id: 'eigen-image', name: 'T(u)', coordinates: inputResult.imageVector }] : []),
    { id: 'eigen-input', name: 'u', coordinates: current },
  ];
  const viewport = dragViewport ?? manualViewport ?? createAutoFitViewport(vectors);
  const presentation = eigenVectorPresentation(current, inputResult.imageVector, viewport);
  function cancelDrag() { previewRef.current = null; setPreview(null); setDragViewport(null); }
  useEffect(() => { if (!active) cancelDrag(); }, [active]);
  function reset() {
    setScene(initial); setTab('values'); setManualViewport(null); cancelDrag(); setResetKey((v) => v + 1);
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1
      : event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : null;
    if (next === null) return;
    event.preventDefault(); setTab(TABS[next][0]); tabRefs.current[next]?.focus();
  }
  const colors = inputResult.imageVector ? [IMAGE_COLOR, INPUT_COLOR] : [INPUT_COLOR];
  const rootLabels = eigenRootLabels(analysis);
  return <main className="lab-page eigenspace-lab" data-lab-id="eigenspace" aria-hidden={!active}>
    <section className="lab-intro" aria-labelledby="eigenspace-title">
      <div><p className="panel-kicker">Eigenspace / 2D</p><h1 id="eigenspace-title">固有値と固有空間</h1>
        <p>入力とその像を重ねて、固有値と固有空間の関係を調べます。</p></div>
      <div><LabActionControls exportDisabled exportDescriptionId="eigen-share-help" onExport={() => {}} onReset={reset} />
        <small id="eigen-share-help">このLabの共有は準備中です。</small></div>
    </section>
    <div className="lab-workspace eigen-workspace">
      <section className="plot-card eigen-plot" aria-labelledby="eigen-plot-title">
        <div className="card-heading"><div><p className="panel-kicker">Linear transformation</p>
          <h2 id="eigen-plot-title">空間 <Scalar>U</Scalar> = ℝ<sup>2</sup></h2></div>
          <button className="basis-fit-button" type="button" disabled={dragViewport !== null} onClick={() => setManualViewport(null)}>全体を表示</button></div>
        <div className="eigen-selection">
          <label htmlFor="eigen-select">固有値を選択</label>
          <select id="eigen-select" value={selected ?? ''} disabled={selected === null || dragViewport !== null}
            onChange={(event) => setScene((s) => ({ ...s, selectedEigenvalueIndex: Number(event.target.value) }))}>
            {selected === null && <option value="">{analysis.status === 'no-real-eigenvalues' ? '実固有値なし' : '選択できる固有空間なし'}</option>}
            {analysis.realEigenvalues.map((root, i) => <option key={i} value={i} disabled={!root.eigenspace}>{rootLabels[i]}{!root.eigenspace && '（空間は判定保留）'}</option>)}
          </select>
          <label className="eigen-show"><input type="checkbox" checked={scene.showEigenspace} disabled={!geometry || dragViewport !== null}
            onChange={(event) => setScene((s) => ({ ...s, showEigenspace: event.target.checked }))} />固有空間を表示</label>
        </div>
        <VectorPlane2D idPrefix="eigen-plane" vectors={vectors} colors={colors} viewport={viewport}
          editableVectorIds={['eigen-input']} alwaysOpaqueVectorIds={['eigen-input', 'eigen-image']}
          vectorPresentation={presentation} onViewportChange={setManualViewport}
          showSpan={scene.showEigenspace && geometry !== null} spanVectors={geometry?.vectors ?? []} spanDimension={geometry?.dimension ?? 0}
          spanLabel="選択した固有空間" onVectorDragStart={() => { setDragViewport(viewport); previewRef.current = scene.input; }}
          onVectorChange={(_, coordinates) => {
            const snapped = snapEigenInput({ ...scene, selectedEigenvalueIndex: selected }, analysis, coordinates, viewport.maxX - viewport.minX);
            previewRef.current = snapped.coordinates; setPreview(snapped.coordinates);
          }}
          onVectorDragEnd={() => { const input = previewRef.current; if (input) setScene((s) => setEigenInput(s, input)); cancelDrag(); }}
          onVectorDragCancel={cancelDrag} />
        <p className="eigen-legend"><span style={{ color: INPUT_COLOR }}>● 入力 <Vector name="u" /></span>
          <span style={{ color: IMAGE_COLOR }}>◇ 像 <MapValue name="u" /></span></p>
      </section>
      <div className="analysis-column">
        <section className="basis-candidate-card eigen-editor" aria-labelledby="eigen-edit-title">
          <p className="panel-kicker">Edit transformation</p><h2 id="eigen-edit-title">行列と入力</h2>
          <Formula><MapValue name="u" /> = <Vector name="A" /><Vector name="u" /></Formula>
          <fieldset key={resetKey} disabled={dragViewport !== null}>
            <legend className="visually-hidden">行列と入力の成分</legend>
            <div className="eigen-editor-row"><Vector name="A" /> = <span className="linear-map-matrix-input">
              {scene.definition.matrix.flatMap((row, r) => row.map((v, c) => <EigenNumberInput key={`${r}-${c}`} value={v} label={`行列Aの第${r + 1}行第${c + 1}列`}
                onValue={(value) => setScene((s) => editEigenMatrix(s, r, c, value))} />))}</span></div>
            <div className="eigen-editor-row" style={{ color: INPUT_COLOR }}><Vector name="u" /> = <span className="linear-map-vector-input">
              {scene.input.map((v, i) => <EigenNumberInput key={i} value={v} label={`入力uの第${i + 1}成分`}
                onValue={(value) => setScene((s) => setEigenInput(s, i === 0 ? [value, s.input[1]] : [s.input[0], value]))} />)}</span></div>
          </fieldset>
        </section>
        <div className="inspector-tablist" role="tablist" aria-label="固有値Labの解析">
          {TABS.map(([id, label], i) => <button key={id} type="button" id={`eigen-tab-${id}`} role="tab" aria-selected={tab === id}
            aria-controls={`eigen-panel-${id}`} tabIndex={tab === id ? 0 : -1} ref={(node) => { tabRefs.current[i] = node; }}
            onKeyDown={(event) => tabKey(event, i)} onClick={() => setTab(id)}>{label}</button>)}
        </div>
        {TABS.map(([id, label]) => <section key={id} id={`eigen-panel-${id}`} className="basis-result-card inspector-panel eigen-panel"
          role="tabpanel" aria-labelledby={`eigen-tab-${id}`} hidden={tab !== id} tabIndex={0}>
          <h2>{label}</h2>
          {(analysis.status === 'inconclusive' || analysis.status === 'numerical-failure') && <div className="representation-warning">
            <strong>数値判定を保留しています。</strong><p>{[...new Set(analysis.issues.map((issue) => ISSUES[issue]))].join(' ')}</p>
          </div>}
          <EigenPanel tab={id} analysis={analysis} input={inputResult} selected={selected} />
        </section>)}
      </div>
    </div>
  </main>;
}

/** 丸め表示が衝突する根はnumberの全桁へ戻し、序数も併記して同じ根に見せない。 */
export function eigenRootLabels(analysis: EigenMapAnalysis): string[] {
  const texts = analysis.realEigenvalues.map((root) => formatMathNumber(root.value).text);
  return analysis.realEigenvalues.map((root, i) => `${i + 1}: λ ≈ ${texts.filter((v) => v === texts[i]).length > 1 ? String(root.value).replaceAll('-', '−') : texts[i]}`);
}
export function eigenVectorPresentation(input: readonly number[], image: readonly number[] | null, viewport: PlaneViewport): Record<string, PlaneVectorPresentation> {
  const same = image !== null && input.every((v, i) => v === image[i]);
  const endpoint = toSvgPoint(input as readonly [number, number], viewport);
  const imageEndpoint = image ? toSvgPoint(image as readonly [number, number], viewport) : null;
  const close = imageEndpoint && Math.hypot(endpoint[0] - imageEndpoint[0], endpoint[1] - imageEndpoint[1]) < 85;
  // 共通SVGはplot内でclipする。長い写像ラベルも表示端の内側に置く。
  const offset = (point: readonly [number, number], right: boolean, width: number, dy: number): readonly [number, number] => {
    const x = Math.max(viewport.padding + 8 + (right ? 0 : width),
      Math.min(viewport.width - viewport.padding - 8 - (right ? width : 0), point[0] + (right ? 16 : -16)));
    const y = Math.max(viewport.padding + 24, Math.min(viewport.height - viewport.padding - 8, point[1] + dy));
    return [x - point[0], y - point[1]];
  };
  return {
    'eigen-input': { strokeWidth: 5, labelOffset: offset(endpoint, input[0] >= 0, same ? 120 : 22, -18),
      ...(same ? { label: <><SvgVectorLabel name="u" /><tspan> = </tspan><SvgVectorLabel name="T(u)" /></> } : {}) },
    'eigen-image': { strokeWidth: 9, outline: true, ...(same ? { hideArrow: true, label: null }
      : imageEndpoint ? { labelOffset: offset(imageEndpoint, image![0] >= 0, 65, close ? 30 : -18) } : {}) },
  };
}

export function EigenPanel({ tab, analysis, input, selected }: { readonly tab: Tab; readonly analysis: EigenMapAnalysis; readonly input: EigenInputAnalysis; readonly selected: number | null }) {
  const root = selected === null ? null : analysis.realEigenvalues[selected];
  if (tab === 'values') return analysis.status === 'no-real-eigenvalues' ? <p>この線形変換には実固有値がありません。</p> : <>
    <p>実固有値{analysis.spectrumComplete ? `は${analysis.realEigenvalues.length}個です。` : 'の確認できた部分を示します。'}</p>
    <ul className="eigen-values">{analysis.realEigenvalues.map((value, i) => <li key={i}>
      <span className="linear-map-math">{i + 1}: <Scalar>λ</Scalar> ≈ {eigenRootLabels(analysis)[i].split(' ≈ ')[1]}</span><span>固有値の重複度：{value.algebraicMultiplicity ?? '判定保留'}</span>
      <span>固有空間の次元：{value.eigenspace?.dimension ?? '判定保留'}</span></li>)}</ul>
    <p>重複度は、固有方程式の根として重なる回数です。</p></>;
  if (tab === 'space') return root?.eigenspace ? <>
    <Formula><Scalar>λ</Scalar> ≈ {formatMathNumber(root.value).text}</Formula>
    <Formula><Scalar>W</Scalar>(<Scalar>λ</Scalar>; <Scalar>T</Scalar>) = {'{'}<Vector name="u" /> ∈ <Scalar>U</Scalar> | <MapValue name="u" /> = <Scalar>λ</Scalar><Vector name="u" />{'}'}</Formula>
    <p>固有空間の次元：{root.eigenspace.dimension}</p><h3>固有空間の基底の一例</h3>
    <Formula><span className="basis-script-symbol">𝒬</span> = ({root.eigenspace.basis.map((_, i) => <span key={i}>{i > 0 && ', '}<Vector name={`q${i + 1}`} /></span>)})</Formula>
    {root.eigenspace.basis.map((q, i) => <Formula key={i}><Vector name={`q${i + 1}`} /><Equals values={q} /><Column values={q} /></Formula>)}
    <p>固有空間は零ベクトルを含みます。基底の取り方は唯一ではありません。</p>
  </> : <p>{analysis.status === 'no-real-eigenvalues' ? '実固有値がないため、固有空間の選択はありません。' : '表示できる固有空間は未確定です。'}</p>;
  if (tab === 'input') return <>
    <Formula><Vector name="u" /><Equals values={input.inputVector} /><Column values={input.inputVector} /></Formula>
    <Formula><MapValue name="u" /> = <Vector name="A" /><Vector name="u" />{input.imageVector ? <><Equals values={input.imageVector} /><Column values={input.imageVector} /></> : <>（数値計算を保留）</>}</Formula>
    <p><strong>{input.eigenvectorStatus === 'zero-input' ? '零ベクトルは固有ベクトルではありません。'
      : input.eigenvectorStatus === 'eigenvector' ? '入力は固有ベクトルです（数値基準内）。'
        : input.eigenvectorStatus === 'not-eigenvector' ? '入力は固有ベクトルではありません。' : '固有ベクトルかどうかの判定は保留です。'}</strong></p>
    {input.matchingEigenvalueIndices.map((i) => <Formula key={i}><MapValue name="u" /> ≈ ({formatMathNumber(analysis.realEigenvalues[i].value).text})<Vector name="u" /></Formula>)}
    <p>{input.selectionRelation === 'member' ? '選択した固有空間に属します（数値基準内）。' : input.selectionRelation === 'not-member' ? '選択した固有空間には属しません。' : input.selectionRelation === 'no-selection' ? '固有空間は選択されていません。' : '選択した固有空間への所属は判定保留です。'}</p>
    {input.matchingEigenvalueIndices.some((i) => i !== selected) && <p>選択中とは別の固有値に対応する固有ベクトルです。</p>}
    {input.eigenvectorStatus === 'eigenvector' && input.imageVector?.every((v) => v === 0) && <p>非零の入力が零へ写ります。対応する固有値は0です。</p>}
    {input.status === 'numerical-failure' && <p className="representation-warning">{input.issues.map((issue) => ISSUES[issue]).join(' ')}</p>}
  </>;
  return <>
    <Formula><Scalar>g</Scalar>(<Scalar>λ</Scalar>) = det(<Vector name="A" /> − <Scalar>λ</Scalar><Vector name="E" />)</Formula>
    {analysis.characteristicCoefficients ? <Formula><Scalar>g</Scalar>(<Scalar>λ</Scalar>) ≈ <EigenPolynomial coefficients={analysis.characteristicCoefficients} /></Formula> : <p>固有多項式の係数は数値計算を保留しています。</p>}
    <Formula><Scalar>g</Scalar>(<Scalar>λ</Scalar>) = 0</Formula>
    <p><Vector name="E" /> は単位行列です。この方程式の実数解が固有値です。</p>
  </>;
}
function EigenPolynomial({ coefficients }: { readonly coefficients: readonly number[] }) {
  const terms = coefficients.map((value, degree) => ({ value, degree })).reverse().filter(({ value }) => value !== 0);
  return <>{terms.length ? terms.map(({ value, degree }, i) => <span className="representation-atom" key={degree}>
    {value < 0 ? '− ' : i > 0 ? '+ ' : ''}{degree === 0 || Math.abs(value) !== 1 ? formatMathNumber(Math.abs(value)).text : ''}
    {degree > 0 && <Scalar>λ</Scalar>}{degree > 1 && <sup>{degree}</sup>}
  </span>) : '0'}</>;
}
function EigenNumberInput({ value, label, onValue }: { readonly value: number; readonly label: string; readonly onValue: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const errorId = useId();
  useEffect(() => setDraft(String(value)), [value]);
  const invalid = parseEigenNumber(draft) === null;
  return <label className="representation-number"><input type="text" inputMode="decimal" value={draft} aria-label={label}
    aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined} onChange={(event) => {
      setDraft(event.target.value); const next = parseEigenNumber(event.target.value); if (next !== null) onValue(next);
    }} onKeyDown={(event) => { if (event.key === 'Escape') setDraft(String(value)); }} />
    {invalid && <small id={errorId} role="status">有限数（絶対値100万以下）。図と解析は直前の値です。</small>}</label>;
}

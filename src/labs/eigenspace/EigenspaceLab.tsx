import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { analyzeEigenInput, analyzeEigenMap, type EigenInputAnalysis, type EigenMapAnalysis, type EigenIssue, type VectorValue } from '../../domain';
import { LabActionControls } from '../../app/LabActionControls';
import { VectorPlane2D, VectorLine1D, ZeroSpace0D, createAutoFitViewport, createAutoFitLineViewport, type PlaneViewport, type LineViewport } from '../../visualization';
import type { PlaneVectorPresentation } from '../../visualization/VectorPlane2D';
import { SvgVectorLabel } from '../../visualization/SvgVectorLabel';
import { toSvgPoint } from '../../visualization/planeGeometry';
import { formatMathNumber } from '../../ui';
import { Column, Formula, MapValue, Scalar, Vector } from '../representation-matrix/representationMath';
import { createEigenSpaceGeometries, editEigenMatrix, parseEigenNumber, setEigenInput, snapEigenInput, snapEigenSpaceInput, type EigenScene } from './eigenScene';
import { createEigenWorkspace, currentEigenSlot, selectEigenDimension, selectEigenKind, resetEigenWorkspace, updateEigenSlot, type EigenSlot, type EigenView } from './eigenWorkspace';
import { applyEigenPolynomialExample, EIGEN_POLYNOMIAL_EXAMPLES, eigenPolynomialRule, type EigenPolynomialExample } from './eigenPolynomial';
import { EigenCoordinateName, EigenPolynomialValue, EigenPolynomialRule, EigenPolynomialCorrespondence, EigenPolynomialBasisValue } from './eigenPolynomialMath';
import { SpaceName, StandardPolynomialBasis } from '../representation-matrix/representationObjects';
import './eigenspace.css';
import { EigenKernelExplanation, EigenShiftedMatrix, EigenSpaceSpan, eigenDirectionDescription } from './eigenExplanation';

const TABS = [['values', '固有値'], ['space', '固有空間'], ['input', '入力と像'], ['equation', '固有方程式']] as const;
type Tab = typeof TABS[number][0];
const INPUT_COLOR = '#245b8d', IMAGE_COLOR = '#ce5135';
const Space3D = lazy(() => import('../../visualization/VectorSpace3D').then((m) => ({ default: m.VectorSpace3D })));
const EDITABLE_IDS = ['eigen-input'];
const OPAQUE_IDS = ['eigen-input', 'eigen-image'];
const EMPTY_VECTORS: readonly VectorValue[] = [];
const NOOP = () => {};
const POLYNOMIAL_AXES_2D = ['b₀', 'b₁'] as const;
const POLYNOMIAL_AXES_3D = ['b₀', 'b₁', 'b₂'] as const;
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
  const [initial] = useState(() => createEigenWorkspace(initialScene));
  const [workspace, setWorkspace] = useState(initial);
  const [revision, setRevision] = useState(0);
  const dimension = workspace.dimension;
  const kind = workspace.kind;
  const selectionControls = <>
    <div className="dimension-switcher eigen-kinds"><div className="dimension-tablist" role="group" aria-label="固有値Labのベクトルの種類">
      {(['coordinate', 'polynomial'] as const).map((value) => <button key={value} type="button" aria-pressed={kind === value}
        onClick={() => setWorkspace((w) => selectEigenKind(w, value))}>{value === 'coordinate' ? '数ベクトル' : '多項式'}</button>)}
    </div></div>
    <div className="dimension-switcher eigen-dimensions"><div className="dimension-tablist" style={{ gridTemplateColumns: `repeat(${kind === 'polynomial' ? 3 : 4}, minmax(0, 1fr))` }} role="group" aria-label="固有値Labの次元">
      {([0, 1, 2, 3] as const).filter((n) => kind !== 'polynomial' || n !== 0).map((n) => <button type="button" key={n} aria-pressed={dimension === n}
        onClick={() => setWorkspace((w) => selectEigenDimension(w, n))}>{n}D</button>)}
    </div></div>
  </>;
  return <EigenSceneView key={`${kind}-${dimension}-${revision}`} active={active} slot={currentEigenSlot(workspace)} selectionControls={selectionControls}
      onSlot={(change) => setWorkspace((w) => updateEigenSlot(w, dimension, change, kind))}
      onReset={() => { setWorkspace((w) => resetEigenWorkspace(w, initial)); setRevision((r) => r + 1); }} />
}

function EigenSceneView({ active, slot, onSlot, onReset, selectionControls }: { readonly active: boolean; readonly slot: EigenSlot; readonly selectionControls: ReactNode;
  readonly onSlot: (change: (slot: EigenSlot) => EigenSlot) => void; readonly onReset: () => void }) {
  const { scene, view } = slot;
  const kind = scene.kind;
  const polynomial = kind === 'polynomial';
  const dimension = scene.definition.dimension;
  const setScene = (change: (scene: EigenScene) => EigenScene) => onSlot((s) => ({ ...s, scene: change(s.scene) }));
  const setView = (change: Partial<EigenView>) => onSlot((s) => ({ ...s, view: { ...s.view, ...change } }));
  const setManualViewport = (plane: PlaneViewport | null) => setView({ plane });
  const manualViewport = view.plane;
  const [tab, setTab] = useState<Tab>('values');
  const [editorRevision, setEditorRevision] = useState(0);
  const [dragViewport, setDragViewport] = useState<PlaneViewport | null>(null);
  const [dragLine, setDragLine] = useState<LineViewport | null>(null);
  const [preview, setPreview] = useState<readonly number[] | null>(null);
  const previewRef = useRef<readonly number[] | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // 入力のpreview・数値編集ではこの解析を繰り返さない。
  const analysis = useMemo(() => analyzeEigenMap(scene.definition), [scene.definition]);
  const current = preview ?? scene.input;
  const inputResult = useMemo(() => analyzeEigenInput(analysis, current), [analysis, current]);
  const geometries = useMemo(() => createEigenSpaceGeometries(analysis), [analysis]);
  const geometry = geometries[0];
  const vectors: VectorValue[] = [
    // 像を先に描き、編集できる入力ハンドルを常に手前に残す。
    ...(inputResult.imageVector ? [{ id: 'eigen-image', name: 'T(u)', coordinates: inputResult.imageVector }] : []),
    { id: 'eigen-input', name: 'u', coordinates: current },
  ];
  const viewport = dragViewport ?? manualViewport ?? createAutoFitViewport(dimension === 2 ? vectors : []);
  const lineViewport = dragLine ?? view.line ?? createAutoFitLineViewport(dimension === 1 ? vectors.map((v) => v.coordinates[0]) : []);
  const presentation = dimension === 2 ? eigenVectorPresentation(current, inputResult.imageVector, viewport) : undefined;
  const dragging = preview !== null || dragViewport !== null || dragLine !== null;
  function cancelDrag() { previewRef.current = null; setPreview(null); setDragViewport(null); setDragLine(null); }
  useEffect(() => { if (!active) cancelDrag(); }, [active]);
  // Three.jsの構築入力は確定状態からのみ生成。ドラッグ中の像は専用previewで更新する。
  const committedResult = useMemo(() => analyzeEigenInput(analysis, scene.input), [analysis, scene.input]);
  const spaceVectors = useMemo(() => [
    { id: 'eigen-image', name: 'T(u)', coordinates: committedResult.imageVector ?? [0, 0, 0] },
    { id: 'eigen-input', name: 'u', coordinates: scene.input },
  ], [committedResult.imageVector, scene.input]);
  const spaceColors = useMemo(() => [IMAGE_COLOR, INPUT_COLOR], []);
  const rootLabels = eigenRootLabels(analysis);
  const spaceGroups = useMemo(() => geometries.map((g) => ({ vectors: g.vectors, rank: g.dimension,
    label: eigenRootLabels(analysis)[g.index] + 'の固有空間' })), [geometries, analysis]);
  const imagePreview = useMemo(() => preview || committedResult.imageVector === null ? {
    vectorId: 'eigen-image', coordinates: inputResult.imageVector as readonly [number, number, number] | null,
  } : null, [preview, committedResult.imageVector, inputResult.imageVector]);
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1
      : event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : null;
    if (next === null) return;
    event.preventDefault(); setTab(TABS[next][0]); tabRefs.current[next]?.focus();
  }
  const colors = inputResult.imageVector ? [IMAGE_COLOR, INPUT_COLOR] : [INPUT_COLOR];
  return <main className="lab-page eigenspace-lab" data-lab-id="eigenspace" aria-hidden={!active}>
    <section className="lab-intro" aria-labelledby="eigenspace-title">
      <div><p className="panel-kicker">Eigenspace / {polynomial ? 'Polynomial / ' : ''}{dimension}D</p><h1 id="eigenspace-title">固有値と固有空間</h1>
        <p>入力とその像を重ねて、固有値と固有空間の関係を調べます。</p></div>
      <div><LabActionControls exportDisabled exportDescriptionId="eigen-share-help" onExport={NOOP} onReset={onReset} />
        <small id="eigen-share-help">このLabの共有は準備中です。</small></div>
    </section>
    {selectionControls}
    <div className="lab-workspace eigen-workspace">
      <section className="plot-card eigen-plot" aria-labelledby="eigen-plot-title">
        <div className="card-heading"><div><p className="panel-kicker">Linear transformation</p>
          <h2 id="eigen-plot-title">空間 <Scalar>U</Scalar> = {dimension === 0 ? <>{'{'}<Vector name="0" />{'}'}</> : <SpaceName kind={kind} dimension={dimension} />}{polynomial && '（係数空間）'}</h2></div>
          {(dimension === 1 || dimension === 2) && <button className="basis-fit-button" type="button" disabled={dragging}
            onClick={() => setView({ plane: null, line: null })}>全体を表示</button>}</div>
        <div className="eigen-selection">
          <label className="eigen-show"><input type="checkbox" checked={scene.showEigenspace} disabled={!geometry || dragging}
            onChange={(event) => setScene((s) => ({ ...s, showEigenspace: event.target.checked }))} />固有空間を表示</label>
        </div>
        {dimension === 0 && <ZeroSpace0D idPrefix="eigen-zero" spaceName="U" description="この空間にあるベクトルは零ベクトルだけです。成分はなく、空間の次元は0です。" />}
        {dimension === 1 && <VectorLine1D idPrefix="eigen-line" vectors={vectors} colors={colors} viewport={lineViewport}
          axisLabel={polynomial ? 'b₀' : 'x'}
          editableVectorIds={EDITABLE_IDS} alwaysOpaqueVectorIds={OPAQUE_IDS} showHelpText={false}
          outlinedVectorIds={['eigen-image']} onViewportChange={(line) => setView({ line })}
          showSpan={scene.showEigenspace && !!geometry} spanDimension={geometry ? 1 : 0} spanLabel="固有空間"
          onVectorDragStart={() => { setDragLine(lineViewport); previewRef.current = scene.input; }}
          onVectorChange={(_, coordinates) => { previewRef.current = coordinates; setPreview(coordinates); }}
          onVectorDragEnd={() => { const input = previewRef.current; if (input) setScene((s) => setEigenInput(s, input)); cancelDrag(); }}
          onVectorDragCancel={cancelDrag} />}
        {dimension === 2 && <VectorPlane2D idPrefix="eigen-plane" vectors={vectors} colors={colors} viewport={viewport}
          axisLabels={polynomial ? POLYNOMIAL_AXES_2D : undefined}
          editableVectorIds={EDITABLE_IDS} alwaysOpaqueVectorIds={OPAQUE_IDS}
          vectorPresentation={presentation} onViewportChange={setManualViewport}
          showSpan={scene.showEigenspace && !!geometry} spanVectors={geometry?.vectors ?? []} spanDimension={geometry?.dimension ?? 0}
          spanLineDirections={geometries.filter((g) => g.dimension === 1).map((g) => ({
            direction: g.vectors[0].coordinates as readonly [number, number], label: rootLabels[g.index] + 'の固有空間',
          }))}
          spanLabel={`固有空間（${geometries.length}個）`} onVectorDragStart={() => { setDragViewport(viewport); previewRef.current = scene.input; }}
          onVectorChange={(_, coordinates) => {
            const snapped = snapEigenInput(scene, analysis, coordinates, viewport.maxX - viewport.minX);
            previewRef.current = snapped.coordinates; setPreview(snapped.coordinates);
          }}
          onVectorDragEnd={() => { const input = previewRef.current; if (input) setScene((s) => setEigenInput(s, input)); cancelDrag(); }}
          onVectorDragCancel={cancelDrag} />}
        {dimension === 3 && active && <Suspense fallback={<p role="status">3D表示を準備しています。数値入力と解析は利用できます。</p>}>
          <Space3D idPrefix="eigen-space" vectors={spaceVectors} colors={spaceColors} spanVectors={geometry?.vectors ?? EMPTY_VECTORS}
            axisLabels={polynomial ? POLYNOMIAL_AXES_3D : undefined}
            spanRank={geometry?.dimension ?? 0} spanGroups={spaceGroups} showSpan={scene.showEigenspace}
            spanLabel="表示中の各固有空間" snapEditableVectorsToSpan editableVectorIds={EDITABLE_IDS} alwaysOpaqueVectorIds={OPAQUE_IDS}
            vectorCoordinatePreview={imagePreview} linearCombinationVisible={false} linearCombinationTarget={null} linearCombinationCoefficients={null}
            active={active} resetKey={0} camera={view.camera} onCameraChange={(camera) => setView({ camera })}
            onVectorCoordinatesPreview={(_, coordinates) => setPreview(coordinates)}
            onVectorCoordinatesCommit={(_, coordinates) => { setScene((s) => setEigenInput(s, coordinates)); cancelDrag(); }}
            onVectorCoordinatesSnap={(_, coordinates, distance) => snapEigenSpaceInput(scene, analysis, coordinates, distance)}
            onLinearCombinationTargetPlacement={NOOP} onLinearCombinationVisibility={NOOP}
            showLinearCombinationControl={false} showHeading={false} showHelpText={false} spaceTitle={polynomial ? '入力と像の係数空間' : '入力と像'}
            assistiveDescription={polynomial ? '入力多項式と像の標準単項式係数を同じ3次元係数空間に表示します。固有値・固有空間の基底と多項式は解析タブで確認できます。' : '入力と像を同じ3次元座標空間に表示します。固有値、各固有空間の次元と基底、入力と像の成分は解析タブで確認できます。'}
            unavailableFallbackDescription="行列・入力の数値編集と解析タブ、Resetはそのまま利用できます。" />
        </Suspense>}
        {dimension > 0 && <p className="eigen-legend"><span style={{ color: INPUT_COLOR }}>● 入力 <EigenCoordinateName kind={kind} /></span>
          <span style={{ color: IMAGE_COLOR }}>◇ 像 <EigenCoordinateName kind={kind} mapped /></span></p>}
        {polynomial && <p className="eigen-coefficient-note">矢印は多項式の係数列を表します（関数グラフではありません）。</p>}
      </section>
      <div className="analysis-column">
        <section className="basis-candidate-card eigen-editor" aria-labelledby="eigen-edit-title">
          <p className="panel-kicker">Edit transformation</p><h2 id="eigen-edit-title">行列と入力</h2>
          {polynomial && <Formula><span className="basis-script-symbol">ℰ</span> = <StandardPolynomialBasis dimension={dimension} /></Formula>}
          <Formula><EigenCoordinateName kind={kind} mapped /> = <Vector name="A" /><EigenCoordinateName kind={kind} /></Formula>
          {polynomial && <><label className="eigen-example-select">行列の例（入力は保持）<select aria-label="多項式の線形変換の行列の例" value="" disabled={dragging}
            onChange={(event) => { const example = event.target.value as EigenPolynomialExample;
              if (EIGEN_POLYNOMIAL_EXAMPLES.some(([id]) => id === example)) {
                setScene((s) => applyEigenPolynomialExample(s, example)); setEditorRevision((r) => r + 1);
              }
            }}><option value="">選択して適用</option>{EIGEN_POLYNOMIAL_EXAMPLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <EigenPolynomialRule rule={eigenPolynomialRule(scene)} /></>}
          {dimension === 0 ? <p>零ベクトルだけの空間です。行列と入力の成分はありません。</p> : <fieldset key={editorRevision} disabled={dragging}>
            <legend className="visually-hidden">行列と入力の成分</legend>
            <div className="eigen-editor-row"><Vector name="A" /> = <span className="linear-map-matrix-input" style={{ gridTemplateColumns: `repeat(${dimension}, minmax(0, 1fr))` }}>
              {scene.definition.matrix.flatMap((row, r) => row.map((v, c) => <EigenNumberInput key={`${r}-${c}`} value={v} label={`行列Aの第${r + 1}行第${c + 1}列`}
                onValue={(value) => setScene((s) => editEigenMatrix(s, r, c, value))} />))}</span></div>
            <div className="eigen-editor-row" style={{ color: INPUT_COLOR }}><EigenCoordinateName kind={kind} /> = <span className="linear-map-vector-input">
              {scene.input.map((v, i) => <EigenNumberInput key={i} value={v} label={polynomial ? `入力多項式の係数b${i}` : `入力uの第${i + 1}成分`}
                onValue={(value) => setScene((s) => setEigenInput(s, s.input.map((entry, index) => index === i ? value : entry)))} />)}</span></div>
          </fieldset>}
          {polynomial && <EigenPolynomialValue coefficients={current} />}
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
          <EigenPanel tab={id} analysis={analysis} input={inputResult} kind={kind} />
        </section>)}
      </div>
    </div>
  </main>;
}

/** 丸め表示が衝突する根はnumberの全桁へ戻し、序数も併記して同じ根に見せない。 */
export function eigenRootLabels(analysis: EigenMapAnalysis): string[] {
  const texts = analysis.realEigenvalues.map((root) => formatMathNumber(root.value).text);
  return analysis.realEigenvalues.map((root, i) => `${i + 1}: λ = ${texts.filter((v) => v === texts[i]).length > 1 ? String(root.value).replaceAll('-', '−') : texts[i]}`);
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

export function EigenPanel({ tab, analysis, input, kind = 'coordinate' }: { readonly tab: Tab; readonly analysis: EigenMapAnalysis; readonly input: EigenInputAnalysis; readonly kind?: EigenScene['kind'] }) {
  // D-106: このLabの教材表示は丸めを含め等号で統一。内部の数値基準・保留は維持する。
  if (analysis.definition.dimension === 0) return tab === 'equation' ? <>
    <Formula><Scalar>g</Scalar>(<Scalar>λ</Scalar>) = det(<Vector name="A" /> − <Scalar>λ</Scalar><Vector name="E" />) = 1</Formula>
    <p>0×0行列の行列式は1です。固有方程式に解はありません。</p>
  </> : tab === 'input' ? <>
    <Formula><Vector name="u" /> = <Vector name="0" />, <MapValue name="u" /> = <Vector name="0" /></Formula>
    <p>零ベクトルは固有ベクトルではありません。</p>
  </> : <p>0次元空間には非零ベクトルがないため、固有値も固有ベクトルも固有空間もありません。正の次元の零変換（固有値0）とは異なります。</p>;
  if (tab === 'values') return analysis.status === 'no-real-eigenvalues' ? <p>この線形変換には実固有値がありません。</p> : <>
    <p>実固有値{analysis.spectrumComplete ? `は${analysis.realEigenvalues.length}個です。` : 'の確認できた部分を示します。'}</p>
    <ul className="eigen-values">{analysis.realEigenvalues.map((value, i) => <li key={i}>
      <span className="linear-map-math">{i + 1}: <Scalar>λ</Scalar> = {eigenRootLabels(analysis)[i].split(' = ')[1]}</span><span>固有値の重複度：{value.algebraicMultiplicity ?? '判定保留'}</span>
      <span>固有空間の次元：{value.eigenspace?.dimension ?? '判定保留'}</span></li>)}</ul>
    <p>重複度は、固有方程式の根として重なる回数です。固有空間の次元は、その空間の基底を構成するベクトルの本数です。両者は必ずしも一致しません。</p></>;
  if (tab === 'space') return analysis.realEigenvalues.length ? <><EigenKernelExplanation kind={kind} />{analysis.realEigenvalues.map((root, index) => <article className="eigen-space-detail" key={index}>
    <Formula><Scalar>λ</Scalar> = {eigenRootLabels(analysis)[index].split(' = ')[1]}</Formula>
    {root.eigenspace ? <>
    <EigenShiftedMatrix analysis={analysis} index={index} rootLabel={eigenRootLabels(analysis)[index].split(' = ')[1]} />
    <p>固有空間の次元：{root.eigenspace.dimension}</p><h3>固有空間の基底の一例</h3>
    <Formula><span className="basis-script-symbol">𝒬</span> = ({root.eigenspace.basis.map((_, i) => <span key={i}>{i > 0 && ', '}<Vector name={`q${i + 1}`} /></span>)})</Formula>
    {root.eigenspace.basis.map((q, i) => kind === 'polynomial'
      ? <EigenPolynomialBasisValue key={i} name={`q${i + 1}`} coefficients={q} />
      : <Formula key={i}><Vector name={`q${i + 1}`} /> = <Column values={q} /></Formula>)}
    <EigenSpaceSpan dimension={root.eigenspace.dimension} />
    <p>この基底の任意の一次結合が、上の同次方程式の解になります。固有空間は零ベクトルを含みます。基底の取り方は唯一ではありません。</p>
    </> : <p>この固有値の固有空間は判定保留です。</p>}
  </article>)}</> : <p>{analysis.status === 'no-real-eigenvalues' ? '実固有値がないため、固有空間はありません。' : '表示できる固有空間は未確定です。'}</p>;
  if (tab === 'input') return <>
    {kind === 'polynomial' && <><EigenPolynomialCorrespondence dimension={analysis.definition.dimension} />
      <EigenPolynomialValue coefficients={input.inputVector} /></>}
    <Formula><EigenCoordinateName kind={kind} /> = <Column values={input.inputVector} /></Formula>
    <Formula><EigenCoordinateName kind={kind} mapped /> = <Vector name="A" /><EigenCoordinateName kind={kind} />{input.imageVector ? <> = <Column values={input.imageVector} /></> : <>（数値計算を保留）</>}</Formula>
    {kind === 'polynomial' && input.imageVector && <EigenPolynomialValue mapped coefficients={input.imageVector} />}
    <p><strong>{input.eigenvectorStatus === 'zero-input' ? '零ベクトルは固有ベクトルではありません。'
      : input.eigenvectorStatus === 'eigenvector' ? '入力は固有ベクトルです（数値基準内）。'
        : input.eigenvectorStatus === 'not-eigenvector' ? '入力は固有ベクトルではありません。' : '固有ベクトルかどうかの判定は保留です。'}</strong></p>
    {input.matchingEigenvalueIndices.map((i) => <div key={i}><Formula><MapValue name="u" /> = ({eigenRootLabels(analysis)[i].split(' = ')[1]})<Vector name="u" /></Formula>
      {kind === 'polynomial' && <Formula><EigenCoordinateName kind={kind} mapped /> = ({eigenRootLabels(analysis)[i].split(' = ')[1]})<EigenCoordinateName kind={kind} /></Formula>}
      <p>この固有値の固有空間に属します。{kind === 'polynomial' && '係数空間の矢印では、'}{eigenDirectionDescription(analysis.realEigenvalues[i].value)}</p></div>)}
    {kind === 'polynomial' && input.eigenvectorStatus === 'eigenvector' && <p>入力は固有ベクトルである多項式です。</p>}
    {input.zeroStatus === 'zero' && analysis.realEigenvalues.some((r) => r.eigenspace) && <p>零ベクトルは、すべての固有空間に属します。</p>}
    {input.zeroStatus === 'zero' && <><Formula><MapValue name="u" /> = <Scalar>λ</Scalar><Vector name="u" /> = <Vector name="0" /></Formula>
      <p>零入力では任意の実数 <Scalar>λ</Scalar> でこの等式が成り立つため、固有値を特定できません。固有ベクトルには非零という条件が必要です。</p></>}
    {input.status === 'numerical-failure' && <p className="representation-warning">{input.issues.map((issue) => ISSUES[issue]).join(' ')}</p>}
  </>;
  return <>
    <Formula><Scalar>g</Scalar>(<Scalar>λ</Scalar>) = det(<Vector name="A" /> − <Scalar>λ</Scalar><Vector name="E" />)</Formula>
    {analysis.characteristicCoefficients ? <Formula><Scalar>g</Scalar>(<Scalar>λ</Scalar>) = <EigenPolynomial coefficients={analysis.characteristicCoefficients} /> = 0</Formula> : <p>固有多項式の係数は数値計算を保留しています。</p>}
    <p><Vector name="E" /> は単位行列です。この方程式の実数解が固有値です。</p>
    <p>行列 <Vector name="A" /> − <Scalar>λ</Scalar><Vector name="E" /> の行列式が0であることと、同次方程式に非零解があることは同値です。解全体と基底は「固有空間」タブで確認できます。</p>
    <p className="eigen-numeric-note">数値は表示桁数に丸め、数式は等号で表示しています。判定は丸め前の値と数値基準を用い、不確かな結果は保留します。</p>
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

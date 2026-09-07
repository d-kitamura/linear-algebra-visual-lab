import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { analyzeRepresentationMatrix, analyzeBasisChange, type VectorValue, type VectorSet } from '../../domain';
import { LabActionControls } from '../../app/LabActionControls';
import { VectorPlane2D, createAutoFitViewport, type PlaneViewport } from '../../visualization';
import { formatMathNumber, splitVectorName } from '../../ui';
import { createRepresentationScene, dragRepresentationVector, editRepresentationValue, parseRepresentationNumber, swapRepresentationBasis, type BasisSide } from './representationMatrixState';

const TABS = [['edit', '写像と基底'], ['columns', '表現行列の作り方'], ['coordinates', '座標での作用'], ['change', '基底変換']] as const;
type TabId = typeof TABS[number][0];
const COLORS: Readonly<Record<string, string>> = { u1: '#d55535', u2: '#13877e', v1: '#7661b5', v2: '#94651c', w: '#245b8d' };
const color = (name: string) => COLORS[name.replace(/^T\((.*)\)$/u, '$1')] ?? '#245b8d';

/** M,wと順序付き基底だけを保持し、A・像・座標は常に導出する。 */
export function RepresentationMatrixLab({ active }: { readonly active: boolean }) {
  const [scene, setScene] = useState(createRepresentationScene);
  const [tab, setTab] = useState<TabId>('edit');
  const [resetKey, setResetKey] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [manual, setManual] = useState<Record<BasisSide, PlaneViewport | null>>({ source: null, target: null });
  const [dragViews, setDragViews] = useState<Record<BasisSide, PlaneViewport | null>>({ source: null, target: null });
  const result = useMemo(() => analyzeRepresentationMatrix(scene.definition, scene.source, scene.target, scene.input), [scene]);
  const change = useMemo(() => analyzeBasisChange(2, scene.source, scene.target, scene.input), [scene.source, scene.target, scene.input]);
  const derived = result.representation;
  const images = scene.source.vectors.map((vector): VectorValue => ({
    id: 'image-' + vector.id, name: 'T(' + vector.name + ')',
    // APIと同様、描画前に微小成分を0へ整理しない。
    coordinates: scene.definition.matrix.map((row) => row.reduce((sum, value, i) => sum + value * vector.coordinates[i], 0)),
  }));
  const domainVectors = [...scene.source.vectors, { id: 'w', name: 'w', coordinates: scene.input }];
  // 同じ矢先に重なっても編集可能な基底が手前になる描画順。
  const codomainVectors = [...images, { id: 'image-w', name: 'T(w)', coordinates: result.imageVector }, ...scene.target.vectors];
  const vectors = { source: domainVectors, target: codomainVectors };
  const viewports = {
    source: dragViews.source ?? manual.source ?? createAutoFitViewport(domainVectors),
    target: dragViews.target ?? manual.target ?? createAutoFitViewport(codomainVectors),
  };
  const basisFailure = (side: BasisSide) => !result[side === 'source' ? 'sourceBasis' : 'targetBasis'].isBasis;
  function reset() {
    setScene(createRepresentationScene());
    setManual({ source: null, target: null });
    setDragViews({ source: null, target: null });
    setResetKey((value) => value + 1);
    setTab('edit');
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1
      : event.key === 'ArrowRight' ? (index + 1) % TABS.length
        : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : null;
    if (next === null) return;
    event.preventDefault();
    setTab(TABS[next][0]);
    tabRefs.current[next]?.focus();
  }
  const failure = <div className="representation-warning" role={active ? 'status' : undefined}>
    {result.status === 'invalid-basis' ? <>
      {basisFailure('source') && <p>定義域の候補 <BasisName name="B" /> は <Scalar>U</Scalar> = ℝ<sup>2</sup> の基底ではありません。</p>}
      {basisFailure('target') && <p>終域の候補 <BasisName name="C" /> は <Scalar>V</Scalar> = ℝ<sup>2</sup> の基底ではありません。</p>}
      <p>2本が一次独立となるように編集してください。表現行列・基底座標は未確定です。</p>
    </> : <p>数値計算の精度を確認できません。成分の大きさや基底の近さを調整してください。数学的な「基底ではない」とは異なります。</p>}
    <p>基準座標の写像と像は引き続き表示しています。</p>
  </div>;

  return <main className="lab-page representation-lab" data-lab-id="representation-matrix" aria-hidden={!active}>
    <section className="lab-intro" aria-labelledby="representation-title">
      <div><p className="panel-kicker">Representation matrix / 2D → 2D</p>
        <h1 id="representation-title">表現行列・基底変換Lab</h1>
        <p>同じ写像でも、2つの基底とその順序によって表現行列は変わります。</p>
      </div>
      <div><LabActionControls exportDisabled exportDescriptionId="representation-share-help" onExport={() => {}} onReset={reset} />
        <p className="lab-action-help" id="representation-share-help">このLabの共有URL・QRは11.7で対応予定です。ResetはこのLabだけを初期例へ戻します。</p>
      </div>
    </section>
    <p className="representation-fixed-note">基底を編集・並べ替えても、基準行列 <Vector name="M" /> と入力 <Vector name="w" /> は変わりません。グラフの軸は標準座標のままです。</p>
    <div className="linear-map-workspace">
      <div className="linear-map-diagram-grid">
        {(['source', 'target'] as const).map((side) => <section key={side} className="plot-card linear-map-plot-card" aria-labelledby={'representation-' + side + '-title'}>
          <div className="card-heading"><div><p className="panel-kicker">{side === 'source' ? 'Domain' : 'Codomain'}</p>
            <h2 id={'representation-' + side + '-title'}>{side === 'source' ? '定義域' : '終域'} <Scalar>{side === 'source' ? 'U' : 'V'}</Scalar> = ℝ<sup>2</sup></h2></div>
            <button type="button" className="basis-fit-button" onClick={() => setManual((value) => ({ ...value, [side]: null }))}>全体を表示</button>
          </div>
          <VectorPlane2D idPrefix={'representation-' + side + '-plane'}
            vectors={vectors[side]} colors={vectors[side].map((vector) => color(vector.name))}
            viewport={viewports[side]} onViewportChange={(viewport) => setManual((value) => ({ ...value, [side]: viewport }))}
            editableVectorIds={side === 'source' ? domainVectors.map((vector) => vector.id) : scene.target.vectors.map((vector) => vector.id)}
            onVectorDragStart={() => setDragViews({ source: viewports.source, target: viewports.target })}
            onVectorChange={(id, coordinates) => setScene((value) => dragRepresentationVector(value, side, id, coordinates, viewports[side].maxX - viewports[side].minX))}
            onVectorDragEnd={() => setDragViews({ source: null, target: null })}
          />
        </section>)}
      </div>
      <p className="representation-legend">定義域：赤・緑の基底と青の入力。終域：紫・黄褐色の基底、赤・緑の基底像と青の入力の像。基底と入力の矢先をドラッグできます。</p>
      <div className="linear-map-inspector">
        <div className="inspector-tablist linear-map-inspector-tablist representation-tabs" role="tablist" aria-label="表現行列の編集・解析">
          {TABS.map(([id, label], index) => <button key={id} type="button" role="tab"
            id={'representation-tab-' + id} aria-controls={'representation-panel-' + id} aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1} ref={(element) => { tabRefs.current[index] = element; }}
            onClick={() => setTab(id)} onKeyDown={(event) => tabKey(event, index)}>{label}</button>)}
        </div>
        {TABS.map(([id, label]) => <section key={id} id={'representation-panel-' + id} role="tabpanel"
          aria-labelledby={'representation-tab-' + id} hidden={tab !== id} tabIndex={0}
          className="linear-map-control-card inspector-panel representation-panel">
          <h2>{label}</h2>
          {id === 'edit' && <div className="representation-edit-grid" key={resetKey}>
            <article><h3>基準基底に関する行列</h3><p>ここだけが写像そのものの編集です。</p>
              <Formula><Vector name="M" /> = <span className="linear-map-matrix-input">
                {scene.definition.matrix.flatMap((row, r) => row.map((value, c) => <NumberInput key={r + '-' + c} value={value} label={'行列Mの第' + (r + 1) + '行第' + (c + 1) + '列'}
                  onValue={(next) => setScene((s) => editRepresentationValue(s, 'matrix', r, c, next))} />))}
              </span></Formula>
              <h3>標準座標の入力</h3><Formula><Vector name="w" /> = <span className="linear-map-vector-input">
                {scene.input.map((value, r) => <NumberInput key={r} value={value} label={'入力wの第' + (r + 1) + '成分'}
                  onValue={(next) => setScene((s) => editRepresentationValue(s, 'input', r, 0, next))} />)}
              </span></Formula>
            </article>
            {(['source', 'target'] as const).map((side) => <article key={side}>
              <h3>{side === 'source' ? '定義域の基底' : '終域の基底'}</h3>
              <Formula><BasisName name={side === 'source' ? 'B' : 'C'} /> = <Tuple basis={scene[side]} /></Formula>
              {scene[side].vectors.map((vector, column) => <div className="representation-basis-row" key={vector.id}>
                <span style={{ color: color(vector.name) }}><Vector name={vector.name} /></span> =
                <span className="linear-map-vector-input">{vector.coordinates.map((value, row) => <NumberInput key={row} value={value} label={vector.name + 'の第' + (row + 1) + '成分'}
                  onValue={(next) => setScene((s) => editRepresentationValue(s, side, row, column, next))} />)}</span>
                <span>{column + 1}番目</span>
              </div>)}
              <button type="button" className="basis-fit-button" onClick={() => setScene((s) => swapRepresentationBasis(s, side))}>{side === 'source' ? '定義域' : '終域'}の基底順序を交換</button>
              <p>{basisFailure(side) ? '一次従属：この候補は基底ではありません。' : '一次独立：空間全体の基底です。'}</p>
            </article>)}
          </div>}
          {id === 'columns' && <>
            <p>基底 <BasisName name="B" /> から基底 <BasisName name="C" /> に関する <Scalar>T</Scalar> の表現行列</p>
            <Formula><Tuple basis={scene.source} mapped /> = <Tuple basis={scene.target} /><Vector name="A" /></Formula>
            {derived ? <>
              <Formula><Vector name="A" /><Equals values={derived.matrix.flat()} /><Matrix values={derived.matrix} columnColors={scene.source.vectors.map((vector) => color(vector.name))} /></Formula>
              <div className="representation-column-grid">{scene.source.vectors.map((vector, i) => <article key={vector.id} style={{ borderTopColor: color(vector.name) }}>
                <h3 style={{ color: color(vector.name) }}>第{i + 1}列：<MapValue name={vector.name} /></h3>
                <Formula><MapValue name={vector.name} /><Equals values={derived.basisImages[i]} /><Column values={derived.basisImages[i]} /></Formula>
                <Formula><MapValue name={vector.name} /> = {scene.target.vectors.map((v, row) => <span className="representation-atom" key={v.id}>{row > 0 && ' + '}<Scalar>a</Scalar><sub>{row + 1}{i + 1}</sub><Vector name={v.name} /></span>)}</Formula>
                <Formula><MapValue name={vector.name} /><Equals values={derived.columnCoordinates[i]} /><Combination basis={scene.target} coefficients={derived.columnCoordinates[i]} /></Formula>
                <Formula>第{i + 1}列：<Column values={derived.columnCoordinates[i]} /></Formula>
              </article>)}</div>
            </> : failure}
          </>}
          {id === 'coordinates' && <>
            <p>標準座標で写す経路と、基底座標を表現行列で移す経路を比べます。</p>
            <Formula><MapValue name="w" /> = <Vector name="M" /><Vector name="w" /><Equals values={result.imageVector} /><Column values={result.imageVector} /></Formula>
            <Formula><Matrix values={scene.definition.matrix} /><Column values={scene.input} /><Equals values={[...scene.definition.matrix.flat(), ...scene.input, ...result.imageVector]} /><Column values={result.imageVector} /></Formula>
            {derived ? <>
              <Formula><Vector name="c" /> = <CoordinateName basis="B" /><Equals values={derived.inputCoordinates} /><Column values={derived.inputCoordinates} /></Formula>
              <Formula><Vector name="d" /> = <CoordinateName basis="C" mapped /> = <Vector name="A" /><Vector name="c" /><Equals values={derived.imageCoordinatesViaMatrix} /><Column values={derived.imageCoordinatesViaMatrix} /></Formula>
              <Formula><Matrix values={derived.matrix} /><Column values={derived.inputCoordinates} /><Equals values={[...derived.matrix.flat(), ...derived.inputCoordinates, ...derived.imageCoordinatesViaMatrix]} /><Column values={derived.imageCoordinatesViaMatrix} /></Formula>
              <Formula><MapValue name="w" /> = <Tuple basis={scene.target} /><Vector name="d" /><Equals values={derived.imageViaCoordinates} /><Column values={derived.imageViaCoordinates} /></Formula>
              <p>2つの経路は数値許容誤差内で一致しています。同じ写像・同じ入力でも、基底とその順序を変えると座標が変わります。</p>
            </> : failure}
          </>}
          {id === 'change' && <>
            <p>ここでは同じ2基底で恒等写像を考えます。現在の写像 <Vector name="M" /> は変更しません。</p>
            <h3>基底<BasisName name="B" />の座標 → 基底<BasisName name="C" />の座標</h3>
            <Formula><ChangeName /><CoordinateName basis="B" /> = <CoordinateName basis="C" /></Formula>
            <Formula><Tuple basis={scene.source} /> = <Tuple basis={scene.target} /><ChangeName /></Formula>
            {change.representation ? <>
              <Formula><ChangeName /><Equals values={change.representation.matrix.flat()} /><Matrix values={change.representation.matrix} /></Formula>
              <Formula><Column values={change.representation.inputCoordinates} /> → <Column values={change.representation.imageCoordinates} /></Formula>
              <p>座標を変えてもベクトル自体は同じです。逆方向の比較と独立した基底変換モードは11.5で追加します。</p>
            </> : <p className="representation-warning">基底変換を確定できません。両候補の独立性と数値計算の精度を確認してください。</p>}
          </>}
        </section>)}
      </div>
    </div>
  </main>;
}

function NumberInput({ value, label, onValue }: { readonly value: number; readonly label: string; readonly onValue: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const invalid = parseRepresentationNumber(draft) === null;
  return <label className="representation-number"><input type="text" inputMode="decimal" value={draft} aria-label={label} aria-invalid={invalid}
    onChange={(event) => { setDraft(event.target.value); const next = parseRepresentationNumber(event.target.value); if (next !== null) onValue(next); }}
    onKeyDown={(event) => { if (event.key === 'Escape') setDraft(String(value)); }} />
    {invalid && <small role="status">有限数（絶対値100万以下）を入力。グラフは直前値です。</small>}
  </label>;
}
function Vector({ name }: { readonly name: string }) {
  const parts = splitVectorName(name);
  return <span className="math-vector"><span className="math-vector-base">{parts.base}</span>{parts.subscript && <sub className="math-vector-subscript">{parts.subscript}</sub>}</span>;
}
function Scalar({ children }: { readonly children: ReactNode }) { return <span className="math-scalar-base">{children}</span>; }
function BasisName({ name }: { readonly name: 'B' | 'C' }) { return <span className="basis-script-symbol">{name === 'B' ? 'ℬ' : '𝒞'}</span>; }
function MapValue({ name }: { readonly name: string }) { return <span className="representation-atom"><Scalar>T</Scalar>(<Vector name={name} />)</span>; }
function Tuple({ basis, mapped = false }: { readonly basis: VectorSet; readonly mapped?: boolean }) {
  return <span className="representation-atom">({basis.vectors.map((v, i) => <span key={v.id}>{i > 0 && ', '}{mapped ? <MapValue name={v.name} /> : <Vector name={v.name} />}</span>)})</span>;
}
function ChangeName() { return <span className="representation-atom"><Vector name="P" /><sub><BasisName name="C" />←<BasisName name="B" /></sub></span>; }
function CoordinateName({ basis, mapped = false }: { readonly basis: 'B' | 'C'; readonly mapped?: boolean }) {
  return <span className="representation-atom">[{mapped ? <MapValue name="w" /> : <Vector name="w" />}]<sub><BasisName name={basis} /></sub></span>;
}
function Formula({ children }: { readonly children: ReactNode }) { return <div className="representation-formula linear-map-math">{children}</div>; }
function Equals({ values }: { readonly values: readonly number[] }) { return <span>{values.some((v) => formatMathNumber(v).approximate) ? '≈' : '='}</span>; }
function Column({ values }: { readonly values: readonly number[] }) {
  return <span className="display-column-vector linear-map-column-vector" aria-label={'列ベクトル ' + values.join('、')}>{values.map((v, i) => <span key={i}>{formatMathNumber(v).text}</span>)}</span>;
}
function Matrix({ values, columnColors }: { readonly values: readonly (readonly number[])[]; readonly columnColors?: readonly string[] }) {
  return <span className="linear-map-display-matrix" aria-label={values.map((row, i) => '第' + (i + 1) + '行 ' + row.join('、')).join('。')}>{values.flatMap((row, r) => row.map((v, c) => <span key={r + '-' + c} style={{ color: columnColors?.[c] }}>{formatMathNumber(v).text}</span>))}</span>;
}
function Combination({ basis, coefficients }: { readonly basis: VectorSet; readonly coefficients: readonly number[] }) {
  return <>{basis.vectors.map((v, i) => <span className="representation-atom" key={v.id}>{i > 0 && ' + '}({formatMathNumber(coefficients[i]).text})<Vector name={v.name} /></span>)}</>;
}

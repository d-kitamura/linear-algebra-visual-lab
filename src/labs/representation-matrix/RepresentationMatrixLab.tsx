import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { analyzeRepresentationMatrix, analyzeBasisChange, analyzeVectorSet, type VectorValue, type VectorSet } from '../../domain';
import { LabActionControls } from '../../app/LabActionControls';
import { VectorPlane2D, VectorLine1D, createAutoFitLineViewport, createAutoFitViewport } from '../../visualization';
import { formatMathNumber, splitVectorName } from '../../ui';
import { dragRepresentationVector, dragRepresentationLineVector, setRepresentationVector, snapRepresentationSpaceVector, editRepresentationValue, parseRepresentationNumber, moveRepresentationBasis, REPRESENTATION_DIMENSIONS, type BasisSide, type RepresentationDimension, type RepresentationScene } from './representationMatrixState';
import { createRepresentationWorkspace, representationShapeId, resetRepresentationWorkspace, type RepresentationViewState } from './representationWorkspace';

const VectorSpace3D = lazy(async () => ({ default: (await import('../../visualization/VectorSpace3D')).VectorSpace3D }));

const TABS = [['edit', '写像と基底'], ['columns', '表現行列の作り方'], ['coordinates', '座標での作用'], ['change', '基底変換']] as const;
type TabId = typeof TABS[number][0];
const COLORS: Readonly<Record<string, string>> = { u1: '#d55535', u2: '#13877e', u3: '#c04791', v1: '#7661b5', v2: '#94651c', v3: '#536e43', w: '#245b8d' };
const color = (name: string) => COLORS[name.replace(/^T\((.*)\)$/u, '$1')] ?? '#245b8d';

/** M,wと順序付き基底だけを保持し、A・像・座標は常に導出する。 */
export function RepresentationMatrixLab({ active }: { readonly active: boolean }) {
  const [workspace, setWorkspace] = useState(createRepresentationWorkspace);
  const id = workspace.activeShapeId;
  const scene = workspace.scenes[id];
  // 非表示の次元組のWebGLは保持せず、教材と表示状態だけを保持する。
  return <RepresentationSceneView key={id} active={active} committed={scene} views={workspace.views[id]}
    setScene={(update) => setWorkspace((w) => ({ ...w, scenes: { ...w.scenes, [id]: update(w.scenes[id]) } }))}
    setViews={(update) => setWorkspace((w) => ({ ...w, views: { ...w.views, [id]: update(w.views[id]) } }))}
    onReset={() => setWorkspace(resetRepresentationWorkspace)}
    onDimensionChange={(side, dimension) => setWorkspace((w) => ({ ...w, activeShapeId: representationShapeId(
      side === 'source' ? dimension : scene.source.dimension as RepresentationDimension,
      side === 'target' ? dimension : scene.target.dimension as RepresentationDimension) }))} />;
}

interface SceneViewProps {
  readonly active: boolean;
  readonly committed: RepresentationScene;
  readonly views: RepresentationViewState;
  readonly setScene: (update: (scene: RepresentationScene) => RepresentationScene) => void;
  readonly setViews: (update: (views: RepresentationViewState) => RepresentationViewState) => void;
  readonly onReset: () => void;
  readonly onDimensionChange: (side: BasisSide, dimension: RepresentationDimension) => void;
}
type DragPreview = { readonly side: BasisSide; readonly id: string; readonly coordinates: readonly [number, number, number] };

/** 3Dはcommitとpreviewを分離し、ドラッグ中にWebGLの操作対象を再生成しない。 */
export function RepresentationSceneView({ active, committed, views, setScene, setViews, onReset, onDimensionChange }: SceneViewProps) {
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const scene = useMemo(() => preview ? setRepresentationVector(committed, preview.side, preview.id, preview.coordinates) : committed, [committed, preview]);
  const [tab, setTab] = useState<TabId>('edit');
  const [resetKey, setResetKey] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [dragViews, setDragViews] = useState<ReturnType<typeof automaticViews> | null>(null);
  const result = useMemo(() => analyzeRepresentationMatrix(scene.definition, scene.source, scene.target, scene.input), [scene]);
  const change = useMemo(() => scene.source.dimension === scene.target.dimension ? analyzeBasisChange(scene.source.dimension, scene.source, scene.target, scene.input) : null, [scene.source, scene.target, scene.input]);
  const derived = result.representation;
  const vectors = useMemo(() => graphVectors(scene), [scene]);
  const stable = useMemo(() => {
    const values = graphVectors(committed);
    return { values, ranks: { source: analyzeVectorSet(committed.source).rank, target: analyzeVectorSet(committed.target).rank }, colors: { source: values.source.map((v) => color(v.name)), target: values.target.map((v) => color(v.name)) },
      editable: { source: values.source.map((v) => v.id), target: committed.target.vectors.map((v) => v.id) },
      opaque: { source: values.source.map((v) => v.id), target: values.target.map((v) => v.id) } };
  }, [committed]);
  const viewports = dragViews ?? automaticViews(vectors, views);
  const crossPreview = useMemo(() => preview?.side === 'source' && committed.target.dimension === 3 ? {
    vectorId: 'image-' + preview.id,
    coordinates: vectors.target.find((v) => v.id === 'image-' + preview.id)!.coordinates as readonly [number, number, number],
  } : null, [preview, committed.target.dimension, vectors]);
  const basisFailure = (side: BasisSide) => !result[side === 'source' ? 'sourceBasis' : 'targetBasis'].isBasis;
  function reset() {
    onReset();
    setPreview(null);
    setDragViews(null);
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
      {basisFailure('source') && <p>定義域の候補 <BasisName name="B" /> は <Scalar>U</Scalar> = ℝ<sup>{scene.source.dimension}</sup> の基底ではありません。</p>}
      {basisFailure('target') && <p>終域の候補 <BasisName name="C" /> は <Scalar>V</Scalar> = ℝ<sup>{scene.target.dimension}</sup> の基底ではありません。</p>}
      <p>各候補が一次独立となるように編集してください。表現行列・基底座標は未確定です。</p>
    </> : <p>数値計算の精度を確認できません。成分の大きさや基底の近さを調整してください。数学的な「基底ではない」とは異なります。</p>}
    <p>基準座標の写像と像は引き続き表示しています。</p>
  </div>;

  return <main className="lab-page representation-lab" data-lab-id="representation-matrix" aria-hidden={!active}>
    <section className="lab-intro" aria-labelledby="representation-title">
      <div><p className="panel-kicker">Representation matrix / {scene.source.dimension}D → {scene.target.dimension}D</p>
        <h1 id="representation-title">表現行列と基底の変換</h1>
        <p>同じ写像でも、2つの基底とその順序によって表現行列は変わります。</p>
      </div>
      <div><LabActionControls exportDisabled exportDescriptionId="representation-share-help" onExport={() => {}} onReset={reset} />
        <p className="lab-action-help" id="representation-share-help">このLabの共有URL・QRは11.7で対応予定です。Resetは現在の次元組だけを初期例へ戻します。</p>
      </div>
    </section>
    <div className="representation-dimensions">{(['source', 'target'] as const).map((side) => <label key={side}>
      {side === 'source' ? '定義域の次元' : '終域の次元'} <select value={scene[side].dimension} onChange={(event) => onDimensionChange(side, Number(event.target.value) as RepresentationDimension)}>
        {REPRESENTATION_DIMENSIONS.map((dimension) => <option key={dimension} value={dimension}>{dimension}D</option>)}
    </select></label>)}</div>
    <details><summary>0次元空間について</summary><p>零ベクトル空間の基底は空の組で、座標も空です。0次元からの写像は零ベクトルだけを写し、0次元への写像ではすべての入力が零ベクトルへ写ります。行列はそれぞれ0列・0行になります。図と境界例は既存の基底・次元Lab、線形写像Labの0Dで確認できます。このLabの通常操作は1〜3次元です。</p></details>
    <p className="representation-fixed-note">基底を編集・並べ替えても、基準行列 <Vector name="M" /> と入力 <Vector name="w" /> は変わりません。グラフの軸は標準座標のままです。</p>
    <div className="linear-map-workspace">
      <div className="linear-map-diagram-grid">
        {(['source', 'target'] as const).map((side) => scene[side].dimension === 3 ? <Suspense key={side} fallback={<section className="plot-card">3Dグラフを読み込み中です。</section>}>
          <VectorSpace3D idPrefix={'representation-' + side + '-space'} active={active} resetKey={resetKey}
            spaceTitle={(side === 'source' ? '定義域 U' : '終域 V') + ' = ℝ³'}
            vectors={stable.values[side]} colors={stable.colors[side]} editableVectorIds={stable.editable[side]} alwaysOpaqueVectorIds={stable.opaque[side]}
            spanVectors={committed[side].vectors} spanRank={stable.ranks[side]} spanLabel="基底候補が生成する空間" showSpan={false}
            linearCombinationVisible={false} linearCombinationTarget={null} linearCombinationCoefficients={null}
            showLinearCombinationControl={false} showHelpText={false}
            onLinearCombinationTargetPlacement={() => {}} onLinearCombinationVisibility={() => {}}
            camera={views.cameras[side]} onCameraChange={(camera) => setViews((value) => ({ ...value, cameras: { ...value.cameras, [side]: camera } }))}
            vectorCoordinatePreview={side === 'target' ? crossPreview : null}
            onVectorCoordinatesSnap={(id, coordinates, distance) => snapRepresentationSpaceVector(committed, side, id, coordinates, distance)}
            onVectorCoordinatesPreview={(id, coordinates) => {
              if (coordinates) { setDragViews((value) => value ?? viewports); setPreview({ side, id, coordinates }); }
              else { setPreview(null); setDragViews(null); }
            }}
            onVectorCoordinatesCommit={(id, coordinates) => setScene((value) => setRepresentationVector(value, side, id, coordinates))}
            assistiveDescription={side === 'source' ? '定義域の基底と入力。成分とrankは写像と基底タブで確認できます。' : '終域の基底と導出した像。表現行列の作り方タブで各列を確認できます。'}
          />
        </Suspense> : <section key={side} className="plot-card linear-map-plot-card" aria-labelledby={'representation-' + side + '-title'}>
          <div className="card-heading"><div><p className="panel-kicker">{side === 'source' ? 'Domain' : 'Codomain'}</p>
            <h2 id={'representation-' + side + '-title'}>{side === 'source' ? '定義域' : '終域'} <Scalar>{side === 'source' ? 'U' : 'V'}</Scalar> = ℝ<sup>{scene[side].dimension}</sup></h2></div>
            <button type="button" className="basis-fit-button" onClick={() => setViews((value) => ({ ...value, plane: { ...value.plane, [side]: null }, line: { ...value.line, [side]: null } }))}>全体を表示</button>
          </div>
          {scene[side].dimension === 1 ? <VectorLine1D idPrefix={'representation-' + side + '-line'}
            vectors={vectors[side]} colors={stable.colors[side]} viewport={viewports.line[side]} editableVectorIds={stable.editable[side]} alwaysOpaqueVectorIds={stable.opaque[side]}
            showHelpText={false} showViewportControls={false}
            onViewportChange={(viewport) => setViews((value) => ({ ...value, line: { ...value.line, [side]: viewport } }))}
            onVectorDragStart={() => setDragViews(viewports)} onVectorDragEnd={() => setDragViews(null)}
            onVectorChange={(id, coordinates) => setScene((value) => dragRepresentationLineVector(value, side, id, coordinates, viewports.line[side].max - viewports.line[side].min))}
          /> : <VectorPlane2D idPrefix={'representation-' + side + '-plane'}
            vectors={vectors[side]} colors={vectors[side].map((vector) => color(vector.name))}
            viewport={viewports.plane[side]} onViewportChange={(viewport) => setViews((value) => ({ ...value, plane: { ...value.plane, [side]: viewport } }))}
            editableVectorIds={stable.editable[side]} alwaysOpaqueVectorIds={stable.opaque[side]}
            onVectorDragStart={() => setDragViews(viewports)}
            onVectorChange={(id, coordinates) => setScene((value) => dragRepresentationVector(value, side, id, coordinates, viewports.plane[side].maxX - viewports.plane[side].minX))}
            onVectorDragEnd={() => setDragViews(null)}
          />}
        </section>)}
      </div>
      <p className="representation-legend">定義域：赤・緑・赤紫の基底と青の入力。終域：紫・黄褐色・深緑の基底と、定義域と同色の像。基底と入力の矢先をドラッグできます。3Dは矢先を画面内で移動し、背景をドラッグして視点を回します。</p>
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
              <p>{scene.target.dimension}行{scene.source.dimension}列の行列です。</p>
              <Formula><Vector name="M" /> = <span className="linear-map-matrix-input" style={{ gridTemplateColumns: `repeat(${scene.source.dimension}, minmax(0, 1fr))` }}>
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
                <button type="button" className="basis-fit-button" disabled={column === 0} aria-label={vector.name + 'を前へ'} onClick={() => setScene((s) => moveRepresentationBasis(s, side, column, -1))}>↑</button>
                <button type="button" className="basis-fit-button" disabled={column === scene[side].vectors.length - 1} aria-label={vector.name + 'を後へ'} onClick={() => setScene((s) => moveRepresentationBasis(s, side, column, 1))}>↓</button>
              </div>)}
              <p>{basisFailure(side) ? '一次従属：この候補は基底ではありません。' : '一次独立：空間全体の基底です。'} 候補{scene[side].vectors.length}本、rank {result[side === 'source' ? 'sourceBasis' : 'targetBasis'].analysis?.candidateRank}、対象空間の次元{scene[side].dimension}。</p>
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
          {id === 'change' && (change ? <>
            <p>ここでは同じ2基底で恒等写像を考えます。現在の写像 <Vector name="M" /> は変更しません。</p>
            <h3>基底<BasisName name="B" />の座標 → 基底<BasisName name="C" />の座標</h3>
            <Formula><ChangeName /><CoordinateName basis="B" /> = <CoordinateName basis="C" /></Formula>
            <Formula><Tuple basis={scene.source} /> = <Tuple basis={scene.target} /><ChangeName /></Formula>
            {change.representation ? <>
              <Formula><ChangeName /><Equals values={change.representation.matrix.flat()} /><Matrix values={change.representation.matrix} /></Formula>
              <Formula><Column values={change.representation.inputCoordinates} /> → <Column values={change.representation.imageCoordinates} /></Formula>
              <p>座標を変えてもベクトル自体は同じです。逆方向の比較と独立した基底変換モードは11.5で追加します。</p>
            </> : <p className="representation-warning">基底変換を確定できません。両候補の独立性と数値計算の精度を確認してください。</p>}
          </> : <p>基底変換は同じ次元の2基底で考えます。現在は{scene.source.dimension}次元から{scene.target.dimension}次元への写像です。「表現行列の作り方」「座標での作用」で長方形の表現行列を確認してください。</p>)}
        </section>)}
      </div>
    </div>
  </main>;
}

function graphVectors(scene: RepresentationScene): Record<BasisSide, VectorValue[]> {
  const image = (v: VectorValue): VectorValue => ({ id: 'image-' + v.id, name: 'T(' + v.name + ')',
    // 微小成分もそのまま保持し、解析と描画を一致させる。
    coordinates: scene.definition.matrix.map((row) => row.reduce((sum, entry, i) => sum + entry * v.coordinates[i], 0)) });
  const input = { id: 'w', name: 'w', coordinates: scene.input };
  return { source: [...scene.source.vectors, input],
    // 重なる場合は編集可能な終域基底を手前へ。
    target: [...scene.source.vectors.map(image), image(input), ...scene.target.vectors] };
}
function automaticViews(vectors: Record<BasisSide, readonly VectorValue[]>, views: RepresentationViewState) {
  return {
    plane: { source: views.plane.source ?? createAutoFitViewport(vectors.source), target: views.plane.target ?? createAutoFitViewport(vectors.target) },
    line: { source: views.line.source ?? createAutoFitLineViewport(vectors.source.map((v) => v.coordinates[0])), target: views.line.target ?? createAutoFitLineViewport(vectors.target.map((v) => v.coordinates[0])) },
  };
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
  return <span className="linear-map-display-matrix" style={{ gridTemplateColumns: `repeat(${values[0].length}, minmax(0, auto))` }} aria-label={values.length + '行' + values[0].length + '列。' + values.map((row, i) => '第' + (i + 1) + '行 ' + row.join('、')).join('。')}>{values.flatMap((row, r) => row.map((v, c) => <span key={r + '-' + c} style={{ color: columnColors?.[c] }}>{formatMathNumber(v).text}</span>))}</span>;
}
function Combination({ basis, coefficients }: { readonly basis: VectorSet; readonly coefficients: readonly number[] }) {
  return <>{basis.vectors.map((v, i) => <span className="representation-atom" key={v.id}>{i > 0 && ' + '}({formatMathNumber(coefficients[i]).text})<Vector name={v.name} /></span>)}</>;
}

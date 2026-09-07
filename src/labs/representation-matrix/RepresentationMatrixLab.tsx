import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { analyzeRepresentationMatrix, analyzeVectorSet, type VectorValue } from '../../domain';
import { LabActionControls } from '../../app/LabActionControls';
import { VectorPlane2D, VectorLine1D, createAutoFitLineViewport, createAutoFitViewport } from '../../visualization';
import { Vector, Scalar, BasisName, MapValue, Tuple, Formula, Equals, Column, Matrix, Combination } from './representationMath';
import { RepresentationPaths, BasisChangePanel } from './RepresentationCoordinatePanels';
import { dragRepresentationVector, dragRepresentationLineVector, setRepresentationVector, snapRepresentationSpaceVector, editRepresentationValue, parseRepresentationNumber, moveRepresentationBasis, REPRESENTATION_DIMENSIONS, type BasisSide, type RepresentationDimension, type RepresentationScene } from './representationMatrixState';
import { createRepresentationWorkspace, resetRepresentationWorkspace, activeRepresentationScene, activeRepresentationViews, updateActiveRepresentationScene, updateActiveRepresentationViews, selectRepresentationDimension, createBasisChangeScene, type RepresentationViewState, type RepresentationMode, type BasisChangeDirection } from './representationWorkspace';

const VectorSpace3D = lazy(async () => ({ default: (await import('../../visualization/VectorSpace3D')).VectorSpace3D }));

const TABS = [['edit', '写像と基底'], ['columns', '表現行列の作り方'], ['coordinates', '座標での作用'], ['change', '基底変換']] as const;
type TabId = typeof TABS[number][0];
const COLORS: Readonly<Record<string, string>> = { u1: '#d55535', u2: '#13877e', u3: '#c04791', v1: '#7661b5', v2: '#94651c', v3: '#536e43', w: '#245b8d' };
const color = (name: string) => COLORS[name.replace(/^T\((.*)\)$/u, '$1')] ?? '#245b8d';

/** M,wと順序付き基底だけを保持し、A・像・座標は常に導出する。 */
export function RepresentationMatrixLab({ active }: { readonly active: boolean }) {
  const [workspace, setWorkspace] = useState(createRepresentationWorkspace);
  const id = workspace.mode === 'map' ? workspace.activeShapeId : 'change-' + workspace.changeDimension;
  const scene = activeRepresentationScene(workspace);
  // 非表示の次元組のWebGLは保持せず、教材と表示状態だけを保持する。
  return <RepresentationSceneView key={id} active={active} committed={scene} views={activeRepresentationViews(workspace)}
    mode={workspace.mode} onModeChange={(mode) => setWorkspace((w) => ({ ...w, mode }))}
    direction={workspace.changeDirections[workspace.changeDimension]}
    onDirectionChange={(direction) => setWorkspace((w) => ({ ...w, changeDirections: { ...w.changeDirections, [w.changeDimension]: direction } }))}
    setScene={(update) => setWorkspace((w) => updateActiveRepresentationScene(w, update))}
    setViews={(update) => setWorkspace((w) => updateActiveRepresentationViews(w, update))}
    onReset={() => setWorkspace(resetRepresentationWorkspace)}
    onDimensionChange={(side, dimension) => setWorkspace((w) => selectRepresentationDimension(w, side, dimension))} />;
}

interface SceneViewProps {
  readonly mode?: RepresentationMode;
  readonly onModeChange?: (mode: RepresentationMode) => void;
  readonly direction?: BasisChangeDirection;
  readonly onDirectionChange?: (direction: BasisChangeDirection) => void;
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
export function RepresentationSceneView({ active, committed, views, setScene, setViews, onReset, onDimensionChange, mode = 'map', onModeChange, direction = 'B-to-C', onDirectionChange }: SceneViewProps) {
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const scene = useMemo(() => preview ? setRepresentationVector(committed, preview.side, preview.id, preview.coordinates) : committed, [committed, preview]);
  const [tab, setTab] = useState<TabId>('edit');
  const [inspectionDirection, setInspectionDirection] = useState<BasisChangeDirection>('B-to-C');
  const [resetKey, setResetKey] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [dragViews, setDragViews] = useState<ReturnType<typeof automaticViews> | null>(null);
  const result = useMemo(() => analyzeRepresentationMatrix(scene.definition, scene.source, scene.target, scene.input), [scene]);
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
    setInspectionDirection('B-to-C');
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
      {basisFailure('target') && <p>終域の候補 <BasisName name="C" /> は <Scalar>{mode === 'basis-change' ? 'U' : 'V'}</Scalar> = ℝ<sup>{scene.target.dimension}</sup> の基底ではありません。</p>}
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
        <p className="lab-action-help" id="representation-share-help">このLabの共有URL・QRは11.7で対応予定です。Resetは現在のモード・次元組だけを初期例へ戻します。</p>
      </div>
    </section>
    <div className="representation-mode-controls" role="group" aria-label="教材モード">
      <button type="button" className="basis-fit-button" aria-pressed={mode === 'map'} onClick={() => onModeChange?.('map')}>通常の写像</button>
      <button type="button" className="basis-fit-button" aria-pressed={mode === 'basis-change'} onClick={() => onModeChange?.('basis-change')}>基底変換モード</button>
    </div>
    {mode === 'basis-change' && <>
      <p className="representation-fixed-note">同じ数ベクトル空間の恒等写像に固定しています。<Scalar>T</Scalar>(<Vector name="w" />) = <Vector name="w" />、<Vector name="M" /> = <Vector name="E" />。通常の写像の教材状態と表示状態は別に保持します。</p>
      <div className="representation-dimensions"><label>空間の次元 <select value={scene.source.dimension} onChange={(event) => onDimensionChange('source', Number(event.target.value) as RepresentationDimension)}>
        {REPRESENTATION_DIMENSIONS.map((n) => <option key={n} value={n}>{n}D</option>)}
      </select></label></div>
      <div className="representation-example-controls" role="group" aria-label="基底変換の例">
        {(['standard', 'order', 'oblique'] as const).map((example) => <button key={example} type="button" className="basis-fit-button"
          disabled={example === 'order' && scene.source.dimension === 1}
          onClick={() => { setScene(() => createBasisChangeScene(scene.source.dimension as RepresentationDimension, example)); setResetKey((value) => value + 1); setTab('change'); }}>
          {example === 'standard' ? '両方とも標準基底' : example === 'order' ? '順序だけ異なる基底' : scene.source.dimension === 1 ? '長さ・向きの異なる基底' : '斜交基底の例'}
        </button>)}
      </div>
      <p className="lab-action-help">例を選ぶと、このモード・次元の両基底と入力を置き換えます。1Dでは基底が1本なので、順序の入れ替えはありません。</p>
    </>}
    {mode === 'map' && <div className="representation-dimensions">{(['source', 'target'] as const).map((side) => <label key={side}>
      {side === 'source' ? '定義域の次元' : '終域の次元'} <select value={scene[side].dimension} onChange={(event) => onDimensionChange(side, Number(event.target.value) as RepresentationDimension)}>
        {REPRESENTATION_DIMENSIONS.map((dimension) => <option key={dimension} value={dimension}>{dimension}D</option>)}
    </select></label>)}</div>}
    <details><summary>0次元空間について</summary><p>零ベクトル空間の基底は空の組で、座標も空です。0次元からの写像は零ベクトルだけを写し、0次元への写像ではすべての入力が零ベクトルへ写ります。行列はそれぞれ0列・0行になります。図と境界例は既存の基底・次元Lab、線形写像Labの0Dで確認できます。このLabの通常操作は1〜3次元です。</p></details>
    <p className="representation-fixed-note">基底を編集・並べ替えても、基準行列 <Vector name="M" /> と入力 <Vector name="w" /> は変わりません。グラフの軸は標準座標のままです。</p>
    <div className="linear-map-workspace">
      <div className="linear-map-diagram-grid">
        {(['source', 'target'] as const).map((side) => scene[side].dimension === 3 ? <Suspense key={side} fallback={<section className="plot-card">3Dグラフを読み込み中です。</section>}>
          <VectorSpace3D idPrefix={'representation-' + side + '-space'} active={active} resetKey={resetKey}
            spaceTitle={(mode === 'basis-change' ? (side === 'source' ? '同じ空間 U（基底B）' : '同じ空間 U（基底C）') : side === 'source' ? '定義域 U' : '終域 V') + ' = ℝ³'}
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
            <h2 id={'representation-' + side + '-title'}>{mode === 'basis-change' ? '同じ空間' : side === 'source' ? '定義域' : '終域'} <Scalar>{mode === 'basis-change' || side === 'source' ? 'U' : 'V'}</Scalar> = ℝ<sup>{scene[side].dimension}</sup>{mode === 'basis-change' && <>（基底<BasisName name={side === 'source' ? 'B' : 'C'} />）</>}</h2></div>
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
            <article><h3>基準基底に関する行列</h3><p>{mode === 'basis-change' ? '恒等写像のため単位行列に固定します。基底と入力を編集してください。' : '基準基底に関する行列を変更し、写像を編集します。'}</p>
              <p>{scene.target.dimension}行{scene.source.dimension}列の行列です。</p>
              {mode === 'basis-change' ? <Formula><Vector name="M" /> = <Vector name="E" /> = <Matrix values={scene.definition.matrix} /></Formula> : <Formula><Vector name="M" /> = <span className="linear-map-matrix-input" style={{ gridTemplateColumns: `repeat(${scene.source.dimension}, minmax(0, 1fr))` }}>
                {scene.definition.matrix.flatMap((row, r) => row.map((value, c) => <NumberInput key={r + '-' + c} value={value} label={'行列Mの第' + (r + 1) + '行第' + (c + 1) + '列'}
                  onValue={(next) => setScene((s) => editRepresentationValue(s, 'matrix', r, c, next))} />))}
              </span></Formula>}
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
          {id === 'coordinates' && <RepresentationPaths scene={scene} result={result} failure={failure} />}
          {id === 'change' && <>
            {mode === 'map' && <p>このタブは現在の2基底について恒等写像を計算します。グラフの通常写像<Vector name="M" />は変更しません。グラフも恒等写像として操作する場合は、ページ上部の「基底変換モード」へ切り替えてください。</p>}
            <BasisChangePanel scene={scene} direction={mode === 'basis-change' ? direction : inspectionDirection}
              onDirectionChange={mode === 'basis-change' ? (value) => onDirectionChange?.(value) : setInspectionDirection} />
          </>}
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

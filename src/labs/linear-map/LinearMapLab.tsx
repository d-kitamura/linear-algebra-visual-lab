import { useMemo, useState } from 'react';
import {
  MAX_ABSOLUTE_LINEAR_MAP_INPUT,
  analyzeLinearMap,
  type VectorValue,
} from '../../domain';
import { formatMathNumber } from '../../ui';
import {
  VectorPlane2D,
  createAutoFitViewport,
  createLinearMapGridSegments,
  type PlaneViewport,
} from '../../visualization';
import {
  LINEAR_MAP_PRESETS,
  createDefaultLinearMapScene,
  createLinearMapDefinition,
  createLinearMapSceneFromPreset,
  findMatchingLinearMapPreset,
  setTransformedGridVisibility,
  updateLinearMapInputFromDrag,
  updateLinearMapInputVector,
  updateLinearMapMatrixEntry,
  type LinearMapPresetId,
  type Matrix2,
  type Vector2,
} from './linearMapState';

const DOMAIN_VECTOR_COLOR = '#245b8d';
const IMAGE_VECTOR_COLORS = ['#d55535', '#13877e', '#245b8d'] as const;

interface LinearMapLabProps {
  readonly active: boolean;
}

type MatrixDrafts = [[string, string], [string, string]];
type VectorDrafts = [string, string];

export function LinearMapLab({ active }: LinearMapLabProps) {
  const [scene, setScene] = useState(createDefaultLinearMapScene);
  const [matrixDrafts, setMatrixDrafts] = useState<MatrixDrafts>(() =>
    createMatrixDrafts(createDefaultLinearMapScene().matrix));
  const [inputDrafts, setInputDrafts] = useState<VectorDrafts>(() =>
    createVectorDrafts(createDefaultLinearMapScene().inputVector));
  const [domainManualViewport, setDomainManualViewport] = useState<PlaneViewport | null>(null);
  const [codomainManualViewport, setCodomainManualViewport] = useState<PlaneViewport | null>(null);
  const [dragViewport, setDragViewport] = useState<PlaneViewport | null>(null);

  const definition = useMemo(() => createLinearMapDefinition(scene), [scene]);
  const analysis = useMemo(
    () => analyzeLinearMap(definition, scene.inputVector),
    [definition, scene.inputVector],
  );
  const imageVector: Vector2 = [analysis.imageVector[0], analysis.imageVector[1]];
  const domainVectors = useMemo<readonly VectorValue[]>(() => [{
    id: 'linear-map-input-u',
    name: 'u',
    coordinates: scene.inputVector,
  }], [scene.inputVector]);
  const codomainVectors = useMemo<readonly VectorValue[]>(() => [
    {
      id: 'linear-map-column-1',
      name: 'T(e1)',
      coordinates: [scene.matrix[0][0], scene.matrix[1][0]],
    },
    {
      id: 'linear-map-column-2',
      name: 'T(e2)',
      coordinates: [scene.matrix[0][1], scene.matrix[1][1]],
    },
    {
      id: 'linear-map-image-u',
      name: 'T(u)',
      coordinates: imageVector,
    },
  ], [imageVector, scene.matrix]);
  const domainAutoViewport = useMemo(
    () => createAutoFitViewport(domainVectors),
    [domainVectors],
  );
  const codomainAutoViewport = useMemo(
    () => createAutoFitViewport(codomainVectors),
    [codomainVectors],
  );
  const domainViewport = dragViewport ?? domainManualViewport ?? domainAutoViewport;
  const codomainViewport = codomainManualViewport ?? codomainAutoViewport;
  const transformedGridSegments = useMemo(
    () => scene.showTransformedGrid
      ? createLinearMapGridSegments(definition, domainViewport)
      : [],
    [definition, domainViewport, scene.showTransformedGrid],
  );
  const matchingPresetId = findMatchingLinearMapPreset(scene.matrix);
  const selectedPreset = LINEAR_MAP_PRESETS.find((preset) => preset.id === matchingPresetId);
  const invalidDraftCount = countInvalidDrafts(matrixDrafts.flat(), inputDrafts);

  function handlePresetChange(presetId: LinearMapPresetId): void {
    const nextScene = createLinearMapSceneFromPreset(
      presetId,
      scene.inputVector,
      scene.showTransformedGrid,
    );
    setScene(nextScene);
    setMatrixDrafts(createMatrixDrafts(nextScene.matrix));
    setDomainManualViewport(null);
    setCodomainManualViewport(null);
  }

  function handleMatrixDraftChange(
    rowIndex: 0 | 1,
    columnIndex: 0 | 1,
    text: string,
  ): void {
    setMatrixDrafts((current) => {
      const next = current.map((row) => [...row]) as MatrixDrafts;
      next[rowIndex][columnIndex] = text;
      return next;
    });
    const parsed = parseEditableNumber(text);
    if (parsed !== null) {
      setScene((current) => updateLinearMapMatrixEntry(
        current,
        rowIndex,
        columnIndex,
        parsed,
      ));
    }
  }

  function handleInputDraftChange(index: 0 | 1, text: string): void {
    setInputDrafts((current) => {
      const next: VectorDrafts = [...current];
      next[index] = text;
      return next;
    });
    const parsed = parseEditableNumber(text);
    if (parsed !== null) {
      setScene((current) => updateLinearMapInputVector(
        current,
        index === 0
          ? [parsed, current.inputVector[1]]
          : [current.inputVector[0], parsed],
      ));
    }
  }

  function handleInputDrag(coordinates: Vector2): void {
    const next = updateLinearMapInputFromDrag(scene, coordinates);
    setScene(next);
    setInputDrafts(createVectorDrafts(next.inputVector));
  }

  function handleReset(): void {
    const nextScene = createDefaultLinearMapScene();
    setScene(nextScene);
    setMatrixDrafts(createMatrixDrafts(nextScene.matrix));
    setInputDrafts(createVectorDrafts(nextScene.inputVector));
    setDomainManualViewport(null);
    setCodomainManualViewport(null);
    setDragViewport(null);
  }

  return (
    <div className="linear-map-lab" data-lab-id="linear-map" aria-hidden={!active}>
      <a className="skip-link" href="#linear-map-workspace">
        線形写像の操作領域へ移動
      </a>
      <main className="lab-page">
        <div className="linear-map-scope" aria-label="現在の対象">
          <span>現在の対象</span>
          <strong><MathMapSignature /></strong>
          <small>2次元から2次元への線形写像</small>
        </div>

        <section className="lab-intro" aria-labelledby="linear-map-title">
          <div>
            <p className="eyebrow">線形写像 / 2D → 2D</p>
            <h1 id="linear-map-title">入力を動かして、像の動きを見る。</h1>
          </div>
          <div className="lab-intro-side">
            <p className="lab-intro-copy">
              定義域の入力 <MathVectorName name="u" /> と行列 <MathMatrixName /> を変えると、
              終域の像 <MathMapValue argument="u" /> がリアルタイムに決まります。
              標準基底の像と格子の変形から、行列の2列が表す動きを読み取ります。
            </p>
            <div className="lab-actions" aria-label="線形写像Labの教材状態を操作">
              <button className="reset-button" type="button" onClick={handleReset}>Reset</button>
            </div>
          </div>
        </section>

        <div className="linear-map-workspace" id="linear-map-workspace">
          <div className="linear-map-diagram-grid">
            <section className="plot-card linear-map-plot-card" aria-labelledby="linear-map-domain-title">
              <div className="card-heading">
                <div>
                  <p className="panel-kicker">Domain</p>
                  <h2 id="linear-map-domain-title">定義域 <MathRealSpace name="U" /></h2>
                </div>
                <button
                  className="basis-fit-button"
                  type="button"
                  onClick={() => setDomainManualViewport(null)}
                >全体を表示</button>
              </div>
              <VectorPlane2D
                idPrefix="linear-map-domain-plane"
                vectors={domainVectors}
                colors={[DOMAIN_VECTOR_COLOR]}
                viewport={domainViewport}
                onViewportChange={setDomainManualViewport}
                onVectorDragStart={() => setDragViewport(domainViewport)}
                onVectorChange={(_, coordinates) => handleInputDrag(coordinates)}
                onVectorDragEnd={() => setDragViewport(null)}
              />
              <p className="viewport-help">
                入力 <MathVectorName name="u" /> の矢先をドラッグできます。背景のドラッグ、ホイール、ピンチで表示範囲を変えられます。
              </p>
            </section>

            <section className="plot-card linear-map-plot-card" aria-labelledby="linear-map-codomain-title">
              <div className="card-heading">
                <div>
                  <p className="panel-kicker">Codomain</p>
                  <h2 id="linear-map-codomain-title">終域 <MathRealSpace name="V" /></h2>
                </div>
                <button
                  className="basis-fit-button"
                  type="button"
                  onClick={() => setCodomainManualViewport(null)}
                >全体を表示</button>
              </div>
              <VectorPlane2D
                idPrefix="linear-map-codomain-plane"
                vectors={codomainVectors}
                colors={IMAGE_VECTOR_COLORS}
                viewport={codomainViewport}
                onViewportChange={setCodomainManualViewport}
                transformedGridSegments={transformedGridSegments}
              />
              <p className="viewport-help">
                <MathMapValue argument="u" /> は導出値なので直接編集しません。赤と緑は標準基底の像、青は入力の像です。
              </p>
            </section>
          </div>

          <div className="linear-map-detail-grid">
            <section className="linear-map-control-card" aria-labelledby="linear-map-control-title">
              <p className="panel-kicker">Edit transformation</p>
              <h2 id="linear-map-control-title">行列と入力</h2>

              <label className="linear-map-preset-field">
                <span>代表例</span>
                <select
                  value={matchingPresetId ?? 'custom'}
                  onChange={(event) => {
                    if (event.target.value !== 'custom') {
                      handlePresetChange(event.target.value as LinearMapPresetId);
                    }
                  }}
                >
                  <option value="custom" disabled>成分を編集中</option>
                  {LINEAR_MAP_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.label}</option>
                  ))}
                </select>
              </label>
              <p className="linear-map-preset-description">
                {selectedPreset?.description ?? '行列の成分を直接編集した写像です。'}
              </p>

              <div className="linear-map-editor-row">
                <div className="linear-map-editor-block">
                  <strong><MathMatrixName /> =</strong>
                  <MatrixInput
                    drafts={matrixDrafts}
                    onChange={handleMatrixDraftChange}
                  />
                </div>
                <div className="linear-map-editor-block">
                  <strong><MathVectorName name="u" /> =</strong>
                  <VectorInput drafts={inputDrafts} onChange={handleInputDraftChange} />
                </div>
              </div>

              <label className="linear-map-grid-toggle">
                <input
                  type="checkbox"
                  checked={scene.showTransformedGrid}
                  onChange={(event) => setScene((current) =>
                    setTransformedGridVisibility(current, event.target.checked))}
                />
                <span>終域に格子の像を表示</span>
              </label>
              {invalidDraftCount > 0 ? (
                <p className="linear-map-input-warning" role="status">
                  未確定の成分が{invalidDraftCount}か所あります。図には直前の有効な値を使っています。
                </p>
              ) : null}
            </section>

            <section className="linear-map-reading-card" aria-labelledby="linear-map-reading-title" aria-live="polite">
              <p className="panel-kicker">Read the matrix</p>
              <h2 id="linear-map-reading-title">行列の列と標準基底の像</h2>
              <div className="linear-map-standard-basis">
                <MathStandardBasisVector subscript="1" /> ={' '}
                <MathTransposedRowVector values={[1, 0]} />,
                {' '}<MathStandardBasisVector subscript="2" /> ={' '}
                <MathTransposedRowVector values={[0, 1]} />
              </div>
              <div className="linear-map-equation">
                <MathMatrixName /> = [
                <MathMapValue argument="e" subscript="1" />,
                {' '}<MathMapValue argument="e" subscript="2" />]
                {' '}= <MathMatrix values={scene.matrix} />
              </div>
              <div className="linear-map-column-list">
                <p className="is-first-column">
                  <MathMapValue argument="e" subscript="1" /> ={' '}
                  <MathColumnVector values={[scene.matrix[0][0], scene.matrix[1][0]]} />
                </p>
                <p className="is-second-column">
                  <MathMapValue argument="e" subscript="2" /> ={' '}
                  <MathColumnVector values={[scene.matrix[0][1], scene.matrix[1][1]]} />
                </p>
              </div>
              <div className="linear-map-current-value">
                <p>
                  <MathMapValue argument="u" /> = <MathMatrixName /><MathVectorName name="u" /> ={' '}
                  <MathColumnVector values={imageVector} />
                </p>
                <strong>{describeRank(analysis.rank)}</strong>
                <small>
                  <span className="math-roman">rank</span>(<span className="math-scalar-base">T</span>) = {analysis.rank}
                </small>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function MatrixInput({
  drafts,
  onChange,
}: {
  readonly drafts: MatrixDrafts;
  readonly onChange: (row: 0 | 1, column: 0 | 1, text: string) => void;
}) {
  return (
    <span className="linear-map-matrix-input" aria-label="行列Aの成分">
      {drafts.map((row, rowIndex) => row.map((draft, columnIndex) => (
        <input
          key={`${rowIndex}-${columnIndex}`}
          type="text"
          inputMode="decimal"
          value={draft}
          aria-label={`行列Aの第${rowIndex + 1}行第${columnIndex + 1}列`}
          aria-invalid={parseEditableNumber(draft) === null}
          onChange={(event) => onChange(
            rowIndex as 0 | 1,
            columnIndex as 0 | 1,
            event.target.value,
          )}
        />
      )))}
    </span>
  );
}

function VectorInput({
  drafts,
  onChange,
}: {
  readonly drafts: VectorDrafts;
  readonly onChange: (index: 0 | 1, text: string) => void;
}) {
  return (
    <span className="linear-map-vector-input" aria-label="入力ベクトルuの成分">
      {drafts.map((draft, index) => (
        <input
          key={index}
          type="text"
          inputMode="decimal"
          value={draft}
          aria-label={`入力ベクトルuの第${index + 1}成分`}
          aria-invalid={parseEditableNumber(draft) === null}
          onChange={(event) => onChange(index as 0 | 1, event.target.value)}
        />
      ))}
    </span>
  );
}

function MathMapSignature() {
  return (
    <span className="linear-map-math">
      <span className="math-scalar-base">T</span>: ℝ<sup>2</sup> → ℝ<sup>2</sup>
    </span>
  );
}

function MathRealSpace({ name }: { readonly name: 'U' | 'V' }) {
  return (
    <span className="linear-map-math">
      <span className="math-scalar-base">{name}</span> = ℝ<sup>2</sup>
    </span>
  );
}

function MathMatrixName() {
  return <span className="math-matrix">A</span>;
}

function MathVectorName({ name }: { readonly name: string }) {
  return <span className="math-vector"><span className="math-vector-base">{name}</span></span>;
}

function MathStandardBasisVector({ subscript }: { readonly subscript: '1' | '2' }) {
  return (
    <span className="math-vector">
      <span className="math-vector-base">e</span>
      <sub className="math-vector-subscript">{subscript}</sub>
    </span>
  );
}

function MathTransposedRowVector({ values }: { readonly values: readonly number[] }) {
  return (
    <span className="transposed-row-vector" aria-label={`転置した行表示 ${values.join('、')}`}>
      <sup aria-hidden="true">t</sup>
      <span aria-hidden="true">[</span>
      {values.map((value, index) => (
        <span key={index} aria-hidden="true">{index > 0 ? ', ' : ''}{value}</span>
      ))}
      <span aria-hidden="true">]</span>
    </span>
  );
}

function MathMapValue({
  argument,
  subscript,
}: {
  readonly argument: 'u' | 'e';
  readonly subscript?: '1' | '2';
}) {
  return (
    <span className="linear-map-math math-map-value">
      <span className="math-scalar-base">T</span>(
      <span className="math-vector-base">{argument}</span>
      {subscript ? <sub className="math-vector-subscript">{subscript}</sub> : null})
    </span>
  );
}

function MathMatrix({ values }: { readonly values: Matrix2 }) {
  return (
    <span className="linear-map-display-matrix" aria-label={`行列 ${values.flat().join('、')}`}>
      {values.flatMap((row, rowIndex) => row.map((value, columnIndex) => (
        <span key={`${rowIndex}-${columnIndex}`} aria-hidden="true">
          {formatMathNumber(value).text}
        </span>
      )))}
    </span>
  );
}

function MathColumnVector({ values }: { readonly values: readonly number[] }) {
  return (
    <span className="display-column-vector linear-map-column-vector" aria-label={`列ベクトル ${values.join('、')}`}>
      {values.map((value, index) => (
        <span key={index} aria-hidden="true">{formatMathNumber(value).text}</span>
      ))}
    </span>
  );
}

function describeRank(rank: number): string {
  if (rank === 0) {
    return 'すべての入力が原点へ移ります。';
  }
  if (rank === 1) {
    return '2次元の格子が原点を通る1本の直線へ押しつぶされます。';
  }
  return '2次元の広がりを保ったまま格子が移ります。';
}

function createMatrixDrafts(matrix: Matrix2): MatrixDrafts {
  return matrix.map((row) => row.map(formatDraft)) as MatrixDrafts;
}

function createVectorDrafts(vector: Vector2): VectorDrafts {
  return vector.map(formatDraft) as VectorDrafts;
}

function formatDraft(value: number): string {
  return String(Number(value.toPrecision(10)));
}

function parseEditableNumber(text: string): number | null {
  if (text.trim() === '') {
    return null;
  }
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= MAX_ABSOLUTE_LINEAR_MAP_INPUT
    ? value
    : null;
}

function countInvalidDrafts(...groups: readonly (readonly string[])[]): number {
  return groups.flat().filter((draft) => parseEditableNumber(draft) === null).length;
}

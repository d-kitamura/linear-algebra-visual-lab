import { useMemo, useState, type CSSProperties } from 'react';
import { analyzeVectorSet, type VectorValue } from '../domain';
import type { ShareStateV1 } from '../sharing';
import { DEFAULT_2D_SHARE_STATE, parseCoordinateInput } from '../state';
import { splitVectorName } from '../ui';
import {
  VectorPlane2D,
  createAutoFitViewport,
  zoomViewportAtCenter,
  type PlaneViewport,
} from '../visualization';
import { projectInfo } from './projectInfo';
import './App.css';

const vectorColors = ['#c84c35', '#087f73'];
const coordinateNames = ['第1成分', '第2成分'] as const;

type CoordinateDrafts = Readonly<Record<string, readonly string[]>>;
type ViewMode = 'auto' | 'manual';

export function App() {
  const [state, setState] = useState<ShareStateV1>(() => DEFAULT_2D_SHARE_STATE);
  const [coordinateDrafts, setCoordinateDrafts] = useState<CoordinateDrafts>(() =>
    createCoordinateDrafts(DEFAULT_2D_SHARE_STATE.vectors),
  );
  const [viewMode, setViewMode] = useState<ViewMode>('auto');
  const [manualViewport, setManualViewport] = useState<PlaneViewport | null>(null);
  const analysis = useMemo(
    () => analyzeVectorSet({ dimension: state.dim, vectors: state.vectors }),
    [state],
  );
  const autoViewport = useMemo(() => createAutoFitViewport(state.vectors), [state.vectors]);
  const viewport = viewMode === 'auto' ? autoViewport : (manualViewport ?? autoViewport);
  const isIndependent = analysis.isLinearlyIndependent;
  const viewportLabel = viewMode === 'auto'
    ? `自動表示 ±${formatViewportNumber((viewport.maxX - viewport.minX) / 2)}`
    : `手動表示・幅 ${formatViewportNumber(viewport.maxX - viewport.minX)}`;

  function handleManualViewportChange(nextViewport: PlaneViewport): void {
    setManualViewport(nextViewport);
    setViewMode('manual');
  }

  function handleButtonZoom(factor: number): void {
    handleManualViewportChange(zoomViewportAtCenter(viewport, factor));
  }

  function handleFitViewport(): void {
    setManualViewport(null);
    setViewMode('auto');
  }

  function handleCoordinateChange(
    vectorId: string,
    coordinateIndex: number,
    input: string,
  ): void {
    setCoordinateDrafts((current) => ({
      ...current,
      [vectorId]: (current[vectorId] ?? []).map((value, index) =>
        index === coordinateIndex ? input : value,
      ),
    }));

    const parsed = parseCoordinateInput(input);
    if (!parsed.ok) {
      return;
    }

    setState((current) => ({
      ...current,
      vectors: current.vectors.map((vector) => {
        if (vector.id !== vectorId) {
          return vector;
        }

        return {
          ...vector,
          coordinates: vector.coordinates.map((coordinate, index) =>
            index === coordinateIndex ? parsed.value : coordinate,
          ),
        };
      }),
    }));
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Linear Algebra Visual Lab ホーム"
        >
          <span className="brand-mark" aria-hidden="true">
            LA
          </span>
          <span>{projectInfo.name}</span>
        </a>
        <span className="phase-badge">{projectInfo.phase}</span>
      </header>

      <main className="lab-page">
        <section className="lab-intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ベクトル空間 / 2D</p>
            <h1 id="page-title">ベクトルを変えて、生成する空間を見る。</h1>
          </div>
          <p>
            列ベクトルの成分を編集すると、座標平面と数学的な判定が連動します。
            表示範囲は自動調整に加え、ホイール、ピンチ、背景ドラッグでも変更できます。
          </p>
        </section>

        <div className="lab-workspace">
          <section className="plot-card" aria-labelledby="plot-title">
            <div className="card-heading">
              <div>
                <p className="panel-kicker">Coordinate plane</p>
                <h2 id="plot-title">2次元座標平面</h2>
              </div>
              <div className="viewport-toolbar">
                <span className={`example-badge ${viewMode === 'manual' ? 'is-manual' : ''}`}>
                  {viewportLabel}
                </span>
                <div className="viewport-controls" role="group" aria-label="座標面の表示範囲">
                  <button
                    type="button"
                    aria-label="縮小して広い範囲を表示"
                    title="縮小"
                    onClick={() => handleButtonZoom(1.25)}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label="拡大して狭い範囲を表示"
                    title="拡大"
                    onClick={() => handleButtonZoom(0.8)}
                  >
                    ＋
                  </button>
                  <button
                    className="fit-viewport-button"
                    type="button"
                    disabled={viewMode === 'auto'}
                    onClick={handleFitViewport}
                  >
                    全体を表示
                  </button>
                </div>
              </div>
            </div>
            <VectorPlane2D
              vectors={state.vectors}
              colors={vectorColors}
              viewport={viewport}
              onViewportChange={handleManualViewportChange}
            />
            <p className="viewport-help">
              ホイール／ピンチで拡大・縮小、座標面の背景ドラッグで移動できます。
            </p>
          </section>

          <aside className="analysis-column" aria-label="ベクトル集合の編集と解析結果">
            <section className="vector-editor-card" aria-labelledby="vector-editor-title">
              <p className="panel-kicker">Edit vectors</p>
              <h2 id="vector-editor-title">列ベクトルの成分</h2>
              <p className="editor-hint">上段が第1成分、下段が第2成分です。</p>
              <div className="vector-editor-list">
                {state.vectors.map((vector, vectorIndex) => {
                  const drafts = coordinateDrafts[vector.id] ?? vector.coordinates.map(String);
                  const results = drafts.map(parseCoordinateInput);
                  const firstError = results.find((result) => !result.ok);
                  const errorId = `${vector.id}-coordinate-error`;

                  return (
                    <div className="vector-editor" key={vector.id}>
                      <span
                        className="vector-key"
                        style={{
                          '--vector-color': vectorColors[vectorIndex % vectorColors.length],
                        } as CSSProperties}
                        aria-hidden="true"
                      >
                        {vectorIndex + 1}
                      </span>
                      <MathVectorName name={vector.name} />
                      <span className="math-equals" aria-hidden="true">=</span>
                      <div className="editable-column-vector">
                        {drafts.map((draft, coordinateIndex) => {
                          const result = results[coordinateIndex];
                          const isInvalid = !result.ok;
                          const inputId = `${vector.id}-coordinate-${coordinateIndex}`;

                          return (
                            <label className="coordinate-field" key={inputId} htmlFor={inputId}>
                              <span className="visually-hidden">
                                {`${vector.name} の${coordinateNames[coordinateIndex]}`}
                              </span>
                              <input
                                id={inputId}
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                spellCheck={false}
                                value={draft}
                                aria-invalid={isInvalid}
                                aria-describedby={isInvalid ? errorId : undefined}
                                onChange={(event) =>
                                  handleCoordinateChange(vector.id, coordinateIndex, event.target.value)
                                }
                              />
                            </label>
                          );
                        })}
                      </div>
                      <p
                        className={`coordinate-feedback ${firstError ? 'has-error' : ''}`}
                        id={errorId}
                        role={firstError ? 'alert' : undefined}
                      >
                        {firstError && !firstError.ok
                          ? `${firstError.message} 表示には直前の有効値を使います。`
                          : '入力は表示と判定へすぐに反映されます。'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={`result-card ${isIndependent ? 'is-independent' : 'is-dependent'}`}>
              <p className="panel-kicker">Analysis</p>
              <MatrixDefinition vectors={state.vectors} />
              <p className="result-symbol" aria-hidden="true">{isIndependent ? '∥' : '≈'}</p>
              <h2>{isIndependent ? '一次独立です' : '一次従属です'}</h2>
              <p className="result-explanation">
                {isIndependent
                  ? 'どのベクトルも、他のベクトルの一次結合では表せません。'
                  : '少なくとも1本のベクトルが、他のベクトルの一次結合で表せます。'}
              </p>

              <dl className="metric-grid">
                <div>
                  <dt>ベクトル数</dt>
                  <dd>{analysis.vectorCount}</dd>
                </div>
                <div>
                  <dt>
                    <MathOperator name="rank" />
                    (<MathMatrixName />)
                  </dt>
                  <dd>{analysis.rank}</dd>
                </div>
                <div>
                  <dt>
                    生成する空間の次元
                    <small className="dimension-expression">
                      <MathOperator name="dim" />
                      (<MathOperator name="span" />(&#123;
                      {state.vectors.map((vector, index) => (
                        <span key={vector.id}>
                          {index > 0 ? ', ' : ''}
                          <MathVectorName name={vector.name} />
                        </span>
                      ))}
                      &#125;))
                    </small>
                  </dt>
                  <dd>{analysis.spanDimension}</dd>
                </div>
              </dl>
            </section>

            <p className="development-note">
              この段階では表示範囲の操作を確認します。ベクトル先端のドラッグ、生成する空間の幾何表示は後続の作業単位で追加します。
            </p>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <p>{projectInfo.status} — 有効な成分は座標平面と判定へ即時反映されます。</p>
      </footer>
    </div>
  );
}

function MathVectorName({ name }: { readonly name: string }) {
  const { base, subscript } = splitVectorName(name);

  return (
    <span className="math-symbol math-vector" aria-label={name}>
      <span className="math-vector-base" aria-hidden="true">{base}</span>
      {subscript ? (
        <sub className="math-vector-subscript" aria-hidden="true">{subscript}</sub>
      ) : null}
    </span>
  );
}

function MathMatrixName() {
  return <span className="math-symbol math-matrix">A</span>;
}

function MathOperator({ name }: { readonly name: string }) {
  return <span className="math-operator">{name}</span>;
}

function MatrixDefinition({ vectors }: { readonly vectors: readonly VectorValue[] }) {
  const rowCount = vectors[0]?.coordinates.length ?? 0;
  const ariaDescription = vectors
    .map((vector) => `${vector.name} を第${vectors.indexOf(vector) + 1}列`)
    .join('、');

  return (
    <div
      className="matrix-definition"
      aria-label={`行列 A は、${ariaDescription}に並べた行列です。`}
    >
      <MathMatrixName />
      <span className="math-equals" aria-hidden="true">=</span>
      <span className="matrix-bracket" aria-hidden="true">
        <span
          className="matrix-values"
          style={{ '--matrix-columns': vectors.length } as CSSProperties}
        >
          {Array.from({ length: rowCount }, (_, rowIndex) =>
            vectors.map((vector) => (
              <span key={`${vector.id}-${rowIndex}`}>
                {vector.coordinates[rowIndex]}
              </span>
            )),
          )}
        </span>
      </span>
      <span className="matrix-columns-note" aria-hidden="true">
        = [
        {vectors.map((vector, index) => (
          <span key={vector.id}>
            {index > 0 ? ' ' : ''}
            <MathVectorName name={vector.name} />
          </span>
        ))}
        ]
      </span>
    </div>
  );
}

function createCoordinateDrafts(vectors: readonly VectorValue[]): CoordinateDrafts {
  return Object.fromEntries(
    vectors.map((vector) => [vector.id, vector.coordinates.map(String)]),
  );
}

function formatViewportNumber(value: number): string {
  return new Intl.NumberFormat('ja-JP', { maximumSignificantDigits: 4 }).format(value);
}

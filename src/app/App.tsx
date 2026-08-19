import type { CSSProperties } from 'react';
import { analyzeVectorSet } from '../domain';
import { DEFAULT_2D_SHARE_STATE } from '../state';
import { VectorPlane2D } from '../visualization';
import { projectInfo } from './projectInfo';
import './App.css';

const vectorColors = ['#c84c35', '#087f73'];

export function App() {
  const state = DEFAULT_2D_SHARE_STATE;
  const analysis = analyzeVectorSet({ dimension: state.dim, vectors: state.vectors });
  const isIndependent = analysis.isLinearlyIndependent;

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
            <h1 id="page-title">ベクトルの向きと、張る空間を見る。</h1>
          </div>
          <p>
            2本のベクトルを座標平面で確認し、一次独立性と span の次元を対応づけます。
            この段階では固定された例を表示しています。
          </p>
        </section>

        <div className="lab-workspace">
          <section className="plot-card" aria-labelledby="plot-title">
            <div className="card-heading">
              <div>
                <p className="panel-kicker">Coordinate plane</p>
                <h2 id="plot-title">2次元座標平面</h2>
              </div>
              <span className="example-badge">固定例</span>
            </div>
            <VectorPlane2D vectors={state.vectors} colors={vectorColors} />
          </section>

          <aside className="analysis-column" aria-label="ベクトル集合の解析結果">
            <section className={`result-card ${isIndependent ? 'is-independent' : 'is-dependent'}`}>
              <p className="panel-kicker">Analysis</p>
              <p className="result-symbol" aria-hidden="true">{isIndependent ? '∥' : '≈'}</p>
              <h2>{isIndependent ? '一次独立です' : '一次従属です'}</h2>
              <p className="result-explanation">
                {isIndependent
                  ? '2本のベクトルは異なる方向をもち、どちらも他方のスカラー倍ではありません。'
                  : '少なくとも1本のベクトルが、他のベクトルの組合せで表せます。'}
              </p>

              <dl className="metric-grid">
                <div>
                  <dt>ベクトル数</dt>
                  <dd>{analysis.vectorCount}</dd>
                </div>
                <div>
                  <dt>rank</dt>
                  <dd>{analysis.rank}</dd>
                </div>
                <div>
                  <dt>span の次元</dt>
                  <dd>{analysis.spanDimension}</dd>
                </div>
              </dl>
            </section>

            <section className="vector-list-card" aria-labelledby="vector-list-title">
              <p className="panel-kicker">Vectors</p>
              <h2 id="vector-list-title">表示中のベクトル</h2>
              <ul>
                {state.vectors.map((vector, index) => (
                  <li key={vector.id}>
                    <span
                      className="vector-key"
                      style={{ '--vector-color': vectorColors[index % vectorColors.length] } as CSSProperties}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <span>
                      <strong>{vector.name}</strong>
                      <small>{`(${vector.coordinates.join(', ')})`}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <p className="development-note">
              次の作業単位で座標の数値入力を追加します。現在は表示と数学的判定の整合性を確認する段階です。
            </p>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <p>{projectInfo.status} — 共有・編集機能は後続の作業単位で追加します。</p>
      </footer>
    </div>
  );
}

import { projectInfo } from './projectInfo';
import './App.css';

const initialTopics = ['2D / 3D ベクトル', 'span', '一次独立・一次従属', '共有 URL'];

export function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Linear Algebra Visual Lab ホーム">
          <span className="brand-mark" aria-hidden="true">
            LA
          </span>
          <span>{projectInfo.name}</span>
        </a>
        <span className="phase-badge">{projectInfo.phase}</span>
      </header>

      <main className="foundation-page">
        <section className="hero-panel" aria-labelledby="page-title">
          <p className="eyebrow">ベクトル空間 可視化教材</p>
          <h1 id="page-title">ベクトルを、見て、動かして、確かめる。</h1>
          <p className="hero-copy">
            線形代数の概念をブラウザ上で視覚的・対話的に学び、同じ教材例を URL
            で共有できるアプリを段階的に開発しています。
          </p>

          <div className="status-card" role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <strong>{projectInfo.status}</strong>
              <p>次の段階では、描画から独立した数学ロジックを実装します。</p>
            </div>
          </div>
        </section>

        <aside className="scope-panel" aria-labelledby="scope-title">
          <p className="panel-kicker">初版の学習範囲</p>
          <h2 id="scope-title">まず、中核となる四つの体験から。</h2>
          <ul className="topic-list">
            {initialTopics.map((topic, index) => (
              <li key={topic}>
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                {topic}
              </li>
            ))}
          </ul>
        </aside>
      </main>

      <footer className="site-footer">
        <p>現在は開発基盤の確認段階です。教材の操作機能は次のフェーズから追加します。</p>
      </footer>
    </div>
  );
}


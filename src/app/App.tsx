import { useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { VectorSpaceLab } from '../labs/vector-space/VectorSpaceLab';
import { LabMenu } from './LabMenu';
import { projectInfo } from './projectInfo';
import './App.css';

export function App() {
  const usageDialogRef = useRef<HTMLDialogElement>(null);

  function handleOpenUsageDialog(): void {
    usageDialogRef.current?.showModal();
  }

  function handleCloseUsageDialog(): void {
    usageDialogRef.current?.close();
  }

  function handleUsageDialogClick(event: ReactMouseEvent<HTMLDialogElement>): void {
    if (event.target === event.currentTarget) {
      handleCloseUsageDialog();
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Linear Algebra Visual Lab ホーム"
        >
          <span className="brand-mark" aria-hidden="true">LA</span>
          <span>{projectInfo.name}</span>
        </a>
        <LabMenu />
        <span className="phase-badge">{projectInfo.phase}</span>
      </header>

      <VectorSpaceLab />

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p>{projectInfo.status} — 現在のLabだけを共有・Resetします。</p>
          <div className="site-footer-meta">
            <span>v{projectInfo.version}</span>
            <button type="button" onClick={handleOpenUsageDialog}>
              利用・プライバシー
            </button>
          </div>
        </div>
      </footer>

      <dialog
        className="usage-dialog"
        ref={usageDialogRef}
        aria-labelledby="usage-dialog-title"
        aria-describedby="usage-dialog-description"
        onClick={handleUsageDialogClick}
      >
        <div className="usage-dialog-content">
          <p className="panel-kicker">Usage &amp; privacy</p>
          <h2 id="usage-dialog-title">利用・プライバシー</h2>
          <p id="usage-dialog-description">
            本アプリは、入力した数学状態とQRコードをブラウザ内で処理します。
          </p>
          <ul>
            <li>アプリ独自のアカウント、Cookie、アクセス解析、サーバー保存はありません。</li>
            <li>共有する数学状態と3DカメラはURL内に含まれます。</li>
            <li>氏名、学籍番号などの個人情報を共有URLへ含めないでください。</li>
            <li>配信元のGitHub Pagesでは、通常のアクセス情報が取り扱われる場合があります。</li>
          </ul>
          <p className="usage-dialog-license">
            {projectInfo.name} v{projectInfo.version} — Copyright © 2026 Daichi Kitamura — MIT License
          </p>
          <div className="usage-dialog-links" aria-label="利用条件の詳細文書">
            <a
              href={`${projectInfo.repositoryUrl}/blob/main/docs/USAGE_AND_PRIVACY.md`}
              target="_blank"
              rel="noreferrer"
            >
              詳細な利用案内
            </a>
            <a
              href={`${projectInfo.repositoryUrl}/blob/main/THIRD_PARTY_NOTICES.md`}
              target="_blank"
              rel="noreferrer"
            >
              第三者ライセンス
            </a>
            <a
              href={`${projectInfo.repositoryUrl}/blob/main/LICENSE`}
              target="_blank"
              rel="noreferrer"
            >
              MIT License全文
            </a>
          </div>
          <button className="usage-dialog-close" type="button" onClick={handleCloseUsageDialog}>
            閉じる
          </button>
        </div>
      </dialog>
    </div>
  );
}

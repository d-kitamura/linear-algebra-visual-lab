import { useEffect, useRef, useState } from 'react';
import { createShareQrCodeDataUrl, createShareQrCodeFileName, createShareTextFileContents, createShareTextFileName } from '../sharing';

/** URLは開いた瞬間のスナップショット。QR失敗時もコピー・テキスト保存を残す。 */
export function ShareExportDialog({ url, onClose }: { readonly url: string; readonly onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const [qr, setQr] = useState('');
  const [qrError, setQrError] = useState('');
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    field.current?.focus();
    field.current?.select();
    let cancelled = false;
    setQr(''); setQrError(''); setFeedback('');
    void createShareQrCodeDataUrl(url).then((value) => { if (!cancelled) setQr(value); }).catch((error: unknown) => {
      if (!cancelled) setQrError(error instanceof Error ? error.message : 'QRコードを生成できませんでした。');
    });
    // 閉じる・別場面への移動後に古いQR生成結果を反映しない。
    // アンマウント時はDOM除去がモーダルを閉じる。ここでcloseイベントを発火すると
    // StrictModeのeffect再実行時にも親のonCloseが呼ばれてしまうため、生成だけを中止する。
    return () => { cancelled = true; };
  }, [url]);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setFeedback('クリップボードにコピーしました。'); }
    catch { field.current?.focus(); field.current?.select(); setFeedback('自動でコピーできませんでした。選択されたURLを手動でコピーしてください。'); }
  }
  function download(href: string, name: string, revoke = false) {
    const anchor = document.createElement('a');
    anchor.href = href; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
    if (revoke) window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    setFeedback('ファイルのダウンロードを開始しました。');
  }
  return <dialog className="share-dialog" ref={dialog} aria-labelledby="representation-share-title" aria-describedby="representation-share-description"
    onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className="share-dialog-content">
      <p className="panel-kicker">Export current state</p>
      <h2 id="representation-share-title">共有URLをエクスポート</h2>
      <p className="share-dialog-description" id="representation-share-description">現在のモード・空間の種類・次元・写像・両基底の成分と順序・入力を復元します。基底変換の方向と3Dカメラも保存します。1D・2Dの表示範囲は全体が見えるように自動調整します。Resetは開いた共有時の状態へ戻ります。</p>
      <section className={'share-qr-code' + (qrError ? ' has-error' : '')} aria-labelledby="representation-share-qr-title" aria-busy={!qr && !qrError}>
        <h3 id="representation-share-qr-title">共有URLのQRコード</h3>
        <div className="share-qr-code-frame">{qr ? <img src={qr} alt="現在の表現行列Lab共有URLを表すQRコード" /> : <p role="status">{qrError || 'QRコードを生成しています。'}</p>}</div>
        {qrError && <p>URLのコピーまたはテキスト保存をご利用ください。</p>}
      </section>
      <label className="share-url-field"><span>共有URL</span><textarea ref={field} readOnly value={url} rows={5} spellCheck={false} aria-describedby="representation-share-description representation-share-feedback" /></label>
      <p id="representation-share-feedback" className="share-feedback" role="status">{feedback || 'URLはドラッグして選択し、手動でもコピーできます。'}</p>
      <div className="share-dialog-actions">
        <button className="copy-share-button" type="button" onClick={() => void copy()}>クリップボードにコピー</button>
        <button type="button" disabled={!qr} onClick={() => download(qr, createShareQrCodeFileName())}>QRコードを保存</button>
        <button type="button" onClick={() => download(URL.createObjectURL(new Blob([createShareTextFileContents(url)], { type: 'text/plain;charset=utf-8' })), createShareTextFileName(), true)}>テキストで保存</button>
        <button type="button" onClick={() => dialog.current?.close()}>閉じる</button>
      </div>
    </div>
  </dialog>;
}

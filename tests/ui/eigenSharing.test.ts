import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { EigenspaceLab } from '../../src/labs/eigenspace/EigenspaceLab';
import { ShareExportDialog } from '../../src/app/ShareExportDialog';
import fixture from '../fixtures/share-url-eigenspace-v1.json';

afterEach(() => vi.unstubAllGlobals());
describe('12.7 固有値Labの共有画面', () => {
  it('第五LabのURLから種類・次元・入力を復元し、Appも第五Labを選ぶ', () => {
    vi.stubGlobal('window', { location: { href: fixture.url } });
    const html = renderToStaticMarkup(createElement(EigenspaceLab, { active: false }));
    expect(html).toContain('Polynomial / 3D');
    expect(html).toContain('入力多項式の係数b2');
    expect(html).toMatch(/aria-label="入力多項式の係数b2"[^>]*value="3"/);
    expect(html).toMatch(/type="checkbox"[^>]*checked/);
    expect(html).not.toMatch(/disabled=""[^>]*>共有URLをエクスポート/);
    expect(html).not.toContain('共有は準備中');
    expect(html).not.toContain('eigen-share-help');
    const app = renderToStaticMarkup(createElement(App));
    expect(app).toContain('教材Labを選択。現在は固有値・固有空間Lab');
    expect(app).toMatch(/data-lab-id="eigenspace" aria-hidden="false"/);
  });
  it('不正URLのフォールバックを利用者へ通知する', () => {
    vi.stubGlobal('window', { location: { href: 'https://example.test/?state=invalid' } });
    const html = renderToStaticMarkup(createElement(EigenspaceLab, { active: true }));
    expect(html).toContain('共有状態を読み込めませんでした');
    expect(html).toContain('初期例を表示しています');
    expect(html).toContain('Eigenspace / 2D');
  });
  it('不正下書き・ドラッグは共有不可、Resetや場面切替はダイアログも破棄する', () => {
    const source = readFileSync(new URL('../../src/labs/eigenspace/EigenspaceLab.tsx', import.meta.url), 'utf8');
    expect(source).toContain('exportDisabled={invalidDrafts.size > 0 || dragging}');
    expect(source).toContain('if (invalidDrafts.size || dragging) return;');
    expect(source).toContain('reportInvalid(errorId, invalid)');
    expect(source).toContain('reportInvalid(errorId, false)');
    expect(source).toContain('createEigenShareState(slot)'); // previewを保存しない。
    expect(source).toContain('key={`${kind}-${dimension}-${revision}`}');
    expect(source).toContain('if (!active) setShareUrl(null)');
    expect(source).toContain('resetEigenWorkspace(w, initial)');
  });
  it('既存共有オーバーレイのQR、URL、保存・コピー・閉じるを共用する', () => {
    const html = renderToStaticMarkup(createElement(ShareExportDialog, { url: fixture.url, onClose: () => {} }));
    expect(html).toContain(fixture.url);
    expect(html.indexOf('share-qr-code')).toBeLessThan(html.indexOf('share-url-field'));
    expect(html).toMatch(/readonly=""/i);
    expect([...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1])).toEqual(['クリップボードにコピー', 'QRコードを保存', 'テキストで保存', '閉じる']);
  });
});

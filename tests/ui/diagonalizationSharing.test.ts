import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { DiagonalizationLab } from '../../src/labs/diagonalization/DiagonalizationLab';
import { ShareExportDialog } from '../../src/app/ShareExportDialog';
import fixture from '../fixtures/share-url-diagonalization-v1.json';

afterEach(() => vi.unstubAllGlobals());
describe('13.6 対角化Labの共有UI', () => {
  it('共有URLから第六Labを選び、入力・表示と交換済み座標を復元する', () => {
    vi.stubGlobal('window', { location: { href: fixture.url } });
    const html = renderToStaticMarkup(createElement(DiagonalizationLab, { active: false }));
    expect(html).toMatch(/aria-label="入力多項式の係数b2"[^>]*value="3"/);
    expect(html).toContain('列ベクトル 3、1、2'); expect(html).toContain('列ベクトル 6、0、2');
    expect(html).toMatch(/type="checkbox"[^>]*checked/);
    expect(html).not.toMatch(/disabled=""[^>]*>共有URLをエクスポート/);
    expect(html).not.toContain('diagonalization-share-help');
    const app = renderToStaticMarkup(createElement(App));
    expect(app).toContain('教材Labを選択。現在は対角化Lab');
    expect(app).toMatch(/data-lab-id="diagonalization" aria-hidden="false"/);
  });
  it('構造不正と意味的不整合のURLを警告付きで初期例へ戻す', () => {
    for (const state of ['invalid', Buffer.from(JSON.stringify({ ...fixture.expectedState, order: null })).toString('base64url')]) {
      vi.stubGlobal('window', { location: { href: 'https://example.test/?state=' + state } });
      const html = renderToStaticMarkup(createElement(DiagonalizationLab));
      expect(html).toContain('共有状態を読み込めませんでした'); expect(html).toContain('初期例を表示しています');
      expect(html).toContain('Diagonalization / 2D');
    }
  });
  it('未確定入力の共有を停止し、確定slotのみ保存、非表示やResetでダイアログを閉じる', () => {
    const source = readFileSync(new URL('../../src/labs/diagonalization/DiagonalizationLab.tsx', import.meta.url), 'utf8');
    expect(source).toContain('exportDisabled={invalid.size > 0 || dragging}');
    expect(source).toContain('if (invalid.size > 0 || dragging || previewRef.current !== null) return;');
    expect(source).toContain('buildShareUrl(window.location.href, createDiagonalizationShareState(slot))');
    expect(source).toContain('if (!active) setShareUrl(null)');
    expect(source).toContain('key={`${kind}-${dimension}-${revision}`}');
    expect(source).toContain('resetDiagonalizationWorkspace(w, initial)');
    expect(source).toContain('labName="対角化Lab"');
  });
  it('QR・URL選択・コピー・PNG・テキスト・閉じるを共通オーバーレイに委ねる', () => {
    const html = renderToStaticMarkup(createElement(ShareExportDialog, { url: fixture.url, labName: '対角化Lab', onClose: () => {} }));
    expect(html).toContain(fixture.url); expect(html).toMatch(/readonly=""/i);
    expect(html.indexOf('share-qr-code')).toBeLessThan(html.indexOf('share-url-field'));
    expect([...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1])).toEqual(['クリップボードにコピー', 'QRコードを保存', 'テキストで保存', '閉じる']);
  });
});

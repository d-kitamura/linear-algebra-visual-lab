import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareExportDialog } from '../../src/app/ShareExportDialog';
import { RepresentationMatrixLab } from '../../src/labs/representation-matrix/RepresentationMatrixLab';
import fixture from '../fixtures/share-url-representation-matrix-v1.json';

afterEach(() => vi.unstubAllGlobals());
describe('11.7 表現行列の共有UI', () => {
  it('URL・QRと4ボタンを既存Labと同じ順序・スタイルで表示する', () => {
    const html = renderToStaticMarkup(createElement(ShareExportDialog, { url: fixture.url, onClose: () => {} }));
    expect(html).toContain('<dialog');
    expect(html).toMatch(/readonly=""/i);
    expect(html).toContain(fixture.url);
    expect(html.indexOf('share-qr-code')).toBeLessThan(html.indexOf('share-url-field'));
    const actions = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1]);
    expect(actions).toEqual(['クリップボードにコピー', 'QRコードを保存', 'テキストで保存', '閉じる']);
    expect(html).toContain('copy-share-button');
    expect(html).toContain('role="status"');
  });
  it('共有URLの多項式場面と基底順を起動時から表示する', () => {
    vi.stubGlobal('window', { location: { href: fixture.url } });
    const html = renderToStaticMarkup(createElement(RepresentationMatrixLab, { active: true }));
    expect(html).toContain('3D → 2D');
    expect(html).toContain('入力f(x)の定数項');
    expect(html.indexOf('aria-label="u3(x)の定数項"')).toBeLessThan(html.indexOf('aria-label="u1(x)の定数項"'));
    expect(html).not.toMatch(/disabled=""[^>]*>共有URLをエクスポート/);
    expect(html).not.toContain('11.7で対応予定');
  });
});

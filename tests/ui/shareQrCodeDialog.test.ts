import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(
  new URL('../../src/app/App.tsx', import.meta.url),
  'utf8',
);
const cssSource = readFileSync(
  new URL('../../src/app/App.css', import.meta.url),
  'utf8',
);

describe('共有QRコードダイアログ', () => {
  it('URL欄の前に読み上げ可能なQRコード表示を置く', () => {
    const qrCodePosition = appSource.indexOf('共有URLのQRコード');
    const urlFieldPosition = appSource.indexOf('className="share-url-field"');

    expect(qrCodePosition).toBeGreaterThan(-1);
    expect(qrCodePosition).toBeLessThan(urlFieldPosition);
    expect(appSource).toContain('alt="現在の共有URLを表すQRコード"');
    expect(appSource).toContain("aria-busy={isShareQrCodeLoading}");
  });

  it('QRコード保存をテキスト保存の左隣に置く', () => {
    const qrSavePosition = appSource.indexOf('QRコードを保存');
    const textSavePosition = appSource.indexOf('テキストで保存');

    expect(qrSavePosition).toBeGreaterThan(-1);
    expect(qrSavePosition).toBeLessThan(textSavePosition);
    expect(appSource).toContain('disabled={!shareQrCodeDataUrl}');
  });

  it('狭い画面では保存操作を1列に並べる', () => {
    expect(cssSource).toMatch(
      /@media \(max-width: 640px\)[\s\S]*?\.share-dialog-actions\s*{\s*grid-template-columns: 1fr;/,
    );
  });
});

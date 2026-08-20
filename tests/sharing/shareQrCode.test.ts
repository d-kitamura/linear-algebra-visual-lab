import { describe, expect, it } from 'vitest';
import {
  createShareQrCodeDataUrl,
  createShareQrCodeFileName,
} from '../../src/sharing';

describe('共有URLのQRコード', () => {
  it('共有URLからPNGのデータURLを生成する', async () => {
    const dataUrl = await createShareQrCodeDataUrl(
      'https://example.jp/linear-algebra-visual-lab/?state=abc123',
    );
    const encodedPng = dataUrl.replace(/^data:image\/png;base64,/, '');
    const png = Buffer.from(encodedPng, 'base64');

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.length).toBeGreaterThan(1_000);
  });

  it('空のURLを安全に拒否する', async () => {
    await expect(createShareQrCodeDataUrl('   ')).rejects.toThrowError(
      'QRコードに変換する共有URLがありません。',
    );
  });

  it('QRコードの容量を超える文字列では案内可能なエラーにする', async () => {
    await expect(createShareQrCodeDataUrl(`https://example.jp/?state=${'a'.repeat(5_000)}`))
      .rejects.toThrowError(
        '共有URLからQRコードを生成できませんでした。URLが長すぎる可能性があります。',
      );
  });

  it('時刻付きのPNGファイル名を作る', () => {
    const date = new Date(2026, 7, 20, 16, 45);

    expect(createShareQrCodeFileName(date))
      .toBe('linear-algebra-visual-lab-qr-20260820-1645.png');
  });
});

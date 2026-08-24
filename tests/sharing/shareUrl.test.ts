import { describe, expect, it } from 'vitest';
import {
  buildShareUrl,
  MAX_OPERATIONAL_SHARE_URL_LENGTH,
  ShareUrlBuildError,
  createShareTextFileContents,
  createShareTextFileName,
  readShareStateFromUrl,
  type ShareState,
} from '../../src/sharing';

const exampleState: ShareState = {
  v: 3,
  lab: 'vector-space',
  dim: 2,
  vectors: [
    { id: 'v1', name: 'v₁', coordinates: [2, 1] },
    { id: 'v2', name: 'v₂', coordinates: [-3, 2] },
  ],
  spanSelection: ['v2'],
  visualization: { showSpan: false, camera: null },
  linearCombination: { visible: true, target: [3, -2] },
};

describe('共有URL', () => {
  it('公開サブパスを維持し、既存のクエリーとハッシュを除いて状態を格納する', () => {
    const shareUrl = buildShareUrl(
      'https://example.jp/linear-algebra-visual-lab/?utm_source=test#section',
      exampleState,
    );
    const url = new URL(shareUrl);

    expect(url.pathname).toBe('/linear-algebra-visual-lab/');
    expect([...url.searchParams.keys()]).toEqual(['state']);
    expect(url.hash).toBe('');
  });

  it('生成したURLから数学状態、span選択、表示切替、ターゲットを復元する', () => {
    const shareUrl = buildShareUrl('https://example.jp/lab/', exampleState);
    const result = readShareStateFromUrl(shareUrl);

    expect(result).toEqual({ status: 'success', state: exampleState });
  });

  it('stateがないURLを通常起動として区別する', () => {
    expect(readShareStateFromUrl('https://example.jp/lab/')).toEqual({ status: 'absent' });
  });

  it('複数のstateや壊れたstateを安全に拒否する', () => {
    const duplicate = readShareStateFromUrl('https://example.jp/lab/?state=a&state=b');
    const invalid = readShareStateFromUrl('https://example.jp/lab/?state=not-json');

    expect(duplicate.status).toBe('error');
    expect(duplicate.status === 'error' ? duplicate.error.code : null)
      .toBe('DUPLICATE_STATE_PARAMETER');
    expect(invalid.status).toBe('error');
    expect(invalid.status === 'error' ? invalid.error.code : null)
      .toBe('INVALID_SHARED_STATE');
  });

  it('URLだけのテキスト内容と時刻付きファイル名を作る', () => {
    const shareUrl = 'https://example.jp/lab/?state=abc';
    const date = new Date(2026, 7, 19, 20, 30);

    expect(createShareTextFileContents(shareUrl)).toBe(`${shareUrl}\n`);
    expect(createShareTextFileName(date))
      .toBe('linear-algebra-visual-lab-url-20260819-2030.txt');
  });

  it('完全URLが授業用上限を超える場合は長さを付けて拒否する', () => {
    const longBaseUrl = `https://example.jp/${'a'.repeat(MAX_OPERATIONAL_SHARE_URL_LENGTH)}/`;

    expect(() => buildShareUrl(longBaseUrl, exampleState)).toThrowError(
      expect.objectContaining<Partial<ShareUrlBuildError>>({
        code: 'URL_TOO_LONG',
        actualLength: expect.any(Number) as number,
      }),
    );
  });
});

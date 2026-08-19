import { decodeShareState, encodeShareState, type ShareStateV1 } from './shareState';

export const SHARE_STATE_QUERY_PARAMETER = 'state';

export type ShareUrlErrorCode =
  | 'INVALID_URL'
  | 'DUPLICATE_STATE_PARAMETER'
  | 'INVALID_SHARED_STATE';

export interface ShareUrlError {
  readonly code: ShareUrlErrorCode;
  readonly message: string;
}

export type ShareUrlReadResult =
  | { readonly status: 'absent' }
  | { readonly status: 'success'; readonly state: ShareStateV1 }
  | { readonly status: 'error'; readonly error: ShareUrlError };

export function buildShareUrl(baseHref: string, state: ShareStateV1): string {
  let url: URL;

  try {
    url = new URL(baseHref);
  } catch {
    throw new TypeError('共有URLの基準となるページURLが正しくありません。');
  }

  url.search = '';
  url.hash = '';
  url.searchParams.set(SHARE_STATE_QUERY_PARAMETER, encodeShareState(state));

  return url.toString();
}

export function readShareStateFromUrl(href: string): ShareUrlReadResult {
  let url: URL;

  try {
    url = new URL(href);
  } catch {
    return {
      status: 'error',
      error: {
        code: 'INVALID_URL',
        message: 'ページURLを読み取れませんでした。',
      },
    };
  }

  const encodedStates = url.searchParams.getAll(SHARE_STATE_QUERY_PARAMETER);
  if (encodedStates.length === 0) {
    return { status: 'absent' };
  }

  if (encodedStates.length > 1) {
    return {
      status: 'error',
      error: {
        code: 'DUPLICATE_STATE_PARAMETER',
        message: '共有状態が複数指定されています。',
      },
    };
  }

  const decoded = decodeShareState(encodedStates[0]);
  if (!decoded.ok) {
    return {
      status: 'error',
      error: {
        code: 'INVALID_SHARED_STATE',
        message: decoded.error.message,
      },
    };
  }

  return { status: 'success', state: decoded.state };
}

export function createShareTextFileContents(shareUrl: string): string {
  return `${shareUrl}\n`;
}

export function createShareTextFileName(now = new Date()): string {
  const timestamp = [
    now.getFullYear(),
    padTwoDigits(now.getMonth() + 1),
    padTwoDigits(now.getDate()),
    '-',
    padTwoDigits(now.getHours()),
    padTwoDigits(now.getMinutes()),
  ].join('');

  return `linear-algebra-visual-lab-url-${timestamp}.txt`;
}

function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

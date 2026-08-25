import { decodeShareState, encodeShareState, type SharedState } from './shareState';

export const SHARE_STATE_QUERY_PARAMETER = 'state';
export const MAX_OPERATIONAL_SHARE_URL_LENGTH = 2_048;

export type ShareUrlBuildErrorCode = 'INVALID_BASE_URL' | 'URL_TOO_LONG';

export class ShareUrlBuildError extends Error {
  readonly code: ShareUrlBuildErrorCode;
  readonly actualLength?: number;

  constructor(code: ShareUrlBuildErrorCode, message: string, actualLength?: number) {
    super(message);
    this.name = 'ShareUrlBuildError';
    this.code = code;
    this.actualLength = actualLength;
  }
}

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
  | { readonly status: 'success'; readonly state: SharedState }
  | { readonly status: 'error'; readonly error: ShareUrlError };

export function buildShareUrl(baseHref: string, state: SharedState): string {
  let url: URL;

  try {
    url = new URL(baseHref);
  } catch {
    throw new ShareUrlBuildError(
      'INVALID_BASE_URL',
      '共有URLの基準となるページURLが正しくありません。',
    );
  }

  url.search = '';
  url.hash = '';
  url.searchParams.set(SHARE_STATE_QUERY_PARAMETER, encodeShareState(state));

  const shareUrl = url.toString();
  if (shareUrl.length > MAX_OPERATIONAL_SHARE_URL_LENGTH) {
    throw new ShareUrlBuildError(
      'URL_TOO_LONG',
      `共有URLが授業用の上限 ${MAX_OPERATIONAL_SHARE_URL_LENGTH} 文字を超えています。`,
      shareUrl.length,
    );
  }

  return shareUrl;
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

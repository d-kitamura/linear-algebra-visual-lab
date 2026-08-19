import type { VectorDimension, VectorValue } from '../domain';

export const SHARE_STATE_VERSION = 1 as const;
export const MAX_SHARE_VECTORS = 8;
export const MAX_SHARE_VECTOR_ID_LENGTH = 32;
export const MAX_SHARE_VECTOR_NAME_LENGTH = 40;
export const MAX_ABSOLUTE_COORDINATE = 1_000_000;
export const MAX_ENCODED_SHARE_STATE_LENGTH = 8_192;

const SHARE_LAB = 'vector-space' as const;
const VECTOR_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface SharedVisualizationState {
  readonly showSpan: boolean;
}

export interface ShareStateV1 {
  readonly v: typeof SHARE_STATE_VERSION;
  readonly lab: typeof SHARE_LAB;
  readonly dim: VectorDimension;
  readonly vectors: readonly VectorValue[];
  readonly spanSelection: readonly string[];
  readonly visualization: SharedVisualizationState;
}

export type ShareStateErrorCode =
  | 'EMPTY_ENCODED_STATE'
  | 'ENCODED_STATE_TOO_LARGE'
  | 'INVALID_BASE64URL'
  | 'INVALID_UTF8'
  | 'INVALID_JSON'
  | 'UNSUPPORTED_VERSION'
  | 'INVALID_STATE'
  | 'VECTOR_LIMIT_EXCEEDED'
  | 'COORDINATE_LIMIT_EXCEEDED'
  | 'UNKNOWN_SPAN_VECTOR';

export class InvalidShareStateError extends Error {
  readonly code: ShareStateErrorCode;
  readonly path?: string;

  constructor(code: ShareStateErrorCode, message: string, path?: string) {
    super(message);
    this.name = 'InvalidShareStateError';
    this.code = code;
    this.path = path;
  }
}

export type ShareStateDecodeResult =
  | { readonly ok: true; readonly state: ShareStateV1 }
  | { readonly ok: false; readonly error: InvalidShareStateError };

export function validateShareState(input: unknown): ShareStateV1 {
  const state = requireRecord(input, '$');
  requireExactKeys(
    state,
    ['v', 'lab', 'dim', 'vectors', 'spanSelection', 'visualization'],
    '$',
  );

  if (state.v !== SHARE_STATE_VERSION) {
    throw new InvalidShareStateError(
      'UNSUPPORTED_VERSION',
      `共有状態のバージョン ${String(state.v)} には対応していません。`,
      '$.v',
    );
  }

  if (state.lab !== SHARE_LAB) {
    throw invalidState('共有状態の Lab が正しくありません。', '$.lab');
  }

  if (state.dim !== 2 && state.dim !== 3) {
    throw invalidState('共有状態の次元は 2 または 3 である必要があります。', '$.dim');
  }
  const dimension = state.dim;

  if (!Array.isArray(state.vectors)) {
    throw invalidState('vectors は配列である必要があります。', '$.vectors');
  }

  if (state.vectors.length > MAX_SHARE_VECTORS) {
    throw new InvalidShareStateError(
      'VECTOR_LIMIT_EXCEEDED',
      `共有できるベクトルは ${MAX_SHARE_VECTORS} 本までです。`,
      '$.vectors',
    );
  }

  const vectorIds = new Set<string>();
  const vectors = state.vectors.map((inputVector, index) => {
    const path = `$.vectors[${index}]`;
    const vector = requireRecord(inputVector, path);
    requireExactKeys(vector, ['id', 'name', 'coordinates'], path);

    const id = requireVectorId(vector.id, `${path}.id`);
    if (vectorIds.has(id)) {
      throw invalidState(`ベクトル ID "${id}" が重複しています。`, `${path}.id`);
    }
    vectorIds.add(id);

    const name = requireVectorName(vector.name, `${path}.name`);
    const coordinates = requireCoordinates(vector.coordinates, dimension, `${path}.coordinates`);

    return { id, name, coordinates } satisfies VectorValue;
  });

  if (!Array.isArray(state.spanSelection)) {
    throw invalidState('spanSelection は配列である必要があります。', '$.spanSelection');
  }

  if (state.spanSelection.length > MAX_SHARE_VECTORS) {
    throw invalidState(
      `spanSelection は ${MAX_SHARE_VECTORS} 件までです。`,
      '$.spanSelection',
    );
  }

  const selectedIds = new Set<string>();
  const spanSelection = state.spanSelection.map((inputId, index) => {
    const path = `$.spanSelection[${index}]`;
    const id = requireVectorId(inputId, path);

    if (selectedIds.has(id)) {
      throw invalidState(`spanSelection の ID "${id}" が重複しています。`, path);
    }
    selectedIds.add(id);

    if (!vectorIds.has(id)) {
      throw new InvalidShareStateError(
        'UNKNOWN_SPAN_VECTOR',
        `spanSelection の ID "${id}" に対応するベクトルがありません。`,
        path,
      );
    }

    return id;
  });

  const visualization = requireRecord(state.visualization, '$.visualization');
  requireExactKeys(visualization, ['showSpan'], '$.visualization');
  if (typeof visualization.showSpan !== 'boolean') {
    throw invalidState('showSpan は真偽値である必要があります。', '$.visualization.showSpan');
  }

  return {
    v: SHARE_STATE_VERSION,
    lab: SHARE_LAB,
    dim: dimension,
    vectors,
    spanSelection,
    visualization: { showSpan: visualization.showSpan },
  };
}

export function encodeShareState(state: ShareStateV1): string {
  const validatedState = validateShareState(state);
  const json = JSON.stringify(validatedState);
  const encoded = bytesToBase64Url(new TextEncoder().encode(json));

  if (encoded.length > MAX_ENCODED_SHARE_STATE_LENGTH) {
    throw new InvalidShareStateError(
      'ENCODED_STATE_TOO_LARGE',
      `共有状態が ${MAX_ENCODED_SHARE_STATE_LENGTH} 文字を超えています。`,
    );
  }

  return encoded;
}

export function decodeShareState(encoded: string): ShareStateDecodeResult {
  try {
    if (typeof encoded !== 'string' || encoded.length === 0) {
      throw new InvalidShareStateError(
        'EMPTY_ENCODED_STATE',
        '共有状態が指定されていません。',
      );
    }

    if (encoded.length > MAX_ENCODED_SHARE_STATE_LENGTH) {
      throw new InvalidShareStateError(
        'ENCODED_STATE_TOO_LARGE',
        `共有状態は ${MAX_ENCODED_SHARE_STATE_LENGTH} 文字以内である必要があります。`,
      );
    }

    const bytes = base64UrlToBytes(encoded);
    const json = decodeUtf8(bytes);
    const parsed = parseJson(json);

    return { ok: true, state: validateShareState(parsed) };
  } catch (error) {
    if (error instanceof InvalidShareStateError) {
      return { ok: false, error };
    }

    return {
      ok: false,
      error: new InvalidShareStateError(
        'INVALID_STATE',
        '共有状態を復元できませんでした。',
      ),
    };
  }
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidState('オブジェクトである必要があります。', path);
  }

  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  path: string,
): void {
  const actualKeys = Object.keys(value);
  const expected = new Set(expectedKeys);

  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key) => !expected.has(key))
  ) {
    throw invalidState('フィールドの不足または未対応のフィールドがあります。', path);
  }
}

function requireVectorId(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_SHARE_VECTOR_ID_LENGTH ||
    !VECTOR_ID_PATTERN.test(value)
  ) {
    throw invalidState(
      `ID は英数字、ハイフン、アンダースコアからなる ${MAX_SHARE_VECTOR_ID_LENGTH} 文字以内の文字列である必要があります。`,
      path,
    );
  }

  return value;
}

function requireVectorName(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > MAX_SHARE_VECTOR_NAME_LENGTH ||
    !isWellFormedUnicode(value)
  ) {
    throw invalidState(
      `表示名は空でない ${MAX_SHARE_VECTOR_NAME_LENGTH} 文字以内の文字列である必要があります。`,
      path,
    );
  }

  return value;
}

function requireCoordinates(
  value: unknown,
  dimension: VectorDimension,
  path: string,
): number[] {
  if (!Array.isArray(value) || value.length !== dimension) {
    throw invalidState(`座標数は ${dimension} 個である必要があります。`, path);
  }

  return value.map((coordinate, index) => {
    if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) {
      throw invalidState('座標は有限の数である必要があります。', `${path}[${index}]`);
    }

    if (Math.abs(coordinate) > MAX_ABSOLUTE_COORDINATE) {
      throw new InvalidShareStateError(
        'COORDINATE_LIMIT_EXCEEDED',
        `座標の絶対値は ${MAX_ABSOLUTE_COORDINATE} 以下である必要があります。`,
        `${path}[${index}]`,
      );
    }

    return Object.is(coordinate, -0) ? 0 : coordinate;
  });
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (index + 1 >= value.length) {
        return false;
      }
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) {
        return false;
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return true;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(encoded: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(encoded) || encoded.length % 4 === 1) {
    throw new InvalidShareStateError(
      'INVALID_BASE64URL',
      '共有状態が正しい Base64URL 形式ではありません。',
    );
  }

  const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    throw new InvalidShareStateError(
      'INVALID_BASE64URL',
      '共有状態が正しい Base64URL 形式ではありません。',
    );
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new InvalidShareStateError('INVALID_UTF8', '共有状態を UTF-8 として読めません。');
  }
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new InvalidShareStateError('INVALID_JSON', '共有状態が正しい JSON ではありません。');
  }
}

function invalidState(message: string, path?: string): InvalidShareStateError {
  return new InvalidShareStateError('INVALID_STATE', message, path);
}

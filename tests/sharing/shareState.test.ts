import { describe, expect, it } from 'vitest';
import {
  MAX_ABSOLUTE_COORDINATE,
  MAX_ENCODED_SHARE_STATE_LENGTH,
  MAX_SHARE_VECTORS,
  decodeShareState,
  encodeShareState,
  validateShareState,
  type ShareState,
  type ShareStateErrorCode,
  type ShareStateV1,
} from '../../src/sharing';

const exampleState: ShareState = {
  v: 2,
  lab: 'vector-space',
  dim: 2,
  vectors: [
    { id: 'v1', name: 'ベクトル v₁', coordinates: [2, 1] },
    { id: 'v2', name: 'ベクトル v₂', coordinates: [-3, 2] },
  ],
  spanSelection: ['v1'],
  visualization: { showSpan: true },
  linearCombination: { visible: true, target: [3, -2] },
};

function expectDecodeError(encoded: string, code: ShareStateErrorCode): void {
  const result = decodeShareState(encoded);

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe(code);
  }
}

function encodeRawText(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function encodeRawValue(value: unknown): string {
  return encodeRawText(JSON.stringify(value));
}

describe('share-state round trip', () => {
  it('restores the same state including Japanese display names', () => {
    const encoded = encodeShareState(exampleState);
    const decoded = decodeShareState(encoded);

    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.state).toEqual(exampleState);
    }
  });

  it('produces deterministic URL-safe output without padding', () => {
    const first = encodeShareState(exampleState);
    const second = encodeShareState(exampleState);

    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(first).not.toContain('=');
  });

  it('supports a 3D state and an empty span selection', () => {
    const state: ShareState = {
      v: 2,
      lab: 'vector-space',
      dim: 3,
      vectors: [{ id: 'v1', name: 'v₁', coordinates: [1, 0, -2.5] }],
      spanSelection: [],
      visualization: { showSpan: false },
      linearCombination: { visible: true, target: [2, 0, -1] },
    };

    const decoded = decodeShareState(encodeShareState(state));

    expect(decoded).toEqual({ ok: true, state });
  });
});

describe('share-state schema validation', () => {
  it('returns a canonical copy with only supported fields', () => {
    const validated = validateShareState(exampleState);

    expect(validated).toEqual(exampleState);
    expect(validated).not.toBe(exampleState);
  });

  it('rejects more vectors than the safety limit', () => {
    const state = {
      ...exampleState,
      vectors: Array.from({ length: MAX_SHARE_VECTORS + 1 }, (_, index) => ({
        id: `v${index}`,
        name: `v${index}`,
        coordinates: [index, 0],
      })),
    } as ShareState;

    expect(() => encodeShareState(state)).toThrowError(
      expect.objectContaining({ code: 'VECTOR_LIMIT_EXCEEDED' }),
    );
  });

  it('rejects coordinates beyond the safety limit', () => {
    const state = {
      ...exampleState,
      vectors: [
        {
          id: 'v1',
          name: 'v₁',
          coordinates: [MAX_ABSOLUTE_COORDINATE + 1, 0],
        },
      ],
      spanSelection: ['v1'],
    } as ShareState;

    expect(() => encodeShareState(state)).toThrowError(
      expect.objectContaining({ code: 'COORDINATE_LIMIT_EXCEEDED' }),
    );
  });

  it('rejects non-finite coordinates before encoding', () => {
    const state = {
      ...exampleState,
      vectors: [{ id: 'v1', name: 'v₁', coordinates: [Number.NaN, 0] }],
      spanSelection: ['v1'],
    } as ShareState;

    expect(() => encodeShareState(state)).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE' }),
    );
  });

  it('rejects a coordinate count inconsistent with the dimension', () => {
    const invalid = {
      ...exampleState,
      dim: 3,
    } as ShareState;

    expect(() => encodeShareState(invalid)).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE' }),
    );
  });

  it('rejects duplicate vector IDs', () => {
    const invalid = {
      ...exampleState,
      vectors: [exampleState.vectors[0], exampleState.vectors[0]],
    } as ShareState;

    expect(() => encodeShareState(invalid)).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE' }),
    );
  });

  it('rejects duplicate and unknown span selections', () => {
    const duplicate = { ...exampleState, spanSelection: ['v1', 'v1'] } as ShareState;
    const unknown = { ...exampleState, spanSelection: ['missing'] } as ShareState;

    expect(() => encodeShareState(duplicate)).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE' }),
    );
    expect(() => encodeShareState(unknown)).toThrowError(
      expect.objectContaining({ code: 'UNKNOWN_SPAN_VECTOR' }),
    );
  });

  it('rejects unknown fields rather than silently accepting them', () => {
    const encoded = encodeRawValue({ ...exampleState, temporaryPanelOpen: true });

    expectDecodeError(encoded, 'INVALID_STATE');
  });

  it('rejects a display name containing an unpaired Unicode surrogate', () => {
    const invalid = {
      ...exampleState,
      vectors: [{ id: 'v1', name: '\ud800', coordinates: [1, 0] }],
      spanSelection: ['v1'],
    } as ShareState;

    expect(() => encodeShareState(invalid)).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATE' }),
    );
  });

  it('canonicalizes negative zero to zero', () => {
    const state = {
      ...exampleState,
      vectors: [{ id: 'v1', name: 'v₁', coordinates: [-0, 0] }],
      spanSelection: ['v1'],
    } as ShareState;
    const validated = validateShareState(state);

    expect(validated.vectors[0].coordinates).toEqual([0, 0]);
    expect(Object.is(validated.vectors[0].coordinates[0], -0)).toBe(false);
  });

  it('validates and canonicalizes the linear-combination target', () => {
    const validated = validateShareState({
      ...exampleState,
      linearCombination: { visible: true, target: [-0, 2] },
    });

    expect(validated.linearCombination).toEqual({ visible: true, target: [0, 2] });
    expect(Object.is(validated.linearCombination.target?.[0], -0)).toBe(false);
  });

  it('accepts a hidden explorer without a target', () => {
    const state: ShareState = {
      ...exampleState,
      linearCombination: { visible: false, target: null },
    };

    expect(validateShareState(state)).toEqual(state);
  });

  it('rejects an invalid explorer value and target', () => {
    expectDecodeError(encodeRawValue({
      ...exampleState,
      linearCombination: { visible: 'yes', target: [1, 2] },
    }), 'INVALID_STATE');
    expectDecodeError(encodeRawValue({
      ...exampleState,
      linearCombination: { visible: true, target: [1, 2, 3] },
    }), 'INVALID_STATE');
    expectDecodeError(encodeRawValue({
      ...exampleState,
      linearCombination: {
        visible: true,
        target: [MAX_ABSOLUTE_COORDINATE + 1, 0],
      },
    }), 'COORDINATE_LIMIT_EXCEEDED');
  });

  it('migrates a strict v1 state to the current v2 defaults', () => {
    const legacyState: ShareStateV1 = {
      v: 1,
      lab: 'vector-space',
      dim: 2,
      vectors: exampleState.vectors,
      spanSelection: exampleState.spanSelection,
      visualization: exampleState.visualization,
    };
    const decoded = decodeShareState(encodeRawValue(legacyState));

    expect(decoded).toEqual({
      ok: true,
      state: {
        ...legacyState,
        v: 2,
        linearCombination: { visible: false, target: null },
      },
    });
  });

  it('keeps v1 strict instead of accepting v2 fields under the old version', () => {
    const legacyWithNewField = {
      ...exampleState,
      v: 1,
    };

    expectDecodeError(encodeRawValue(legacyWithNewField), 'INVALID_STATE');
  });
});

describe('safe share-state decoding', () => {
  it('returns an error for an empty encoded state', () => {
    expectDecodeError('', 'EMPTY_ENCODED_STATE');
  });

  it('rejects encoded input beyond the safety limit before decoding', () => {
    expectDecodeError('A'.repeat(MAX_ENCODED_SHARE_STATE_LENGTH + 1), 'ENCODED_STATE_TOO_LARGE');
  });

  it('rejects malformed Base64URL', () => {
    expectDecodeError('not+base64=', 'INVALID_BASE64URL');
  });

  it('rejects invalid UTF-8', () => {
    expectDecodeError('_w', 'INVALID_UTF8');
  });

  it('rejects invalid JSON', () => {
    expectDecodeError(encodeRawText('{broken'), 'INVALID_JSON');
  });

  it('rejects an unsupported schema version', () => {
    expectDecodeError(encodeRawValue({ ...exampleState, v: 3 }), 'UNSUPPORTED_VERSION');
  });

  it('rejects a wrong visualization value type', () => {
    const encoded = encodeRawValue({
      ...exampleState,
      visualization: { showSpan: 'yes' },
    });

    expectDecodeError(encoded, 'INVALID_STATE');
  });
});

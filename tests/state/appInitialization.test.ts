import { describe, expect, it } from 'vitest';
import { buildShareUrl, type ShareState, type ShareStateV1 } from '../../src/sharing';
import {
  createAppInitialization,
  DEFAULT_2D_SHARE_STATE,
  DEFAULT_3D_SHARE_STATE,
} from '../../src/state';

describe('アプリ初期状態', () => {
  it('stateがない場合は既定の2D例をInitialStateにする', () => {
    const initialization = createAppInitialization('https://example.jp/lab/');

    expect(initialization).toEqual({
      initialStates: { 2: DEFAULT_2D_SHARE_STATE, 3: DEFAULT_3D_SHARE_STATE },
      activeDimension: 2,
      source: 'default',
      errorMessage: null,
    });
  });

  it('有効な2D共有URLをInitialStateにする', () => {
    const shared: ShareState = {
      ...DEFAULT_2D_SHARE_STATE,
      vectors: [{ id: 'a', name: 'a₁', coordinates: [4, -1] }],
      spanSelection: ['a'],
      visualization: { showSpan: false },
      linearCombination: { visible: true, target: [3, -2] },
    };
    const initialization = createAppInitialization(
      buildShareUrl('https://example.jp/lab/', shared),
    );

    expect(initialization.initialStates).toEqual({
      2: shared,
      3: DEFAULT_3D_SHARE_STATE,
    });
    expect(initialization.activeDimension).toBe(2);
    expect(initialization.source).toBe('shared');
    expect(initialization.errorMessage).toBeNull();
  });

  it('壊れた共有URLでは既定例へ安全にフォールバックする', () => {
    const initialization = createAppInitialization('https://example.jp/lab/?state=broken');

    expect(initialization.initialStates).toEqual({
      2: DEFAULT_2D_SHARE_STATE,
      3: DEFAULT_3D_SHARE_STATE,
    });
    expect(initialization.activeDimension).toBe(2);
    expect(initialization.source).toBe('fallback');
    expect(initialization.errorMessage).toContain('共有URLを復元できませんでした');
  });

  it('有効な3D共有状態を3D側のInitialStateにして3Dタブを選ぶ', () => {
    const shared3d: ShareState = {
      ...DEFAULT_2D_SHARE_STATE,
      dim: 3,
      vectors: [{ id: 'v1', name: 'v₁', coordinates: [1, 2, 3] }],
      spanSelection: ['v1'],
      linearCombination: { visible: true, target: [2, 0, -1] },
    };
    const initialization = createAppInitialization(
      buildShareUrl('https://example.jp/lab/', shared3d),
    );

    expect(initialization.initialStates).toEqual({
      2: DEFAULT_2D_SHARE_STATE,
      3: shared3d,
    });
    expect(initialization.activeDimension).toBe(3);
    expect(initialization.source).toBe('shared');
    expect(initialization.errorMessage).toBeNull();
  });

  it('v1共有URLをv2へ移行してInitialStateにする', () => {
    const legacy: ShareStateV1 = {
      v: 1,
      lab: 'vector-space',
      dim: 2,
      vectors: [{ id: 'v1', name: 'v₁', coordinates: [4, -1] }],
      spanSelection: ['v1'],
      visualization: { showSpan: false },
    };
    const encoded = encodeRawValue(legacy);
    const initialization = createAppInitialization(`https://example.jp/lab/?state=${encoded}`);

    expect(initialization.initialStates[2]).toEqual({
      ...legacy,
      v: 2,
      linearCombination: { visible: false, target: null },
    });
    expect(initialization.activeDimension).toBe(2);
    expect(initialization.source).toBe('shared');
  });
});

function encodeRawValue(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

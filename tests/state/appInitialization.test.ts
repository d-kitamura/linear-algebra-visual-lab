import { describe, expect, it } from 'vitest';
import { buildShareUrl, type ShareStateV1 } from '../../src/sharing';
import { createAppInitialization, DEFAULT_2D_SHARE_STATE } from '../../src/state';

describe('アプリ初期状態', () => {
  it('stateがない場合は既定の2D例をInitialStateにする', () => {
    const initialization = createAppInitialization('https://example.jp/lab/');

    expect(initialization).toEqual({
      initialState: DEFAULT_2D_SHARE_STATE,
      source: 'default',
      errorMessage: null,
    });
  });

  it('有効な2D共有URLをInitialStateにする', () => {
    const shared: ShareStateV1 = {
      ...DEFAULT_2D_SHARE_STATE,
      vectors: [{ id: 'a', name: 'a₁', coordinates: [4, -1] }],
      spanSelection: ['a'],
      visualization: { showSpan: false },
    };
    const initialization = createAppInitialization(
      buildShareUrl('https://example.jp/lab/', shared),
    );

    expect(initialization.initialState).toEqual(shared);
    expect(initialization.source).toBe('shared');
    expect(initialization.errorMessage).toBeNull();
  });

  it('壊れた共有URLでは既定例へ安全にフォールバックする', () => {
    const initialization = createAppInitialization('https://example.jp/lab/?state=broken');

    expect(initialization.initialState).toEqual(DEFAULT_2D_SHARE_STATE);
    expect(initialization.source).toBe('fallback');
    expect(initialization.errorMessage).toContain('共有URLを復元できなかった');
  });

  it('未実装の3D共有状態では既定例と明示的な案内を返す', () => {
    const shared3d: ShareStateV1 = {
      ...DEFAULT_2D_SHARE_STATE,
      dim: 3,
      vectors: [{ id: 'v1', name: 'v₁', coordinates: [1, 2, 3] }],
      spanSelection: ['v1'],
    };
    const initialization = createAppInitialization(
      buildShareUrl('https://example.jp/lab/', shared3d),
    );

    expect(initialization.initialState).toEqual(DEFAULT_2D_SHARE_STATE);
    expect(initialization.source).toBe('fallback');
    expect(initialization.errorMessage).toContain('3次元');
  });
});

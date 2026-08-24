import { describe, expect, it } from 'vitest';
import {
  SHARE_STATE_VERSION,
  buildShareUrl,
  readShareStateFromUrl,
  type ShareState,
} from '../../src/sharing';
import v3Fixture from '../fixtures/share-url-v3.json';

const expectedState = v3Fixture.expectedState as ShareState;

describe('正式リリース候補の共有URL互換性', () => {
  it('最初の保証対象を共有状態v3として固定する', () => {
    expect(SHARE_STATE_VERSION).toBe(3);
    expect(v3Fixture.schemaVersion).toBe(3);
  });

  it('固定したv3 URLを現行状態へ復元する', () => {
    expect(readShareStateFromUrl(v3Fixture.url)).toEqual({
      status: 'success',
      state: expectedState,
    });
  });

  it('現行v3エンコーダーが固定URLを決定的に再生成する', () => {
    expect(buildShareUrl(
      'https://d-kitamura.github.io/linear-algebra-visual-lab/',
      expectedState,
    )).toBe(v3Fixture.url);
  });
});

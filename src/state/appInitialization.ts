import { readShareStateFromUrl, type ShareStateV1 } from '../sharing';
import { DEFAULT_2D_SHARE_STATE } from './defaultState';

export interface AppInitialization {
  readonly initialState: ShareStateV1;
  readonly source: 'default' | 'shared' | 'fallback';
  readonly errorMessage: string | null;
}

export function createAppInitialization(href: string): AppInitialization {
  const result = readShareStateFromUrl(href);

  if (result.status === 'absent') {
    return {
      initialState: DEFAULT_2D_SHARE_STATE,
      source: 'default',
      errorMessage: null,
    };
  }

  if (result.status === 'error') {
    return {
      initialState: DEFAULT_2D_SHARE_STATE,
      source: 'fallback',
      errorMessage: `共有URLを復元できなかったため、既定例を表示しています。${result.error.message}`,
    };
  }

  if (result.state.dim !== 2) {
    return {
      initialState: DEFAULT_2D_SHARE_STATE,
      source: 'fallback',
      errorMessage: '3次元の共有状態は現在の2D画面では開けないため、既定例を表示しています。',
    };
  }

  return {
    initialState: result.state,
    source: 'shared',
    errorMessage: null,
  };
}

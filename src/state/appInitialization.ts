import { readShareStateFromUrl, type ShareState } from '../sharing';
import { DEFAULT_2D_SHARE_STATE, DEFAULT_3D_SHARE_STATE } from './defaultState';

export type AppDimension = 2 | 3;

export interface InitialStatesByDimension {
  readonly 2: ShareState;
  readonly 3: ShareState;
}

export interface AppInitialization {
  readonly initialStates: InitialStatesByDimension;
  readonly activeDimension: AppDimension;
  readonly source: 'default' | 'shared' | 'fallback';
  readonly errorMessage: string | null;
}

export function createAppInitialization(href: string): AppInitialization {
  const result = readShareStateFromUrl(href);

  if (result.status === 'absent') {
    return {
      initialStates: createInitialStates(),
      activeDimension: 2,
      source: 'default',
      errorMessage: null,
    };
  }

  if (result.status === 'error') {
    return {
      initialStates: createInitialStates(),
      activeDimension: 2,
      source: 'fallback',
      errorMessage: `共有URLを復元できませんでした。既定例を表示しています。理由：${result.error.message}`,
    };
  }

  const initialStates = createInitialStates(result.state);

  return {
    initialStates,
    activeDimension: result.state.dim,
    source: 'shared',
    errorMessage: null,
  };
}

function createInitialStates(sharedState?: ShareState): InitialStatesByDimension {
  return {
    2: sharedState?.dim === 2 ? sharedState : DEFAULT_2D_SHARE_STATE,
    3: sharedState?.dim === 3 ? sharedState : DEFAULT_3D_SHARE_STATE,
  };
}

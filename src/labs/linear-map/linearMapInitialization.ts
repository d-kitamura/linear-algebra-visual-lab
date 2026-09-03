import {
  DEFAULT_3D_CAMERA_STATE,
  readShareStateFromUrl,
  type LinearMapShareState,
  type SharedCameraState,
} from '../../sharing';
import {
  LINEAR_MAP_SHAPES,
  createDefaultLinearMapScene,
  linearMapShapeId,
  type LinearMapScene,
  type LinearMapShapeId,
} from './linearMapState';

export interface LinearMapInitialState {
  readonly scene: LinearMapScene;
  readonly domainCamera: SharedCameraState;
  readonly codomainCamera: SharedCameraState;
}

export interface LinearMapInitialization {
  readonly initialStates: Readonly<Record<LinearMapShapeId, LinearMapInitialState>>;
  readonly activeShapeId: LinearMapShapeId;
  readonly source: 'default' | 'shared' | 'fallback';
  readonly errorMessage: string | null;
}

/**
 * URLは一度だけ読み、共有された次元組だけをInitialStateとして差し替える。
 * これにより、共有URLから開いた後のResetは共有時状態へ戻り、他の次元組は既定例を保つ。
 */
export function createLinearMapInitialization(href: string): LinearMapInitialization {
  const result = readShareStateFromUrl(href);
  if (result.status === 'absent') {
    return createDefaultInitialization();
  }
  if (result.status === 'error') {
    return {
      ...createDefaultInitialization(),
      source: 'fallback',
      errorMessage: `共有URLを復元できませんでした。既定例を表示しています。理由：${result.error.message}`,
    };
  }
  if (result.state.lab !== 'linear-map') {
    return createDefaultInitialization();
  }

  const shapeId = linearMapShapeId(
    result.state.sourceDimension,
    result.state.targetDimension,
  );
  return {
    initialStates: {
      ...createDefaultLinearMapInitialStates(),
      [shapeId]: toInitialState(result.state),
    },
    activeShapeId: shapeId,
    source: 'shared',
    errorMessage: null,
  };
}

export function createLinearMapShareState(
  initial: LinearMapInitialState,
): LinearMapShareState {
  const { scene } = initial;
  return {
    v: 1,
    lab: 'linear-map',
    sourceDimension: scene.sourceDimension,
    targetDimension: scene.targetDimension,
    matrix: scene.matrix,
    inputVector: scene.inputVector,
    secondaryInputVector: scene.secondaryInputVector,
    scalar: scene.scalar,
    visualization: {
      showTransformedGrid: scene.showTransformedGrid,
      domainCamera: scene.sourceDimension === 3 ? initial.domainCamera : null,
      codomainCamera: scene.targetDimension === 3 ? initial.codomainCamera : null,
    },
  };
}

function createDefaultInitialization(): LinearMapInitialization {
  return {
    initialStates: createDefaultLinearMapInitialStates(),
    activeShapeId: '2-to-2',
    source: 'default',
    errorMessage: null,
  };
}

function createDefaultLinearMapInitialStates(): Record<LinearMapShapeId, LinearMapInitialState> {
  return Object.fromEntries(LINEAR_MAP_SHAPES.map((shape) => [
    shape.id,
    {
      scene: createDefaultLinearMapScene(shape.sourceDimension, shape.targetDimension),
      domainCamera: cloneCamera(DEFAULT_3D_CAMERA_STATE),
      codomainCamera: cloneCamera(DEFAULT_3D_CAMERA_STATE),
    },
  ])) as Record<LinearMapShapeId, LinearMapInitialState>;
}

function toInitialState(state: LinearMapShareState): LinearMapInitialState {
  return {
    scene: {
      sourceDimension: state.sourceDimension,
      targetDimension: state.targetDimension,
      matrix: state.matrix.map((row) => [...row]),
      inputVector: [...state.inputVector],
      secondaryInputVector: [...state.secondaryInputVector],
      scalar: state.scalar,
      showTransformedGrid: state.visualization.showTransformedGrid,
    },
    domainCamera: cloneCamera(state.visualization.domainCamera ?? DEFAULT_3D_CAMERA_STATE),
    codomainCamera: cloneCamera(state.visualization.codomainCamera ?? DEFAULT_3D_CAMERA_STATE),
  };
}

function cloneCamera(camera: SharedCameraState): SharedCameraState {
  return {
    direction: [...camera.direction],
    target: [...camera.target],
    up: [...camera.up],
    zoom: camera.zoom,
  };
}

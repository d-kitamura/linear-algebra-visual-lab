import {
  DEFAULT_3D_CAMERA_STATE,
  readShareStateFromUrl,
  type BasisDimensionShareState,
  type BasisRepresentation,
  type SharedCameraState,
} from '../../sharing';
import type { VectorDimension } from '../../domain';
import {
  createDefaultBasisScene,
  type BasisDimensionScene,
} from './basisDimensionState';

export interface BasisDimensionInitialState {
  readonly scene: BasisDimensionScene;
  readonly representation: BasisRepresentation;
  readonly linearCombinationVisible: boolean;
  readonly comparisonBasisIds: readonly string[] | null;
  readonly camera: SharedCameraState;
}

export interface BasisDimensionInitialization {
  readonly initialStates: Readonly<Record<VectorDimension, BasisDimensionInitialState>>;
  readonly activeDimension: VectorDimension;
  readonly source: 'default' | 'shared' | 'fallback';
  readonly errorMessage: string | null;
}

export function createBasisDimensionInitialization(href: string): BasisDimensionInitialization {
  const result = readShareStateFromUrl(href);
  if (result.status === 'absent') {
    return createInitialization();
  }
  if (result.status === 'error') {
    return {
      ...createInitialization(),
      source: 'fallback',
      errorMessage: `共有URLを復元できませんでした。既定例を表示しています。理由：${result.error.message}`,
    };
  }

  if (result.state.lab !== 'basis-dimension') {
    return createInitialization();
  }

  const sharedState = result.state;
  const initialStates = createDefaultInitialStates();
  return {
    initialStates: {
      ...initialStates,
      [sharedState.dim]: toInitialState(sharedState),
    },
    activeDimension: sharedState.dim,
    source: 'shared',
    errorMessage: null,
  };
}

export function createBasisDimensionShareState(
  initial: BasisDimensionInitialState,
): BasisDimensionShareState {
  return {
    v: 1,
    lab: 'basis-dimension',
    dim: initial.scene.dimension,
    vectors: initial.scene.vectors,
    candidateVectorIds: initial.scene.candidateVectorIds,
    representation: initial.representation,
    linearCombination: {
      visible: initial.linearCombinationVisible,
      target: initial.scene.target,
    },
    comparisonBasisIds: initial.comparisonBasisIds,
    camera: initial.scene.dimension === 3 ? initial.camera : null,
  };
}

function createInitialization(): BasisDimensionInitialization {
  return {
    initialStates: createDefaultInitialStates(),
    activeDimension: 2,
    source: 'default',
    errorMessage: null,
  };
}

function createDefaultInitialStates(): Readonly<Record<VectorDimension, BasisDimensionInitialState>> {
  return {
    2: createDefaultInitialState(2),
    3: createDefaultInitialState(3),
  };
}

function createDefaultInitialState(dimension: VectorDimension): BasisDimensionInitialState {
  return {
    scene: createDefaultBasisScene(dimension),
    representation: 'coordinate',
    linearCombinationVisible: false,
    comparisonBasisIds: null,
    camera: DEFAULT_3D_CAMERA_STATE,
  };
}

function toInitialState(state: BasisDimensionShareState): BasisDimensionInitialState {
  return {
    scene: {
      dimension: state.dim,
      vectors: state.vectors,
      candidateVectorIds: state.candidateVectorIds,
      target: state.linearCombination.target,
    },
    representation: state.representation,
    linearCombinationVisible: state.linearCombination.visible,
    comparisonBasisIds: state.comparisonBasisIds,
    camera: state.camera ?? DEFAULT_3D_CAMERA_STATE,
  };
}

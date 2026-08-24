import {
  DEFAULT_3D_CAMERA_STATE,
  validateShareState,
  type ShareState,
} from '../sharing';

const initialTwoDimensionalState: ShareState = {
  v: 3,
  lab: 'vector-space',
  dim: 2,
  vectors: [
    { id: 'a1', name: 'a₁', coordinates: [2, 1] },
    { id: 'a2', name: 'a₂', coordinates: [-3, 2] },
  ],
  spanSelection: ['a1', 'a2'],
  visualization: { showSpan: true, camera: null },
  linearCombination: { visible: false, target: null },
};

export const DEFAULT_2D_SHARE_STATE = validateShareState(initialTwoDimensionalState);

const initialThreeDimensionalState: ShareState = {
  v: 3,
  lab: 'vector-space',
  dim: 3,
  vectors: [
    { id: 'a1', name: 'a₁', coordinates: [2, 0, 1] },
    { id: 'a2', name: 'a₂', coordinates: [0, 2, 1] },
    { id: 'a3', name: 'a₃', coordinates: [1, 1, 2] },
  ],
  spanSelection: ['a1', 'a2', 'a3'],
  visualization: { showSpan: true, camera: DEFAULT_3D_CAMERA_STATE },
  linearCombination: { visible: false, target: null },
};

export const DEFAULT_3D_SHARE_STATE = validateShareState(initialThreeDimensionalState);

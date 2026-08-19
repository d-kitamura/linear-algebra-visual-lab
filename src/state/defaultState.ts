import { validateShareState, type ShareState } from '../sharing';

const initialState: ShareState = {
  v: 2,
  lab: 'vector-space',
  dim: 2,
  vectors: [
    { id: 'v1', name: 'v₁', coordinates: [2, 1] },
    { id: 'v2', name: 'v₂', coordinates: [-3, 2] },
  ],
  spanSelection: ['v1', 'v2'],
  visualization: { showSpan: true },
  linearCombination: { visible: false, target: null },
};

export const DEFAULT_2D_SHARE_STATE = validateShareState(initialState);

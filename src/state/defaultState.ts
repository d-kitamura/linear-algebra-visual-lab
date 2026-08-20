import { validateShareState, type ShareState } from '../sharing';

const initialState: ShareState = {
  v: 2,
  lab: 'vector-space',
  dim: 2,
  vectors: [
    { id: 'a1', name: 'a₁', coordinates: [2, 1] },
    { id: 'a2', name: 'a₂', coordinates: [-3, 2] },
  ],
  spanSelection: ['a1', 'a2'],
  visualization: { showSpan: true },
  linearCombination: { visible: false, target: null },
};

export const DEFAULT_2D_SHARE_STATE = validateShareState(initialState);

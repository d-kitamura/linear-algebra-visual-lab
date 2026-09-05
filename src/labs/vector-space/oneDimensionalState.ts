import type { VectorValue } from '../../domain';
import { MAX_SHARE_VECTORS, type ShareState } from '../../sharing';

export interface OneDimensionalVectorSpaceState {
  readonly vectors: readonly VectorValue[];
  readonly spanSelection: readonly string[];
  readonly showSpan: boolean;
  readonly linearCombinationVisible: boolean;
  readonly target: number | null;
}

export interface OneDimensionalVectorAddResult {
  readonly state: OneDimensionalVectorSpaceState;
  readonly addedVector: VectorValue | null;
}

export function createInitialOneDimensionalVectorSpaceState(): OneDimensionalVectorSpaceState {
  return {
    vectors: [{ id: 'a1', name: 'a1', coordinates: [2] }],
    spanSelection: ['a1'],
    showSpan: true,
    linearCombinationVisible: false,
    target: null,
  };
}

/** 数直線UIの状態は共有v4との変換を通し、描画用の単一成分を保つ。 */
export function addOneDimensionalVector(
  state: OneDimensionalVectorSpaceState,
): OneDimensionalVectorAddResult {
  if (state.vectors.length >= MAX_SHARE_VECTORS) {
    return { state, addedVector: null };
  }

  const usedIndices = new Set(state.vectors.map((vector) => vectorIndex(vector.id)));
  let nextIndex = 1;
  while (usedIndices.has(nextIndex)) {
    nextIndex += 1;
  }
  const id = `a${nextIndex}`;
  const addedVector: VectorValue = { id, name: id, coordinates: [1] };

  return {
    addedVector,
    state: {
      ...state,
      vectors: [...state.vectors, addedVector],
      spanSelection: [...state.spanSelection, id],
    },
  };
}

export function removeOneDimensionalVector(
  state: OneDimensionalVectorSpaceState,
  vectorId: string,
): OneDimensionalVectorSpaceState {
  return {
    ...state,
    vectors: state.vectors.filter((vector) => vector.id !== vectorId),
    spanSelection: state.spanSelection.filter((id) => id !== vectorId),
  };
}

function vectorIndex(id: string): number {
  const match = /^a([1-8])$/.exec(id);
  return match ? Number(match[1]) : -1;
}


export function oneDimensionalStateFromShare(state: ShareState): OneDimensionalVectorSpaceState {
  if (state.dim !== 1) throw new RangeError('1Dの共有状態が必要です。');
  return { vectors: state.vectors, spanSelection: state.spanSelection,
    showSpan: state.visualization.showSpan, linearCombinationVisible: state.linearCombination.visible,
    target: state.linearCombination.target?.[0] ?? null };
}

export function oneDimensionalStateToShare(state: OneDimensionalVectorSpaceState): ShareState {
  return { v: 4, lab: 'vector-space', dim: 1,
    vectors: state.vectors, spanSelection: state.spanSelection,
    visualization: { showSpan: state.showSpan, camera: null },
    linearCombination: { visible: state.linearCombinationVisible,
      target: state.target === null ? null : [state.target] } };
}

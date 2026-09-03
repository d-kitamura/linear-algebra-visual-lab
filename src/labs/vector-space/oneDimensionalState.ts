import type { VectorValue } from '../../domain';
import { MAX_SHARE_VECTORS } from '../../sharing';

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

/** 1D状態は10.7の共有版へ入れるまで、既存2D/3D共有型から明示的に分離する。 */
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

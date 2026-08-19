import type { VectorDimension, VectorValue } from '../domain';
import { MAX_SHARE_VECTORS, type ShareStateV1 } from '../sharing';

export interface AddDefaultVectorResult {
  readonly state: ShareStateV1;
  readonly addedVector: VectorValue | null;
}

export function addDefaultVector(state: ShareStateV1): AddDefaultVectorResult {
  if (state.vectors.length >= MAX_SHARE_VECTORS) {
    return { state, addedVector: null };
  }

  const addedVector = createNextDefaultVector(state.vectors, state.dim);

  return {
    state: {
      ...state,
      vectors: [...state.vectors, addedVector],
      spanSelection: [...state.spanSelection, addedVector.id],
    },
    addedVector,
  };
}

export function removeVector(state: ShareStateV1, vectorId: string): ShareStateV1 {
  if (!state.vectors.some((vector) => vector.id === vectorId)) {
    return state;
  }

  return {
    ...state,
    vectors: state.vectors.filter((vector) => vector.id !== vectorId),
    spanSelection: state.spanSelection.filter((selectedId) => selectedId !== vectorId),
  };
}

function createNextDefaultVector(
  vectors: readonly VectorValue[],
  dimension: VectorDimension,
): VectorValue {
  const existingIds = new Set(vectors.map((vector) => vector.id));
  const existingNames = new Set(vectors.map((vector) => vector.name));
  let suffix = 1;

  while (
    existingIds.has(`v${suffix}`)
    || existingNames.has(`v${toUnicodeSubscript(suffix)}`)
  ) {
    suffix += 1;
  }

  return {
    id: `v${suffix}`,
    name: `v${toUnicodeSubscript(suffix)}`,
    coordinates: Array.from({ length: dimension }, (_, index) => (index === 0 ? 1 : 0)),
  };
}

function toUnicodeSubscript(value: number): string {
  return String(value).replace(/[0-9]/gu, (digit) => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)]);
}

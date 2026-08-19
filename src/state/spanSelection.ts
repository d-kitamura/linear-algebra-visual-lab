import type { VectorValue } from '../domain';

export function selectSpanVectors(
  vectors: readonly VectorValue[],
  selection: readonly string[],
): readonly VectorValue[] {
  const selectedIds = new Set(selection);
  return vectors.filter((vector) => selectedIds.has(vector.id));
}

export function updateSpanSelection(
  vectors: readonly VectorValue[],
  currentSelection: readonly string[],
  vectorId: string,
  selected: boolean,
): readonly string[] {
  const selectedIds = new Set(currentSelection);

  if (selected) {
    selectedIds.add(vectorId);
  } else {
    selectedIds.delete(vectorId);
  }

  return vectors
    .filter((vector) => selectedIds.has(vector.id))
    .map((vector) => vector.id);
}

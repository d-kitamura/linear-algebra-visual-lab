import { MAX_ABSOLUTE_LINEAR_MAP_INPUT, type LinearMapDefinition, type VectorSet } from '../../domain';
import { parallelSnapDistanceForViewWidth, snapDraggedVectorToParallel, snapTargetToSelectedSpan } from '../../state';
import { analyzeVectorSet } from '../../domain';

export type BasisSide = 'source' | 'target';
export interface RepresentationScene {
  readonly definition: LinearMapDefinition;
  readonly source: VectorSet;
  readonly target: VectorSet;
  readonly input: readonly number[];
}

/** 11.3は数ベクトル2→2のみ。共有状態や既存LabのInitialStateとは独立。 */
export function createRepresentationScene(): RepresentationScene {
  const basis = (name: string, columns: number[][]): VectorSet => ({
    dimension: 2,
    vectors: columns.map((coordinates, i) => ({ id: `${name}${i + 1}`, name: `${name}${i + 1}`, coordinates })),
  });
  return {
    definition: { sourceDimension: 2, targetDimension: 2, matrix: [[1, 1], [0, 1]] },
    source: basis('u', [[1, 0], [1, 1]]),
    target: basis('v', [[1, 1], [0, 1]]),
    input: [3, 2],
  };
}

export function parseRepresentationNumber(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= MAX_ABSOLUTE_LINEAR_MAP_INPUT ? value : null;
}

export function editRepresentationValue(scene: RepresentationScene, field: BasisSide | 'matrix' | 'input', row: number, column: number, value: number): RepresentationScene {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_ABSOLUTE_LINEAR_MAP_INPUT
    || ![0, 1].includes(row) || ![0, 1].includes(column)) return scene;
  if (field === 'matrix') return { ...scene, definition: { ...scene.definition,
    matrix: scene.definition.matrix.map((entries, r) => entries.map((entry, c) => r === row && c === column ? value : entry)),
  } };
  if (field === 'input') return { ...scene, input: scene.input.map((entry, r) => r === row ? value : entry) };
  return { ...scene, [field]: { ...scene[field], vectors: scene[field].vectors.map((vector, c) => c === column
    ? { ...vector, coordinates: vector.coordinates.map((entry, r) => r === row ? value : entry) } : vector) } };
}

/** 順序だけを交換する。ベクトルの名前・ID・実体およびM,wは変えない。 */
export function swapRepresentationBasis(scene: RepresentationScene, side: BasisSide): RepresentationScene {
  return { ...scene, [side]: { ...scene[side], vectors: [...scene[side].vectors].reverse() } };
}

export function dragRepresentationVector(scene: RepresentationScene, side: BasisSide, id: string, coordinates: readonly [number, number], viewWidth: number): RepresentationScene {
  if (!coordinates.every(Number.isFinite)) return scene;
  const limit = MAX_ABSOLUTE_LINEAR_MAP_INPUT;
  const safe = coordinates.map((value) => Math.max(-limit, Math.min(limit, value))) as [number, number];
  const distance = parallelSnapDistanceForViewWidth(viewWidth);
  if (side === 'source' && id === 'w') {
    return { ...scene, input: snapTargetToSelectedSpan(safe, scene.source.vectors, analyzeVectorSet(scene.source).rank, distance).coordinates };
  }
  if (!scene[side].vectors.some((vector) => vector.id === id)) return scene;
  const snapped = snapDraggedVectorToParallel(id, safe, scene[side].vectors, distance);
  return { ...scene, [side]: { ...scene[side], vectors: scene[side].vectors.map((vector) => vector.id === id
    ? { ...vector, coordinates: snapped.coordinates } : vector) } };
}

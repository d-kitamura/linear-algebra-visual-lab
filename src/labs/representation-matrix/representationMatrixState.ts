import { MAX_ABSOLUTE_LINEAR_MAP_INPUT, type LinearMapDefinition, type VectorSet } from '../../domain';
import { parallelSnapDistanceForViewWidth, snapDraggedVectorToParallel, snapTargetToSelectedSpan, lineSnapDistanceForViewWidth, snapLineCoordinateToOrigin, snapDraggedSpaceVectorToDependentPosition, snapSpaceTargetToSelectedSpan } from '../../state';
import { analyzeVectorSet } from '../../domain';

export type BasisSide = 'source' | 'target';
export type RepresentationDimension = 1 | 2 | 3;
export const REPRESENTATION_DIMENSIONS = [1, 2, 3] as const;
export type RepresentationSpaceKind = 'coordinate' | 'polynomial';
export const REPRESENTATION_SPACE_KINDS = ['coordinate', 'polynomial'] as const;
export interface RepresentationScene {
  readonly sourceKind: RepresentationSpaceKind;
  readonly targetKind: RepresentationSpaceKind;
  readonly definition: LinearMapDefinition;
  readonly source: VectorSet;
  readonly target: VectorSet;
  readonly input: readonly number[];
}

/** 数ベクトル1〜3次元。既定の2→2はD-092の確認済み初期例を維持する。 */
export function createRepresentationScene(sourceDimension: RepresentationDimension = 2, targetDimension: RepresentationDimension = 2, sourceKind: RepresentationSpaceKind = 'coordinate', targetKind: RepresentationSpaceKind = 'coordinate'): RepresentationScene {
  if (!REPRESENTATION_DIMENSIONS.includes(sourceDimension) || !REPRESENTATION_DIMENSIONS.includes(targetDimension)) {
    throw new RangeError('通常操作の次元は1〜3です。0Dは補助説明の対象です。');
  }
  if (!REPRESENTATION_SPACE_KINDS.includes(sourceKind) || !REPRESENTATION_SPACE_KINDS.includes(targetKind)) throw new TypeError('空間の種類は数ベクトルまたは多項式です。');
  const basis = (name: string, columns: number[][]): VectorSet => ({
    dimension: columns.length as RepresentationDimension,
    vectors: columns.map((coordinates, i) => ({ id: `${name}${i + 1}`, name: `${name}${i + 1}`, coordinates })),
  });
  return {
    sourceKind, targetKind,
    definition: { sourceDimension, targetDimension, matrix: Array.from({ length: targetDimension }, (_, row) =>
      Array.from({ length: sourceDimension }, (_, column) => row === column || row === 0 ? 1 : 0)) },
    source: basis('u', [[1, 0, 0], [1, 1, 0], [0, 0, 1]].slice(0, sourceDimension).map((v) => v.slice(0, sourceDimension))),
    target: basis('v', [[1, 1, 0], [0, 1, 0], [0, 0, 1]].slice(0, targetDimension).map((v) => v.slice(0, targetDimension))),
    input: [3, 2, 1].slice(0, sourceDimension),
  };
}

export function parseRepresentationNumber(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= MAX_ABSOLUTE_LINEAR_MAP_INPUT ? value : null;
}

export function editRepresentationValue(scene: RepresentationScene, field: BasisSide | 'matrix' | 'input', row: number, column: number, value: number): RepresentationScene {
  const rows = field === 'matrix' ? scene.definition.targetDimension : field === 'input' ? scene.input.length : scene[field].dimension;
  const columns = field === 'matrix' ? scene.definition.sourceDimension : field === 'input' ? 1 : scene[field].vectors.length;
  if (!Number.isFinite(value) || Math.abs(value) > MAX_ABSOLUTE_LINEAR_MAP_INPUT
    || !Number.isInteger(row) || row < 0 || row >= rows || !Number.isInteger(column) || column < 0 || column >= columns) return scene;
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

/** 3本でも全ての順列を選べる隣接移動。IDと成分の対応は変えない。 */
export function moveRepresentationBasis(scene: RepresentationScene, side: BasisSide, index: number, delta: -1 | 1): RepresentationScene {
  const next = index + delta;
  if (!Number.isInteger(index) || index < 0 || index >= scene[side].vectors.length || next < 0 || next >= scene[side].vectors.length) return scene;
  const vectors = [...scene[side].vectors];
  [vectors[index], vectors[next]] = [vectors[next], vectors[index]];
  return { ...scene, [side]: { ...scene[side], vectors } };
}

/** 1D/2Dの即時編集と、吸着済み3Dのcommit/previewに共用。導出値のIDは拒否。 */
export function setRepresentationVector(scene: RepresentationScene, side: BasisSide, id: string, coordinates: readonly number[]): RepresentationScene {
  if (coordinates.length !== scene[side].dimension || !coordinates.every((v) => Number.isFinite(v) && Math.abs(v) <= MAX_ABSOLUTE_LINEAR_MAP_INPUT)) return scene;
  if (side === 'source' && id === 'w') return { ...scene, input: [...coordinates] };
  if (!scene[side].vectors.some((vector) => vector.id === id)) return scene;
  return { ...scene, [side]: { ...scene[side], vectors: scene[side].vectors.map((vector) => vector.id === id ? { ...vector, coordinates: [...coordinates] } : vector) } };
}

/** 描画側が算出した画面相対距離を使う。像やwを基底の吸着先にしない。 */
export function snapRepresentationSpaceVector(scene: RepresentationScene, side: BasisSide, id: string, coordinates: readonly [number, number, number], maximumDistance: number) {
  return side === 'source' && id === 'w'
    ? snapSpaceTargetToSelectedSpan(coordinates, scene.source.vectors, analyzeVectorSet(scene.source).rank, maximumDistance)
    : snapDraggedSpaceVectorToDependentPosition(id, coordinates, scene[side].vectors, maximumDistance);
}

export function dragRepresentationLineVector(scene: RepresentationScene, side: BasisSide, id: string, coordinates: readonly [number], width: number): RepresentationScene {
  const snapped = snapLineCoordinateToOrigin(coordinates[0], lineSnapDistanceForViewWidth(width));
  return setRepresentationVector(scene, side, id, [snapped.coordinate]);
}

export function dragRepresentationVector(scene: RepresentationScene, side: BasisSide, id: string, coordinates: readonly [number, number], viewWidth: number): RepresentationScene {
  if (scene[side].dimension !== 2 || !coordinates.every(Number.isFinite)) return scene;
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

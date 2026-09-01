import {
  MAX_ABSOLUTE_LINEAR_MAP_INPUT,
  type LinearMapDefinition,
  type VectorDimension,
} from '../../domain';

export type Matrix2 = readonly [readonly [number, number], readonly [number, number]];
export type Vector2 = readonly [number, number];
export type LinearMapShapeId = '2-to-2' | '2-to-3' | '3-to-2' | '3-to-3';
export type LinearMapPresetId =
  | 'identity' | 'rotation' | 'reflection' | 'shear' | 'scaling' | 'rank-one'
  | 'embedding-2-to-3' | 'rank-one-2-to-3'
  | 'projection-3-to-2' | 'rank-one-3-to-2'
  | 'identity-3' | 'plane-projection-3' | 'line-projection-3' | 'zero-3';

export interface LinearMapShape {
  readonly id: LinearMapShapeId;
  readonly sourceDimension: VectorDimension;
  readonly targetDimension: VectorDimension;
  readonly label: string;
  readonly description: string;
}

export interface LinearMapPreset {
  readonly id: LinearMapPresetId;
  readonly label: string;
  readonly description: string;
  readonly sourceDimension: VectorDimension;
  readonly targetDimension: VectorDimension;
  readonly matrix: readonly (readonly number[])[];
  readonly defaultInput: readonly number[];
}

export interface LinearMapScene {
  readonly sourceDimension: VectorDimension;
  readonly targetDimension: VectorDimension;
  readonly matrix: readonly (readonly number[])[];
  readonly inputVector: readonly number[];
  readonly showTransformedGrid: boolean;
}

/** 9.3との互換用の名称。9.4以降は2D/3D共通sceneとして扱う。 */
export type LinearMapPlaneScene = LinearMapScene;

export const LINEAR_MAP_SHAPES: readonly LinearMapShape[] = [
  { id: '2-to-2', sourceDimension: 2, targetDimension: 2, label: '2D → 2D', description: '2次元から2次元' },
  { id: '2-to-3', sourceDimension: 2, targetDimension: 3, label: '2D → 3D', description: '2次元から3次元' },
  { id: '3-to-2', sourceDimension: 3, targetDimension: 2, label: '3D → 2D', description: '3次元から2次元' },
  { id: '3-to-3', sourceDimension: 3, targetDimension: 3, label: '3D → 3D', description: '3次元から3次元' },
] as const;

export const LINEAR_MAP_PRESETS: readonly LinearMapPreset[] = [
  preset('identity', '恒等写像', 'すべてのベクトルをそのまま移します。', 2, 2, [[1, 0], [0, 1]], [2, 1]),
  preset('rotation', '90°回転', '原点を中心に反時計回りへ90°回転します。', 2, 2, [[0, -1], [1, 0]], [2, 1]),
  preset('reflection', '鏡映', 'x軸について折り返します。', 2, 2, [[1, 0], [0, -1]], [2, 1]),
  preset('shear', 'せん断', '高さに応じて水平方向へずらします。', 2, 2, [[1, 1], [0, 1]], [2, 1]),
  preset('scaling', '拡大・縮小', 'x方向を1.5倍、y方向を0.5倍にします。', 2, 2, [[1.5, 0], [0, 0.5]], [2, 1]),
  preset('rank-one', 'rank 1へ退化', '2次元の格子を原点を通る直線へ押しつぶします。', 2, 2, [[1, 2], [0.5, 1]], [2, 1]),
  preset('embedding-2-to-3', 'xy平面への埋め込み', '2次元の入力を3次元のxy平面へ移します。', 2, 3, [[1, 0], [0, 1], [0, 0]], [2, 1]),
  preset('rank-one-2-to-3', '3次元内の直線へ退化', '2次元の入力を3次元内の1本の直線へ移します。', 2, 3, [[1, 2], [0, 0], [1, 2]], [2, 1]),
  preset('projection-3-to-2', 'xy成分への射影', 'z成分を失い、xy成分だけを終域へ移します。', 3, 2, [[1, 0, 0], [0, 1, 0]], [2, 1, 1]),
  preset('rank-one-3-to-2', '平面から直線へ退化', '3次元の入力を終域の1本の直線へ移します。', 3, 2, [[1, 2, 0], [0.5, 1, 0]], [2, 1, 1]),
  preset('identity-3', '3次元の恒等写像', '3次元のすべてのベクトルをそのまま移します。', 3, 3, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [2, 1, 1]),
  preset('plane-projection-3', 'xy平面への射影', 'z成分を失い、像はxy平面全体になります。', 3, 3, [[1, 0, 0], [0, 1, 0], [0, 0, 0]], [2, 1, 1]),
  preset('line-projection-3', 'x軸への射影', 'y成分とz成分を失い、像はx軸になります。', 3, 3, [[1, 0, 0], [0, 0, 0], [0, 0, 0]], [2, 1, 1]),
  preset('zero-3', '零写像', 'すべての入力を原点へ移します。', 3, 3, [[0, 0, 0], [0, 0, 0], [0, 0, 0]], [2, 1, 1]),
] as const;

const DEFAULT_PRESET_BY_SHAPE: Readonly<Record<LinearMapShapeId, LinearMapPresetId>> = {
  '2-to-2': 'shear',
  '2-to-3': 'embedding-2-to-3',
  '3-to-2': 'projection-3-to-2',
  '3-to-3': 'plane-projection-3',
};

export const DEFAULT_LINEAR_MAP_SCENE = createSceneFromPresetRecord(presetById('shear'), false);

export function linearMapShapeId(
  sourceDimension: VectorDimension,
  targetDimension: VectorDimension,
): LinearMapShapeId {
  return `${sourceDimension}-to-${targetDimension}` as LinearMapShapeId;
}

export function createDefaultLinearMapScene(
  sourceDimension: VectorDimension = 2,
  targetDimension: VectorDimension = 2,
): LinearMapScene {
  const shapeId = linearMapShapeId(sourceDimension, targetDimension);
  return createSceneFromPresetRecord(presetById(DEFAULT_PRESET_BY_SHAPE[shapeId]), false);
}

export function createDefaultLinearMapScenes(): Record<LinearMapShapeId, LinearMapScene> {
  return Object.fromEntries(LINEAR_MAP_SHAPES.map((shape) => [
    shape.id,
    createDefaultLinearMapScene(shape.sourceDimension, shape.targetDimension),
  ])) as Record<LinearMapShapeId, LinearMapScene>;
}

export function presetsForLinearMapScene(scene: LinearMapScene): readonly LinearMapPreset[] {
  return LINEAR_MAP_PRESETS.filter((candidate) =>
    candidate.sourceDimension === scene.sourceDimension
    && candidate.targetDimension === scene.targetDimension);
}

export function createLinearMapSceneFromPreset(
  presetId: LinearMapPresetId,
  inputVector?: readonly number[],
  showTransformedGrid = false,
): LinearMapScene {
  const selected = presetById(presetId);
  const nextInput = inputVector ?? selected.defaultInput;
  if (nextInput.length !== selected.sourceDimension) {
    throw new RangeError('代表例と入力ベクトルの次元が一致しません。');
  }
  nextInput.forEach((value) => validateEditableValue(value, '入力ベクトルの成分'));
  return {
    sourceDimension: selected.sourceDimension,
    targetDimension: selected.targetDimension,
    matrix: cloneMatrix(selected.matrix),
    inputVector: [...nextInput],
    showTransformedGrid: showTransformedGrid && selected.sourceDimension === 2 && selected.targetDimension === 2,
  };
}

export function updateLinearMapMatrixEntry(
  scene: LinearMapScene,
  rowIndex: number,
  columnIndex: number,
  value: number,
): LinearMapScene {
  validateEditableValue(value, '行列の成分');
  if (rowIndex < 0 || rowIndex >= scene.targetDimension || columnIndex < 0 || columnIndex >= scene.sourceDimension) {
    throw new RangeError('行列の成分位置が範囲外です。');
  }
  const matrix = scene.matrix.map((row) => [...row]);
  matrix[rowIndex][columnIndex] = value;
  return { ...scene, matrix };
}

export function updateLinearMapInputVector(scene: LinearMapScene, inputVector: readonly number[]): LinearMapScene {
  if (inputVector.length !== scene.sourceDimension) {
    throw new RangeError(`入力ベクトルは${scene.sourceDimension}成分である必要があります。`);
  }
  inputVector.forEach((value) => validateEditableValue(value, '入力ベクトルの成分'));
  return { ...scene, inputVector: [...inputVector] };
}

export function updateLinearMapInputFromDrag(scene: LinearMapScene, inputVector: readonly number[]): LinearMapScene {
  if (inputVector.length !== scene.sourceDimension) {
    throw new RangeError(`入力ベクトルは${scene.sourceDimension}成分である必要があります。`);
  }
  return { ...scene, inputVector: inputVector.map(clampEditableValue) };
}

export function setTransformedGridVisibility(scene: LinearMapScene, visible: boolean): LinearMapScene {
  return {
    ...scene,
    showTransformedGrid: visible && scene.sourceDimension === 2 && scene.targetDimension === 2,
  };
}

export function createLinearMapDefinition(scene: LinearMapScene): LinearMapDefinition {
  return {
    sourceDimension: scene.sourceDimension,
    targetDimension: scene.targetDimension,
    matrix: cloneMatrix(scene.matrix),
  };
}

export function findMatchingLinearMapPreset(scene: LinearMapScene): LinearMapPresetId | null {
  return presetsForLinearMapScene(scene).find((candidate) => matricesEqual(candidate.matrix, scene.matrix))?.id ?? null;
}

function preset(
  id: LinearMapPresetId,
  label: string,
  description: string,
  sourceDimension: VectorDimension,
  targetDimension: VectorDimension,
  matrix: readonly (readonly number[])[],
  defaultInput: readonly number[],
): LinearMapPreset {
  return { id, label, description, sourceDimension, targetDimension, matrix, defaultInput };
}

function createSceneFromPresetRecord(selected: LinearMapPreset, showTransformedGrid: boolean): LinearMapScene {
  return {
    sourceDimension: selected.sourceDimension,
    targetDimension: selected.targetDimension,
    matrix: cloneMatrix(selected.matrix),
    inputVector: [...selected.defaultInput],
    showTransformedGrid: showTransformedGrid && selected.sourceDimension === 2 && selected.targetDimension === 2,
  };
}

function presetById(presetId: LinearMapPresetId): LinearMapPreset {
  const selected = LINEAR_MAP_PRESETS.find((candidate) => candidate.id === presetId);
  if (!selected) {
    throw new RangeError(`未対応の線形写像例です: ${presetId}`);
  }
  return selected;
}

function cloneMatrix(matrix: readonly (readonly number[])[]): number[][] {
  return matrix.map((row) => [...row]);
}

function matricesEqual(first: readonly (readonly number[])[], second: readonly (readonly number[])[]): boolean {
  return first.length === second.length && first.every((row, rowIndex) =>
    row.length === second[rowIndex]?.length
    && row.every((value, columnIndex) => value === second[rowIndex][columnIndex]));
}

function validateEditableValue(value: number, label: string): void {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_ABSOLUTE_LINEAR_MAP_INPUT) {
    throw new RangeError(`${label}は有限で、絶対値${MAX_ABSOLUTE_LINEAR_MAP_INPUT.toLocaleString('ja-JP')}以下である必要があります。`);
  }
}

function clampEditableValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(MAX_ABSOLUTE_LINEAR_MAP_INPUT, Math.max(-MAX_ABSOLUTE_LINEAR_MAP_INPUT, value));
}

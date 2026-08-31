import {
  MAX_ABSOLUTE_LINEAR_MAP_INPUT,
  type LinearMapDefinition,
} from '../../domain';

export type Matrix2 = readonly [
  readonly [number, number],
  readonly [number, number],
];

export type Vector2 = readonly [number, number];

export type LinearMapPresetId =
  | 'identity'
  | 'rotation'
  | 'reflection'
  | 'shear'
  | 'scaling'
  | 'rank-one';

export interface LinearMapPreset {
  readonly id: LinearMapPresetId;
  readonly label: string;
  readonly description: string;
  readonly matrix: Matrix2;
}

export interface LinearMapPlaneScene {
  readonly matrix: Matrix2;
  readonly inputVector: Vector2;
  readonly showTransformedGrid: boolean;
}

export const LINEAR_MAP_PRESETS: readonly LinearMapPreset[] = [
  {
    id: 'identity',
    label: '恒等写像',
    description: 'すべてのベクトルをそのまま移します。',
    matrix: [[1, 0], [0, 1]],
  },
  {
    id: 'rotation',
    label: '90°回転',
    description: '原点を中心に反時計回りへ90°回転します。',
    matrix: [[0, -1], [1, 0]],
  },
  {
    id: 'reflection',
    label: '鏡映',
    description: 'x軸について折り返します。',
    matrix: [[1, 0], [0, -1]],
  },
  {
    id: 'shear',
    label: 'せん断',
    description: '高さに応じて水平方向へずらします。',
    matrix: [[1, 1], [0, 1]],
  },
  {
    id: 'scaling',
    label: '拡大・縮小',
    description: 'x方向を1.5倍、y方向を0.5倍にします。',
    matrix: [[1.5, 0], [0, 0.5]],
  },
  {
    id: 'rank-one',
    label: 'rank 1へ退化',
    description: '2次元の格子を原点を通る直線へ押しつぶします。',
    matrix: [[1, 2], [0.5, 1]],
  },
] as const;

export const DEFAULT_LINEAR_MAP_SCENE: LinearMapPlaneScene = {
  matrix: [[1, 1], [0, 1]],
  inputVector: [2, 1],
  showTransformedGrid: true,
};

export function createDefaultLinearMapScene(): LinearMapPlaneScene {
  return cloneLinearMapScene(DEFAULT_LINEAR_MAP_SCENE);
}

export function createLinearMapSceneFromPreset(
  presetId: LinearMapPresetId,
  inputVector: Vector2 = DEFAULT_LINEAR_MAP_SCENE.inputVector,
  showTransformedGrid = true,
): LinearMapPlaneScene {
  const preset = LINEAR_MAP_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) {
    throw new RangeError(`未対応の線形写像例です: ${presetId}`);
  }

  return {
    matrix: cloneMatrix(preset.matrix),
    inputVector: cloneVector(inputVector),
    showTransformedGrid,
  };
}

export function updateLinearMapMatrixEntry(
  scene: LinearMapPlaneScene,
  rowIndex: 0 | 1,
  columnIndex: 0 | 1,
  value: number,
): LinearMapPlaneScene {
  validateEditableValue(value, '行列の成分');
  const matrix = scene.matrix.map((row) => [...row]) as [[number, number], [number, number]];
  matrix[rowIndex][columnIndex] = value;
  return { ...scene, matrix };
}

export function updateLinearMapInputVector(
  scene: LinearMapPlaneScene,
  inputVector: readonly number[],
): LinearMapPlaneScene {
  if (inputVector.length !== 2) {
    throw new RangeError('入力ベクトルは2成分である必要があります。');
  }
  inputVector.forEach((value) => validateEditableValue(value, '入力ベクトルの成分'));
  return { ...scene, inputVector: [inputVector[0], inputVector[1]] };
}

export function updateLinearMapInputFromDrag(
  scene: LinearMapPlaneScene,
  inputVector: Vector2,
): LinearMapPlaneScene {
  return {
    ...scene,
    inputVector: [
      clampEditableValue(inputVector[0]),
      clampEditableValue(inputVector[1]),
    ],
  };
}

export function setTransformedGridVisibility(
  scene: LinearMapPlaneScene,
  visible: boolean,
): LinearMapPlaneScene {
  return { ...scene, showTransformedGrid: visible };
}

export function createLinearMapDefinition(
  scene: LinearMapPlaneScene,
): LinearMapDefinition {
  return {
    sourceDimension: 2,
    targetDimension: 2,
    matrix: cloneMatrix(scene.matrix),
  };
}

export function findMatchingLinearMapPreset(
  matrix: Matrix2,
): LinearMapPresetId | null {
  return LINEAR_MAP_PRESETS.find((preset) => matricesEqual(preset.matrix, matrix))?.id ?? null;
}

function cloneLinearMapScene(scene: LinearMapPlaneScene): LinearMapPlaneScene {
  return {
    matrix: cloneMatrix(scene.matrix),
    inputVector: cloneVector(scene.inputVector),
    showTransformedGrid: scene.showTransformedGrid,
  };
}

function cloneMatrix(matrix: Matrix2): Matrix2 {
  return [[matrix[0][0], matrix[0][1]], [matrix[1][0], matrix[1][1]]];
}

function cloneVector(vector: Vector2): Vector2 {
  return [vector[0], vector[1]];
}

function matricesEqual(first: Matrix2, second: Matrix2): boolean {
  return first.every((row, rowIndex) =>
    row.every((value, columnIndex) => value === second[rowIndex][columnIndex]),
  );
}

function validateEditableValue(value: number, label: string): void {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_ABSOLUTE_LINEAR_MAP_INPUT) {
    throw new RangeError(
      `${label}は有限で、絶対値${MAX_ABSOLUTE_LINEAR_MAP_INPUT.toLocaleString('ja-JP')}以下である必要があります。`,
    );
  }
}

function clampEditableValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(
    MAX_ABSOLUTE_LINEAR_MAP_INPUT,
    Math.max(-MAX_ABSOLUTE_LINEAR_MAP_INPUT, value),
  );
}

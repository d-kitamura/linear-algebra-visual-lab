import {
  DEFAULT_3D_CAMERA_STATE,
  validateShareState,
  type ShareState,
  type SharedCameraState,
} from '../sharing';
import type {
  LinearCombinationTeachingScenario,
  TeachingScenario,
} from './scenarioTypes';

const FRONT_CAMERA: SharedCameraState = {
  direction: [0, -1, 0],
  target: [0, 0, 0],
  up: [0, 0, 1],
  zoom: 1,
};

const RIGHT_CAMERA: SharedCameraState = {
  direction: [1, 0, 0],
  target: [0, 0, 0],
  up: [0, 0, 1],
  zoom: 1,
};

const TOP_CAMERA: SharedCameraState = {
  direction: [0, 0, 1],
  target: [0, 0, 0],
  up: [0, 1, 0],
  zoom: 1,
};

export const THREE_DIMENSIONAL_TEACHING_SCENARIOS: readonly TeachingScenario[] = [
  {
    id: '3d-empty-set',
    title: '3Dの空集合',
    learningPoint: '3次元でも空集合のrankは0で、生成する空間は零部分空間、空集合は一次独立である。',
    state: createScenarioState([], [], null, DEFAULT_3D_CAMERA_STATE),
    expected: { vectorCount: 0, rank: 0, isLinearlyIndependent: true },
  },
  {
    id: '3d-zero-vector',
    title: '3Dの零ベクトル',
    learningPoint: '零ベクトル1本のrankは0で、その集合は一次従属である。',
    state: createScenarioState(
      [{ id: 'a1', name: 'a₁', coordinates: [0, 0, 0] }],
      ['a1'],
      null,
      FRONT_CAMERA,
    ),
    expected: { vectorCount: 1, rank: 0, isLinearlyIndependent: false },
  },
  {
    id: '3d-line',
    title: '1本が生成する直線',
    learningPoint: '零ベクトルでない1本のrankは1で、原点を通る直線を生成する。',
    state: createScenarioState(
      [{ id: 'a1', name: 'a₁', coordinates: [1, 2, 1] }],
      ['a1'],
      null,
      RIGHT_CAMERA,
    ),
    expected: { vectorCount: 1, rank: 1, isLinearlyIndependent: true },
  },
  {
    id: '3d-coplanar-dependent',
    title: '同一平面上の3本',
    learningPoint: '3本が同一平面上にあるとrankは2以下となり、3次元では一次従属である。',
    state: createScenarioState(
      [
        { id: 'a1', name: 'a₁', coordinates: [1, 0, 0] },
        { id: 'a2', name: 'a₂', coordinates: [0, 1, 0] },
        { id: 'a3', name: 'a₃', coordinates: [1, 1, 0] },
      ],
      ['a1', 'a2', 'a3'],
      null,
      TOP_CAMERA,
    ),
    expected: { vectorCount: 3, rank: 2, isLinearlyIndependent: false },
  },
];

export const THREE_DIMENSIONAL_LINEAR_COMBINATION_SCENARIOS:
  readonly LinearCombinationTeachingScenario[] = [
  {
    id: '3d-independent-triple-unique',
    title: '一次独立な3本で唯一解',
    learningPoint: 'rank 3の3本は3次元座標空間全体を生成し、任意のターゲットを一意に表す。',
    state: createScenarioState(
      [
        { id: 'a1', name: 'a₁', coordinates: [1, 1, 0] },
        { id: 'a2', name: 'a₂', coordinates: [0, 1, 1] },
        { id: 'a3', name: 'a₃', coordinates: [1, 0, 1] },
      ],
      ['a1', 'a2', 'a3'],
      [3, 2, 4],
      DEFAULT_3D_CAMERA_STATE,
    ),
    expected: { vectorCount: 3, rank: 3, isLinearlyIndependent: true },
    linearCombinationExpected: { status: 'unique', rank: 3, augmentedRank: 3 },
  },
  {
    id: '3d-dependent-pair-none',
    title: '3Dの直線外では表現不能',
    learningPoint: '平行な2本が生成する直線の外にあるターゲットは、その一次結合では表せない。',
    state: createScenarioState(
      [
        { id: 'a1', name: 'a₁', coordinates: [1, 1, 0] },
        { id: 'a2', name: 'a₂', coordinates: [2, 2, 0] },
      ],
      ['a1', 'a2'],
      [0, 0, 1],
      FRONT_CAMERA,
    ),
    expected: { vectorCount: 2, rank: 1, isLinearlyIndependent: false },
    linearCombinationExpected: { status: 'none', rank: 1, augmentedRank: 2 },
  },
  {
    id: '3d-coplanar-triple-infinite',
    title: '同一平面上の3本では表し方が無数',
    learningPoint: 'rank 2の3本が生成する平面上ではターゲットを表せるが、係数の組は一意に定まらない。',
    state: createScenarioState(
      [
        { id: 'a1', name: 'a₁', coordinates: [1, 0, 0] },
        { id: 'a2', name: 'a₂', coordinates: [0, 1, 0] },
        { id: 'a3', name: 'a₃', coordinates: [1, 1, 0] },
      ],
      ['a1', 'a2', 'a3'],
      [2, -1, 0],
      DEFAULT_3D_CAMERA_STATE,
    ),
    expected: { vectorCount: 3, rank: 2, isLinearlyIndependent: false },
    linearCombinationExpected: { status: 'infinite', rank: 2, augmentedRank: 2 },
  },
];

function createScenarioState(
  vectors: ShareState['vectors'],
  spanSelection: ShareState['spanSelection'],
  target: readonly number[] | null,
  camera: SharedCameraState,
): ShareState {
  return validateShareState({
    v: 3,
    lab: 'vector-space',
    dim: 3,
    vectors,
    spanSelection,
    visualization: { showSpan: true, camera },
    linearCombination: { visible: target !== null, target },
  });
}

import type { ShareState } from '../sharing';
import type {
  LinearCombinationTeachingScenario,
  TeachingScenario,
} from './scenarioTypes';

export const TWO_DIMENSIONAL_TEACHING_SCENARIOS: readonly TeachingScenario[] = [
  {
    id: 'empty-set',
    title: '空集合',
    learningPoint: '空集合のrankは0で、生成する空間は零部分空間、空集合は一次独立である。',
    state: createScenarioState([], []),
    expected: { vectorCount: 0, rank: 0, isLinearlyIndependent: true },
  },
  {
    id: 'zero-vector',
    title: '零ベクトル',
    learningPoint: '零ベクトル1本のrankは0で、その集合は一次従属である。',
    state: createScenarioState(
      [{ id: 'a1', name: 'a₁', coordinates: [0, 0] }],
      ['a1'],
    ),
    expected: { vectorCount: 1, rank: 0, isLinearlyIndependent: false },
  },
  {
    id: 'parallel-vectors',
    title: '平行な2本',
    learningPoint: '異なる2本でも一方が他方の実数倍なら、rankは1で一次従属となる。',
    state: createScenarioState(
      [
        { id: 'a1', name: 'a₁', coordinates: [2, 1] },
        { id: 'a2', name: 'a₂', coordinates: [-4, -2] },
      ],
      ['a1', 'a2'],
    ),
    expected: { vectorCount: 2, rank: 1, isLinearlyIndependent: false },
  },
  {
    id: 'independent-vectors',
    title: '一次独立な2本',
    learningPoint: '異なる2方向を持つ2本のrankは2で、2次元座標平面全体を生成する。',
    state: createScenarioState(
      [
        { id: 'a1', name: 'a₁', coordinates: [1, 0] },
        { id: 'a2', name: 'a₂', coordinates: [0, 1] },
      ],
      ['a1', 'a2'],
    ),
    expected: { vectorCount: 2, rank: 2, isLinearlyIndependent: true },
  },
  {
    id: 'three-dependent-vectors',
    title: '3本以上の一次従属',
    learningPoint: '2次元では3本のベクトルは一次従属だが、rank 2なら座標平面全体を生成する。',
    state: createScenarioState(
      [
        { id: 'a1', name: 'a₁', coordinates: [1, 0] },
        { id: 'a2', name: 'a₂', coordinates: [0, 1] },
        { id: 'a3', name: 'a₃', coordinates: [1, 1] },
      ],
      ['a1', 'a2', 'a3'],
    ),
    expected: { vectorCount: 3, rank: 2, isLinearlyIndependent: false },
  },
];

export const LINEAR_COMBINATION_TEACHING_SCENARIOS:
  readonly LinearCombinationTeachingScenario[] = [
  {
    id: 'one-vector-unique',
    title: '1本で一意に表す',
    learningPoint: '零ベクトルでない1本では、生成する直線上のターゲットを一意な係数で表せる。',
    state: createScenarioState(
      [{ id: 'a1', name: 'a₁', coordinates: [2, 1] }],
      ['a1'],
      [4, 2],
    ),
    expected: { vectorCount: 1, rank: 1, isLinearlyIndependent: true },
    linearCombinationExpected: { status: 'unique', rank: 1, augmentedRank: 1 },
  },
  {
    id: 'dependent-pair-none',
    title: '一次従属な2本では表現不能',
    learningPoint: '生成する直線の外にあるターゲットは、一次従属な2本の一次結合では表せない。',
    state: createScenarioState(
      [
        { id: 'a1', name: 'a₁', coordinates: [1, 0] },
        { id: 'a2', name: 'a₂', coordinates: [2, 0] },
      ],
      ['a1', 'a2'],
      [0, 1],
    ),
    expected: { vectorCount: 2, rank: 1, isLinearlyIndependent: false },
    linearCombinationExpected: { status: 'none', rank: 1, augmentedRank: 2 },
  },
  {
    id: 'independent-pair-unique',
    title: '一次独立な2本で唯一解',
    learningPoint: '一次独立な2本は任意のターゲットを表し、その係数の組は一意に定まる。',
    state: createScenarioState(
      [
        { id: 'a1', name: 'a₁', coordinates: [1, 0] },
        { id: 'a2', name: 'a₂', coordinates: [0, 1] },
      ],
      ['a1', 'a2'],
      [0.5, 0.25],
    ),
    expected: { vectorCount: 2, rank: 2, isLinearlyIndependent: true },
    linearCombinationExpected: { status: 'unique', rank: 2, augmentedRank: 2 },
  },
  {
    id: 'three-vectors-infinite',
    title: '3本では表し方が無数',
    learningPoint: '2次元を生成する3本ではターゲットを表せるが、係数の組は一意に定まらない。',
    state: createScenarioState(
      [
        { id: 'a1', name: 'a₁', coordinates: [1, 0] },
        { id: 'a2', name: 'a₂', coordinates: [0, 1] },
        { id: 'a3', name: 'a₃', coordinates: [1, 1] },
      ],
      ['a1', 'a2', 'a3'],
      [0.5, 0.25],
    ),
    expected: { vectorCount: 3, rank: 2, isLinearlyIndependent: false },
    linearCombinationExpected: { status: 'infinite', rank: 2, augmentedRank: 2 },
  },
];

function createScenarioState(
  vectors: ShareState['vectors'],
  spanSelection: ShareState['spanSelection'],
  target: readonly number[] | null = null,
): ShareState {
  return {
    v: 3,
    lab: 'vector-space',
    dim: 2,
    vectors,
    spanSelection,
    visualization: { showSpan: true, camera: null },
    linearCombination: { visible: target !== null, target },
  };
}

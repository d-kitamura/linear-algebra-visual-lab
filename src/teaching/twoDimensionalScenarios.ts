import type { ShareState } from '../sharing';

export interface TeachingScenario {
  readonly id: string;
  readonly title: string;
  readonly learningPoint: string;
  readonly state: ShareState;
  readonly expected: {
    readonly vectorCount: number;
    readonly rank: number;
    readonly isLinearlyIndependent: boolean;
  };
}

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

function createScenarioState(
  vectors: ShareState['vectors'],
  spanSelection: ShareState['spanSelection'],
): ShareState {
  return {
    v: 2,
    lab: 'vector-space',
    dim: 2,
    vectors,
    spanSelection,
    visualization: { showSpan: true },
    linearCombination: { visible: false, target: null },
  };
}

import { DEFAULT_3D_CAMERA_STATE, type BasisDimensionShareState } from '../sharing';
import type { BasisDimensionTeachingScenario } from './scenarioTypes';

export const BASIS_DIMENSION_TEACHING_SCENARIOS:
readonly BasisDimensionTeachingScenario[] = [
  {
    id: 'basis-2d-coordinate-comparison',
    title: '2つの基底と順序で座標を比較',
    learningPoint: '同じベクトルでも、基底の選び方と順序により座標ベクトルが変わる。',
    state: createState({
      dim: 2,
      vectors: [
        { id: 'a1', name: 'a1', coordinates: [1, 0] },
        { id: 'a2', name: 'a2', coordinates: [0, 1] },
        { id: 'a3', name: 'a3', coordinates: [1, 1] },
      ],
      candidateVectorIds: ['a3', 'a2'],
      target: [3, 2],
      comparisonBasisIds: ['a1', 'a2'],
    }),
    expected: { sourceRank: 2, candidateRank: 2, isBasis: true, coordinateStatus: 'coordinate-vector' },
  },
  {
    id: 'basis-2d-insufficient',
    title: '一次独立でも対象空間を生成しない候補',
    learningPoint: '1本の候補は一次独立でも2次元座標平面全体を生成せず、基底にはならない。',
    state: createState({
      dim: 2,
      vectors: [
        { id: 'a1', name: 'a1', coordinates: [1, 0] },
        { id: 'a2', name: 'a2', coordinates: [0, 1] },
      ],
      candidateVectorIds: ['a1'],
      target: [0, 1],
    }),
    expected: { sourceRank: 2, candidateRank: 1, isBasis: false, coordinateStatus: 'not-representable' },
  },
  {
    id: 'basis-2d-dependent',
    title: '対象空間を生成しても一次従属な候補',
    learningPoint: '3本の候補は2次元座標平面全体を生成しても一次従属で、係数は一意でない。',
    state: createState({
      dim: 2,
      vectors: [
        { id: 'a1', name: 'a1', coordinates: [1, 0] },
        { id: 'a2', name: 'a2', coordinates: [0, 1] },
        { id: 'a3', name: 'a3', coordinates: [1, 1] },
      ],
      candidateVectorIds: ['a1', 'a2', 'a3'],
      target: [3, 2],
    }),
    expected: { sourceRank: 2, candidateRank: 2, isBasis: false, coordinateStatus: 'non-unique' },
  },
  {
    id: 'basis-3d-polynomial',
    title: '2次多項式の基底と一意な係数',
    learningPoint: '3成分の係数ベクトルとして、2次多項式にも同じ基底・座標の判定を使える。',
    state: createState({
      dim: 3,
      vectors: [
        { id: 'a1', name: 'a1', coordinates: [1, 0, 0] },
        { id: 'a2', name: 'a2', coordinates: [0, 1, 0] },
        { id: 'a3', name: 'a3', coordinates: [0, 0, 1] },
        { id: 'a4', name: 'a4', coordinates: [1, 1, 1] },
      ],
      candidateVectorIds: ['a4', 'a2', 'a3'],
      target: [3, 2, 4],
      comparisonBasisIds: ['a1', 'a2', 'a3'],
      representation: 'polynomial',
    }),
    expected: { sourceRank: 3, candidateRank: 3, isBasis: true, coordinateStatus: 'coordinate-vector' },
  },
];

function createState({
  dim,
  vectors,
  candidateVectorIds,
  target,
  comparisonBasisIds = null,
  representation = 'coordinate',
}: {
  readonly dim: 2 | 3;
  readonly vectors: BasisDimensionShareState['vectors'];
  readonly candidateVectorIds: readonly string[];
  readonly target: readonly number[];
  readonly comparisonBasisIds?: readonly string[] | null;
  readonly representation?: BasisDimensionShareState['representation'];
}): BasisDimensionShareState {
  return {
    v: 1,
    lab: 'basis-dimension',
    dim,
    vectors,
    candidateVectorIds,
    representation,
    linearCombination: { visible: true, target },
    comparisonBasisIds,
    camera: dim === 3 ? DEFAULT_3D_CAMERA_STATE : null,
  };
}

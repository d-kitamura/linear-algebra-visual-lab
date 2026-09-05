import { validateSharedState, type SharedState } from '../sharing';
import { createLinearMapShareState } from '../labs/linear-map/linearMapInitialization';
import { createDefaultLinearMapScene } from '../labs/linear-map/linearMapState';
import { DEFAULT_3D_CAMERA_STATE } from '../sharing';

export interface LowDimensionalScenario {
  readonly id: string;
  readonly title: string;
  readonly learningPoint: string;
  readonly state: SharedState;
  readonly expectedRank: number;
}

function vectorExample(id: string, title: string, values: readonly number[], target: number): LowDimensionalScenario {
  return {
    id, title, learningPoint: '生成元とターゲットを動かし、数直線全体を生成する条件と一次結合の解を比べます。',
    state: validateSharedState({
      v: 4, lab: 'vector-space', dim: 1,
      vectors: values.map((value, i) => ({ id: `a${i + 1}`, name: `a${i + 1}`, coordinates: [value] })),
      spanSelection: values.map((_, i) => `a${i + 1}`),
      visualization: { showSpan: true, camera: null },
      linearCombination: { visible: true, target: [target] },
    }),
    expectedRank: values.some((value) => value !== 0) ? 1 : 0,
  };
}

const mapExamples = [
  [1, 1, '数直線の2倍写像', '入力が2倍され、核は原点、像は数直線全体です。'],
  [1, 2, '直線から平面への埋め込み', '単射ですが全射ではなく、像は平面内の直線です。'],
  [2, 1, '平面から数直線への線形汎関数', '入力の2成分の和を取り、核は直線、像は数直線全体です。'],
  [0, 2, '零空間から平面への写像', '唯一の写像は単射ですが、平面全体を覆わないため全射ではありません。'],
  [2, 0, '平面から零空間への写像', 'すべての入力が零ベクトルに写り、全射ですが単射ではありません。'],
  [0, 0, '零空間どうしの写像', '唯一の写像は単射かつ全射です。次元定理は0=0+0です。'],
] as const;

export const LOW_DIMENSIONAL_TEACHING_SCENARIOS: readonly LowDimensionalScenario[] = [
  vectorExample('line-unique', '1Dの基底1本と唯一の係数', [2], 3),
  vectorExample('line-infinite', '1Dの2本の生成元と無数の係数', [2, -3], 3),
  vectorExample('line-no-solution', '零生成元では非零ターゲットを表せない', [0], 1),
  { id: 'zero-span', title: '0Dと空集合のspan', learningPoint: '空集合のspanは零ベクトル空間です。',
    state: validateSharedState({ v: 4, lab: 'vector-space', dim: 0 }), expectedRank: 0 },
  { id: 'zero-basis', title: '0Dの空の基底', learningPoint: '空の組は一次独立で、零ベクトル空間を生成します。',
    state: validateSharedState({ v: 2, lab: 'basis-dimension', dim: 0 }), expectedRank: 0 },
  { id: 'constant-polynomial-basis', title: '定数多項式と異なる基底の座標',
    learningPoint: '同じ定数多項式6でも、基底2では係数3、基底−3では係数−2です。',
    state: validateSharedState({
      v: 2, lab: 'basis-dimension', dim: 1,
      vectors: [{ id: 'a1', name: 'a1', coordinates: [2] }, { id: 'a2', name: 'a2', coordinates: [-3] }],
      candidateVectorIds: ['a1'], representation: 'polynomial',
      linearCombination: { visible: true, target: [6] }, comparisonBasisIds: ['a2'], camera: null,
    }), expectedRank: 1 },
  ...mapExamples.map(([source, target, title, learningPoint]): LowDimensionalScenario => ({
    id: `low-map-${source}-to-${target}`, title, learningPoint,
    state: createLinearMapShareState({
      scene: createDefaultLinearMapScene(source, target),
      domainCamera: DEFAULT_3D_CAMERA_STATE, codomainCamera: DEFAULT_3D_CAMERA_STATE,
    }), expectedRank: source === 0 || target === 0 ? 0 : 1,
  })),
  { id: 'line-zero-map', title: '数直線の零写像', learningPoint: 'rankは0、nullityは1です。',
    state: createLinearMapShareState({
      scene: { ...createDefaultLinearMapScene(1, 1), matrix: [[0]] },
      domainCamera: DEFAULT_3D_CAMERA_STATE, codomainCamera: DEFAULT_3D_CAMERA_STATE,
    }), expectedRank: 0 },
];

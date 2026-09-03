import { DEFAULT_3D_CAMERA_STATE, type LinearMapShareState } from '../sharing';
import type { LinearMapTeachingScenario } from './scenarioTypes';

export const LINEAR_MAP_TEACHING_SCENARIOS: readonly LinearMapTeachingScenario[] = [
  scenario('linear-map-identity', '恒等写像', 'すべての入力を変えずに写し、核は原点、像は終域全体になる。', 2, 2,
    [[1, 0], [0, 1]], { rank: 2, nullity: 0, isInjective: true, isSurjective: true, isBijective: true }),
  scenario('linear-map-rotation', '90°回転', '回転は長さや向きを変えても次元を失わず、全単射になる。', 2, 2,
    [[0, -1], [1, 0]], { rank: 2, nullity: 0, isInjective: true, isSurjective: true, isBijective: true }),
  scenario('linear-map-reflection', 'x軸に関する鏡映', '鏡映も核が原点だけで、終域全体を像として持つ。', 2, 2,
    [[1, 0], [0, -1]], { rank: 2, nullity: 0, isInjective: true, isSurjective: true, isBijective: true }),
  scenario('linear-map-shear', 'せん断', '格子の形は変わってもrankは保たれ、全単射になる。', 2, 2,
    [[1, 1], [0, 1]], { rank: 2, nullity: 0, isInjective: true, isSurjective: true, isBijective: true }, true),
  scenario('linear-map-rank-one-projection', 'x軸へのrank 1射影', '1方向を核へ失い、2次元の入力を1次元の像へ射影する。', 2, 2,
    [[1, 0], [0, 0]], { rank: 1, nullity: 1, isInjective: false, isSurjective: false, isBijective: false }),
  scenario('linear-map-zero', '零写像', 'すべての入力が核に属し、像は原点だけになる。', 2, 2,
    [[0, 0], [0, 0]], { rank: 0, nullity: 2, isInjective: false, isSurjective: false, isBijective: false }),
  scenario('linear-map-embedding-2-to-3', '2次元から3次元への単射', '核は原点だけだが、像は3次元空間内の平面になる。', 2, 3,
    [[1, 0], [0, 1], [0, 0]], { rank: 2, nullity: 0, isInjective: true, isSurjective: false, isBijective: false }),
  scenario('linear-map-projection-3-to-2', '3次元から2次元への全射', '1方向を核へ失いながら、2次元の終域全体を像として持つ。', 3, 2,
    [[1, 0, 0], [0, 1, 0]], { rank: 2, nullity: 1, isInjective: false, isSurjective: true, isBijective: false }),
];

function scenario(
  id: string,
  title: string,
  learningPoint: string,
  sourceDimension: 2 | 3,
  targetDimension: 2 | 3,
  matrix: readonly (readonly number[])[],
  expected: LinearMapTeachingScenario['expected'],
  showTransformedGrid = false,
): LinearMapTeachingScenario {
  const inputVector = sourceDimension === 2 ? [2, 1] : [2, 1, 1];
  const secondaryInputVector = sourceDimension === 2 ? [1, -1] : [1, -1, 2];
  const state: LinearMapShareState = {
    v: 1,
    lab: 'linear-map',
    sourceDimension,
    targetDimension,
    matrix,
    inputVector,
    secondaryInputVector,
    scalar: 2,
    visualization: {
      showTransformedGrid,
      domainCamera: sourceDimension === 3 ? DEFAULT_3D_CAMERA_STATE : null,
      codomainCamera: targetDimension === 3 ? DEFAULT_3D_CAMERA_STATE : null,
    },
  };
  return { id, title, learningPoint, state, expected };
}

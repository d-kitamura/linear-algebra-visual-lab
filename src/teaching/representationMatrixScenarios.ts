import type { RepresentationMatrixShareState } from '../sharing';
import { createRepresentationShareState } from '../labs/representation-matrix/representationSharing';
import { createBasisChangeScene, createRepresentationViewState } from '../labs/representation-matrix/representationWorkspace';
import { createRepresentationScene, moveRepresentationBasis, type RepresentationScene } from '../labs/representation-matrix/representationMatrixState';
import { createPolynomialMapExample } from '../labs/representation-matrix/representationPolynomialExamples';

export interface RepresentationTeachingScenario {
  readonly id: string;
  readonly title: string;
  readonly observation: string;
  readonly state: RepresentationMatrixShareState;
  /** 独立に計算した期待値。実装の解析結果から生成しない。 */
  readonly expected: { readonly matrix: readonly (readonly number[])[] | null; readonly inputCoordinates: readonly number[] | null; readonly imageCoordinates: readonly number[] | null; readonly image: readonly number[] };
}
function example(id: string, title: string, observation: string, scene: RepresentationScene, matrix: RepresentationTeachingScenario['expected']['matrix'], inputCoordinates: readonly number[] | null, imageCoordinates: readonly number[] | null, image: readonly number[], mode: 'map' | 'basis-change' = 'map'): RepresentationTeachingScenario {
  return { id, title, observation, state: createRepresentationShareState(scene, createRepresentationViewState(), mode), expected: { matrix, inputCoordinates, imageCoordinates, image } };
}
function standard(n: 1 | 2 | 3, m: 1 | 2 | 3, matrix: readonly (readonly number[])[], input = [3, 2, 1].slice(0, n)): RepresentationScene {
  const scene = createRepresentationScene(n, m);
  return { ...scene, source: createBasisChangeScene(n, 'standard').source, target: createBasisChangeScene(m, 'standard').target, definition: { ...scene.definition, matrix }, input };
}
const shear = [[1, 1], [0, 1]];
const initial = createRepresentationScene();
const standardShear = standard(2, 2, shear);
const one = standard(1, 1, [[3]], [4]);

/** 10〜11週の観察順。既存の場面生成・多項式例を再利用し、共有v1で配布できる。 */
export const REPRESENTATION_MATRIX_TEACHING_SCENARIOS: readonly RepresentationTeachingScenario[] = [
  example('standard', '標準基底同士', '次の3例と写像・入力は同じです。標準基底では基準行列と表現行列が一致します。', standardShear, shear, [3, 2], [5, 2], [5, 2]),
  example('same-basis', '同じ非標準基底', '両側を同じ非標準基底に変えても、基準行列と表現行列は一般には一致しません。写像と入力・像は標準基底の例と同じです。', { ...initial, source: { ...initial.source, vectors: initial.source.vectors.map((v, i) => ({ ...v, coordinates: i === 0 ? [1, 0] : [0, 2] })) }, target: { ...initial.target, vectors: initial.target.vectors.map((v, i) => ({ ...v, coordinates: i === 0 ? [1, 0] : [0, 2] })) } }, [[1, 2], [0, 1]], [3, 1], [5, 1], [5, 2]),
  example('different-bases', '異なる2基底', '標準基底の例と同じ写像・入力・像です。各列を終域の基底で表すため表現行列が変わります。', initial, [[1, 2], [-1, -1]], [1, 2], [5, -3], [5, 2]),
  example('order', '基底の順序交換', '標準基底の例から定義域の順序だけを交換します。表現行列の列と入力座標の順序が交換され、像は変わりません。', moveRepresentationBasis(standardShear, 'source', 0, 1), [[1, 1], [1, 0]], [2, 3], [5, 2], [5, 2]),
  example('line', '1Dの長さと向き', '写像は3倍ですが、両基底の長さと向きが違うため表現行列の成分は負になります。', { ...one, source: { ...one.source, vectors: [{ ...one.source.vectors[0], coordinates: [2] }] }, target: { ...one.target, vectors: [{ ...one.target.vectors[0], coordinates: [-1] }] } }, [[-6]], [2], [-12], [12]),
  example('embedding', '2Dから3Dへの埋め込み', '終域の行数と定義域の列数を確認します。第3成分は常に零でも、終域は3次元です。', standard(2, 3, [[1, 0], [0, 1], [0, 0]]), [[1, 0], [0, 1], [0, 0]], [3, 2], [3, 2, 0], [3, 2, 0]),
  example('projection', '3Dから2Dへの射影', '第3標準基底の像は零です。零の列も表現行列の1列として残ります。', standard(3, 2, [[1, 0, 0], [0, 1, 0]]), [[1, 0, 0], [0, 1, 0]], [3, 2, 1], [3, 2], [3, 2]),
  example('identity', '恒等写像による基底変換', '同じベクトルを別の基底の座標へ変換します。方向を逆にすると変換元と変換先が入れ替わります。写像自体は恒等写像のままです。', createBasisChangeScene(2), [[1, 1], [-1, 0]], [1, 2], [3, -1], [3, 2], 'basis-change'),
  example('invalid', '基底でない候補', '定義域の候補は一次従属です。写像と像は計算できますが、この候補に関する表現行列を基底の表現行列として確定できません。', { ...initial, source: { ...initial.source, vectors: initial.source.vectors.map((v, i) => ({ ...v, coordinates: [i + 1, 0] })) } }, null, null, null, [5, 2]),
  example('derivative', '多項式の微分', '多項式そのものと標準単項式基底の係数を区別します。微分した多項式の基準係数と、選んだ終域基底での座標は異なります。', createPolynomialMapExample('derivative'), [[0, 1, -2], [0, 0, 2]], [1, 2, 3], [-4, 6], [2, 6]),
  example('multiply-x', '多項式への変数の乗算', '次数が1つ上がる操作を係数ベクトルへの行列として読みます。標準単項式基底の像を列ごとに確認します。', createPolynomialMapExample('multiply-x'), [[0, 0], [1, 0], [0, 1]], [1, 2], [0, 1, 2], [0, 1, 2]),
];

import { createBasisChangeScene } from './representationWorkspace';
import type { RepresentationScene } from './representationMatrixState';

export type PolynomialMapExample = 'derivative' | 'multiply-x' | 'translation';
/** 文字式を解析せず、標準単項式基底の係数に作用する既知の行列を使う。 */
export function createPolynomialMapExample(example: PolynomialMapExample): RepresentationScene {
  const source = createBasisChangeScene(example === 'multiply-x' ? 2 : 3, 'standard', 'polynomial');
  const target = createBasisChangeScene(example === 'derivative' ? 2 : 3, 'standard', 'polynomial');
  const matrix = example === 'derivative' ? [[0, 1, 0], [0, 0, 2]]
    : example === 'multiply-x' ? [[0, 0], [1, 0], [0, 1]] : [[1, 1, 1], [0, 1, 2], [0, 0, 1]];
  return { sourceKind: 'polynomial', targetKind: 'polynomial', source: source.source,
    target: example === 'derivative' ? { ...target.target, vectors: target.target.vectors.map((v, i) => ({ ...v, coordinates: i === 0 ? [1, 0] : [1, 1] })) } : target.target,
    input: example === 'multiply-x' ? [1, 2] : [1, 2, 3],
    definition: { sourceDimension: source.source.dimension, targetDimension: target.target.dimension, matrix } };
}

/** 編集後に古い「微分」等の説明を残さない。Mが一致する場合だけ規則を示す。 */
export function polynomialMapRule(scene: RepresentationScene): PolynomialMapExample | 'identity' | null {
  if (scene.sourceKind !== 'polynomial' || scene.targetKind !== 'polynomial') return null;
  const equal = (matrix: readonly (readonly number[])[]) => JSON.stringify(matrix) === JSON.stringify(scene.definition.matrix);
  const n = scene.source.dimension;
  if (n === scene.target.dimension && equal(Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r === c ? 1 : 0)))) return 'identity';
  return (['derivative', 'multiply-x', 'translation'] as const).find((example) => equal(createPolynomialMapExample(example).definition.matrix)) ?? null;
}

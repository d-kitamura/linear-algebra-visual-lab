import { createEigenScene, type EigenScene } from './eigenScene';

export type EigenPolynomialDimension = 1 | 2 | 3;
export type EigenPolynomialExample = 'derivative' | 'degree' | 'translation';
export const EIGEN_POLYNOMIAL_EXAMPLES = [
  ['derivative', '微分'], ['degree', 'x倍した微分'], ['translation', '平行移動（x → x + 1）'],
] as const;

/** すべて同じ空間上の自己写像。第四Labの長方形の微分行列とは区別する。 */
export function eigenPolynomialMatrix(example: EigenPolynomialExample, dimension: EigenPolynomialDimension): number[][] {
  if (![1, 2, 3].includes(dimension) || !EIGEN_POLYNOMIAL_EXAMPLES.some(([id]) => id === example)) throw new RangeError('多項式の例と1〜3次元を指定してください。');
  const translation = [[1, 1, 1], [0, 1, 2], [0, 0, 1]];
  return Array.from({ length: dimension }, (_, row) => Array.from({ length: dimension }, (_, column) =>
    example === 'derivative' ? column === row + 1 ? column : 0
      : example === 'degree' ? row === column ? column : 0 : translation[row][column]));
}
export function createEigenPolynomialScene(dimension: EigenPolynomialDimension): EigenScene {
  return createEigenScene(dimension === 1 ? [[2]] : eigenPolynomialMatrix('degree', dimension), 'polynomial');
}
export function applyEigenPolynomialExample(scene: EigenScene, example: EigenPolynomialExample): EigenScene {
  if (scene.kind !== 'polynomial' || scene.definition.dimension === 0) return scene;
  // 例を選んでも入力、空間表示、Reset基準は変更しない。
  return { ...scene, definition: { ...scene.definition, matrix: eigenPolynomialMatrix(example, scene.definition.dimension) } };
}
/** 文字列の構文解析や例IDの保存はしない。行列編集後に古い規則を表示しない。 */
export function eigenPolynomialRule(scene: EigenScene): EigenPolynomialExample | 'twice' | 'zero' | null {
  if (scene.kind !== 'polynomial' || scene.definition.dimension === 0) return null;
  const matrix = scene.definition.matrix, n = scene.definition.dimension;
  const equals = (other: readonly (readonly number[])[]) => matrix.every((row, r) => row.every((value, c) => value === other[r][c]));
  // 定数空間の微分とxf′は同じ零変換。選択履歴で異なる規則名を残さない。
  if (matrix.every((row) => row.every((value) => value === 0))) return 'zero';
  if (equals(Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r === c ? 2 : 0)))) return 'twice';
  return EIGEN_POLYNOMIAL_EXAMPLES.find(([example]) => equals(eigenPolynomialMatrix(example, n)))?.[0] ?? null;
}

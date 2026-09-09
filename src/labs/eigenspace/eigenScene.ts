import { analyzeEigenMap, type EigenMapAnalysis, type EigenMapDefinition, type VectorValue } from '../../domain';
import { parallelSnapDistanceForViewWidth, snapTargetToSelectedSpan, snapSpaceTargetToSelectedSpan } from '../../state';

/** 像や固有空間の基底は保存せず数学APIから導出する。0Dの成分は空配列。 */
export interface EigenScene {
  readonly kind: 'coordinate' | 'polynomial';
  readonly definition: EigenMapDefinition;
  readonly input: readonly number[];
  readonly showEigenspace: boolean;
}
export function createEigenScene(matrix: readonly (readonly number[])[] = [[4, 1], [0, 2]], kind: EigenScene['kind'] = 'coordinate'): EigenScene {
  if (kind === 'polynomial' && matrix.length === 0) throw new RangeError('多項式の係数空間は1〜3次元です。');
  const definition = { dimension: matrix.length as EigenMapDefinition['dimension'], matrix: matrix.map((row) => [...row]) };
  analyzeEigenMap(definition); // 初期値の形状・成分を検証する。
  return { kind, definition, input: kind === 'coordinate' && definition.dimension === 2 ? [1, 2] : Array.from({ length: definition.dimension }, () => 1), showEigenspace: false };
}
export function createEigenSceneForDimension(dimension: EigenMapDefinition['dimension']): EigenScene {
  const matrices = { 0: [], 1: [[-2]], 2: [[4, 1], [0, 2]], 3: [[2, 0, 0], [0, 2, 0], [0, 0, -1]] };
  return createEigenScene(matrices[dimension]);
}
export function parseEigenNumber(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= 1_000_000 ? value : null;
}
export function editEigenMatrix(scene: EigenScene, row: number, column: number, value: number): EigenScene {
  if (![row, column].every((i) => Number.isInteger(i) && i >= 0 && i < scene.definition.dimension) || parseEigenNumber(String(value)) === null) return scene;
  if (scene.definition.matrix[row][column] === value) return scene;
  const definition = { ...scene.definition, matrix: scene.definition.matrix.map((entries, r) =>
    entries.map((entry, c) => r === row && c === column ? value : entry)) };
  return { ...scene, definition };
}
export function setEigenInput(scene: EigenScene, input: readonly number[]): EigenScene {
  if (input.length !== scene.definition.dimension || !input.every((v) => parseEigenNumber(String(v)) !== null)) return scene;
  return { ...scene, input: [...input] };
}
export function createEigenSpaceGeometries(analysis: EigenMapAnalysis) {
  // 固有空間ごとに保持する。異なる固有直線を合わせて「平面」と解釈しない。
  return analysis.realEigenvalues.flatMap((root, index) => root.eigenspace ? [{
    index, dimension: root.eigenspace.dimension, vectors: root.eigenspace.basis.map((coordinates, i): VectorValue =>
      ({ id: `eigen-${index}-q${i + 1}`, name: `q${i + 1}`, coordinates })),
  }] : []);
}
export function snapEigenInput(scene: EigenScene, analysis: EigenMapAnalysis, coordinates: readonly [number, number], viewWidth: number) {
  const safe = coordinates.map((v) => Math.max(-1_000_000, Math.min(1_000_000, v))) as [number, number];
  const distance = parallelSnapDistanceForViewWidth(viewWidth);
  const origin = snapTargetToSelectedSpan(safe, [], 0, distance);
  if (origin.snapKind === 'origin' || !scene.showEigenspace) return origin;
  // 全候補のうち最短距離へ吸着。同距離なら実根昇順。未確認空間は候補にしない。
  let nearest = origin, bestDistance = Infinity;
  for (const geometry of createEigenSpaceGeometries(analysis)) {
    const candidate = snapTargetToSelectedSpan(safe, geometry.vectors, geometry.dimension, distance);
    const move = Math.hypot(candidate.coordinates[0] - safe[0], candidate.coordinates[1] - safe[1]);
    if (candidate.snapKind && move < bestDistance) { nearest = candidate; bestDistance = move; }
  }
  return nearest;
}

/** 共通3Dが渡す表示幅3%の距離を使用。異なる固有空間を合成して吸着しない。 */
export function snapEigenSpaceInput(scene: EigenScene, analysis: EigenMapAnalysis, coordinates: readonly [number, number, number], maximumDistance: number) {
  const safe = coordinates.map((v) => Math.max(-1_000_000, Math.min(1_000_000, v))) as [number, number, number];
  const origin = snapSpaceTargetToSelectedSpan(safe, [], 0, maximumDistance);
  if (origin.snapKind === 'origin' || !scene.showEigenspace) return origin;
  let nearest = origin, bestDistance = Infinity;
  for (const geometry of createEigenSpaceGeometries(analysis)) {
    const candidate = snapSpaceTargetToSelectedSpan(safe, geometry.vectors, geometry.dimension, maximumDistance);
    const move = Math.hypot(...candidate.coordinates.map((v, i) => v - safe[i]));
    if (candidate.snapKind && move < bestDistance) { nearest = candidate; bestDistance = move; }
  }
  return nearest;
}

import { analyzeEigenMap, type EigenMapAnalysis, type EigenMapDefinition, type VectorValue } from '../../domain';
import { parallelSnapDistanceForViewWidth, snapTargetToSelectedSpan } from '../../state';

/** 12.3は数ベクトル2Dだけ。像や空間基底は保存せず数学APIから導出する。 */
export interface EigenScene {
  readonly definition: EigenMapDefinition & { readonly dimension: 2 };
  readonly input: readonly [number, number];
  readonly showEigenspace: boolean;
}
export function createEigenScene(matrix: readonly (readonly number[])[] = [[4, 1], [0, 2]]): EigenScene {
  const definition = { dimension: 2 as const, matrix: matrix.map((row) => [...row]) };
  analyzeEigenMap(definition); // 初期値の形状・成分を検証する。
  return { definition, input: [2, 1], showEigenspace: false };
}
export function parseEigenNumber(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= 1_000_000 ? value : null;
}
export function editEigenMatrix(scene: EigenScene, row: number, column: number, value: number): EigenScene {
  if (![0, 1].includes(row) || ![0, 1].includes(column) || parseEigenNumber(String(value)) === null) return scene;
  if (scene.definition.matrix[row][column] === value) return scene;
  const definition = { ...scene.definition, matrix: scene.definition.matrix.map((entries, r) =>
    entries.map((entry, c) => r === row && c === column ? value : entry)) };
  return { ...scene, definition };
}
export function setEigenInput(scene: EigenScene, input: readonly [number, number]): EigenScene {
  if (!input.every((v) => parseEigenNumber(String(v)) !== null)) return scene;
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

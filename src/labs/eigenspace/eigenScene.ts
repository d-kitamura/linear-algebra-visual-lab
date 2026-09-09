import { analyzeEigenMap, type EigenMapAnalysis, type EigenMapDefinition, type VectorValue } from '../../domain';
import { parallelSnapDistanceForViewWidth, snapTargetToSelectedSpan } from '../../state';

/** 12.3は数ベクトル2Dだけ。像や空間基底は保存せず数学APIから導出する。 */
export interface EigenScene {
  readonly definition: EigenMapDefinition & { readonly dimension: 2 };
  readonly input: readonly [number, number];
  readonly selectedEigenvalueIndex: number | null;
  readonly showEigenspace: boolean;
}
export function firstEigenSelection(analysis: EigenMapAnalysis, requested: number | null = null): number | null {
  if (requested !== null && analysis.realEigenvalues[requested]?.eigenspace) return requested;
  const first = analysis.realEigenvalues.findIndex((root) => root.eigenspace !== null);
  return first < 0 ? null : first;
}
export function createEigenScene(matrix: readonly (readonly number[])[] = [[2, 1], [1, 2]]): EigenScene {
  const definition = { dimension: 2 as const, matrix: matrix.map((row) => [...row]) };
  const analysis = analyzeEigenMap(definition);
  return { definition, input: [2, 1], selectedEigenvalueIndex: firstEigenSelection(analysis), showEigenspace: true };
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
  // 行列が変わった場合だけ最初の確認済み空間へ戻す。別の根を追跡したとは解釈しない。
  return { ...scene, definition, selectedEigenvalueIndex: firstEigenSelection(analyzeEigenMap(definition)) };
}
export function setEigenInput(scene: EigenScene, input: readonly [number, number]): EigenScene {
  if (!input.every((v) => parseEigenNumber(String(v)) !== null)) return scene;
  return { ...scene, input: [...input] };
}
export function createEigenSpaceGeometry(analysis: EigenMapAnalysis, index: number | null) {
  const space = index === null ? null : analysis.realEigenvalues[index]?.eigenspace;
  if (!space) return null;
  return { dimension: space.dimension, vectors: space.basis.map((coordinates, i): VectorValue =>
    ({ id: `eigen-q${i + 1}`, name: `q${i + 1}`, coordinates })) };
}
export function snapEigenInput(scene: EigenScene, analysis: EigenMapAnalysis, coordinates: readonly [number, number], viewWidth: number) {
  const geometry = scene.showEigenspace ? createEigenSpaceGeometry(analysis, scene.selectedEigenvalueIndex) : null;
  const safe = coordinates.map((v) => Math.max(-1_000_000, Math.min(1_000_000, v))) as [number, number];
  // 未確認・非表示の空間へは吸着しないが、原点の優先吸着は常に共用する。
  return snapTargetToSelectedSpan(safe, geometry?.vectors ?? [], geometry?.dimension ?? 0,
    parallelSnapDistanceForViewWidth(viewWidth));
}

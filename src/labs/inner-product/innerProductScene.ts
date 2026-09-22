import { analyzeInnerProductPair, createInnerProductMetric, type MetricId, type GramSchmidtAnalysis, type StageKey, type OrderedInput, type PairAnalysis, type VectorValue } from '../../domain';
import { parallelSnapDistanceForViewWidth } from '../../state/vectorSnapping';
import type { PlaneViewport } from '../../visualization/planeGeometry';

export type InnerProductDimension = 0 | 1 | 2 | 3;
export type InnerProductKind = 'coordinate' | 'polynomial';
/** 数0〜3Dの教材状態。下書き・タブ・表示範囲はReact側へ分離する。 */
export interface InnerProductScene {
  readonly kind: InnerProductKind;
  readonly metric: MetricId;
  readonly dimension: InnerProductDimension;
  readonly inputs: readonly OrderedInput[];
  readonly pair: readonly [number, number] | null;
  readonly mode: 'pair' | 'gram-schmidt';
  readonly stage: StageKey | null;
  readonly showGeometry: boolean;
}
const METRICS = [0, 1, 2, 3].map(dimension => createInnerProductMetric({ dimension: dimension as InnerProductDimension, metric: 'euclidean' }));
const POLYNOMIAL_METRICS = Object.fromEntries((['integral', 'coefficient'] as const).map(metric => [metric, [1, 2, 3].map(dimension => createInnerProductMetric({ dimension: dimension as 1 | 2 | 3, metric }))]));
export const innerProductMetric = (dimension: InnerProductDimension, metric: MetricId = 'euclidean') => {
  if (metric !== 'euclidean' && dimension === 0) throw new Error('Polynomial space must have positive dimension');
  return metric === 'euclidean' ? METRICS[dimension] : POLYNOMIAL_METRICS[metric][dimension - 1];
};
export const INNER_PRODUCT_2D_METRIC = innerProductMetric(2);
export const INNER_PRODUCT_COLORS = ['#ce5135', '#00877e', '#8170bc', '#aa752a', '#327baa', '#aa5683', '#658238', '#647380'] as const;
export const innerInputColor = (id: number) => INNER_PRODUCT_COLORS[(id - 1) % INNER_PRODUCT_COLORS.length];
export const PROJECTION_COLOR = '#2f6690', RESIDUAL_COLOR = '#8170bc';
export function createInnerProductScene(dimension: InnerProductDimension = 2, kind: InnerProductKind = 'coordinate'): InnerProductScene {
  if (kind === 'polynomial' && dimension === 0) throw new Error('Polynomial space must have positive dimension');
  const components = kind === 'polynomial' ? Array.from({ length: dimension }, (_, i) => Array.from({ length: dimension }, (_, j) => i === j ? 1 : 0))
    : dimension === 0 ? [] : dimension === 1 ? [[1], [2]] : dimension === 2 ? [[2, 2], [3, 0]] : [[1, 1, 0], [1, 0, 1], [0, 1, 1]];
  return { kind, metric: kind === 'polynomial' ? 'integral' : 'euclidean', dimension, inputs: components.map((components, i) => ({ id: i + 1, components })), pair: components.length ? [1, components.length === 1 ? 1 : 2] : null, mode: 'pair', stage: dimension ? { inputId: 1, phase: 'input' } : null, showGeometry: true };
}
export function editInnerProductInput(scene: InnerProductScene, id: number, coordinates: readonly number[]): InnerProductScene {
  if (!scene.inputs.some(input => input.id === id) || coordinates.length !== scene.dimension
    || Array.from(coordinates).some(x => !Number.isFinite(x) || Math.abs(x) > 1e6)) return scene;
  return { ...scene, inputs: scene.inputs.map(input => input.id === id ? { ...input, components: coordinates.map(x => x === 0 ? 0 : x) } : input) };
}
export function selectInnerProductPair(scene: InnerProductScene, side: 0 | 1, id: number): InnerProductScene {
  if (!scene.pair || !scene.inputs.some(input => input.id === id)) return scene;
  return { ...scene, pair: side === 0 ? [id, scene.pair[1]] : [scene.pair[0], id] };
}
export function analyzeInnerProductScene(scene: InnerProductScene): PairAnalysis | null {
  if (scene.dimension === 0) return analyzeInnerProductPair(innerProductMetric(0), [], []);
  if (!scene.pair) return null;
  const pair = scene.pair;
  const u = scene.inputs.find(input => input.id === pair[0]);
  const v = scene.inputs.find(input => input.id === pair[1]);
  if (!u || !v) throw new Error('Inner product pair must refer to existing inputs');
  return analyzeInnerProductPair(innerProductMetric(scene.dimension, scene.metric), u.components, v.components);
}
export function snapInnerProductInput(coordinates: readonly [number, number], viewWidth: number): readonly [number, number] {
  return Math.hypot(...coordinates) <= parallelSnapDistanceForViewWidth(viewWidth) ? [0, 0] : coordinates;
}
export const inputPlotId = (id: number) => `inner-input-${id}`;
export function innerProductPlots(scene: InnerProductScene, result: PairAnalysis | null) {
  const inputs: VectorValue[] = scene.inputs.map(input => ({ id: inputPlotId(input.id), name: `a${input.id}`, coordinates: input.components }));
  const projection = result?.projection;
  // 保留時は古い導出図を残さない。成分・式は値ごとの可否を別に表示する。
  const usable = result?.status !== 'numerical-failure' && projection?.vector.numeric.status === 'ready'
    && projection.residual.numeric.status === 'ready';
  const derived: VectorValue[] = usable && scene.dimension > 0 ? [
    { id: 'inner-p', name: 'p', coordinates: projection.vector.numeric.status === 'ready' ? projection.vector.numeric.value : [] },
    { id: 'inner-r', name: 'r', coordinates: projection.residual.numeric.status === 'ready' ? projection.residual.numeric.value : [] },
  ] : [];
  const vectors = [...(scene.showGeometry ? derived : []), ...inputs];
  const safe = vectors.every(v => v.coordinates.length === scene.dimension && v.coordinates.every(x => Number.isFinite(x) && Math.abs(x) <= 1e6));
  return { vectors, inputs, safe, derivedAvailable: Boolean(usable),
    colors: [...(scene.showGeometry && derived.length ? [PROJECTION_COLOR, RESIDUAL_COLOR] : []), ...scene.inputs.map(input => innerInputColor(input.id))],
    editableIds: inputs.map(v => v.id) };
}
/** 矢先とラベル、特にaとその射影のラベルを異なる側へ分ける。 */
export function innerProductPresentation(vectors: readonly VectorValue[], viewport: PlaneViewport) {
  return Object.fromEntries(vectors.map(v => {
    const derived = !v.id.startsWith('inner-input-');
    const x = v.coordinates[0], y = v.coordinates[1];
    // 表示端付近でも外へ押し出しにくいオフセット。拡大／移動の度に計算する。
    const nearTop = y > viewport.maxY - (viewport.maxY - viewport.minY) * 0.08;
    return [v.id, { outline: derived, strokeWidth: derived ? 2 : 4,
      labelOffset: [x >= 0 ? 14 : -14, derived || nearTop ? (v.id === 'inner-r' ? 36 : 23) : -17] as const }];
  }));
}

const firstStage = (inputs: readonly OrderedInput[]): StageKey | null => inputs.length ? { inputId: inputs[0].id, phase: 'input' } : null;
export const stageId = (stage: StageKey | null) => stage ? `${stage.inputId}:${stage.phase}${stage.phase === 'projection' ? ':' + stage.count : ''}` : '';
export function resolveInnerProductStage(stage: StageKey | null, analysis: GramSchmidtAnalysis): StageKey | null {
  return analysis.availableStages.find(item => stageId(item) === stageId(stage)) ?? analysis.availableStages[0] ?? null;
}
export function addInnerProductInput(scene: InnerProductScene): InnerProductScene {
  if (scene.dimension === 0 || scene.inputs.length >= 8) return scene;
  const id = Array.from({ length: 8 }, (_, i) => i + 1).find(id => !scene.inputs.some(input => input.id === id))!;
  // 新しい入力は零から明示編集する。pair未選択を勝手に補完しない。
  const inputs = [...scene.inputs, { id, components: Array<number>(scene.dimension).fill(0) }];
  return { ...scene, inputs, stage: firstStage(inputs) };
}
export function removeInnerProductInput(scene: InnerProductScene, id: number): InnerProductScene {
  if (!scene.inputs.some(input => input.id === id)) return scene;
  const inputs = scene.inputs.filter(input => input.id !== id);
  return { ...scene, inputs, pair: scene.pair?.includes(id) ? null : scene.pair, stage: firstStage(inputs) };
}
export function moveInnerProductInput(scene: InnerProductScene, id: number, direction: -1 | 1): InnerProductScene {
  const index = scene.inputs.findIndex(input => input.id === id), target = index + direction;
  if (index < 0 || target < 0 || target >= scene.inputs.length) return scene;
  const inputs = [...scene.inputs];
  [inputs[index], inputs[target]] = [inputs[target], inputs[index]];
  return { ...scene, inputs, stage: firstStage(inputs) };
}

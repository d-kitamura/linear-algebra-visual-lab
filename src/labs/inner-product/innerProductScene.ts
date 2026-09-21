import { analyzeInnerProductPair, createInnerProductMetric, type OrderedInput, type PairAnalysis, type VectorValue } from '../../domain';
import { parallelSnapDistanceForViewWidth } from '../../state/vectorSnapping';
import type { PlaneViewport } from '../../visualization/planeGeometry';

/** 14.3は数2D・固定2本。追加／削除／並替えとGSのモードは14.4で接続する。 */
export interface InnerProductScene {
  readonly inputs: readonly OrderedInput[];
  readonly pair: readonly [number, number];
  readonly showGeometry: boolean;
}
export const INNER_PRODUCT_2D_METRIC = createInnerProductMetric({ dimension: 2, metric: 'euclidean' });
export const INNER_PRODUCT_COLORS = ['#ce5135', '#00877e'] as const;
export const PROJECTION_COLOR = '#2f6690', RESIDUAL_COLOR = '#8170bc';
export function createInnerProductScene(): InnerProductScene {
  return { inputs: [{ id: 1, components: [1, 1] }, { id: 2, components: [1, 0] }], pair: [1, 2], showGeometry: true };
}
export function editInnerProductInput(scene: InnerProductScene, id: number, coordinates: readonly number[]): InnerProductScene {
  if (!scene.inputs.some(input => input.id === id) || coordinates.length !== 2
    || Array.from(coordinates).some(x => !Number.isFinite(x) || Math.abs(x) > 1e6)) return scene;
  return { ...scene, inputs: scene.inputs.map(input => input.id === id ? { ...input, components: coordinates.map(x => x === 0 ? 0 : x) } : input) };
}
export function selectInnerProductPair(scene: InnerProductScene, side: 0 | 1, id: number): InnerProductScene {
  if (!scene.inputs.some(input => input.id === id)) return scene;
  return { ...scene, pair: side === 0 ? [id, scene.pair[1]] : [scene.pair[0], id] };
}
export function analyzeInnerProductScene(scene: InnerProductScene): PairAnalysis {
  const u = scene.inputs.find(input => input.id === scene.pair[0]);
  const v = scene.inputs.find(input => input.id === scene.pair[1]);
  if (!u || !v) throw new Error('Inner product pair must refer to existing inputs');
  return analyzeInnerProductPair(INNER_PRODUCT_2D_METRIC, u.components, v.components);
}
export function snapInnerProductInput(coordinates: readonly [number, number], viewWidth: number): readonly [number, number] {
  return Math.hypot(...coordinates) <= parallelSnapDistanceForViewWidth(viewWidth) ? [0, 0] : coordinates;
}
export const inputPlotId = (id: number) => `inner-input-${id}`;
export function innerProductPlots(scene: InnerProductScene, result: PairAnalysis) {
  const inputs: VectorValue[] = scene.inputs.map(input => ({ id: inputPlotId(input.id), name: `a${input.id}`, coordinates: input.components }));
  const projection = result.projection;
  // 保留時は古い導出図を残さない。成分・式は値ごとの可否を別に表示する。
  const usable = result.status !== 'numerical-failure' && projection?.vector.numeric.status === 'ready'
    && projection.residual.numeric.status === 'ready';
  const derived: VectorValue[] = usable ? [
    { id: 'inner-p', name: 'p', coordinates: projection.vector.numeric.status === 'ready' ? projection.vector.numeric.value : [] },
    { id: 'inner-r', name: 'r', coordinates: projection.residual.numeric.status === 'ready' ? projection.residual.numeric.value : [] },
  ] : [];
  const vectors = [...(scene.showGeometry ? derived : []), ...inputs];
  const safe = vectors.every(v => v.coordinates.length === 2 && v.coordinates.every(x => Number.isFinite(x) && Math.abs(x) <= 1e6));
  return { vectors, inputs, safe, derivedAvailable: Boolean(usable),
    colors: [...(scene.showGeometry && usable ? [PROJECTION_COLOR, RESIDUAL_COLOR] : []), ...inputs.map((_, i) => INNER_PRODUCT_COLORS[i % 2])],
    editableIds: inputs.map(v => v.id) };
}
/** 矢先とラベル、特にaとその射影のラベルを異なる側へ分ける。 */
export function innerProductPresentation(vectors: readonly VectorValue[], viewport: PlaneViewport) {
  return Object.fromEntries(vectors.map(v => {
    const derived = v.id === 'inner-p' || v.id === 'inner-r';
    const x = v.coordinates[0], y = v.coordinates[1];
    // 表示端付近でも外へ押し出しにくいオフセット。拡大／移動の度に計算する。
    const nearTop = y > viewport.maxY - (viewport.maxY - viewport.minY) * 0.08;
    return [v.id, { outline: derived, strokeWidth: derived ? 2 : 4,
      labelOffset: [x >= 0 ? 14 : -14, derived || nearTop ? (v.id === 'inner-r' ? 36 : 23) : -17] as const }];
  }));
}

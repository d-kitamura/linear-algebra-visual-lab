import type { GramSchmidtAnalysis, PairAnalysis, StageKey, VectorValue } from '../../domain';
import type { SpaceAuxiliarySegment, VectorCoordinatePreview } from '../../visualization/VectorSpace3D';
import { gramSchmidtFrame } from './gramSchmidtPresentation';
import { PROJECTION_COLOR, RESIDUAL_COLOR } from './innerProductScene';

type Point = readonly [number, number, number];
type Plots = { readonly vectors: readonly VectorValue[]; readonly colors: readonly string[] };
const ORIGIN: Point = [0, 0, 0];
// 3D runtimeの構築用IDは固定。ドラッグで段階が消滅／復帰してもcaptureを維持する。
const DERIVED_NAMES = ['p', 'r', 'p1', 'p2', 'p3', 'q1', 'q2', 'q3'] as const;
const slotId = (name: string) => `inner-space-${name}`;
const point = (values: readonly number[]): Point => [values[0], values[1], values[2]];
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const safe = (a: readonly number[]) => a.length === 3 && a.every(x => Number.isFinite(x) && Math.abs(x) <= 1e6);

export function innerSpaceVectorPool(committed: Plots) {
  const inputs = committed.vectors.filter(v => v.id.startsWith('inner-input-'));
  const derived = DERIVED_NAMES.map(name => {
    const value = committed.vectors.find(v => v.name === name);
    return { id: slotId(name), name, coordinates: value && safe(value.coordinates) ? value.coordinates : ORIGIN };
  });
  return { vectors: [...derived, ...inputs], colors: [
    ...DERIVED_NAMES.map(name => name === 'r' ? RESIDUAL_COLOR : PROJECTION_COLOR),
    ...inputs.map(v => committed.colors[committed.vectors.indexOf(v)]),
  ] };
}
/** 非表示のslotにはnullを渡す。零ベクトルの偽ラベルや古い段階を残さない。 */
export function innerSpacePreviews(plots: Plots): readonly VectorCoordinatePreview[] {
  return DERIVED_NAMES.map(name => {
    const index = plots.vectors.findIndex(v => v.name === name), vector = plots.vectors[index];
    const labelCenter: readonly [number, number] = name.startsWith('q') ? [-.42, 2.4] : name === 'r' ? [1.42, -.9] : [-.42, -.9];
    return { vectorId: slotId(name), coordinates: vector && safe(vector.coordinates) ? point(vector.coordinates) : null, color: plots.colors[index], outlined: true, labelCenter };
  });
}
export function snapInnerSpaceInput(_id: string, coordinates: Point, maximumDistance: number) {
  return Math.hypot(...coordinates) <= maximumDistance
    ? { coordinates: ORIGIN, snapKind: 'origin' as const, targetVectorIds: [] }
    : { coordinates, snapKind: null, targetVectorIds: [] };
}

/** 解析済みの直交成分から補助辺を作る。移動経路の矢印ではなく、平行移動した細い辺。 */
export function innerSpaceSegments(mode: 'pair' | 'gram-schmidt', result: PairAnalysis | null, gs: GramSchmidtAnalysis, stage: StageKey | null, scale: number): readonly SpaceAuxiliarySegment[] {
  const components: Point[] = [];
  const take = (value: readonly number[] | undefined) => { if (value && safe(value) && Math.hypot(...value) > 0) components.push(point(value)); };
  if (mode === 'pair') {
    const p = result?.projection;
    if (p?.vector.numeric.status !== 'ready' || p.residual.numeric.status !== 'ready') return [];
    take(p?.vector.numeric.status === 'ready' ? p.vector.numeric.value : undefined);
    take(p?.residual.numeric.status === 'ready' ? p.residual.numeric.value : undefined);
  } else {
    const frame = gramSchmidtFrame(gs, stage);
    if (frame.residual?.numeric.status !== 'ready' || frame.projections.some(p => p.vector.numeric.status !== 'ready')) return [];
    frame.projections.forEach(p => take(p.vector.numeric.status === 'ready' ? p.vector.numeric.value : undefined));
    take(frame.residual?.numeric.status === 'ready' ? frame.residual.numeric.value : undefined);
  }
  if (components.length < 2 || components.length > 3) return [];
  const lines: SpaceAuxiliarySegment[] = [];
  for (let mask = 1; mask < (1 << components.length); mask++) {
    const start = components.reduce<Point>((sum, p, i) => mask & (1 << i) ? add(sum, p) : sum, ORIGIN);
    components.forEach((p, i) => {
      if (!(mask & (1 << i))) { const end = add(start, p); if (safe(start) && safe(end)) lines.push({ start, end, dashed: true }); }
    });
  }
  // 記号も世界座標で直交させる。透視した画面の見かけの角度で判断しない。
  const [a, b] = components, na = Math.hypot(...a), nb = Math.hypot(...b);
  if (Math.abs(a.reduce((sum, x, i) => sum + (x / na) * (b[i] / nb), 0)) > 1e-8) return lines;
  const size = Math.min(scale * .06, na * .2, nb * .2);
  const alongA = point(a.map(x => -x / na * size)), alongB = point(b.map(x => x / nb * size));
  const first = add(a, alongA), corner = add(first, alongB), last = add(a, alongB);
  if ([first, corner, last].every(safe)) lines.push({ start: first, end: corner }, { start: corner, end: last });
  return lines;
}

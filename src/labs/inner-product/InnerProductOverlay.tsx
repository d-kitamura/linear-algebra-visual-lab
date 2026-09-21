import type { PairAnalysis } from '../../domain';
import { toSvgPoint, type PlaneViewport } from '../../visualization/planeGeometry';

/** pとrを原点からの2辺とする補助図。移動経路の矢印ではない。 */
export function InnerProductOverlay({ result, viewport }: { readonly result: PairAnalysis; readonly viewport: PlaneViewport }) {
  const projection = result.projection;
  if (result.status === 'numerical-failure' || projection?.vector.numeric.status !== 'ready' || projection.residual.numeric.status !== 'ready') return null;
  const point = (values: readonly number[]) => toSvgPoint(values as readonly [number, number], viewport);
  const p = point(projection.vector.numeric.value), r = point(projection.residual.numeric.value), v = point(result.v), o = point([0, 0]), u = point(result.u);
  const a = [u[0] - o[0], u[1] - o[1]], b = [v[0] - p[0], v[1] - p[1]];
  const an = Math.hypot(...a), bn = Math.hypot(...b);
  const size = Math.min(10, an / 4, bn / 4);
  const sign = (p[0] - o[0]) * a[0] + (p[1] - o[1]) * a[1] > 0 ? -1 : 1;
  const x = a.map(value => an ? value / an * size * sign : 0), y = b.map(value => bn ? value / bn * size : 0);
  return <g className="inner-projection-overlay">
    <line x1={p[0]} y1={p[1]} x2={v[0]} y2={v[1]} /><line x1={r[0]} y1={r[1]} x2={v[0]} y2={v[1]} />
    {size >= 2 && projection.kind === 'line' && <polyline className="inner-right-angle"
      points={`${p[0] + x[0]},${p[1] + x[1]} ${p[0] + x[0] + y[0]},${p[1] + x[1] + y[1]} ${p[0] + y[0]},${p[1] + y[1]}`} />}
  </g>;
}

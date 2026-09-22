import type { PairAnalysis, InnerProductMetric } from '../../domain';
import { innerDisplayCoordinates } from './innerProductCoordinates';
import { toSvgPoint, type PlaneViewport } from '../../visualization/planeGeometry';

/** pとrを原点からの2辺とする補助図。移動経路の矢印ではない。 */
export function InnerProductOverlay({ result, viewport, metric }: { readonly result: PairAnalysis; readonly viewport: PlaneViewport; readonly metric?: InnerProductMetric }) {
  const projection = result.projection;
  if (result.status === 'numerical-failure' || projection?.vector.numeric.status !== 'ready' || projection.residual.numeric.status !== 'ready') return null;
  return <ProjectionGeometry u={result.u} v={result.v} p={projection.vector.numeric.value} r={projection.residual.numeric.value} viewport={viewport} metric={metric} />;
}

/** 直交分解が確認済みの2辺だけに使用する。画面の見かけから直交判定しない。 */
export function ProjectionGeometry({ u, v, p, r, viewport, metric }: {
  readonly u: readonly number[]; readonly v: readonly number[]; readonly p: readonly number[]; readonly r: readonly number[]; readonly viewport: PlaneViewport; readonly metric?: InnerProductMetric;
}) {
  const transformed = [u, v, p, r].map(values => metric ? innerDisplayCoordinates(metric, values) : values);
  if (transformed.some(value => value === null)) return null;
  return <DisplayProjectionGeometry direction={transformed[0]!} input={transformed[1]!} projection={transformed[2]!} residual={transformed[3]!} viewport={viewport} />;
}
function DisplayProjectionGeometry({ direction, input, projection, residual, viewport }: {
  readonly direction: readonly number[]; readonly input: readonly number[]; readonly projection: readonly number[]; readonly residual: readonly number[]; readonly viewport: PlaneViewport;
}) {
  const point = (values: readonly number[]) => toSvgPoint(values as readonly [number, number], viewport);
  const p = point(projection), r = point(residual), v = point(input), o = point([0, 0]), u = point(direction);
  const a = [u[0] - o[0], u[1] - o[1]], b = [v[0] - p[0], v[1] - p[1]];
  const an = Math.hypot(...a), bn = Math.hypot(...b);
  const size = Math.min(10, an / 4, bn / 4);
  const sign = (p[0] - o[0]) * a[0] + (p[1] - o[1]) * a[1] > 0 ? -1 : 1;
  const x = a.map(value => an ? value / an * size * sign : 0), y = b.map(value => bn ? value / bn * size : 0);
  return <g className="inner-projection-overlay">
    <line x1={p[0]} y1={p[1]} x2={v[0]} y2={v[1]} /><line x1={r[0]} y1={r[1]} x2={v[0]} y2={v[1]} />
    {size >= 2 && <polyline className="inner-right-angle"
      points={`${p[0] + x[0]},${p[1] + x[1]} ${p[0] + x[0] + y[0]},${p[1] + x[1] + y[1]} ${p[0] + y[0]},${p[1] + y[1]}`} />}
  </g>;
}

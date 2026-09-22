import type { GramSchmidtAnalysis, StageKey, InnerProductMetric } from '../../domain';
import type { PlaneViewport } from '../../visualization';
import { gramSchmidtFrame } from './gramSchmidtPresentation';
import { ProjectionGeometry } from './InnerProductOverlay';

export function GramSchmidtOverlay({ analysis, stage, viewport, metric }: {
  readonly analysis: GramSchmidtAnalysis; readonly stage: StageKey | null; readonly viewport: PlaneViewport; readonly metric?: InnerProductMetric;
}) {
  const frame = gramSchmidtFrame(analysis, stage);
  const input = analysis.inputs.find(item => item.id === stage?.inputId);
  if (!input || frame.residual?.numeric.status !== 'ready') return null;
  const [first, second] = frame.projections;
  if (first?.vector.numeric.status !== 'ready') return null;
  if (frame.projections.length === 1) {
    const direction = analysis.accepted.find(item => item.sourceId === first.ontoSourceId)?.w.numeric;
    if (direction?.status !== 'ready') return null;
    return <ProjectionGeometry u={direction.value} v={input.components} p={first.vector.numeric.value} r={frame.residual.numeric.value} viewport={viewport} metric={metric} />;
  }
  // 2Dで2方向を引き切った厳密零の場合は、2つの射影を辺にした補助図。
  if (second?.vector.numeric.status === 'ready' && frame.residual.exact.every(x => x.numerator === 0n)) {
    return <ProjectionGeometry u={first.vector.numeric.value} v={input.components} p={first.vector.numeric.value} r={second.vector.numeric.value} viewport={viewport} metric={metric} />;
  }
  return null;
}

import type { GramSchmidtAnalysis, StageKey, VectorValue } from '../../domain';
import { innerProductPlots, innerInputColor, inputPlotId, PROJECTION_COLOR, RESIDUAL_COLOR, type InnerProductScene } from './innerProductScene';

export function stageLabel(stage: StageKey): string {
  switch (stage.phase) {
    case 'input': return '元の入力';
    case 'projection': return `射影を${stage.count}本引く`;
    case 'residual': return '残差を確認';
    case 'normalize': return '正規化して採用';
    case 'skip': return '零の残差を飛ばす';
    case 'hold': return '計算を保留';
  }
}

/** 解析snapshotから現在段階の値だけ取り出す。数学APIの再呼出し／再計算を行わない。 */
export function gramSchmidtFrame(analysis: GramSchmidtAnalysis, stage: StageKey | null) {
  const step = stage ? analysis.steps.find(item => item.sourceId === stage.inputId) : undefined;
  const count = !stage || stage.phase === 'input' ? 0 : stage.phase === 'projection' ? stage.count : step?.projections.length ?? 0;
  const projections = step?.projections.slice(0, count) ?? [];
  const residual = stage?.phase === 'projection' ? projections.at(-1)?.cumulativeResidual ?? null
    : stage?.phase !== 'input' ? step?.residual ?? null : null;
  const previous = analysis.accepted.filter(item => step?.previousSourceIds.includes(item.sourceId));
  const current = stage?.phase === 'normalize' ? analysis.accepted.find(item => item.sourceId === stage.inputId) : undefined;
  return { step, projections, residual, accepted: current ? [...previous, current] : previous };
}

export function gramSchmidtPlots(scene: InnerProductScene, analysis: GramSchmidtAnalysis, stage: StageKey | null) {
  const frame = gramSchmidtFrame(analysis, stage), base = innerProductPlots(scene, null);
  const derived: VectorValue[] = [], colors: string[] = [];
  let available = true;
  if (scene.showGeometry) {
    for (const item of frame.accepted) {
      derived.push({ id: `inner-q-${item.sourceId}`, name: `q${item.outputIndex}`, coordinates: item.q });
      colors.push(innerInputColor(item.sourceId));
    }
    frame.projections.forEach((item, index) => {
      if (item.vector.numeric.status !== 'ready') { available = false; return; }
      derived.push({ id: `inner-gs-p-${index + 1}`, name: `p${index + 1}`, coordinates: item.vector.numeric.value });
      colors.push(PROJECTION_COLOR);
    });
    if (frame.residual) {
      if (frame.residual.numeric.status === 'ready') {
        derived.push({ id: 'inner-r', name: 'r', coordinates: frame.residual.numeric.value }); colors.push(RESIDUAL_COLOR);
      } else available = false;
    }
  }
  // 一部が保留でも独立に確認済みのqは残す。無効なp/rや後続入力の結果は追加しない。
  const vectors = [...derived, ...base.inputs];
  return { ...base, vectors, colors: [...colors, ...base.colors], derivedAvailable: available,
    safe: vectors.every(vector => vector.coordinates.every(x => Number.isFinite(x) && Math.abs(x) <= 1e6)),
    opaqueIds: [...derived.map(vector => vector.id), ...(stage ? [inputPlotId(stage.inputId)] : [])] };
}

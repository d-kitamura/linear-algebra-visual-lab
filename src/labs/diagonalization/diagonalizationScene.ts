import type { DiagonalizationAnalysis, DiagonalizationInputAnalysis, VectorValue } from '../../domain';
import { editEigenMatrix, setEigenInput, type EigenScene } from '../eigenspace/eigenScene';

/** 13.3は数ベクトル2Dのみ。解析結果・下書き・表示範囲は教材状態と分離する。 */
export interface DiagonalizationScene extends EigenScene {
  readonly order: readonly number[] | null;
}
export function createDiagonalizationScene(): DiagonalizationScene {
  return { kind: 'coordinate', definition: { dimension: 2, matrix: [[4, 1], [0, 2]] },
    input: [1, 2], order: [0, 1], showEigenspace: false };
}
export function editDiagonalizationMatrix(scene: DiagonalizationScene, row: number, column: number, value: number): DiagonalizationScene {
  const next = editEigenMatrix(scene, row, column, value);
  // 新しい行列の自動構成順を使う。旧行列の列対応は引き継がない。
  return next === scene ? scene : { ...next, order: null };
}
export function setDiagonalizationInput(scene: DiagonalizationScene, input: readonly number[]): DiagonalizationScene {
  return { ...setEigenInput(scene, input), order: scene.order };
}
/** nullは再解析後に解決。構成できない場合はnullのまま、できる場合はAPIの基準順。 */
export function resolvedDiagonalizationOrder(scene: DiagonalizationScene, analysis: DiagonalizationAnalysis): readonly number[] | null {
  return analysis.status === 'ready' ? scene.order ?? analysis.basis.order : null;
}

/** 導出値をクリップしない。図単位で判定し、数式・数値は上限を超えても保持する（D-116）。 */
export function canPlotDiagonalization(vectors: readonly VectorValue[]): boolean {
  return vectors.length > 0 && vectors.every((v) => v.coordinates.length === 2 &&
    v.coordinates.every((n) => Number.isFinite(n) && Math.abs(n) <= 1_000_000));
}
export function diagonalizationPlotVectors(result: DiagonalizationInputAnalysis) {
  const reference: VectorValue[] = [
    ...(result.imageVector ? [{ id: 'diagonal-image', name: 'T(u)', coordinates: result.imageVector }] : []),
    { id: 'diagonal-input', name: 'u', coordinates: result.inputVector },
  ];
  const eigenbasis: VectorValue[] = result.status === 'ready' ? [
    { id: 'diagonal-dc', name: 'Dc', coordinates: result.coordinates.imageCoordinatesViaDiagonal },
    { id: 'diagonal-c', name: 'c', coordinates: result.coordinates.inputCoordinates },
  ] : [];
  return { reference, eigenbasis };
}

export function diagonalizationExplanation(analysis: DiagonalizationAnalysis): string {
  if (analysis.status === 'ready') return '実数上で対角化できます。';
  if (analysis.criterion.reason === 'non-real-spectrum') return '実数ではない固有値があるため、実数上では対角化できません。';
  if (analysis.status === 'not-diagonalizable') return '一次独立な実固有ベクトルの本数が不足するため、対角化できません。';
  if (analysis.criterion.status === 'satisfied') return '固有空間の次元条件は満たしますが、基底の構成・検算が数値的に不安定なため保留しています。';
  return analysis.status === 'numerical-failure' ? '数値の表現範囲・演算上限により計算を保留しています。対角化不可という意味ではありません。'
    : '固有値・固有空間を十分に確認できないため、対角化の判定を保留しています。';
}

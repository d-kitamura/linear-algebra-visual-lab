import { analyzeGramSchmidt } from '../../domain';
import { DEFAULT_3D_CAMERA_STATE, InvalidShareStateError, readShareStateFromUrl, validateInnerProductShareState, type InnerProductShareState } from '../../sharing';
import { createInnerProductScene, innerProductMetric, resolveInnerProductStage, stageId } from './innerProductScene';
import { createInnerProductWorkspace, updateActiveInnerSlot, type InnerProductSlot, type InnerProductWorkspace } from './innerProductWorkspace';

/** 確定入力だけを保存。局所編集後の段階退避は画面と同じ規則を使う。 */
export function createInnerProductShareState({ scene, view }: InnerProductSlot): InnerProductShareState {
  if (scene.dimension === 0) return validateInnerProductShareState({ v: 1, lab: 'inner-product', dim: 0, mode: scene.mode });
  const analysis = analyzeGramSchmidt(innerProductMetric(scene.dimension, scene.metric), scene.inputs);
  return validateInnerProductShareState({ v: 1, lab: 'inner-product', dim: scene.dimension, kind: scene.kind, metric: scene.metric,
    inputs: scene.inputs, mode: scene.mode, pair: scene.pair, stage: resolveInnerProductStage(scene.stage, analysis), showGeometry: scene.showGeometry,
    camera: scene.dimension === 3 ? view.camera ?? DEFAULT_3D_CAMERA_STATE : null });
}

/** 外部の段階は修復しない。全検証に成功してから起動時snapshotへ適用する。 */
export function restoreInnerProductWorkspace(input: InnerProductShareState): InnerProductWorkspace {
  const s = validateInnerProductShareState(input);
  if (s.dim === 0) return createInnerProductWorkspace({ ...createInnerProductScene(0), mode: s.mode });
  const scene = { kind: s.kind, dimension: s.dim, metric: s.metric, inputs: s.inputs, mode: s.mode,
    pair: s.pair, stage: s.stage, showGeometry: s.showGeometry };
  const analysis = analyzeGramSchmidt(innerProductMetric(s.dim, s.metric), s.inputs);
  if (s.stage !== null && !analysis.availableStages.some(key => stageId(key) === stageId(s.stage))) {
    throw new InvalidShareStateError('INVALID_STATE', '共有された計算段階は、この入力・順序・内積から再現できません。共有状態を適用せず初期例を表示します。', '$.stage');
  }
  return updateActiveInnerSlot(createInnerProductWorkspace(scene), slot => ({ ...slot, view: { plane: null, line: null, camera: s.camera } }));
}

/** 他LabのURLではGSを計算しない。共有後の編集・再共有もこの初期値を変更しない。 */
export function createInnerProductInitialization(href: string): { readonly initialWorkspace: InnerProductWorkspace; readonly errorMessage: string | null } {
  const result = readShareStateFromUrl(href);
  if (result.status === 'success' && result.state.lab === 'inner-product') {
    try { return { initialWorkspace: restoreInnerProductWorkspace(result.state), errorMessage: null }; }
    catch (error) { return { initialWorkspace: createInnerProductWorkspace(), errorMessage: error instanceof Error ? error.message : '共有状態を復元できませんでした。' }; }
  }
  return { initialWorkspace: createInnerProductWorkspace(), errorMessage: result.status === 'error' ? result.error.message : null };
}

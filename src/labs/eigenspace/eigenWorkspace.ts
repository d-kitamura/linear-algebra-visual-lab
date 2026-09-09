import type { EigenMapDefinition } from '../../domain';
import type { SharedCameraState } from '../../sharing';
import type { LineViewport, PlaneViewport } from '../../visualization';
import { createEigenScene, createEigenSceneForDimension, type EigenScene } from './eigenScene';
import { createEigenPolynomialScene, type EigenPolynomialDimension } from './eigenPolynomial';

export type EigenDimension = EigenMapDefinition['dimension'];
export interface EigenView {
  readonly plane: PlaneViewport | null;
  readonly line: LineViewport | null;
  readonly camera: SharedCameraState | null;
}
export interface EigenSlot { readonly scene: EigenScene; readonly view: EigenView }
export interface EigenWorkspace {
  readonly kind: EigenScene['kind'];
  readonly dimension: EigenDimension;
  readonly lastPolynomialDimension: EigenPolynomialDimension;
  readonly slots: Readonly<Record<EigenDimension, EigenSlot>>;
  readonly polynomialSlots: Readonly<Record<EigenPolynomialDimension, EigenSlot>>;
}
const emptyView = (): EigenView => ({ plane: null, line: null, camera: null });
export function createEigenWorkspace(initialScene: EigenScene = createEigenScene()): EigenWorkspace {
  const slot = (n: EigenDimension): EigenSlot => ({ scene: createEigenSceneForDimension(n), view: emptyView() });
  const polynomialSlot = (n: EigenPolynomialDimension): EigenSlot => ({ scene: createEigenPolynomialScene(n), view: emptyView() });
  const workspace: EigenWorkspace = { kind: initialScene.kind, dimension: initialScene.definition.dimension,
    lastPolynomialDimension: initialScene.kind === 'polynomial' && initialScene.definition.dimension !== 0 ? initialScene.definition.dimension : 2,
    slots: {
    0: slot(0), 1: slot(1), 2: slot(2), 3: slot(3),
  }, polynomialSlots: { 1: polynomialSlot(1), 2: polynomialSlot(2), 3: polynomialSlot(3) } };
  return updateEigenSlot(workspace, workspace.dimension, () => ({ scene: initialScene, view: emptyView() }));
}
export function selectEigenDimension(workspace: EigenWorkspace, dimension: EigenDimension): EigenWorkspace {
  if (workspace.kind === 'polynomial' && dimension === 0) return workspace;
  return { ...workspace, dimension, lastPolynomialDimension: workspace.kind === 'polynomial' && dimension !== 0 ? dimension : workspace.lastPolynomialDimension };
}
export function selectEigenKind(workspace: EigenWorkspace, kind: EigenScene['kind']): EigenWorkspace {
  if (workspace.kind === kind) return workspace;
  return selectEigenDimension({ ...workspace, kind }, kind === 'polynomial' && workspace.dimension === 0 ? workspace.lastPolynomialDimension : workspace.dimension);
}
export function currentEigenSlot(workspace: EigenWorkspace): EigenSlot {
  if (workspace.kind === 'polynomial') {
    if (workspace.dimension === 0) throw new RangeError('0Dの多項式場面はありません。');
    return workspace.polynomialSlots[workspace.dimension];
  }
  return workspace.slots[workspace.dimension];
}
export function updateEigenSlot(workspace: EigenWorkspace, dimension: EigenDimension, change: (slot: EigenSlot) => EigenSlot, kind = workspace.kind): EigenWorkspace {
  if (kind === 'polynomial') {
    if (dimension === 0) throw new RangeError('0Dの多項式場面はありません。');
    return { ...workspace, polynomialSlots: { ...workspace.polynomialSlots, [dimension]: change(workspace.polynomialSlots[dimension]) } };
  }
  return { ...workspace, slots: { ...workspace.slots, [dimension]: change(workspace.slots[dimension]) } };
}
/** Resetは現在の次元だけ。ほかの次元の教材・手動範囲・カメラは変更しない。 */
export function resetEigenWorkspace(workspace: EigenWorkspace, initial: EigenWorkspace): EigenWorkspace {
  const initialSlot = currentEigenSlot({ ...initial, kind: workspace.kind, dimension: workspace.dimension });
  return updateEigenSlot(workspace, workspace.dimension, () => initialSlot);
}

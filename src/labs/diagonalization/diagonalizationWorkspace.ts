import type { SharedCameraState } from '../../sharing';
import type { LineViewport, PlaneViewport } from '../../visualization';
import { createDiagonalizationPolynomialScene, createDiagonalizationScene, type DiagonalizationScene } from './diagonalizationScene';
import type { EigenPolynomialDimension } from '../eigenspace/eigenPolynomial';

export type DiagonalizationDimension = DiagonalizationScene['definition']['dimension'];
export interface DiagonalizationView {
  readonly plane: PlaneViewport | null;
  readonly line: LineViewport | null;
  readonly camera: SharedCameraState | null;
}
export interface DiagonalizationSlot {
  readonly scene: DiagonalizationScene;
  readonly views: { readonly reference: DiagonalizationView; readonly eigenbasis: DiagonalizationView };
}
export interface DiagonalizationWorkspace {
  readonly kind: DiagonalizationScene['kind'];
  readonly dimension: DiagonalizationDimension;
  readonly lastPolynomialDimension: EigenPolynomialDimension;
  readonly slots: Readonly<Record<DiagonalizationDimension, DiagonalizationSlot>>;
  readonly polynomialSlots: Readonly<Record<EigenPolynomialDimension, DiagonalizationSlot>>;
}
const emptyView = (): DiagonalizationView => ({ plane: null, line: null, camera: null });
const slot = (scene: DiagonalizationScene): DiagonalizationSlot => ({ scene, views: { reference: emptyView(), eigenbasis: emptyView() } });
/** 数ベクトル4場面と多項式3場面を分離。解析値や入力下書きは保存しない。 */
export function createDiagonalizationWorkspace(initialScene = createDiagonalizationScene()): DiagonalizationWorkspace {
  if (initialScene.kind === 'polynomial' && initialScene.definition.dimension === 0) throw new RangeError('多項式は1〜3次元です。');
  const workspace: DiagonalizationWorkspace = { kind: initialScene.kind, dimension: initialScene.definition.dimension,
    lastPolynomialDimension: initialScene.kind === 'polynomial' ? initialScene.definition.dimension as EigenPolynomialDimension : 2, slots: {
    0: slot(createDiagonalizationScene(0)), 1: slot(createDiagonalizationScene(1)),
    2: slot(createDiagonalizationScene(2)), 3: slot(createDiagonalizationScene(3)),
  }, polynomialSlots: { 1: slot(createDiagonalizationPolynomialScene(1)), 2: slot(createDiagonalizationPolynomialScene(2)), 3: slot(createDiagonalizationPolynomialScene(3)) } };
  return updateDiagonalizationSlot(workspace, workspace.dimension, () => slot(initialScene));
}
export function diagonalizationCurrentSlot(workspace: DiagonalizationWorkspace): DiagonalizationSlot {
  return workspace.kind === 'coordinate' ? workspace.slots[workspace.dimension] : workspace.polynomialSlots[workspace.dimension as EigenPolynomialDimension];
}
export function selectDiagonalizationKind(workspace: DiagonalizationWorkspace, kind: DiagonalizationScene['kind']): DiagonalizationWorkspace {
  const dimension = kind === 'polynomial' && workspace.dimension === 0 ? workspace.lastPolynomialDimension : workspace.dimension;
  return { ...workspace, kind, dimension, lastPolynomialDimension: kind === 'polynomial' ? dimension as EigenPolynomialDimension : workspace.lastPolynomialDimension };
}
export function selectDiagonalizationDimension(workspace: DiagonalizationWorkspace, dimension: DiagonalizationDimension): DiagonalizationWorkspace {
  if (workspace.kind === 'polynomial' && dimension === 0) return workspace;
  return { ...workspace, dimension, lastPolynomialDimension: workspace.kind === 'polynomial' ? dimension as EigenPolynomialDimension : workspace.lastPolynomialDimension };
}
export function updateDiagonalizationSlot(workspace: DiagonalizationWorkspace, dimension: DiagonalizationDimension,
  change: (slot: DiagonalizationSlot) => DiagonalizationSlot, kind = workspace.kind): DiagonalizationWorkspace {
  if (kind === 'polynomial') {
    if (dimension === 0) return workspace;
    return { ...workspace, polynomialSlots: { ...workspace.polynomialSlots, [dimension]: change(workspace.polynomialSlots[dimension]) } };
  }
  return { ...workspace, slots: { ...workspace.slots, [dimension]: change(workspace.slots[dimension]) } };
}
export function resetDiagonalizationWorkspace(workspace: DiagonalizationWorkspace, initial: DiagonalizationWorkspace): DiagonalizationWorkspace {
  return updateDiagonalizationSlot(workspace, workspace.dimension, () => diagonalizationCurrentSlot({ ...initial, kind: workspace.kind, dimension: workspace.dimension }));
}

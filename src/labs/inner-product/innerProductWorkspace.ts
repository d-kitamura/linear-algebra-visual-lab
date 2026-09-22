import type { SharedCameraState } from '../../sharing';
import type { LineViewport, PlaneViewport } from '../../visualization';
import { createInnerProductScene, type InnerProductKind, type InnerProductDimension, type InnerProductScene } from './innerProductScene';

export interface InnerProductView { readonly plane: PlaneViewport | null; readonly line: LineViewport | null; readonly camera: SharedCameraState | null }
export interface InnerProductSlot { readonly scene: InnerProductScene; readonly view: InnerProductView }
export interface InnerProductWorkspace {
  readonly kind: InnerProductKind;
  readonly dimension: InnerProductDimension;
  readonly slots: Readonly<Record<InnerProductDimension, InnerProductSlot>>;
  readonly polynomialSlots: Readonly<Record<1 | 2 | 3, InnerProductSlot>>;
  readonly lastDimensions: Readonly<Record<InnerProductKind, InnerProductDimension>>;
}
export function createInnerProductWorkspace(initial = createInnerProductScene()): InnerProductWorkspace {
  const slots = Object.fromEntries(([0, 1, 2, 3] as const).map(dimension => [dimension, {
    scene: initial.kind === 'coordinate' && dimension === initial.dimension ? initial : createInnerProductScene(dimension), view: { plane: null, line: null, camera: null },
  }])) as Record<InnerProductDimension, InnerProductSlot>;
  const polynomialSlots = Object.fromEntries(([1, 2, 3] as const).map(dimension => [dimension, {
    scene: initial.kind === 'polynomial' && dimension === initial.dimension ? initial : createInnerProductScene(dimension, 'polynomial'), view: { plane: null, line: null, camera: null },
  }])) as Record<1 | 2 | 3, InnerProductSlot>;
  return { kind: initial.kind, dimension: initial.dimension, slots, polynomialSlots, lastDimensions: { coordinate: 2, polynomial: 2, [initial.kind]: initial.dimension } };
}
export function updateInnerProductSlot(workspace: InnerProductWorkspace, dimension: InnerProductDimension, update: (slot: InnerProductSlot) => InnerProductSlot): InnerProductWorkspace {
  return { ...workspace, slots: { ...workspace.slots, [dimension]: update(workspace.slots[dimension]) } };
}
export function resetInnerProductWorkspace(workspace: InnerProductWorkspace, initial: InnerProductWorkspace): InnerProductWorkspace {
  return updateActiveInnerSlot(workspace, () => workspace.kind === 'coordinate' ? initial.slots[workspace.dimension] : initial.polynomialSlots[workspace.dimension as 1 | 2 | 3]);
}
export const activeInnerSlot = (w: InnerProductWorkspace) => w.kind === 'coordinate' ? w.slots[w.dimension] : w.polynomialSlots[w.dimension as 1 | 2 | 3];
export function updateActiveInnerSlot(w: InnerProductWorkspace, update: (slot: InnerProductSlot) => InnerProductSlot): InnerProductWorkspace {
  return w.kind === 'coordinate' ? updateInnerProductSlot(w, w.dimension, update)
    : { ...w, polynomialSlots: { ...w.polynomialSlots, [w.dimension]: update(activeInnerSlot(w)) } };
}
export function selectInnerScene(w: InnerProductWorkspace, kind: InnerProductKind, dimension = w.lastDimensions[kind]): InnerProductWorkspace {
  if (kind === 'polynomial' && dimension === 0) dimension = 2;
  return { ...w, kind, dimension, lastDimensions: { ...w.lastDimensions, [w.kind]: w.dimension, [kind]: dimension } };
}
/** 内積変更後の図をfitする。3Dの向きは保持し、中心とズームだけ戻す。 */
export function fitInnerProductView(view: InnerProductView): InnerProductView {
  return { plane: null, line: null, camera: view.camera ? { ...view.camera, target: [0, 0, 0], zoom: 1 } : null };
}

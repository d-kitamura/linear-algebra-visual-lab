import type { SharedCameraState } from '../../sharing';
import type { LineViewport, PlaneViewport } from '../../visualization';
import { createInnerProductScene, type InnerProductDimension, type InnerProductScene } from './innerProductScene';

export interface InnerProductView { readonly plane: PlaneViewport | null; readonly line: LineViewport | null; readonly camera: SharedCameraState | null }
export interface InnerProductSlot { readonly scene: InnerProductScene; readonly view: InnerProductView }
export interface InnerProductWorkspace {
  readonly dimension: InnerProductDimension;
  readonly slots: Readonly<Record<InnerProductDimension, InnerProductSlot>>;
}
export function createInnerProductWorkspace(initial = createInnerProductScene()): InnerProductWorkspace {
  const slots = Object.fromEntries(([0, 1, 2, 3] as const).map(dimension => [dimension, {
    scene: dimension === initial.dimension ? initial : createInnerProductScene(dimension), view: { plane: null, line: null, camera: null },
  }])) as Record<InnerProductDimension, InnerProductSlot>;
  return { dimension: initial.dimension, slots };
}
export function updateInnerProductSlot(workspace: InnerProductWorkspace, dimension: InnerProductDimension, update: (slot: InnerProductSlot) => InnerProductSlot): InnerProductWorkspace {
  return { ...workspace, slots: { ...workspace.slots, [dimension]: update(workspace.slots[dimension]) } };
}
export function resetInnerProductWorkspace(workspace: InnerProductWorkspace, initial: InnerProductWorkspace): InnerProductWorkspace {
  return updateInnerProductSlot(workspace, workspace.dimension, () => initial.slots[workspace.dimension]);
}

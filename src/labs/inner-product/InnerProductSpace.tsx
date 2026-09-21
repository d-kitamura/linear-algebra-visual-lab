import { useMemo } from 'react';
import type { GramSchmidtAnalysis, PairAnalysis, StageKey, VectorValue } from '../../domain';
import type { SharedCameraState } from '../../sharing';
import { VectorSpace3D } from '../../visualization/VectorSpace3D';
import { createSpaceExtent } from '../../visualization/spaceGeometry';
import { gramSchmidtPlots } from './gramSchmidtPresentation';
import { innerProductPlots, resolveInnerProductStage, type InnerProductScene } from './innerProductScene';
import { innerSpacePreviews, innerSpaceSegments, innerSpaceVectorPool, snapInnerSpaceInput } from './innerProductSpaceGeometry';

const EMPTY: readonly VectorValue[] = [];
const NOOP = () => {};
type Point = readonly [number, number, number];
export default function InnerProductSpace({ scene, committedGs, committedResult, plots, gs, stage, result, camera, disabled, onCameraChange, onPreview, onCommit }: {
  readonly scene: InnerProductScene; readonly committedGs: GramSchmidtAnalysis; readonly committedResult: PairAnalysis | null;
  readonly plots: ReturnType<typeof innerProductPlots>; readonly gs: GramSchmidtAnalysis; readonly stage: StageKey | null; readonly result: PairAnalysis | null;
  readonly camera: SharedCameraState | null; readonly disabled: boolean; readonly onCameraChange: (camera: SharedCameraState) => void;
  readonly onPreview: (id: string, coordinates: Point | null) => void; readonly onCommit: (id: string, coordinates: Point) => void;
}) {
  // 確定状態だけでThreeの構築用配列を作る。previewを依存にするとドラッグ途中にruntimeが破棄される。
  const committedPlots = useMemo(() => scene.mode === 'pair' ? innerProductPlots(scene, committedResult)
    : gramSchmidtPlots(scene, committedGs, resolveInnerProductStage(scene.stage, committedGs)), [scene, committedGs, committedResult]);
  const pool = useMemo(() => innerSpaceVectorPool(committedPlots), [committedPlots]);
  const editableIds = useMemo(() => disabled ? [] : committedPlots.editableIds, [disabled, committedPlots]);
  const previews = useMemo(() => innerSpacePreviews(plots), [plots]);
  const extent = useMemo(() => createSpaceExtent(pool.vectors), [pool]);
  const segments = useMemo(() => scene.showGeometry ? innerSpaceSegments(scene.mode, result, gs, stage, extent.halfRange) : [], [scene.showGeometry, scene.mode, result, gs, stage, extent]);
  return <VectorSpace3D idPrefix="inner-product-space" active resetKey={0} vectors={pool.vectors} colors={pool.colors}
    spanVectors={EMPTY} spanRank={0} showSpan={false} editableVectorIds={editableIds} vectorCoordinatePreview={previews}
    auxiliarySegments={segments} visibleVectorCount={plots.vectors.length} camera={camera} onCameraChange={onCameraChange}
    onVectorCoordinatesPreview={onPreview} onVectorCoordinatesCommit={onCommit} onVectorCoordinatesSnap={snapInnerSpaceInput}
    vectorDragDescription="元の入力ベクトルの矢先をドラッグすると画面内で移動します。原点に近づくと表示幅の3%以内で吸着します。導出ベクトルは編集しません。背景のドラッグで視点を回転できます。"
    linearCombinationVisible={false} linearCombinationTarget={null} linearCombinationCoefficients={null}
    onLinearCombinationTargetPlacement={NOOP} onLinearCombinationVisibility={NOOP} showLinearCombinationControl={false} showHeading={false} showHelpText={false}
    assistiveDescription="成分入力と解析タブで、内積、射影、残差、正規直交化の各段階を確認できます。"
    unavailableFallbackDescription="成分入力、解析タブ、Resetはそのまま利用できます。" />;
}

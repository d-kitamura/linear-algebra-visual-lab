import { useMemo } from 'react';
import type { GramSchmidtAnalysis, PairAnalysis, StageKey, VectorValue } from '../../domain';
import type { SharedCameraState } from '../../sharing';
import { VectorSpace3D } from '../../visualization/VectorSpace3D';
import { createSpaceExtent } from '../../visualization/spaceGeometry';
import { gramSchmidtPlots } from './gramSchmidtPresentation';
import { innerProductPlots, innerProductMetric, resolveInnerProductStage, type InnerProductScene } from './innerProductScene';
import { innerDisplayPlots } from './innerProductCoordinates';
import { innerSpacePreviews, innerSpaceSegments, innerSpaceVectorPool, createInnerSpaceDragGuard } from './innerProductSpaceGeometry';

const EMPTY: readonly VectorValue[] = [];
const NOOP = () => {};
type Point = readonly [number, number, number];
export default function InnerProductSpace({ scene, committedGs, committedResult, plots, gs, stage, result, camera, disabled, onCameraChange, onPreview, onCommit, onRejected }: {
  readonly scene: InnerProductScene; readonly committedGs: GramSchmidtAnalysis; readonly committedResult: PairAnalysis | null;
  readonly plots: ReturnType<typeof innerProductPlots>; readonly gs: GramSchmidtAnalysis; readonly stage: StageKey | null; readonly result: PairAnalysis | null;
  readonly camera: SharedCameraState | null; readonly disabled: boolean; readonly onCameraChange: (camera: SharedCameraState) => void;
  readonly onPreview: (id: string, coordinates: Point | null) => void; readonly onCommit: (id: string, coordinates: Point) => void;
  readonly onRejected?: () => void;
}) {
  // 確定状態だけでThreeの構築用配列を作る。previewを依存にするとドラッグ途中にruntimeが破棄される。
  const metric = innerProductMetric(scene.dimension, scene.metric);
  const committedPlots = useMemo(() => innerDisplayPlots(scene, scene.mode === 'pair' ? innerProductPlots(scene, committedResult)
    : gramSchmidtPlots(scene, committedGs, resolveInnerProductStage(scene.stage, committedGs))), [scene, committedGs, committedResult]);
  // 不正な逆変換候補は描画前に直前の有効な図座標へ戻す。式と矢印を別状態にしない。
  const dragGuard = useMemo(() => createInnerSpaceDragGuard(scene, committedPlots.inputs), [scene, committedPlots]);
  const pool = useMemo(() => innerSpaceVectorPool(committedPlots), [committedPlots]);
  const editableIds = useMemo(() => disabled ? [] : committedPlots.editableIds, [disabled, committedPlots]);
  const previews = useMemo(() => innerSpacePreviews(plots), [plots]);
  const extent = useMemo(() => createSpaceExtent(pool.vectors), [pool]);
  const segments = useMemo(() => scene.showGeometry ? innerSpaceSegments(scene.mode, result, gs, stage, extent.halfRange, metric) : [], [scene.showGeometry, scene.mode, result, gs, stage, extent, metric]);
  return <VectorSpace3D idPrefix="inner-product-space" active resetKey={0} vectors={pool.vectors} colors={pool.colors}
    spanVectors={EMPTY} spanRank={0} showSpan={false} editableVectorIds={editableIds} vectorCoordinatePreview={previews}
    auxiliarySegments={segments} visibleVectorCount={plots.vectors.length} camera={camera} onCameraChange={onCameraChange}
    axisLabels={metric.axes as readonly [string, string, string]} spaceTitle={scene.kind === 'polynomial' ? '内積を反映した3次元座標' : '3次元座標空間'}
    onVectorCoordinatesPreview={(id, coordinates) => {
      if (coordinates === null) { dragGuard.reset(); onPreview(id, null); }
      else if (!dragGuard.rejected) onPreview(id, coordinates);
    }} onVectorCoordinatesCommit={onCommit} onVectorCoordinatesSnap={(id, coordinates, distance) => {
      const candidate = dragGuard.snap(id, coordinates, distance);
      if (dragGuard.rejected) onRejected?.();
      return candidate;
    }}
    vectorDragDescription="元の入力ベクトルの矢先をドラッグすると画面内で移動します。原点に近づくと表示幅の3%以内で吸着します。導出ベクトルは編集しません。背景のドラッグで視点を回転できます。"
    linearCombinationVisible={false} linearCombinationTarget={null} linearCombinationCoefficients={null}
    onLinearCombinationTargetPlacement={NOOP} onLinearCombinationVisibility={NOOP} showLinearCombinationControl={false} showHeading={false} showHelpText={false}
    assistiveDescription={scene.kind === 'polynomial'
      ? '多項式の関数グラフではなく、選択した内積を反映した座標です。元の標準単項式係数は入力欄、多項式・内積・射影・残差・正規直交化の各段階は解析タブで確認できます。'
      : '成分入力と解析タブで、内積、射影、残差、正規直交化の各段階を確認できます。'}
    unavailableFallbackDescription="成分入力、解析タブ、Resetはそのまま利用できます。" />;
}

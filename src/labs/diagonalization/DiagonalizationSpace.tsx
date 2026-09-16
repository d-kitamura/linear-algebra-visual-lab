import { useMemo } from 'react';
import type { DiagonalizationAnalysis, DiagonalizationInputAnalysis, VectorValue } from '../../domain';
import type { SharedCameraState } from '../../sharing';
import { VectorSpace3D, type VectorCoordinatePreview } from '../../visualization/VectorSpace3D';
import { createEigenSpaceGeometries, snapEigenSpaceInput } from '../eigenspace/eigenScene';
import type { DiagonalizationScene } from './diagonalizationScene';

const COLORS = ['#ce5135', '#245b8d'];
const EMPTY: readonly VectorValue[] = [];
const READ_ONLY: string[] = [], EDITABLE = ['diagonal-input'];
const OPAQUE = ['diagonal-input', 'diagonal-image', 'diagonal-c', 'diagonal-dc'];
const RIGHT_AXES: readonly [string, string, string] = ['c₁', 'c₂', 'c₃'];
const POLYNOMIAL_AXES: readonly [string, string, string] = ['b₀', 'b₁', 'b₂'];
const NOOP = () => {};

/** 確定値だけをThree.jsの構築入力に使い、ドラッグ中の導出値は差替え専用経路へ渡す。 */
export function DiagonalizationSpace({ side, scene, analysis, committed, current, hasPreview, camera, invalid,
  onCamera, onPreview, onCommit }: {
  readonly side: 'reference' | 'eigenbasis';
  readonly scene: DiagonalizationScene;
  readonly analysis: DiagonalizationAnalysis;
  readonly committed: DiagonalizationInputAnalysis;
  readonly current: DiagonalizationInputAnalysis;
  readonly hasPreview: boolean;
  readonly camera: SharedCameraState | null;
  readonly invalid: boolean;
  readonly onCamera: (camera: SharedCameraState) => void;
  readonly onPreview: (coordinates: readonly [number, number, number] | null) => void;
  readonly onCommit: (coordinates: readonly [number, number, number]) => void;
}) {
  const left = side === 'reference';
  const vectors = useMemo(() => left ? [
    // 数値化失敗時の像は固定IDの受け皿だけ作り、下のnull previewで非表示にする。
    { id: 'diagonal-image', name: 'T(u)', coordinates: committed.imageVector ?? [0, 0, 0] },
    { id: 'diagonal-input', name: 'u', coordinates: committed.inputVector },
  ] : [
    { id: 'diagonal-dc', name: 'Dc', coordinates: committed.coordinates?.imageCoordinatesViaDiagonal ?? [0, 0, 0] },
    { id: 'diagonal-c', name: 'c', coordinates: committed.coordinates?.inputCoordinates ?? [0, 0, 0] },
  ], [left, committed]);
  const groups = useMemo(() => createEigenSpaceGeometries(analysis.eigenAnalysis).map((g) => ({
    vectors: g.vectors, rank: g.dimension, label: `固有空間${g.index + 1}`,
  })), [analysis]);
  const preview = useMemo(() => diagonalizationSpacePreview(side, committed, current, hasPreview), [side, hasPreview, current, committed]);
  return <VectorSpace3D idPrefix={`diagonalization-${side}-space`} vectors={vectors} colors={COLORS}
    spanVectors={left ? groups[0]?.vectors ?? EMPTY : EMPTY} spanRank={left ? groups[0]?.rank ?? 0 : 0}
    spanGroups={left ? groups : undefined} showSpan={left && scene.showEigenspace} spanLabel="固有空間"
    editableVectorIds={left && !invalid ? EDITABLE : READ_ONLY} alwaysOpaqueVectorIds={OPAQUE}
    snapEditableVectorsToSpan={left} vectorCoordinatePreview={preview}
    axisLabels={left ? scene.kind === 'polynomial' ? POLYNOMIAL_AXES : undefined : RIGHT_AXES} camera={camera} onCameraChange={onCamera} active resetKey={0}
    onVectorCoordinatesPreview={left ? (_, coordinates) => onPreview(coordinates) : undefined}
    onVectorCoordinatesCommit={left ? (_, coordinates) => onCommit(coordinates) : NOOP}
    onVectorCoordinatesSnap={left ? (_, coordinates, distance) => snapEigenSpaceInput(scene, analysis.eigenAnalysis, coordinates, distance) : undefined}
    linearCombinationVisible={false} linearCombinationTarget={null} linearCombinationCoefficients={null}
    onLinearCombinationTargetPlacement={NOOP} onLinearCombinationVisibility={NOOP}
    showLinearCombinationControl={false} showHeading={false} showHelpText={false}
    spaceTitle={left ? scene.kind === 'polynomial' ? '標準単項式基底での係数' : '基準基底での表示' : '固有ベクトル基底での座標'}
    assistiveDescription={left ? scene.kind === 'polynomial' ? '標準単項式基底に関する入力と像の係数空間。関数グラフではありません。入力の矢先と数値入力から変更できます。' : '基準座標の入力と像。入力の矢先と数値入力から変更できます。' : '同じ入力と像の固有基底座標cとDc。矢先は編集せず、視点だけ変更できます。'}
    unavailableFallbackDescription="3Dを利用できなくても、下の行列・入力編集、解析タブ、Resetは利用できます。" />;
}

/** null座標は「隠す」、配列自体のnullは「確定表示へ戻す」。偽の零座標に置換しない。 */
export function diagonalizationSpacePreview(side: 'reference' | 'eigenbasis', committed: DiagonalizationInputAnalysis,
  current: DiagonalizationInputAnalysis, hasPreview: boolean): readonly VectorCoordinatePreview[] | null {
  const point = (values: readonly number[] | null | undefined) => (values ?? null) as readonly [number, number, number] | null;
  if (side === 'reference') return hasPreview || committed.imageVector === null
    ? [{ vectorId: 'diagonal-image', coordinates: point(current.imageVector) }] : null;
  return hasPreview || committed.coordinates === null ? [
    { vectorId: 'diagonal-c', coordinates: point(current.coordinates?.inputCoordinates) },
    { vectorId: 'diagonal-dc', coordinates: point(current.coordinates?.imageCoordinatesViaDiagonal) },
  ] : null;
}

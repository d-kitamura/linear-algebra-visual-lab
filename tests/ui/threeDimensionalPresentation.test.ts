import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(
  new URL('../../src/visualization/VectorSpace3D.tsx', import.meta.url),
  'utf8',
);
const appSource = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');

describe('固定3D表示とカメラ操作', () => {
  it('正投影カメラとオンデマンド描画を使う', () => {
    expect(componentSource).toContain('new THREE.OrthographicCamera');
    expect(componentSource).not.toContain('PerspectiveCamera');
    expect(componentSource).toContain("controls.addEventListener('change', handleControlsChange)");
    expect(componentSource).toContain("controls.addEventListener('end', emitCameraChange)");
    expect(componentSource).not.toContain('setAnimationLoop');
  });

  it('等角・正面・右・上・全体表示をキーボード操作可能なボタンで提供する', () => {
    for (const label of ['正面', '右', '上', '等角', '全体を表示']) {
      expect(componentSource).toContain(label);
    }
    expect(componentSource).toContain('aria-label="3D視点プリセット"');
  });

  it('右手座標系のx・y・z軸とベクトルラベルを表示する', () => {
    expect(componentSource).toContain("addAxis(scene, 'x'");
    expect(componentSource).toContain("addAxis(scene, 'y'");
    expect(componentSource).toContain("addAxis(scene, 'z'");
    expect(componentSource).toContain('splitVectorName(name)');
    expect(cssSource).toMatch(/\.space-vector-label-base\s*\{[^}]*font-style:\s*italic;/su);
    expect(cssSource).toMatch(/\.space-vector-label sub\s*\{[^}]*font-style:\s*normal;/su);
  });

  it('モバイル操作をCanvas内に保持し、常時描画しない', () => {
    expect(componentSource).toContain('THREE.TOUCH.ROTATE');
    expect(componentSource).toContain('THREE.TOUCH.DOLLY_PAN');
    expect(cssSource).toMatch(/\.three-dimensional-canvas\s*\{[^}]*touch-action:\s*none;/su);
  });

  it('リサイズ・高DPI・WebGL喪失・破棄を扱う', () => {
    expect(componentSource).toContain('new ResizeObserver(resize)');
    expect(componentSource).toContain('Math.min(window.devicePixelRatio || 1, 2)');
    expect(componentSource).toContain("addEventListener('webglcontextlost'");
    expect(componentSource).toContain('disposeScene(scene)');
    expect(componentSource).toContain('renderer.dispose()');
  });

  it('Canvasを利用できない場合も数値と解析結果へ案内する', () => {
    expect(componentSource).toContain('id="space-3d-canvas-alternative"');
    expect(componentSource).toContain('aria-describedby="space-3d-canvas-alternative"');
    expect(componentSource).toContain('3D図形は補助的な可視化です。');
    expect(componentSource).toContain('数値入力と解析カード、共有URL、Resetはそのまま利用できます。');
  });

  it('3D状態とResetを固定3D表示へ接続する', () => {
    expect(appSource).toContain('<VectorSpace3D');
    expect(appSource).toContain("await import('../visualization/VectorSpace3D')");
    expect(appSource).toContain('hasActivatedThreeDimensions');
    expect(appSource).toContain('vectors={threeDimensionalState.vectors}');
    expect(appSource).toContain('resetKey={threeDimensionalCameraResetKey}');
    expect(appSource).toContain('camera={threeDimensionalState.visualization.camera}');
    expect(appSource).toContain('onCameraChange={handleThreeDimensionalCameraChange}');
  });

  it('3Dの数値編集・集合編集・数学カードを接続する', () => {
    expect(appSource).toContain('ThreeDimensionalVectorEditor');
    expect(appSource).toContain('handleThreeDimensionalCoordinateChange');
    expect(appSource).toContain('handleThreeDimensionalAddVector');
    expect(appSource).toContain('handleThreeDimensionalRemoveVector');
    expect(appSource).toContain('threeDimensionalSpanAnalysis');
    expect(appSource).toContain('threeDimensionalAnalysis');
    expect(appSource).toContain('handleThreeDimensionalShowSpan');
    expect(appSource).toContain('showSpan={threeDimensionalState.visualization.showSpan}');
  });

  it('rank 3の生成空間を半透明の立方体アイコンで表す', () => {
    expect(appSource).toContain('spanAnalysis.rank === 3');
    expect(appSource).toContain('className="span-cube-icon"');
    expect(appSource).toContain('className="span-cube-face span-cube-face-top"');
    expect(appSource).toContain('className="span-cube-hidden-edges"');
    expect(appSource).not.toContain('className="span-cube-pip"');
    expect(cssSource).toMatch(/\.span-cube-icon\s*\{[^}]*width:\s*46px;/su);
    expect(cssSource).toMatch(/\.span-cube-hidden-edges\s*\{[^}]*stroke-dasharray:/su);
  });

  it('rank 0〜3のspan幾何を中立色で描画する', () => {
    expect(componentSource).toContain('addSpanGeometry(spanGeometryGroup, spanVectors, spanRank, extent)');
    expect(componentSource).toContain("case 'origin'");
    expect(componentSource).toContain("case 'line'");
    expect(componentSource).toContain("case 'plane'");
    expect(componentSource).toContain("case 'space'");
    expect(componentSource).toContain("const SPAN_COLOR = '#737b82'");
    expect(componentSource).toContain('side: THREE.DoubleSide');
    expect(componentSource).toContain('new THREE.LineDashedMaterial');
    expect(componentSource).toContain('const fill = new THREE.Mesh(boxGeometry, fillMaterial)');
    expect(componentSource).not.toContain('addSpanPlaneGrid');
    expect(componentSource).toContain('space-span-rank-three-label');
  });

  it('3Dターゲットの数値入力・解析・共有状態を一次結合タブへ接続する', () => {
    expect(appSource).toContain("{ id: 'combination', label: '一次結合'");
    expect(appSource).toContain('threeDimensionalTargetCoordinateDrafts');
    expect(appSource).toContain('threeDimensionalLinearCombinationAnalysis');
    expect(appSource).toContain('handleThreeDimensionalTargetCoordinateChange');
    expect(appSource).toContain('inputIdPrefix="3d-"');
    expect(appSource).toContain('ambientDimension={3}');
    expect(componentSource).toContain('一次結合を調べる');
  });

  it('一次結合モードの短い背景タップから原点を通る画面平行面上へターゲットを配置する', () => {
    expect(componentSource).toContain('TARGET_TAP_MOVEMENT_THRESHOLD = 8');
    expect(componentSource).toContain('PendingTargetPlacement');
    expect(componentSource).toContain('const finishTargetPlacement');
    expect(componentSource).toContain('setFromNormalAndCoplanarPoint(\n      viewDirection,\n      ORIGIN');
    expect(componentSource).toContain('coordinatesFromWorldPoint(targetPoint)');
    expect(componentSource).toContain('背景を短くタップ：ターゲット v を配置');
    expect(appSource).toContain('handleThreeDimensionalTargetPlacement');
    expect(appSource).toContain('onLinearCombinationTargetPlacement');
    expect(cssSource).toMatch(/\.three-dimensional-canvas\.is-target-placement-mode\s*\{[^}]*cursor:\s*crosshair;/su);
  });

  it('3Dターゲットと2項・3項の係数幾何を描画する', () => {
    expect(componentSource).toContain('createSpaceCombinationGeometry');
    expect(componentSource).toContain('addSpaceCombinationGeometry');
    expect(componentSource).toContain('addTargetVector');
    expect(componentSource).toContain("geometry.kind === 'parallelogram'");
    expect(componentSource).toContain('space-combination-term-label');
    expect(appSource).toContain('平行六面体');
    expect(appSource).toContain('4本以上の係数は3D図形へ一意に対応させず');
  });

  it('通常ベクトルと係数付きベクトルのラベルを矢先の反対側へ離して配置する', () => {
    expect(componentSource).toContain('VECTOR_LABEL_CENTERS');
    expect(componentSource).toContain('COMBINATION_LABEL_CENTERS');
    expect(componentSource).toContain('label.center.set(centerX, centerY)');
    expect(cssSource).toMatch(/\.space-vector-label\s*\{[^}]*background:\s*color-mix\([^;]*66%/su);
    expect(cssSource).toMatch(/\.space-combination-term-label\s*\{[^}]*background:\s*color-mix\([^;]*62%/su);
  });

  it('矢先と背景を起点にベクトル移動と視点操作を自動で分ける', () => {
    expect(componentSource).toContain('通常ベクトルの矢先をドラッグ：画面内で移動・吸着');
    expect(componentSource).toContain('背景をドラッグ：視点を回転');
    expect(componentSource).toContain('findVectorTipAtPointer');
    expect(componentSource).toContain('setFromNormalAndCoplanarPoint');
    expect(componentSource).toContain('controls.enabled = false');
    expect(componentSource).toContain('controls.enabled = true');
    expect(componentSource).toContain("addEventListener('pointerdown', handlePointerDown, true)");
    expect(componentSource).toContain("addEventListener('pointercancel', handlePointerCancel, true)");
    expect(componentSource).not.toContain('3D操作モード');
  });

  it('画面平行面のプレビューを全3成分の数値編集へ接続する', () => {
    expect(appSource).toContain('handleThreeDimensionalDirectCoordinatesCommit');
    expect(componentSource).toContain('coordinatesFromScreenPlaneDrag');
    expect(componentSource).toContain('updateVectorScreenPlanePreview');
    expect(componentSource).toContain('onVectorCoordinatesCommit');
    expect(cssSource).toMatch(/\.three-dimensional-gesture-guide\s*\{/su);
    expect(cssSource).toMatch(/\.three-dimensional-canvas\.is-vector-tip-dragging\s*\{/su);
    expect(appSource).not.toContain('threeDimensionalInteractionMode');
  });

  it('ターゲットの矢先ドラッグ中に一次結合の幾何表示を再計算する', () => {
    expect(componentSource).toContain('ActiveTargetScreenPlaneDrag');
    expect(componentSource).toContain('isWorldPointTipAtPointer');
    expect(componentSource).toContain('updateTargetScreenPlanePreview');
    expect(componentSource).toContain('createSpaceTargetDragPreview(coordinates, spanVectors)');
    expect(componentSource).toContain('combinationGeometryGroup.visible = false');
    expect(componentSource).toContain('ターゲット v の矢先をドラッグ：画面内で移動');
    expect(cssSource).toMatch(/\.three-dimensional-canvas\.is-target-tip-dragging\s*\{[^}]*cursor:\s*grabbing;/su);
  });

  it('ドラッグ中だけ表示幅に相対な平行・同一平面スナップを適用する', () => {
    expect(componentSource).toContain('snapDraggedSpaceVectorToDependentPosition');
    expect(componentSource).toContain('parallelSnapDistanceForViewWidth(orthographicVisibleWidth(camera))');
    expect(componentSource).toContain('と平行にスナップ');
    expect(componentSource).toContain('と同一平面上にスナップ');
    expect(componentSource).toContain("snapKind ? '#247565' : '#2f6690'");
  });

  it('span対象ベクトルのドラッグ中にrankと灰色の幾何形状を更新する', () => {
    expect(componentSource).toContain('createSpaceSpanDragPreview');
    expect(componentSource).toContain('updateSpanDragPreview');
    expect(componentSource).toContain('spanGeometryGroup.visible = false');
    expect(componentSource).toContain('const spanDescription = activeVectorDrag.spanPreviewRank');
    expect(componentSource).toContain('生成する空間：${describeSpaceSpan(activeVectorDrag.spanPreviewRank)}');
  });
});

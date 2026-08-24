import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/addons/renderers/CSS2DRenderer.js';
import type { VectorValue } from '../domain';
import {
  snapDraggedSpaceVectorToDependentPosition,
  snapSpaceTargetToSelectedSpan,
  spaceSnapDistanceForViewWidth,
  type SpaceTargetSnapKind,
  type SpaceVectorSnapKind,
} from '../state';
import {
  DEFAULT_3D_CAMERA_STATE,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  type SharedCameraState,
} from '../sharing';
import { splitVectorName } from '../ui';
import {
  createSpaceCombinationGeometry,
  type SpaceCombinationGeometry,
} from './spaceCombinationGeometry';
import {
  createCameraPose,
  createSharedCameraState,
  createSpaceExtent,
  createSpaceSpanGeometry,
  orthographicHalfHeight,
  type CameraPreset,
  type SpaceExtent,
  type SpaceSpanGeometry,
} from './spaceGeometry';
import {
  coordinatesFromScreenPlaneDrag,
  coordinatesFromWorldPoint,
  createSpaceSpanDragPreview,
  type SpaceSpanDragPreview,
  vectorTipHitRadius,
} from './spaceVectorEditing';
import { createSpaceTargetDragPreview } from './spaceTargetEditing';

interface VectorSpace3DProps {
  readonly vectors: readonly VectorValue[];
  readonly colors: readonly string[];
  readonly spanVectors: readonly VectorValue[];
  readonly spanRank: number;
  readonly showSpan: boolean;
  readonly linearCombinationVisible: boolean;
  readonly linearCombinationTarget: readonly [number, number, number] | null;
  readonly linearCombinationCoefficients: readonly number[] | null;
  readonly active: boolean;
  readonly resetKey: number;
  readonly camera: SharedCameraState | null;
  readonly onCameraChange: (camera: SharedCameraState) => void;
  readonly onVectorCoordinatesCommit: (
    vectorId: string,
    coordinates: readonly [number, number, number],
  ) => void;
  readonly onLinearCombinationTargetPlacement: (
    coordinates: readonly [number, number, number],
  ) => void;
  readonly onLinearCombinationVisibility: () => void;
  readonly idPrefix?: string;
  readonly showLinearCombinationControl?: boolean;
  readonly assistiveDescription?: string;
  readonly unavailableFallbackDescription?: string;
}

interface ThreeSpaceRuntime {
  readonly applyPreset: (preset: CameraPreset) => void;
  readonly applyCamera: (camera: SharedCameraState | null) => void;
  readonly fit: () => void;
  readonly resize: () => void;
  readonly dispose: () => void;
}

interface RenderedVector {
  readonly object: THREE.Object3D;
  readonly label: CSS2DObject;
  readonly tipIndicator: THREE.Group;
}

interface RenderedTarget {
  readonly object: THREE.Group;
  readonly tipIndicator: THREE.Group;
}

interface ActiveScreenPlaneDrag {
  readonly pointerId: number;
  readonly vector: VectorValue;
  readonly renderedVector: RenderedVector;
  readonly initialCoordinates: [number, number, number];
  readonly startPoint: THREE.Vector3;
  readonly interactionPlane: THREE.Plane;
  coordinates: [number, number, number];
  snapKind: SpaceVectorSnapKind;
  snapTargetVectorIds: readonly string[];
  spanPreviewRank: number | null;
}

interface PendingTargetPlacement {
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startClientY: number;
}

interface ActiveTargetScreenPlaneDrag {
  readonly pointerId: number;
  readonly renderedTarget: RenderedTarget;
  readonly initialCoordinates: [number, number, number];
  readonly startPoint: THREE.Vector3;
  readonly interactionPlane: THREE.Plane;
  coordinates: [number, number, number];
  snapKind: SpaceTargetSnapKind;
  snapBasisVectorIds: readonly string[];
}

const ORIGIN = new THREE.Vector3(0, 0, 0);
const AXIS_COLORS = {
  x: '#9c4f45',
  y: '#3f756b',
  z: '#3e6687',
} as const;
const SPAN_COLOR = '#737b82';
const TARGET_COLOR = '#245b8d';
const COMBINATION_HELPER_COLOR = '#596b78';
const TARGET_TAP_MOVEMENT_THRESHOLD = 8;
const VECTOR_LABEL_CENTERS = [
  [-0.42, 1.42],
  [1.42, 1.42],
  [-0.42, -0.42],
  [1.42, -0.42],
] as const;
const COMBINATION_LABEL_CENTERS = [
  [1.42, -0.42],
  [-0.42, -0.42],
  [1.42, 1.42],
  [-0.42, 1.42],
] as const;

export function VectorSpace3D({
  vectors,
  colors,
  spanVectors,
  spanRank,
  showSpan,
  linearCombinationVisible,
  linearCombinationTarget,
  linearCombinationCoefficients,
  active,
  resetKey,
  camera,
  onCameraChange,
  onVectorCoordinatesCommit,
  onLinearCombinationTargetPlacement,
  onLinearCombinationVisibility,
  idPrefix = 'space-3d',
  showLinearCombinationControl = true,
  assistiveDescription = 'ベクトルの座標、rank、生成する空間、一次独立性、一次結合の解は、3D表示の後にある数値入力と解析カードでも確認できます。3D表示を利用できない場合も、数値入力、共有URL、Resetは利用できます。',
  unavailableFallbackDescription = '数値入力と解析カード、共有URL、Resetはそのまま利用できます。',
}: VectorSpace3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ThreeSpaceRuntime | null>(null);
  const cameraRef = useRef(camera);
  const onCameraChangeRef = useRef(onCameraChange);
  const onVectorCoordinatesCommitRef = useRef(onVectorCoordinatesCommit);
  const onLinearCombinationTargetPlacementRef = useRef(
    onLinearCombinationTargetPlacement,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);

  cameraRef.current = camera;
  onCameraChangeRef.current = onCameraChange;
  onVectorCoordinatesCommitRef.current = onVectorCoordinatesCommit;
  onLinearCombinationTargetPlacementRef.current = onLinearCombinationTargetPlacement;

  useEffect(() => {
    if (!interactionMessage) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setInteractionMessage(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [interactionMessage]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    setErrorMessage(null);
    let disposed = false;

    try {
      const runtime = createThreeSpaceRuntime(
        host,
        vectors,
        colors,
        spanVectors,
        spanRank,
        showSpan,
        linearCombinationVisible,
        linearCombinationTarget,
        linearCombinationCoefficients,
        cameraRef.current,
        (nextCamera) => onCameraChangeRef.current(nextCamera),
        (vectorId, coordinates) => {
          onVectorCoordinatesCommitRef.current(vectorId, coordinates);
        },
        (coordinates) => {
          onLinearCombinationTargetPlacementRef.current(coordinates);
        },
        (message) => {
          if (!disposed) {
            setInteractionMessage(message);
          }
        },
        (message) => {
          if (!disposed) {
            setErrorMessage(message);
          }
        },
      );
      runtimeRef.current = runtime;

      return () => {
        disposed = true;
        runtime.dispose();
        runtimeRef.current = null;
      };
    } catch {
      setErrorMessage(
        'この端末では3D表示を初期化できませんでした。WebGLが利用可能か確認してください。',
      );
      return undefined;
    }
  }, [
    colors,
    linearCombinationCoefficients,
    linearCombinationTarget,
    linearCombinationVisible,
    showSpan,
    spanRank,
    spanVectors,
    vectors,
  ]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => runtimeRef.current?.resize());
    return () => window.cancelAnimationFrame(frameId);
  }, [active]);

  useEffect(() => {
    runtimeRef.current?.applyCamera(cameraRef.current);
  }, [resetKey]);

  return (
    <section className="three-dimensional-plot-card" aria-labelledby={`${idPrefix}-title`}>
      <div className="three-dimensional-heading">
        <div>
          <p className="panel-kicker">3D coordinate space</p>
          <h2 id={`${idPrefix}-title`}>3次元座標空間</h2>
        </div>
        <div className="three-dimensional-toolbar">
          {showLinearCombinationControl ? (
            <button
              className="target-mode-button"
              type="button"
              aria-pressed={linearCombinationVisible}
              onClick={onLinearCombinationVisibility}
            >
              {linearCombinationVisible ? '一次結合モードを終了' : '一次結合を調べる'}
            </button>
          ) : null}
          <div className="camera-preset-controls" role="group" aria-label="3D視点プリセット">
            <button type="button" onClick={() => runtimeRef.current?.applyPreset('front')}>
              正面
            </button>
            <button type="button" onClick={() => runtimeRef.current?.applyPreset('right')}>
              右
            </button>
            <button type="button" onClick={() => runtimeRef.current?.applyPreset('top')}>
              上
            </button>
            <button type="button" onClick={() => runtimeRef.current?.applyPreset('isometric')}>
              等角
            </button>
            <button className="fit-space-button" type="button" onClick={() => runtimeRef.current?.fit()}>
              全体を表示
            </button>
          </div>
        </div>
      </div>

      <div className="three-dimensional-gesture-guide" aria-label="3D表示の操作方法">
        <span><i className="vector-tip-gesture-mark" aria-hidden="true" />通常ベクトルの矢先をドラッグ：画面内で移動・吸着</span>
        {linearCombinationVisible && linearCombinationTarget ? (
          <span><i className="target-vector-gesture-mark" aria-hidden="true" />ターゲット v の矢先をドラッグ：画面内で移動・生成する空間へ吸着</span>
        ) : null}
        {linearCombinationVisible ? (
          <span><i className="target-placement-gesture-mark" aria-hidden="true" />背景を短くタップ：ターゲット v を配置</span>
        ) : null}
        <span><i className="camera-gesture-mark" aria-hidden="true" />背景をドラッグ：視点を回転</span>
      </div>

      <p className="visually-hidden" id={`${idPrefix}-canvas-alternative`}>
        3D図形は補助的な可視化です。{assistiveDescription}
      </p>

      <div
        className={`three-dimensional-render-frame ${errorMessage ? 'has-error' : ''}`}
        role="group"
        aria-describedby={`${idPrefix}-canvas-alternative`}
        aria-label={`右手座標系の3次元座標空間。x軸、y軸、z軸と${vectors.length}本のベクトルを表示しています。${showSpan ? `選択したベクトルが生成する${describeSpaceSpan(spanRank)}を灰色の幾何形状で表示しています。` : '生成する空間の幾何表示はオフです。'}${linearCombinationVisible ? linearCombinationTarget ? 'ターゲットvと一次結合の幾何表示があります。' : '一次結合モードでターゲットは未配置です。' : ''}`}
      >
        <div className="three-dimensional-render-host" ref={hostRef} />
        {interactionMessage ? (
          <div className="three-dimensional-interaction-message" role="status">
            {interactionMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="three-dimensional-error" role="alert">
            <strong>3D表示を利用できません</strong>
            <p>{errorMessage}</p>
            <p>{unavailableFallbackDescription}</p>
          </div>
        ) : null}
      </div>

      <p className="three-dimensional-help">
        通常ベクトルの矢先をドラッグすると、ドラッグ開始時の画面に平行な面内でベクトルを変更できます。
        他のベクトルが張る直線または平面へ近づけると、平行または同一平面上へ吸着します。
        それ以外の場所では、ドラッグで視点を回転、ホイールまたは2本指で拡大・縮小、右ドラッグまたは2本指ドラッグで表示位置を移動できます。
        {showSpan ? ' 灰色の形状は、選択したベクトルが生成する空間です。' : ''}
        {linearCombinationVisible
          ? ` 背景を短くクリックまたはタップすると、原点を通る現在の画面平行面上へターゲットを配置できます。${linearCombinationTarget ? 'ターゲットの矢先をドラッグすると、一次結合の幾何表示とともに画面平行面内で移動できます。選択したベクトルが生成する原点・直線・平面へ近づけると吸着します。' : ''}数値入力でも変更できます。`
          : ''}
        ページをスクロールするときは3D表示の外側を操作してください。
      </p>
    </section>
  );
}

function createThreeSpaceRuntime(
  host: HTMLDivElement,
  vectors: readonly VectorValue[],
  colors: readonly string[],
  spanVectors: readonly VectorValue[],
  spanRank: number,
  showSpan: boolean,
  linearCombinationVisible: boolean,
  linearCombinationTarget: readonly [number, number, number] | null,
  linearCombinationCoefficients: readonly number[] | null,
  initialCamera: SharedCameraState | null,
  onCameraChange: (camera: SharedCameraState) => void,
  onVectorCoordinatesCommit: (
    vectorId: string,
    coordinates: readonly [number, number, number],
  ) => void,
  onLinearCombinationTargetPlacement: (
    coordinates: readonly [number, number, number],
  ) => void,
  onInteractionMessage: (message: string | null) => void,
  onError: (message: string) => void,
): ThreeSpaceRuntime {
  host.replaceChildren();

  const combinationGeometry = linearCombinationVisible
    && linearCombinationTarget
    && linearCombinationCoefficients
    ? createSpaceCombinationGeometry(spanVectors, linearCombinationCoefficients)
    : null;
  const extentVectors: VectorValue[] = [...vectors];
  if (linearCombinationVisible && linearCombinationTarget) {
    extentVectors.push({
      id: '__target__',
      name: 'v',
      coordinates: linearCombinationTarget,
    });
  }
  combinationGeometry?.vertices.forEach((vertex, index) => {
    extentVectors.push({
      id: `__combination_vertex_${index}__`,
      name: '',
      coordinates: [vertex.x, vertex.y, vertex.z],
    });
  });
  const extent = createSpaceExtent(extentVectors);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#fffdf8');

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, extent.cameraDistance * 12);
  camera.up.set(0, 0, 1);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.className = 'three-dimensional-canvas';
  renderer.domElement.classList.toggle(
    'is-target-placement-mode',
    linearCombinationVisible,
  );
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    'aria-label',
    `3D座標空間。通常ベクトルの矢先をドラッグすると画面に平行な面内で移動し、平行または同一平面上へ吸着できます。${linearCombinationVisible ? `背景を短くクリックまたはタップするとターゲットvを配置できます。${linearCombinationTarget ? 'ターゲットvの矢先をドラッグすると一次結合の幾何表示とともに画面平行面内で移動し、選択したベクトルが生成する原点・直線・平面へ吸着できます。' : ''}` : ''}背景のドラッグで視点を回転、ホイールまたはピンチで拡大縮小、右ドラッグまたは2本指ドラッグで表示位置を移動できます。`,
  );
  host.append(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'three-dimensional-label-layer';
  labelRenderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(labelRenderer.domElement);

  addGrid(scene, extent);
  const spanGeometryGroup = new THREE.Group();
  if (showSpan) {
    addSpanGeometry(spanGeometryGroup, spanVectors, spanRank, extent);
  }
  scene.add(spanGeometryGroup);
  const spanDragPreview = new THREE.Group();
  scene.add(spanDragPreview);
  addAxes(scene, extent);
  addOrigin(scene, extent);
  const combinationGeometryGroup = new THREE.Group();
  if (combinationGeometry) {
    addSpaceCombinationGeometry(
      combinationGeometryGroup,
      combinationGeometry,
      spanVectors,
      vectors,
      colors,
      extent,
    );
  }
  scene.add(combinationGeometryGroup);
  const renderedVectors = addVectors(
    scene,
    vectors,
    colors,
    extent,
    new Set(spanVectors.map((vector) => vector.id)),
    showSpan,
  );
  const targetVectorGroup = new THREE.Group();
  const renderedTarget = linearCombinationVisible && linearCombinationTarget
    ? addTargetVector(targetVectorGroup, linearCombinationTarget, extent)
    : null;
  scene.add(targetVectorGroup);
  const dragPreview = new THREE.Group();
  dragPreview.renderOrder = 10;
  scene.add(dragPreview);
  const targetDragPreview = new THREE.Group();
  targetDragPreview.renderOrder = 10;
  scene.add(targetDragPreview);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enablePan = true;
  controls.enableRotate = true;
  controls.enableZoom = true;
  controls.screenSpacePanning = true;
  controls.target.copy(ORIGIN);
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.minZoom = MIN_CAMERA_ZOOM;
  controls.maxZoom = MAX_CAMERA_ZOOM;

  let disposed = false;
  let resizeObserver: ResizeObserver | null = null;
  let activeScreenPlaneDrag: ActiveScreenPlaneDrag | null = null;
  let activeTargetScreenPlaneDrag: ActiveTargetScreenPlaneDrag | null = null;
  let pendingTargetPlacement: PendingTargetPlacement | null = null;

  const render = () => {
    if (disposed) {
      return;
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };

  const emitCameraChange = () => {
    try {
      onCameraChange(createSharedCameraState({
        position: camera.position,
        target: controls.target,
        up: camera.up,
        zoom: camera.zoom,
      }));
    } catch {
      onError('現在のカメラ状態を共有用に保存できませんでした。視点を調整してください。');
    }
  };

  const handleControlsChange = () => {
    camera.far = Math.max(
      extent.cameraDistance * 24,
      camera.position.length() + extent.halfRange * 6,
    );
    camera.updateProjectionMatrix();
    render();
  };

  const resize = () => {
    if (disposed) {
      return;
    }
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const aspect = width / height;
    const halfHeight = orthographicHalfHeight(extent.halfRange, aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    labelRenderer.setSize(width, height);
    render();
  };

  const applyPreset = (preset: CameraPreset) => {
    const pose = createCameraPose(preset, extent.cameraDistance);
    controls.target.copy(ORIGIN);
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    camera.up.set(pose.up.x, pose.up.y, pose.up.z);
    camera.zoom = 1;
    camera.lookAt(ORIGIN);
    camera.updateProjectionMatrix();
    controls.update();
    render();
    emitCameraChange();
  };

  const applyCamera = (sharedCamera: SharedCameraState | null) => {
    const nextCamera = sharedCamera ?? DEFAULT_3D_CAMERA_STATE;
    const target = new THREE.Vector3(...nextCamera.target);
    const direction = new THREE.Vector3(...nextCamera.direction).normalize();
    controls.target.copy(target);
    camera.position.copy(target).add(direction.multiplyScalar(extent.cameraDistance));
    camera.up.set(...nextCamera.up).normalize();
    camera.zoom = Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, nextCamera.zoom));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    controls.update();
    render();
    emitCameraChange();
  };

  const fit = () => {
    const direction = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(ORIGIN);
    camera.position.copy(direction.multiplyScalar(extent.cameraDistance));
    camera.zoom = 1;
    camera.lookAt(ORIGIN);
    camera.updateProjectionMatrix();
    controls.update();
    render();
    emitCameraChange();
  };

  const raycaster = new THREE.Raycaster();
  const pointerPosition = new THREE.Vector2();

  const updateRayFromPointer = (event: PointerEvent, rect: DOMRect) => {
    pointerPosition.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointerPosition, camera);
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (
      pendingTargetPlacement
      && pendingTargetPlacement.pointerId !== event.pointerId
    ) {
      pendingTargetPlacement = null;
    }
    if (activeScreenPlaneDrag || activeTargetScreenPlaneDrag) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const rect = renderer.domElement.getBoundingClientRect();
    const targetTipHit = linearCombinationTarget && renderedTarget
      ? isWorldPointTipAtPointer(
          new THREE.Vector3(...linearCombinationTarget),
          event,
          camera,
          rect,
        )
      : false;
    if (targetTipHit && linearCombinationTarget && renderedTarget) {
      pendingTargetPlacement = null;
      const initialCoordinates: [number, number, number] = [...linearCombinationTarget];
      const initialTip = new THREE.Vector3(...initialCoordinates);
      const viewDirection = new THREE.Vector3();
      camera.getWorldDirection(viewDirection);
      const interactionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        viewDirection,
        initialTip,
      );
      updateRayFromPointer(event, rect);
      const startPoint = raycaster.ray.intersectPlane(
        interactionPlane,
        new THREE.Vector3(),
      );
      if (!startPoint) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.classList.add('is-target-tip-dragging');
      renderedTarget.object.visible = false;
      combinationGeometryGroup.visible = false;
      renderedTarget.tipIndicator.scale.setScalar(1.22);
      activeTargetScreenPlaneDrag = {
        pointerId: event.pointerId,
        renderedTarget,
        initialCoordinates,
        startPoint,
        interactionPlane,
        coordinates: [...initialCoordinates],
        snapKind: null,
        snapBasisVectorIds: [],
      };
      updateTargetScreenPlanePreview(
        targetDragPreview,
        initialTip,
        initialCoordinates,
        spanVectors,
        vectors,
        colors,
        extent,
        camera,
        null,
      );
      onInteractionMessage('ターゲット v を画面に平行な面内で移動しています。');
      render();
      return;
    }
    const vector = findVectorTipAtPointer(
      vectors,
      event,
      camera,
      rect,
    );
    const renderedVector = vector ? renderedVectors.get(vector.id) : null;
    if (!vector || !renderedVector) {
      if (linearCombinationVisible && event.isPrimary) {
        pendingTargetPlacement = {
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
        };
      }
      return;
    }
    pendingTargetPlacement = null;

    const initialCoordinates: [number, number, number] = [
      vector.coordinates[0] ?? 0,
      vector.coordinates[1] ?? 0,
      vector.coordinates[2] ?? 0,
    ];
    const initialTip = new THREE.Vector3(...initialCoordinates);
    const viewDirection = new THREE.Vector3();
    camera.getWorldDirection(viewDirection);
    const interactionPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      viewDirection,
      initialTip,
    );
    updateRayFromPointer(event, rect);
    const startPoint = raycaster.ray.intersectPlane(interactionPlane, new THREE.Vector3());
    if (!startPoint) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    controls.enabled = false;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.classList.add('is-vector-tip-dragging');
    renderedVector.object.visible = false;
    renderedVector.label.visible = false;
    renderedVector.tipIndicator.scale.setScalar(1.22);
    const initialSpanPreview = showSpan
      ? createSpaceSpanDragPreview(vector.id, initialCoordinates, spanVectors)
      : null;
    if (initialSpanPreview) {
      spanGeometryGroup.visible = false;
      updateSpanDragPreview(
        spanDragPreview,
        initialSpanPreview,
        null,
        extent,
      );
    }
    activeScreenPlaneDrag = {
      pointerId: event.pointerId,
      vector,
      renderedVector,
      initialCoordinates,
      startPoint,
      interactionPlane,
      coordinates: [...initialCoordinates],
      snapKind: null,
      snapTargetVectorIds: [],
      spanPreviewRank: initialSpanPreview?.rank ?? null,
    };
    updateVectorScreenPlanePreview(
      dragPreview,
      initialTip,
      initialTip,
      vector,
      vectors,
      colors,
      extent,
      camera,
      null,
    );
    onInteractionMessage(`${vector.name} を画面に平行な面内で移動しています。`);
    render();
  };

  const handlePointerMove = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    if (!activeScreenPlaneDrag && !activeTargetScreenPlaneDrag) {
      if (
        pendingTargetPlacement?.pointerId === event.pointerId
        && Math.hypot(
          event.clientX - pendingTargetPlacement.startClientX,
          event.clientY - pendingTargetPlacement.startClientY,
        ) > TARGET_TAP_MOVEMENT_THRESHOLD
      ) {
        pendingTargetPlacement = null;
      }
      const hoverTarget = linearCombinationTarget
        ? isWorldPointTipAtPointer(
            new THREE.Vector3(...linearCombinationTarget),
            event,
            camera,
            rect,
          )
        : false;
      const hoverVector = hoverTarget
        ? null
        : findVectorTipAtPointer(vectors, event, camera, rect);
      renderer.domElement.classList.toggle('is-target-tip-hover', hoverTarget);
      renderer.domElement.classList.toggle('is-vector-tip-hover', Boolean(hoverVector));
      return;
    }
    if (activeTargetScreenPlaneDrag) {
      event.stopImmediatePropagation();
      if (activeTargetScreenPlaneDrag.pointerId !== event.pointerId) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      updateRayFromPointer(event, rect);
      const currentPoint = raycaster.ray.intersectPlane(
        activeTargetScreenPlaneDrag.interactionPlane,
        new THREE.Vector3(),
      );
      if (!currentPoint) {
        return;
      }
      const candidateCoordinates = coordinatesFromScreenPlaneDrag(
        activeTargetScreenPlaneDrag.initialCoordinates,
        activeTargetScreenPlaneDrag.startPoint,
        currentPoint,
      );
      const snapResult = snapSpaceTargetToSelectedSpan(
        candidateCoordinates,
        spanVectors,
        spanRank,
        spaceSnapDistanceForViewWidth(orthographicVisibleWidth(camera)),
      );
      const coordinates: [number, number, number] = [...snapResult.coordinates];
      activeTargetScreenPlaneDrag.coordinates = coordinates;
      activeTargetScreenPlaneDrag.snapKind = snapResult.snapKind;
      activeTargetScreenPlaneDrag.snapBasisVectorIds = snapResult.basisVectorIds;
      activeTargetScreenPlaneDrag.renderedTarget.tipIndicator.position.set(...coordinates);
      const previewStatus = updateTargetScreenPlanePreview(
        targetDragPreview,
        new THREE.Vector3(...activeTargetScreenPlaneDrag.initialCoordinates),
        coordinates,
        spanVectors,
        vectors,
        colors,
        extent,
        camera,
        snapResult.snapKind,
      );
      const snapDescription = describeSpaceTargetSnap(
        snapResult.snapKind,
        snapResult.basisVectorIds,
        vectors,
      );
      onInteractionMessage(
        `ターゲット v の成分：${formatCoordinateStatus(coordinates)}　${snapDescription ?? describeTargetPreviewStatus(previewStatus)}`,
      );
      render();
      return;
    }
    const activeVectorDrag = activeScreenPlaneDrag;
    if (!activeVectorDrag) {
      return;
    }
    event.stopImmediatePropagation();
    if (activeVectorDrag.pointerId !== event.pointerId) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    updateRayFromPointer(event, rect);
    const currentPoint = raycaster.ray.intersectPlane(
      activeVectorDrag.interactionPlane,
      new THREE.Vector3(),
    );
    if (!currentPoint) {
      return;
    }
    const directCoordinates = coordinatesFromScreenPlaneDrag(
      activeVectorDrag.initialCoordinates,
      activeVectorDrag.startPoint,
      currentPoint,
    );
    const snapResult = snapDraggedSpaceVectorToDependentPosition(
      activeVectorDrag.vector.id,
      directCoordinates,
      vectors,
      spaceSnapDistanceForViewWidth(orthographicVisibleWidth(camera)),
    );
    activeVectorDrag.coordinates = [...snapResult.coordinates];
    activeVectorDrag.snapKind = snapResult.snapKind;
    activeVectorDrag.snapTargetVectorIds = snapResult.targetVectorIds;
    const spanPreview = showSpan
      ? createSpaceSpanDragPreview(
          activeVectorDrag.vector.id,
          activeVectorDrag.coordinates,
          spanVectors,
        )
      : null;
    if (spanPreview) {
      activeVectorDrag.spanPreviewRank = updateSpanDragPreview(
        spanDragPreview,
        spanPreview,
        activeVectorDrag.spanPreviewRank,
        extent,
      );
    }
    const tip = new THREE.Vector3(...activeVectorDrag.coordinates);
    activeVectorDrag.renderedVector.tipIndicator.position.copy(tip);
    updateVectorScreenPlanePreview(
      dragPreview,
      new THREE.Vector3(...activeVectorDrag.initialCoordinates),
      tip,
      activeVectorDrag.vector,
      vectors,
      colors,
      extent,
      camera,
      snapResult.snapKind,
    );
    const snapDescription = describeSpaceVectorSnap(
      snapResult.snapKind,
      snapResult.targetVectorIds,
      vectors,
    );
    const spanDescription = activeVectorDrag.spanPreviewRank === null
      ? ''
      : `　生成する空間：${describeSpaceSpan(activeVectorDrag.spanPreviewRank)}`;
    onInteractionMessage(
      `${activeVectorDrag.vector.name} の成分：${formatCoordinateStatus(activeVectorDrag.coordinates)}　${snapDescription ?? '画面に平行な面内で移動'}${spanDescription}`,
    );
    render();
  };

  const finishScreenPlaneDrag = (event: PointerEvent, commit: boolean) => {
    if (!activeScreenPlaneDrag) {
      return;
    }
    event.stopImmediatePropagation();
    if (activeScreenPlaneDrag.pointerId !== event.pointerId) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const completedDrag = activeScreenPlaneDrag;
    activeScreenPlaneDrag = null;
    controls.enabled = true;
    renderer.domElement.classList.remove('is-vector-tip-dragging', 'is-vector-tip-hover');
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
    if (commit) {
      const snapDescription = describeSpaceVectorSnap(
        completedDrag.snapKind,
        completedDrag.snapTargetVectorIds,
        vectors,
      );
      onInteractionMessage(
        `${completedDrag.vector.name} を変更しました。${formatCoordinateStatus(completedDrag.coordinates)}${snapDescription ? `。${snapDescription}` : ''}`,
      );
      onVectorCoordinatesCommit(completedDrag.vector.id, completedDrag.coordinates);
      return;
    }
    completedDrag.renderedVector.object.visible = true;
    completedDrag.renderedVector.label.visible = true;
    completedDrag.renderedVector.tipIndicator.position.set(...completedDrag.initialCoordinates);
    completedDrag.renderedVector.tipIndicator.scale.setScalar(1);
    clearObjectGroup(dragPreview);
    clearObjectGroup(spanDragPreview);
    spanGeometryGroup.visible = true;
    onInteractionMessage('ベクトルの変更を取り消しました。');
    render();
  };
  const finishTargetScreenPlaneDrag = (event: PointerEvent, commit: boolean) => {
    if (!activeTargetScreenPlaneDrag) {
      return;
    }
    event.stopImmediatePropagation();
    if (activeTargetScreenPlaneDrag.pointerId !== event.pointerId) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const completedDrag = activeTargetScreenPlaneDrag;
    activeTargetScreenPlaneDrag = null;
    controls.enabled = true;
    renderer.domElement.classList.remove('is-target-tip-dragging', 'is-target-tip-hover');
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
    if (commit) {
      const snapDescription = describeSpaceTargetSnap(
        completedDrag.snapKind,
        completedDrag.snapBasisVectorIds,
        vectors,
      );
      onInteractionMessage(
        `ターゲット v を変更しました。${formatCoordinateStatus(completedDrag.coordinates)}${snapDescription ? `。${snapDescription}` : ''}`,
      );
      onLinearCombinationTargetPlacement(completedDrag.coordinates);
      return;
    }
    completedDrag.renderedTarget.object.visible = true;
    completedDrag.renderedTarget.tipIndicator.position.set(...completedDrag.initialCoordinates);
    completedDrag.renderedTarget.tipIndicator.scale.setScalar(1);
    combinationGeometryGroup.visible = true;
    clearObjectGroup(targetDragPreview);
    onInteractionMessage('ターゲット v の変更を取り消しました。');
    render();
  };
  const finishTargetPlacement = (event: PointerEvent) => {
    const pending = pendingTargetPlacement;
    pendingTargetPlacement = null;
    if (
      !pending
      || pending.pointerId !== event.pointerId
      || event.type !== 'pointerup'
      || !linearCombinationVisible
    ) {
      return;
    }
    const rect = renderer.domElement.getBoundingClientRect();
    updateRayFromPointer(event, rect);
    const viewDirection = new THREE.Vector3();
    camera.getWorldDirection(viewDirection);
    const placementPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      viewDirection,
      ORIGIN,
    );
    const targetPoint = raycaster.ray.intersectPlane(
      placementPlane,
      new THREE.Vector3(),
    );
    if (!targetPoint) {
      return;
    }
    const coordinates = coordinatesFromWorldPoint(targetPoint);
    onLinearCombinationTargetPlacement(coordinates);
    onInteractionMessage(
      `ターゲット v を配置しました。${formatCoordinateStatus(coordinates)}　原点を通る画面平行面上`,
    );
  };
  const handlePointerUp = (event: PointerEvent) => {
    if (activeTargetScreenPlaneDrag) {
      finishTargetScreenPlaneDrag(event, true);
      return;
    }
    if (activeScreenPlaneDrag) {
      finishScreenPlaneDrag(event, true);
      return;
    }
    finishTargetPlacement(event);
  };
  const handlePointerCancel = (event: PointerEvent) => {
    if (activeTargetScreenPlaneDrag) {
      finishTargetScreenPlaneDrag(event, false);
      return;
    }
    if (activeScreenPlaneDrag) {
      finishScreenPlaneDrag(event, false);
      return;
    }
    pendingTargetPlacement = null;
  };
  const handleLostPointerCapture = (event: PointerEvent) => {
    if (activeTargetScreenPlaneDrag) {
      finishTargetScreenPlaneDrag(event, false);
      return;
    }
    finishScreenPlaneDrag(event, false);
  };
  const handlePointerLeave = () => {
    if (!activeScreenPlaneDrag && !activeTargetScreenPlaneDrag) {
      renderer.domElement.classList.remove('is-vector-tip-hover', 'is-target-tip-hover');
      pendingTargetPlacement = null;
    }
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    onError('3D描画の接続が失われました。ページを再読み込みしてください。');
  };
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
  renderer.domElement.addEventListener('pointerdown', handlePointerDown, true);
  renderer.domElement.addEventListener('pointermove', handlePointerMove, true);
  renderer.domElement.addEventListener('pointerup', handlePointerUp, true);
  renderer.domElement.addEventListener('pointercancel', handlePointerCancel, true);
  renderer.domElement.addEventListener('lostpointercapture', handleLostPointerCapture, true);
  renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
  controls.addEventListener('change', handleControlsChange);
  controls.addEventListener('end', emitCameraChange);

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  applyCamera(initialCamera);
  resize();

  return {
    applyPreset,
    applyCamera,
    fit,
    resize,
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      resizeObserver?.disconnect();
      controls.removeEventListener('change', handleControlsChange);
      controls.removeEventListener('end', emitCameraChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown, true);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove, true);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp, true);
      renderer.domElement.removeEventListener('pointercancel', handlePointerCancel, true);
      renderer.domElement.removeEventListener('lostpointercapture', handleLostPointerCapture, true);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      disposeScene(scene);
      renderer.dispose();
      host.replaceChildren();
    },
  };
}

function addGrid(scene: THREE.Scene, extent: SpaceExtent): void {
  const positions: number[] = [];
  const size = extent.gridHalfSize;
  const step = adaptiveGridStep(size);

  for (let coordinate = -size; coordinate <= size; coordinate += step) {
    positions.push(-size, coordinate, 0, size, coordinate, 0);
    positions.push(coordinate, -size, 0, coordinate, size, 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: '#d9d6cf',
    transparent: true,
    opacity: 0.72,
  });
  scene.add(new THREE.LineSegments(geometry, material));
}

function addSpanGeometry(
  scene: THREE.Object3D,
  spanVectors: readonly VectorValue[],
  spanRank: number,
  extent: SpaceExtent,
): void {
  const geometry = createSpaceSpanGeometry(spanVectors, spanRank, extent.halfRange);

  switch (geometry.kind) {
    case 'origin':
      addSpanOrigin(scene, extent);
      return;
    case 'line':
      addSpanLine(scene, geometry, extent);
      return;
    case 'plane':
      addSpanPlane(scene, geometry, extent);
      return;
    case 'space':
      addSpanSpace(scene, geometry);
  }
}

function updateSpanDragPreview(
  group: THREE.Group,
  preview: SpaceSpanDragPreview,
  previousRank: number | null,
  extent: SpaceExtent,
): number {
  if (preview.rank === previousRank && (preview.rank === 0 || preview.rank === 3)) {
    return preview.rank;
  }
  clearObjectGroup(group);
  addSpanGeometry(group, preview.vectors, preview.rank, extent);
  return preview.rank;
}

function addSpanOrigin(scene: THREE.Object3D, extent: SpaceExtent): void {
  const radius = Math.max(0.14, extent.halfRange * 0.035);
  const fillGeometry = new THREE.SphereGeometry(radius, 20, 14);
  const fillMaterial = new THREE.MeshBasicMaterial({
    color: SPAN_COLOR,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const fill = new THREE.Mesh(fillGeometry, fillMaterial);
  fill.renderOrder = -2;
  scene.add(fill);

  const outlineGeometry = new THREE.SphereGeometry(radius * 1.45, 14, 10);
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: SPAN_COLOR,
    transparent: true,
    opacity: 0.72,
    wireframe: true,
    depthWrite: false,
  });
  const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outline.renderOrder = -1;
  scene.add(outline);
  scene.add(createTextLabel(
    '生成する空間：原点',
    'space-span-label',
    new THREE.Vector3(radius * 1.6, radius * 0.5, radius * 1.8),
  ));
}

function addSpanLine(
  scene: THREE.Object3D,
  geometry: Extract<SpaceSpanGeometry, { readonly kind: 'line' }>,
  extent: SpaceExtent,
): void {
  const start = pointToVector3(geometry.start);
  const end = pointToVector3(geometry.end);
  const direction = pointToVector3(geometry.direction);
  const fullLength = start.distanceTo(end);
  const dashLength = Math.max(0.22, extent.halfRange * 0.16);
  const gapLength = dashLength * 0.62;
  const radius = Math.max(0.035, extent.halfRange * 0.009);
  const material = new THREE.MeshBasicMaterial({
    color: SPAN_COLOR,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });

  for (let offset = 0; offset < fullLength; offset += dashLength + gapLength) {
    const segmentLength = Math.min(dashLength, fullLength - offset);
    const center = start.clone().addScaledVector(direction, offset + segmentLength / 2);
    const dashGeometry = new THREE.CylinderGeometry(radius, radius, segmentLength, 10);
    const dash = new THREE.Mesh(dashGeometry, material);
    dash.position.copy(center);
    dash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    dash.renderOrder = -2;
    scene.add(dash);
  }

  const labelPosition = end.clone().multiplyScalar(0.78)
    .add(new THREE.Vector3(0, 0, extent.halfRange * 0.06));
  scene.add(createTextLabel(
    '生成する空間：原点を通る直線',
    'space-span-label',
    labelPosition,
  ));
}

function addSpanPlane(
  scene: THREE.Object3D,
  geometry: Extract<SpaceSpanGeometry, { readonly kind: 'plane' }>,
  extent: SpaceExtent,
): void {
  const normal = pointToVector3(geometry.normal);
  const planeGeometry = new THREE.PlaneGeometry(geometry.halfSize * 2, geometry.halfSize * 2);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: SPAN_COLOR,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  plane.renderOrder = -3;
  scene.add(plane);

  const basisU = pointToVector3(geometry.basisU);
  const basisV = pointToVector3(geometry.basisV);

  const labelPosition = basisU.clone().add(basisV).normalize()
    .multiplyScalar(extent.halfRange * 0.82)
    .addScaledVector(normal, extent.halfRange * 0.035);
  scene.add(createTextLabel(
    '生成する空間：原点を通る平面',
    'space-span-label',
    labelPosition,
  ));
}

function addSpanSpace(
  scene: THREE.Object3D,
  geometry: Extract<SpaceSpanGeometry, { readonly kind: 'space' }>,
): void {
  const boxGeometry = new THREE.BoxGeometry(
    geometry.halfSize * 2,
    geometry.halfSize * 2,
    geometry.halfSize * 2,
  );
  const fillMaterial = new THREE.MeshBasicMaterial({
    color: SPAN_COLOR,
    transparent: true,
    opacity: 0.065,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const fill = new THREE.Mesh(boxGeometry, fillMaterial);
  fill.renderOrder = -4;
  scene.add(fill);

  const edgeGeometry = new THREE.EdgesGeometry(boxGeometry);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: SPAN_COLOR,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  edges.renderOrder = -3;
  scene.add(edges);

  scene.add(createTextLabel(
    '生成する空間：3次元座標空間全体',
    'space-span-label space-span-rank-three-label',
    new THREE.Vector3(
      -geometry.halfSize * 0.72,
      geometry.halfSize * 0.72,
      geometry.halfSize * 0.78,
    ),
  ));
}

function addAxes(scene: THREE.Scene, extent: SpaceExtent): void {
  const length = extent.halfRange * 1.08;
  const headLength = Math.max(0.24, extent.halfRange * 0.055);
  const headWidth = headLength * 0.5;

  addAxis(scene, 'x', new THREE.Vector3(1, 0, 0), length, headLength, headWidth);
  addAxis(scene, 'y', new THREE.Vector3(0, 1, 0), length, headLength, headWidth);
  addAxis(scene, 'z', new THREE.Vector3(0, 0, 1), length, headLength, headWidth);
}

function addAxis(
  scene: THREE.Scene,
  axis: keyof typeof AXIS_COLORS,
  direction: THREE.Vector3,
  length: number,
  headLength: number,
  headWidth: number,
): void {
  const color = new THREE.Color(AXIS_COLORS[axis]);
  const negativeGeometry = new THREE.BufferGeometry().setFromPoints([
    direction.clone().multiplyScalar(-length),
    ORIGIN,
  ]);
  const negativeMaterial = new THREE.LineDashedMaterial({
    color,
    dashSize: length * 0.035,
    gapSize: length * 0.022,
    transparent: true,
    opacity: 0.72,
  });
  const negativeLine = new THREE.Line(negativeGeometry, negativeMaterial);
  negativeLine.computeLineDistances();
  scene.add(negativeLine);

  scene.add(new THREE.ArrowHelper(direction, ORIGIN, length, color, headLength, headWidth));
  const labelPosition = direction.clone().multiplyScalar(length + headLength * 0.65);
  scene.add(createTextLabel(axis, `axis-label axis-${axis}`, labelPosition));
}

function addOrigin(scene: THREE.Scene, extent: SpaceExtent): void {
  const geometry = new THREE.SphereGeometry(Math.max(0.055, extent.halfRange * 0.012), 18, 12);
  const material = new THREE.MeshBasicMaterial({ color: '#26343d' });
  scene.add(new THREE.Mesh(geometry, material));
  scene.add(createTextLabel('O', 'origin-label', new THREE.Vector3(0, 0, extent.halfRange * 0.06)));
}

function addVectors(
  scene: THREE.Scene,
  vectors: readonly VectorValue[],
  colors: readonly string[],
  extent: SpaceExtent,
  spanVectorIds: ReadonlySet<string>,
  showSpan: boolean,
): Map<string, RenderedVector> {
  const renderedVectors = new Map<string, RenderedVector>();
  vectors.forEach((vector, index) => {
    const tip = new THREE.Vector3(
      vector.coordinates[0] ?? 0,
      vector.coordinates[1] ?? 0,
      vector.coordinates[2] ?? 0,
    );
    const length = tip.length();
    const color = new THREE.Color(colors[index % colors.length] ?? '#2f6690');
    const isSpanSelected = spanVectorIds.has(vector.id);
    let vectorObject: THREE.Object3D;

    if (length === 0) {
      const geometry = new THREE.RingGeometry(
        extent.halfRange * 0.025,
        extent.halfRange * 0.042,
        24,
      );
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.copy(ORIGIN);
      marker.lookAt(new THREE.Vector3(0, -1, 0));
      scene.add(marker);
      vectorObject = marker;
    } else {
      const direction = tip.clone().normalize();
      const headLength = Math.min(length * 0.28, Math.max(0.22, extent.halfRange * 0.075));
      const headWidth = Math.min(length * 0.16, headLength * 0.55);
      const arrow = new THREE.ArrowHelper(
        direction,
        ORIGIN,
        length,
        color,
        headLength,
        headWidth,
      );
      scene.add(arrow);
      vectorObject = arrow;
    }

    applyVectorSpanAppearance(vectorObject, showSpan, isSpanSelected);

    const label = createVectorLabel(
      vector.name,
      color.getStyle(),
      tip,
      index,
      showSpan && !isSpanSelected,
    );
    scene.add(label);
    const tipIndicator = createVectorTipIndicator(
      tip,
      color,
      extent,
      showSpan && !isSpanSelected,
    );
    scene.add(tipIndicator);
    renderedVectors.set(vector.id, { object: vectorObject, label, tipIndicator });
  });
  return renderedVectors;
}

function createVectorTipIndicator(
  tip: THREE.Vector3,
  color: THREE.Color,
  extent: SpaceExtent,
  muted: boolean,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vector-tip-indicator';
  group.position.copy(tip);
  const innerRadius = Math.max(0.052, extent.halfRange * 0.011);
  const outerRadius = Math.max(0.09, extent.halfRange * 0.018);
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(innerRadius, 14, 9),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: muted ? 0.25 : 0.82,
      depthTest: false,
      depthWrite: false,
    }),
  );
  inner.renderOrder = 8;
  group.add(inner);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(outerRadius, 12, 8),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: muted ? 0.12 : 0.34,
      wireframe: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  halo.renderOrder = 8;
  group.add(halo);
  return group;
}

function findVectorTipAtPointer(
  vectors: readonly VectorValue[],
  event: PointerEvent,
  camera: THREE.Camera,
  rect: DOMRect,
): VectorValue | null {
  const hitRadius = vectorTipHitRadius(event.pointerType);
  let bestMatch: {
    readonly vector: VectorValue;
    readonly screenDistanceSquared: number;
    readonly cameraDistance: number;
  } | null = null;

  for (const vector of vectors) {
    const tip = new THREE.Vector3(
      vector.coordinates[0] ?? 0,
      vector.coordinates[1] ?? 0,
      vector.coordinates[2] ?? 0,
    );
    const projected = tip.clone().project(camera);
    if (projected.z < -1 || projected.z > 1) {
      continue;
    }
    const screen = projectWorldPointToScreen(tip, camera, rect);
    const screenDistanceSquared = (event.clientX - screen.x) ** 2
      + (event.clientY - screen.y) ** 2;
    if (screenDistanceSquared > hitRadius ** 2) {
      continue;
    }
    const cameraDistance = tip.distanceTo(camera.position);
    if (
      !bestMatch
      || screenDistanceSquared < bestMatch.screenDistanceSquared - 1
      || (
        Math.abs(screenDistanceSquared - bestMatch.screenDistanceSquared) <= 1
        && cameraDistance < bestMatch.cameraDistance
      )
    ) {
      bestMatch = { vector, screenDistanceSquared, cameraDistance };
    }
  }

  return bestMatch?.vector ?? null;
}

function isWorldPointTipAtPointer(
  tip: THREE.Vector3,
  event: PointerEvent,
  camera: THREE.Camera,
  rect: DOMRect,
): boolean {
  const projected = tip.clone().project(camera);
  if (projected.z < -1 || projected.z > 1) {
    return false;
  }
  const screen = projectWorldPointToScreen(tip, camera, rect);
  return (event.clientX - screen.x) ** 2 + (event.clientY - screen.y) ** 2
    <= vectorTipHitRadius(event.pointerType) ** 2;
}

function projectWorldPointToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  rect: DOMRect,
): { readonly x: number; readonly y: number } {
  const projected = point.clone().project(camera);
  return {
    x: rect.left + ((projected.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - projected.y) / 2) * rect.height,
  };
}

function updateVectorScreenPlanePreview(
  group: THREE.Group,
  initialTip: THREE.Vector3,
  tip: THREE.Vector3,
  vector: VectorValue,
  vectors: readonly VectorValue[],
  colors: readonly string[],
  extent: SpaceExtent,
  camera: THREE.Camera,
  snapKind: SpaceVectorSnapKind,
): void {
  clearObjectGroup(group);
  const vectorIndex = vectors.findIndex((candidate) => candidate.id === vector.id);
  const color = new THREE.Color(colors[Math.max(0, vectorIndex) % colors.length] ?? '#2f6690');
  addPreviewArrow(group, initialTip, color, extent, 0.22, 8);
  addPreviewArrow(group, tip, color, extent, 0.86, 10);

  addScreenPlaneDragGuides(
    group,
    initialTip,
    tip,
    color,
    extent,
    camera,
    snapKind,
  );
}

function updateTargetScreenPlanePreview(
  group: THREE.Group,
  initialTip: THREE.Vector3,
  coordinates: readonly [number, number, number],
  spanVectors: readonly VectorValue[],
  vectors: readonly VectorValue[],
  colors: readonly string[],
  extent: SpaceExtent,
  camera: THREE.Camera,
  snapKind: SpaceTargetSnapKind,
): ReturnType<typeof createSpaceTargetDragPreview>['status'] {
  clearObjectGroup(group);
  const preview = createSpaceTargetDragPreview(coordinates, spanVectors);
  if (preview.geometry) {
    addSpaceCombinationGeometry(
      group,
      preview.geometry,
      spanVectors,
      vectors,
      colors,
      extent,
    );
  }
  const tip = new THREE.Vector3(...coordinates);
  addPreviewArrow(
    group,
    initialTip,
    new THREE.Color(TARGET_COLOR),
    extent,
    0.22,
    8,
  );
  addTargetVector(group, coordinates, extent);
  addScreenPlaneDragGuides(
    group,
    initialTip,
    tip,
    new THREE.Color(TARGET_COLOR),
    extent,
    camera,
    snapKind,
  );
  return preview.status;
}

function addScreenPlaneDragGuides(
  group: THREE.Group,
  initialTip: THREE.Vector3,
  tip: THREE.Vector3,
  color: THREE.Color,
  extent: SpaceExtent,
  camera: THREE.Camera,
  snapKind: SpaceVectorSnapKind | SpaceTargetSnapKind,
): void {

  const guideLength = Math.max(0.9, extent.halfRange * 0.28);
  const screenRight = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(camera.quaternion)
    .normalize();
  const screenUp = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(camera.quaternion)
    .normalize();
  const guideGeometry = new THREE.BufferGeometry().setFromPoints([
    initialTip.clone().addScaledVector(screenRight, -guideLength),
    initialTip.clone().addScaledVector(screenRight, guideLength),
    initialTip.clone().addScaledVector(screenUp, -guideLength),
    initialTip.clone().addScaledVector(screenUp, guideLength),
  ]);
  const guideColor = snapKind ? '#247565' : '#2f6690';
  const guideMaterial = new THREE.LineDashedMaterial({
    color: guideColor,
    dashSize: guideLength * 0.12,
    gapSize: guideLength * 0.08,
    transparent: true,
    opacity: 0.34,
    depthTest: false,
    depthWrite: false,
  });
  const guides = new THREE.LineSegments(guideGeometry, guideMaterial);
  guides.computeLineDistances();
  guides.renderOrder = 9;
  group.add(guides);

  if (!initialTip.equals(tip)) {
    const movementGeometry = new THREE.BufferGeometry().setFromPoints([initialTip, tip]);
    const movementMaterial = new THREE.LineDashedMaterial({
      color: snapKind ? guideColor : color,
      dashSize: guideLength * 0.08,
      gapSize: guideLength * 0.055,
      transparent: true,
      opacity: 0.6,
      depthTest: false,
      depthWrite: false,
    });
    const movement = new THREE.Line(movementGeometry, movementMaterial);
    movement.computeLineDistances();
    movement.renderOrder = 9;
    group.add(movement);
  }

  if (snapKind) {
    const visibleWidth = camera instanceof THREE.OrthographicCamera
      ? orthographicVisibleWidth(camera)
      : extent.halfRange * 2;
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(visibleWidth * 0.007, visibleWidth * 0.012, 28),
      new THREE.MeshBasicMaterial({
        color: guideColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        depthWrite: false,
      }),
    );
    marker.position.copy(tip);
    marker.quaternion.copy(camera.quaternion);
    marker.renderOrder = 11;
    group.add(marker);
  }
}

function addPreviewArrow(
  group: THREE.Group,
  tip: THREE.Vector3,
  color: THREE.Color,
  extent: SpaceExtent,
  opacity: number,
  renderOrder: number,
): void {
  const length = tip.length();
  if (length === 0) {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(extent.halfRange * 0.025, extent.halfRange * 0.044, 24),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    marker.lookAt(new THREE.Vector3(0, -1, 0));
    applyForegroundAppearance(marker, opacity, renderOrder);
    group.add(marker);
    return;
  }
  const headLength = Math.min(length * 0.28, Math.max(0.22, extent.halfRange * 0.075));
  const arrow = new THREE.ArrowHelper(
    tip.clone().normalize(),
    ORIGIN,
    length,
    color,
    headLength,
    Math.min(length * 0.16, headLength * 0.55),
  );
  applyForegroundAppearance(arrow, opacity, renderOrder);
  group.add(arrow);
}

function clearObjectGroup(group: THREE.Group): void {
  group.traverse((object) => {
    if (object === group) {
      return;
    }
    if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
      object.geometry.dispose();
    }
    if ('material' in object) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material instanceof THREE.Material) {
          material.dispose();
        }
      });
    }
    if (object instanceof CSS2DObject) {
      object.element.remove();
    }
  });
  group.clear();
}

function addSpaceCombinationGeometry(
  scene: THREE.Object3D,
  geometry: SpaceCombinationGeometry,
  spanVectors: readonly VectorValue[],
  allVectors: readonly VectorValue[],
  colors: readonly string[],
  extent: SpaceExtent,
): void {
  const vertices = geometry.vertices.map(pointToVector3);
  const facePositions: number[] = [];
  geometry.faces.forEach(([first, second, third, fourth]) => {
    facePositions.push(
      ...vertices[first].toArray(),
      ...vertices[second].toArray(),
      ...vertices[third].toArray(),
      ...vertices[first].toArray(),
      ...vertices[third].toArray(),
      ...vertices[fourth].toArray(),
    );
  });
  const faceGeometry = new THREE.BufferGeometry();
  faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(facePositions, 3));
  const faceMaterial = new THREE.MeshBasicMaterial({
    color: TARGET_COLOR,
    transparent: true,
    opacity: geometry.kind === 'parallelogram' ? 0.07 : 0.045,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const faces = new THREE.Mesh(faceGeometry, faceMaterial);
  faces.renderOrder = 2;
  scene.add(faces);

  const helperPositions: number[] = [];
  geometry.helperEdges.forEach(([startIndex, endIndex]) => {
    helperPositions.push(...vertices[startIndex].toArray(), ...vertices[endIndex].toArray());
  });
  const helperGeometry = new THREE.BufferGeometry();
  helperGeometry.setAttribute('position', new THREE.Float32BufferAttribute(helperPositions, 3));
  const helperMaterial = new THREE.LineDashedMaterial({
    color: COMBINATION_HELPER_COLOR,
    dashSize: Math.max(0.14, extent.halfRange * 0.045),
    gapSize: Math.max(0.08, extent.halfRange * 0.026),
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const helperEdges = new THREE.LineSegments(helperGeometry, helperMaterial);
  helperEdges.computeLineDistances();
  helperEdges.renderOrder = 3;
  scene.add(helperEdges);

  geometry.terms.forEach((term, index) => {
    const tip = pointToVector3(term);
    const sourceVector = spanVectors[index];
    const sourceIndex = allVectors.findIndex((vector) => vector.id === sourceVector?.id);
    const color = new THREE.Color(
      colors[(sourceIndex >= 0 ? sourceIndex : index) % colors.length] ?? '#2f6690',
    );
    addCombinationTermArrow(scene, tip, color, extent);
    scene.add(createCombinationTermLabel(
      index + 1,
      sourceVector?.name ?? `a${index + 1}`,
      color.getStyle(),
      tip,
    ));
  });

  const targetCorner = vertices[geometry.targetIndex];
  const cornerGeometry = new THREE.SphereGeometry(
    Math.max(0.07, extent.halfRange * 0.017),
    16,
    10,
  );
  const cornerMaterial = new THREE.MeshBasicMaterial({
    color: TARGET_COLOR,
    depthTest: false,
  });
  const corner = new THREE.Mesh(cornerGeometry, cornerMaterial);
  corner.position.copy(targetCorner);
  corner.renderOrder = 6;
  scene.add(corner);
}

function addCombinationTermArrow(
  scene: THREE.Object3D,
  tip: THREE.Vector3,
  color: THREE.Color,
  extent: SpaceExtent,
): void {
  const length = tip.length();
  if (length === 0) {
    const markerGeometry = new THREE.RingGeometry(
      extent.halfRange * 0.018,
      extent.halfRange * 0.032,
      20,
    );
    const markerMaterial = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.lookAt(new THREE.Vector3(0, -1, 0));
    marker.renderOrder = 5;
    scene.add(marker);
    return;
  }

  const headLength = Math.min(length * 0.24, Math.max(0.2, extent.halfRange * 0.065));
  const arrow = new THREE.ArrowHelper(
    tip.clone().normalize(),
    ORIGIN,
    length,
    color,
    headLength,
    headLength * 0.52,
  );
  applyForegroundAppearance(arrow, 0.84, 5);
  scene.add(arrow);
}

function addTargetVector(
  scene: THREE.Object3D,
  target: readonly [number, number, number],
  extent: SpaceExtent,
): RenderedTarget {
  const group = new THREE.Group();
  scene.add(group);
  const tip = new THREE.Vector3(...target);
  const color = new THREE.Color(TARGET_COLOR);
  const length = tip.length();

  if (length === 0) {
    const geometry = new THREE.RingGeometry(
      extent.halfRange * 0.032,
      extent.halfRange * 0.052,
      24,
    );
    const material = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.lookAt(new THREE.Vector3(0, -1, 0));
    marker.renderOrder = 7;
    group.add(marker);
  } else {
    const headLength = Math.min(length * 0.25, Math.max(0.24, extent.halfRange * 0.075));
    const arrow = new THREE.ArrowHelper(
      tip.clone().normalize(),
      ORIGIN,
      length,
      color,
      headLength,
      headLength * 0.55,
    );
    applyForegroundAppearance(arrow, 1, 7);
    group.add(arrow);
  }

  group.add(createTargetLabel(tip));
  const tipIndicator = createVectorTipIndicator(tip, color, extent, false);
  group.add(tipIndicator);
  return { object: group, tipIndicator };
}

function applyForegroundAppearance(
  object: THREE.Object3D,
  opacity: number,
  renderOrder: number,
): void {
  object.traverse((child) => {
    child.renderOrder = renderOrder;
    if (!('material' in child)) {
      return;
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material instanceof THREE.Material) {
        material.transparent = true;
        material.opacity = opacity;
        material.depthTest = false;
        material.depthWrite = false;
      }
    });
  });
}

function applyVectorSpanAppearance(
  object: THREE.Object3D,
  showSpan: boolean,
  selected: boolean,
): void {
  if (!showSpan) {
    return;
  }

  object.traverse((child) => {
    child.renderOrder = selected ? 5 : 1;
    if (!('material' in child)) {
      return;
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.Material)) {
        return;
      }
      material.transparent = true;
      material.opacity = selected ? 1 : 0.28;
      if (selected) {
        material.depthTest = false;
      }
    });
  });
}

function createTextLabel(
  text: string,
  className: string,
  position: THREE.Vector3,
): CSS2DObject {
  const element = document.createElement('span');
  element.className = `space-label ${className}`;
  element.textContent = text;
  const label = new CSS2DObject(element);
  label.position.copy(position);
  return label;
}

function createVectorLabel(
  name: string,
  color: string,
  position: THREE.Vector3,
  vectorIndex: number,
  muted: boolean,
): CSS2DObject {
  const element = document.createElement('span');
  element.className = `space-label space-vector-label${muted ? ' is-span-unselected' : ''}`;
  element.style.setProperty('--space-vector-color', color);
  const { base, subscript } = splitVectorName(name);
  const baseElement = document.createElement('span');
  baseElement.className = 'space-vector-label-base';
  baseElement.textContent = base;
  element.append(baseElement);

  if (subscript) {
    const subscriptElement = document.createElement('sub');
    subscriptElement.textContent = subscript;
    element.append(subscriptElement);
  }

  const label = new CSS2DObject(element);
  label.position.copy(position);
  const [centerX, centerY] = VECTOR_LABEL_CENTERS[vectorIndex % VECTOR_LABEL_CENTERS.length];
  label.center.set(centerX, centerY);
  return label;
}

function createTargetLabel(position: THREE.Vector3): CSS2DObject {
  const element = document.createElement('span');
  element.className = 'space-label space-target-label';
  element.textContent = 'v';
  const label = new CSS2DObject(element);
  label.position.copy(position);
  label.center.set(-0.42, 1.42);
  return label;
}

function createCombinationTermLabel(
  coefficientIndex: number,
  vectorName: string,
  color: string,
  position: THREE.Vector3,
): CSS2DObject {
  const element = document.createElement('span');
  element.className = 'space-label space-combination-term-label';
  element.style.setProperty('--space-combination-color', color);

  const coefficientBase = document.createElement('span');
  coefficientBase.className = 'space-coefficient-base';
  coefficientBase.textContent = 'c';
  element.append(coefficientBase);
  const coefficientSubscript = document.createElement('sub');
  coefficientSubscript.textContent = String(coefficientIndex);
  element.append(coefficientSubscript);

  const { base, subscript } = splitVectorName(vectorName);
  const vectorBase = document.createElement('span');
  vectorBase.className = 'space-combination-vector-base';
  vectorBase.textContent = base;
  element.append(vectorBase);
  if (subscript) {
    const vectorSubscript = document.createElement('sub');
    vectorSubscript.textContent = subscript;
    element.append(vectorSubscript);
  }

  const label = new CSS2DObject(element);
  label.position.copy(position);
  const patternIndex = (coefficientIndex - 1) % COMBINATION_LABEL_CENTERS.length;
  const [centerX, centerY] = COMBINATION_LABEL_CENTERS[patternIndex];
  label.center.set(centerX, centerY);
  return label;
}

function pointToVector3(point: { readonly x: number; readonly y: number; readonly z: number }): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.y, point.z);
}

function describeSpaceSpan(rank: number): string {
  if (rank === 0) {
    return '原点';
  }
  if (rank === 1) {
    return '原点を通る直線';
  }
  if (rank === 2) {
    return '原点を通る平面';
  }
  return '3次元座標空間全体';
}

function describeTargetPreviewStatus(
  status: ReturnType<typeof createSpaceTargetDragPreview>['status'],
): string {
  if (status === 'none') {
    return '選択集合の一次結合では表現できません';
  }
  if (status === 'unique') {
    return '一次結合の幾何表示を更新中（唯一解）';
  }
  return '一次結合の幾何表示を更新中（表し方は無数）';
}

function formatDirectCoordinate(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: 6,
    useGrouping: false,
  }).format(Object.is(value, -0) ? 0 : value);
}

function formatCoordinateStatus(coordinates: readonly [number, number, number]): string {
  return coordinates
    .map((coordinate, index) => `${['x', 'y', 'z'][index]} = ${formatDirectCoordinate(coordinate)}`)
    .join('、');
}

function orthographicVisibleWidth(camera: THREE.OrthographicCamera): number {
  return (camera.right - camera.left) / camera.zoom;
}

function describeSpaceVectorSnap(
  snapKind: SpaceVectorSnapKind,
  targetVectorIds: readonly string[],
  vectors: readonly VectorValue[],
): string | null {
  if (!snapKind) {
    return null;
  }
  const names = targetVectorIds.map((id) => (
    vectors.find((vector) => vector.id === id)?.name ?? id
  ));
  if (snapKind === 'parallel') {
    return `${names[0]} と平行にスナップ`;
  }
  return `${names.join('、')} と同一平面上にスナップ`;
}

function describeSpaceTargetSnap(
  snapKind: SpaceTargetSnapKind,
  basisVectorIds: readonly string[],
  vectors: readonly VectorValue[],
): string | null {
  if (!snapKind) {
    return null;
  }
  if (snapKind === 'origin') {
    return '原点にスナップ（零ベクトルとして一次結合で表現できます）';
  }
  const names = basisVectorIds.map((id) => (
    vectors.find((vector) => vector.id === id)?.name ?? id
  ));
  if (snapKind === 'span-line') {
    return `${names[0]} が生成する直線にスナップ（一次結合で表現できます）`;
  }
  return `${names.join('、')} が生成する平面にスナップ（一次結合で表現できます）`;
}

function adaptiveGridStep(gridHalfSize: number): number {
  if (gridHalfSize <= 10) {
    return 1;
  }
  if (gridHalfSize <= 25) {
    return 2;
  }
  if (gridHalfSize <= 60) {
    return 5;
  }
  return 10 ** Math.floor(Math.log10(gridHalfSize / 6));
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
      object.geometry.dispose();
    }
    if ('material' in object) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material instanceof THREE.Material) {
          material.dispose();
        }
      });
    }
  });
  scene.clear();
}

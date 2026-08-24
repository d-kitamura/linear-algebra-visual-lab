import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/addons/renderers/CSS2DRenderer.js';
import type { VectorValue } from '../domain';
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
  coordinateFromAxisConstrainedDrag,
  nudgeCoordinate,
  type ScreenPoint,
  type ThreeDimensionalInteractionMode,
} from './spaceVectorEditing';

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
  readonly interactionMode: ThreeDimensionalInteractionMode;
  readonly selectedVectorId: string | null;
  readonly onCameraChange: (camera: SharedCameraState) => void;
  readonly onInteractionModeChange: (mode: ThreeDimensionalInteractionMode) => void;
  readonly onSelectedVectorChange: (vectorId: string) => void;
  readonly onVectorCoordinateCommit: (
    vectorId: string,
    coordinateIndex: number,
    value: number,
  ) => void;
  readonly onLinearCombinationVisibility: () => void;
}

interface ThreeSpaceRuntime {
  readonly applyPreset: (preset: CameraPreset) => void;
  readonly applyCamera: (camera: SharedCameraState | null) => void;
  readonly fit: () => void;
  readonly resize: () => void;
  readonly dispose: () => void;
}

interface VectorEditHandles {
  readonly group: THREE.Group;
  readonly pickTargets: THREE.Mesh[];
  readonly handleLength: number;
}

interface ActiveAxisDrag {
  readonly pointerId: number;
  readonly coordinateIndex: number;
  readonly initialCoordinate: number;
  readonly startPointer: ScreenPoint;
  readonly pixelsPerCoordinate: ScreenPoint;
  readonly coordinates: [number, number, number];
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
  interactionMode,
  selectedVectorId,
  onCameraChange,
  onInteractionModeChange,
  onSelectedVectorChange,
  onVectorCoordinateCommit,
  onLinearCombinationVisibility,
}: VectorSpace3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ThreeSpaceRuntime | null>(null);
  const cameraRef = useRef(camera);
  const onCameraChangeRef = useRef(onCameraChange);
  const onVectorCoordinateCommitRef = useRef(onVectorCoordinateCommit);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const selectedVector = vectors.find((vector) => vector.id === selectedVectorId)
    ?? vectors[0]
    ?? null;

  cameraRef.current = camera;
  onCameraChangeRef.current = onCameraChange;
  onVectorCoordinateCommitRef.current = onVectorCoordinateCommit;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    setErrorMessage(null);
    setInteractionMessage(null);
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
        interactionMode,
        selectedVector?.id ?? null,
        cameraRef.current,
        (nextCamera) => onCameraChangeRef.current(nextCamera),
        (vectorId, coordinateIndex, value) => {
          onVectorCoordinateCommitRef.current(vectorId, coordinateIndex, value);
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
    interactionMode,
    selectedVector?.id,
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
    <section className="three-dimensional-plot-card" aria-labelledby="space-3d-title">
      <div className="three-dimensional-heading">
        <div>
          <p className="panel-kicker">3D coordinate space</p>
          <h2 id="space-3d-title">3次元座標空間</h2>
        </div>
        <div className="three-dimensional-toolbar">
          <button
            className="target-mode-button"
            type="button"
            aria-pressed={linearCombinationVisible}
            onClick={onLinearCombinationVisibility}
          >
            {linearCombinationVisible ? '一次結合モードを終了' : '一次結合を調べる'}
          </button>
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

      <div className="three-dimensional-interaction-panel">
        <div className="three-dimensional-mode-switch">
          <div>
            <strong>3D表示の操作</strong>
            <span>カメラとベクトルの誤操作を防ぐため、先に操作対象を選びます。</span>
          </div>
          <div className="three-dimensional-mode-buttons" role="group" aria-label="3D操作モード">
            <button
              type="button"
              aria-pressed={interactionMode === 'camera'}
              onClick={() => onInteractionModeChange('camera')}
            >
              視点を操作
            </button>
            <button
              type="button"
              aria-pressed={interactionMode === 'vector'}
              onClick={() => onInteractionModeChange('vector')}
              disabled={vectors.length === 0}
            >
              ベクトルを操作
            </button>
          </div>
        </div>

        {interactionMode === 'vector' && selectedVector ? (
          <div className="three-dimensional-vector-direct-editor">
            <label>
              <span>操作するベクトル</span>
              <select
                value={selectedVector.id}
                onChange={(event) => onSelectedVectorChange(event.target.value)}
              >
                {vectors.map((vector) => (
                  <option key={vector.id} value={vector.id}>{vector.name}</option>
                ))}
              </select>
            </label>
            <div className="three-dimensional-axis-nudges" aria-label={`${selectedVector.name}の成分微調整`}>
              {(['x', 'y', 'z'] as const).map((axis, coordinateIndex) => {
                const coordinate = selectedVector.coordinates[coordinateIndex] ?? 0;
                return (
                  <div className={`three-dimensional-axis-nudge axis-${axis}`} key={axis}>
                    <span className="three-dimensional-axis-name">{axis}</span>
                    <output aria-label={`${axis}成分の現在値`}>{formatDirectCoordinate(coordinate)}</output>
                    <button
                      type="button"
                      aria-label={`${selectedVector.name}の${axis}成分を0.1減らす`}
                      onClick={() => onVectorCoordinateCommit(
                        selectedVector.id,
                        coordinateIndex,
                        nudgeCoordinate(coordinate, -0.1),
                      )}
                    >
                      −0.1
                    </button>
                    <button
                      type="button"
                      aria-label={`${selectedVector.name}の${axis}成分を0.1増やす`}
                      onClick={() => onVectorCoordinateCommit(
                        selectedVector.id,
                        coordinateIndex,
                        nudgeCoordinate(coordinate, 0.1),
                      )}
                    >
                      ＋0.1
                    </button>
                  </div>
                );
              })}
            </div>
            <p>
              矢先の色付きハンドルをドラッグすると、その軸の成分だけが変わります。
              数値入力は右側の「ベクトル編集」でも利用できます。
            </p>
          </div>
        ) : null}
      </div>

      <div
        className={`three-dimensional-render-frame ${errorMessage ? 'has-error' : ''}`}
        role="group"
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
          </div>
        ) : null}
      </div>

      <p className="three-dimensional-help">
        {interactionMode === 'camera'
          ? '「視点を操作」では、ドラッグで回転、ホイールまたは2本指で拡大・縮小、右ドラッグまたは2本指ドラッグで表示位置を移動できます。'
          : '「ベクトルを操作」では、選択したベクトルの矢先にあるx・y・zハンドルをマウス、指、ペンでドラッグできます。背景のドラッグでは視点は動きません。'}
        {showSpan ? ' 灰色の形状は、選択したベクトルが生成する空間です。' : ''}
        {linearCombinationVisible
          ? ' ターゲットは数値入力で変更し、係数の幾何表示を視点回転して確認できます。'
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
  interactionMode: ThreeDimensionalInteractionMode,
  selectedVectorId: string | null,
  initialCamera: SharedCameraState | null,
  onCameraChange: (camera: SharedCameraState) => void,
  onVectorCoordinateCommit: (
    vectorId: string,
    coordinateIndex: number,
    value: number,
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
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    'aria-label',
    interactionMode === 'camera'
      ? '3D座標空間。視点操作モードです。ドラッグで回転、ホイールまたはピンチで拡大縮小、右ドラッグまたは2本指ドラッグで移動できます。'
      : '3D座標空間。ベクトル操作モードです。選択したベクトルの矢先にあるx、y、zハンドルをドラッグすると、その成分だけを変更できます。',
  );
  host.append(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'three-dimensional-label-layer';
  labelRenderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(labelRenderer.domElement);

  addGrid(scene, extent);
  if (showSpan) {
    addSpanGeometry(scene, spanVectors, spanRank, extent);
  }
  addAxes(scene, extent);
  addOrigin(scene, extent);
  if (combinationGeometry) {
    addSpaceCombinationGeometry(scene, combinationGeometry, spanVectors, vectors, colors, extent);
  }
  addVectors(
    scene,
    vectors,
    colors,
    extent,
    new Set(spanVectors.map((vector) => vector.id)),
    showSpan,
  );
  if (linearCombinationVisible && linearCombinationTarget) {
    addTargetVector(scene, linearCombinationTarget, extent);
  }
  const selectedVector = vectors.find((vector) => vector.id === selectedVectorId) ?? null;
  const editHandles = interactionMode === 'vector' && selectedVector
    ? addVectorEditHandles(scene, selectedVector, extent)
    : null;
  const editPreview = new THREE.Group();
  editPreview.renderOrder = 10;
  scene.add(editPreview);

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
  controls.enabled = interactionMode === 'camera';

  let disposed = false;
  let resizeObserver: ResizeObserver | null = null;
  let activeAxisDrag: ActiveAxisDrag | null = null;

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

  const handlePointerDown = (event: PointerEvent) => {
    if (activeAxisDrag || !editHandles || !selectedVector || event.button !== 0) {
      return;
    }
    const rect = renderer.domElement.getBoundingClientRect();
    pointerPosition.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointerPosition, camera);
    const intersection = raycaster.intersectObjects(editHandles.pickTargets, false)[0];
    const coordinateIndex = intersection?.object.userData.coordinateIndex;
    if (typeof coordinateIndex !== 'number') {
      return;
    }

    const pixelsPerCoordinate = projectedAxisPixelsPerCoordinate(
      editHandles.group.position,
      coordinateIndex,
      editHandles.handleLength,
      camera,
      rect,
    );
    const projectedHandleLength = Math.hypot(
      pixelsPerCoordinate.x * editHandles.handleLength,
      pixelsPerCoordinate.y * editHandles.handleLength,
    );
    if (projectedHandleLength < 10) {
      onInteractionMessage(
        'この視点では選んだ軸が画面の奥行き方向を向いています。視点プリセットを変えてください。',
      );
      return;
    }

    event.preventDefault();
    renderer.domElement.setPointerCapture(event.pointerId);
    activeAxisDrag = {
      pointerId: event.pointerId,
      coordinateIndex,
      initialCoordinate: selectedVector.coordinates[coordinateIndex] ?? 0,
      startPointer: { x: event.clientX, y: event.clientY },
      pixelsPerCoordinate,
      coordinates: [
        selectedVector.coordinates[0] ?? 0,
        selectedVector.coordinates[1] ?? 0,
        selectedVector.coordinates[2] ?? 0,
      ],
    };
    const axisName = ['x', 'y', 'z'][coordinateIndex];
    onInteractionMessage(`${selectedVector.name} の ${axisName} 成分を編集中です。`);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!activeAxisDrag || activeAxisDrag.pointerId !== event.pointerId || !selectedVector) {
      return;
    }
    event.preventDefault();
    const nextCoordinate = coordinateFromAxisConstrainedDrag(
      activeAxisDrag.initialCoordinate,
      activeAxisDrag.startPointer,
      { x: event.clientX, y: event.clientY },
      activeAxisDrag.pixelsPerCoordinate,
    );
    if (nextCoordinate === null) {
      return;
    }
    activeAxisDrag.coordinates[activeAxisDrag.coordinateIndex] = nextCoordinate;
    const tip = new THREE.Vector3(...activeAxisDrag.coordinates);
    editHandles?.group.position.copy(tip);
    updateVectorEditPreview(
      editPreview,
      tip,
      selectedVector,
      vectors,
      colors,
      extent,
    );
    const axisName = ['x', 'y', 'z'][activeAxisDrag.coordinateIndex];
    onInteractionMessage(
      `${selectedVector.name} の ${axisName} 成分：${formatDirectCoordinate(nextCoordinate)}`,
    );
    render();
  };

  const finishAxisDrag = (event: PointerEvent, commit: boolean) => {
    if (!activeAxisDrag || activeAxisDrag.pointerId !== event.pointerId || !selectedVector) {
      return;
    }
    event.preventDefault();
    const completedDrag = activeAxisDrag;
    activeAxisDrag = null;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
    if (commit) {
      const value = completedDrag.coordinates[completedDrag.coordinateIndex];
      onInteractionMessage(
        `${selectedVector.name} の ${['x', 'y', 'z'][completedDrag.coordinateIndex]} 成分を ${formatDirectCoordinate(value)} に変更しました。`,
      );
      onVectorCoordinateCommit(selectedVector.id, completedDrag.coordinateIndex, value);
      return;
    }
    editHandles?.group.position.set(
      selectedVector.coordinates[0] ?? 0,
      selectedVector.coordinates[1] ?? 0,
      selectedVector.coordinates[2] ?? 0,
    );
    clearObjectGroup(editPreview);
    onInteractionMessage('ベクトルの変更を取り消しました。');
    render();
  };
  const handlePointerUp = (event: PointerEvent) => finishAxisDrag(event, true);
  const handlePointerCancel = (event: PointerEvent) => finishAxisDrag(event, false);
  const handleLostPointerCapture = (event: PointerEvent) => finishAxisDrag(event, false);

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    onError('3D描画の接続が失われました。ページを再読み込みしてください。');
  };
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  renderer.domElement.addEventListener('pointermove', handlePointerMove);
  renderer.domElement.addEventListener('pointerup', handlePointerUp);
  renderer.domElement.addEventListener('pointercancel', handlePointerCancel);
  renderer.domElement.addEventListener('lostpointercapture', handleLostPointerCapture);
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
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointercancel', handlePointerCancel);
      renderer.domElement.removeEventListener('lostpointercapture', handleLostPointerCapture);
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
  scene: THREE.Scene,
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

function addSpanOrigin(scene: THREE.Scene, extent: SpaceExtent): void {
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
  scene: THREE.Scene,
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
  scene: THREE.Scene,
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
  scene: THREE.Scene,
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
): void {
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

    scene.add(createVectorLabel(
      vector.name,
      color.getStyle(),
      tip,
      index,
      showSpan && !isSpanSelected,
    ));
  });
}

function addVectorEditHandles(
  scene: THREE.Scene,
  vector: VectorValue,
  extent: SpaceExtent,
): VectorEditHandles {
  const group = new THREE.Group();
  group.name = 'vector-edit-handles';
  group.position.set(
    vector.coordinates[0] ?? 0,
    vector.coordinates[1] ?? 0,
    vector.coordinates[2] ?? 0,
  );
  const handleLength = Math.max(0.72, extent.halfRange * 0.18);
  const visibleRadius = Math.max(0.065, extent.halfRange * 0.015);
  const pickRadius = visibleRadius * 2.4;
  const pickTargets: THREE.Mesh[] = [];
  const directions = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];

  (['x', 'y', 'z'] as const).forEach((axis, coordinateIndex) => {
    const color = new THREE.Color(AXIS_COLORS[axis]);
    const direction = directions[coordinateIndex];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      direction.clone().multiplyScalar(-handleLength),
      direction.clone().multiplyScalar(handleLength),
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.86,
      depthTest: false,
      depthWrite: false,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 9;
    group.add(line);

    for (const sign of [-1, 1]) {
      const position = direction.clone().multiplyScalar(handleLength * sign);
      const endpointGeometry = new THREE.SphereGeometry(visibleRadius, 16, 10);
      const endpointMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        depthWrite: false,
      });
      const endpoint = new THREE.Mesh(endpointGeometry, endpointMaterial);
      endpoint.position.copy(position);
      endpoint.renderOrder = 10;
      group.add(endpoint);

      const pickGeometry = new THREE.SphereGeometry(pickRadius, 12, 8);
      const pickMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.001,
        depthTest: false,
        depthWrite: false,
      });
      const pickTarget = new THREE.Mesh(pickGeometry, pickMaterial);
      pickTarget.position.copy(position);
      pickTarget.userData.coordinateIndex = coordinateIndex;
      pickTarget.renderOrder = 11;
      group.add(pickTarget);
      pickTargets.push(pickTarget);
    }

    const label = createTextLabel(
      axis,
      `space-edit-axis-label axis-${axis}`,
      direction.clone().multiplyScalar(handleLength * 1.2),
    );
    group.add(label);
  });

  scene.add(group);
  return { group, pickTargets, handleLength };
}

function projectedAxisPixelsPerCoordinate(
  tip: THREE.Vector3,
  coordinateIndex: number,
  handleLength: number,
  camera: THREE.Camera,
  rect: DOMRect,
): ScreenPoint {
  const axisDirection = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ][coordinateIndex];
  const projectedTip = projectWorldPointToScreen(tip, camera, rect);
  const projectedHandle = projectWorldPointToScreen(
    tip.clone().addScaledVector(axisDirection, handleLength),
    camera,
    rect,
  );
  return {
    x: (projectedHandle.x - projectedTip.x) / handleLength,
    y: (projectedHandle.y - projectedTip.y) / handleLength,
  };
}

function projectWorldPointToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  rect: DOMRect,
): ScreenPoint {
  const projected = point.clone().project(camera);
  return {
    x: rect.left + ((projected.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - projected.y) / 2) * rect.height,
  };
}

function updateVectorEditPreview(
  group: THREE.Group,
  tip: THREE.Vector3,
  vector: VectorValue,
  vectors: readonly VectorValue[],
  colors: readonly string[],
  extent: SpaceExtent,
): void {
  clearObjectGroup(group);
  const vectorIndex = vectors.findIndex((candidate) => candidate.id === vector.id);
  const color = new THREE.Color(colors[Math.max(0, vectorIndex) % colors.length] ?? '#2f6690');
  const length = tip.length();

  if (length === 0) {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(extent.halfRange * 0.025, extent.halfRange * 0.044, 24),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    marker.lookAt(new THREE.Vector3(0, -1, 0));
    applyForegroundAppearance(marker, 0.78, 9);
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
  applyForegroundAppearance(arrow, 0.74, 9);
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
  });
  group.clear();
}

function addSpaceCombinationGeometry(
  scene: THREE.Scene,
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
  scene: THREE.Scene,
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
  scene: THREE.Scene,
  target: readonly [number, number, number],
  extent: SpaceExtent,
): void {
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
    scene.add(marker);
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
    scene.add(arrow);
  }

  scene.add(createTargetLabel(tip));
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

function formatDirectCoordinate(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: 6,
    useGrouping: false,
  }).format(Object.is(value, -0) ? 0 : value);
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

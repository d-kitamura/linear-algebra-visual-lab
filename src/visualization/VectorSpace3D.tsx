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
  createCameraPose,
  createSharedCameraState,
  createSpaceExtent,
  createSpaceSpanGeometry,
  orthographicHalfHeight,
  type CameraPreset,
  type SpaceExtent,
  type SpaceSpanGeometry,
} from './spaceGeometry';

interface VectorSpace3DProps {
  readonly vectors: readonly VectorValue[];
  readonly colors: readonly string[];
  readonly spanVectors: readonly VectorValue[];
  readonly spanRank: number;
  readonly showSpan: boolean;
  readonly active: boolean;
  readonly resetKey: number;
  readonly camera: SharedCameraState | null;
  readonly onCameraChange: (camera: SharedCameraState) => void;
}

interface ThreeSpaceRuntime {
  readonly applyPreset: (preset: CameraPreset) => void;
  readonly applyCamera: (camera: SharedCameraState | null) => void;
  readonly fit: () => void;
  readonly resize: () => void;
  readonly dispose: () => void;
}

const ORIGIN = new THREE.Vector3(0, 0, 0);
const AXIS_COLORS = {
  x: '#9c4f45',
  y: '#3f756b',
  z: '#3e6687',
} as const;
const SPAN_COLOR = '#737b82';

export function VectorSpace3D({
  vectors,
  colors,
  spanVectors,
  spanRank,
  showSpan,
  active,
  resetKey,
  camera,
  onCameraChange,
}: VectorSpace3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ThreeSpaceRuntime | null>(null);
  const cameraRef = useRef(camera);
  const onCameraChangeRef = useRef(onCameraChange);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  cameraRef.current = camera;
  onCameraChangeRef.current = onCameraChange;

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
        cameraRef.current,
        (nextCamera) => onCameraChangeRef.current(nextCamera),
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
  }, [colors, showSpan, spanRank, spanVectors, vectors]);

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

      <div
        className={`three-dimensional-render-frame ${errorMessage ? 'has-error' : ''}`}
        role="group"
        aria-label={`右手座標系の3次元座標空間。x軸、y軸、z軸と${vectors.length}本のベクトルを表示しています。${showSpan ? `選択したベクトルが生成する${describeSpaceSpan(spanRank)}を灰色の幾何形状で表示しています。` : '生成する空間の幾何表示はオフです。'}`}
      >
        <div className="three-dimensional-render-host" ref={hostRef} />
        {errorMessage ? (
          <div className="three-dimensional-error" role="alert">
            <strong>3D表示を利用できません</strong>
            <p>{errorMessage}</p>
          </div>
        ) : null}
      </div>

      <p className="three-dimensional-help">
        ドラッグで視点を回転し、ホイールまたは2本指で拡大・縮小できます。
        右ドラッグまたは2本指ドラッグで表示位置を移動できます。
        {showSpan ? ' 灰色の形状は、選択したベクトルが生成する空間です。' : ''}
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
  initialCamera: SharedCameraState | null,
  onCameraChange: (camera: SharedCameraState) => void,
  onError: (message: string) => void,
): ThreeSpaceRuntime {
  host.replaceChildren();

  const extent = createSpaceExtent(vectors);
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
    '3D座標空間。ドラッグで回転、ホイールまたはピンチで拡大縮小、右ドラッグまたは2本指ドラッグで移動できます。',
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
  addVectors(
    scene,
    vectors,
    colors,
    extent,
    new Set(spanVectors.map((vector) => vector.id)),
    showSpan,
  );

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

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    onError('3D描画の接続が失われました。ページを再読み込みしてください。');
  };
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
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

    const labelOffset = length === 0
      ? new THREE.Vector3(0.18, 0, 0.18)
      : tip.clone().normalize().multiplyScalar(Math.max(0.16, extent.halfRange * 0.045));
    scene.add(createVectorLabel(
      vector.name,
      color.getStyle(),
      tip.clone().add(labelOffset),
      index,
      showSpan && !isSpanSelected,
    ));
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
  label.center.set(vectorIndex % 2 === 0 ? -0.08 : 1.08, 0.5);
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

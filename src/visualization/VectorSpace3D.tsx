import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/addons/renderers/CSS2DRenderer.js';
import type { VectorValue } from '../domain';
import { splitVectorName } from '../ui';
import {
  createCameraPose,
  createSpaceExtent,
  orthographicHalfHeight,
  type CameraPreset,
  type SpaceExtent,
} from './spaceGeometry';

interface VectorSpace3DProps {
  readonly vectors: readonly VectorValue[];
  readonly colors: readonly string[];
  readonly active: boolean;
  readonly resetKey: number;
}

interface ThreeSpaceRuntime {
  readonly applyPreset: (preset: CameraPreset) => void;
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

export function VectorSpace3D({
  vectors,
  colors,
  active,
  resetKey,
}: VectorSpace3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ThreeSpaceRuntime | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    setErrorMessage(null);
    let disposed = false;

    try {
      const runtime = createThreeSpaceRuntime(host, vectors, colors, (message) => {
        if (!disposed) {
          setErrorMessage(message);
        }
      });
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
  }, [colors, vectors]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => runtimeRef.current?.resize());
    return () => window.cancelAnimationFrame(frameId);
  }, [active]);

  useEffect(() => {
    runtimeRef.current?.applyPreset('isometric');
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
        aria-label={`右手座標系の3次元座標空間。x軸、y軸、z軸と${vectors.length}本のベクトルを表示しています。`}
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
        ページをスクロールするときは3D表示の外側を操作してください。
      </p>
    </section>
  );
}

function createThreeSpaceRuntime(
  host: HTMLDivElement,
  vectors: readonly VectorValue[],
  colors: readonly string[],
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
  addAxes(scene, extent);
  addOrigin(scene, extent);
  addVectors(scene, vectors, colors, extent);

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

  let disposed = false;
  let resizeObserver: ResizeObserver | null = null;

  const render = () => {
    if (disposed) {
      return;
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
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
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    onError('3D描画の接続が失われました。ページを再読み込みしてください。');
  };
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
  controls.addEventListener('change', render);

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  applyPreset('isometric');
  resize();

  return {
    applyPreset,
    fit,
    resize,
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      resizeObserver?.disconnect();
      controls.removeEventListener('change', render);
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
): void {
  vectors.forEach((vector, index) => {
    const tip = new THREE.Vector3(
      vector.coordinates[0] ?? 0,
      vector.coordinates[1] ?? 0,
      vector.coordinates[2] ?? 0,
    );
    const length = tip.length();
    const color = new THREE.Color(colors[index % colors.length] ?? '#2f6690');

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
    } else {
      const direction = tip.clone().normalize();
      const headLength = Math.min(length * 0.28, Math.max(0.22, extent.halfRange * 0.075));
      const headWidth = Math.min(length * 0.16, headLength * 0.55);
      scene.add(new THREE.ArrowHelper(direction, ORIGIN, length, color, headLength, headWidth));
    }

    const labelOffset = length === 0
      ? new THREE.Vector3(0.18, 0, 0.18)
      : tip.clone().normalize().multiplyScalar(Math.max(0.16, extent.halfRange * 0.045));
    scene.add(createVectorLabel(
      vector.name,
      color.getStyle(),
      tip.clone().add(labelOffset),
      index,
    ));
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
): CSS2DObject {
  const element = document.createElement('span');
  element.className = 'space-label space-vector-label';
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

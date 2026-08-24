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
  });
});

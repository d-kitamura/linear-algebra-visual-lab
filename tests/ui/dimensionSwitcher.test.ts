import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(
  new URL('../../src/labs/vector-space/VectorSpaceLab.tsx', import.meta.url),
  'utf8',
);
const cssSource = readFileSync(
  new URL('../../src/app/App.css', import.meta.url),
  'utf8',
);

describe('0D/1D/2D/3D次元切替', () => {
  it('対等な4択のタブとして実装し、既存共有URLの次元を初期選択に使う', () => {
    expect(appSource).toContain("{ dimension: 0, label: '0D零ベクトル空間'");
    expect(appSource).toContain("{ dimension: 1, label: '1D数直線'");
    expect(appSource).toContain("{ dimension: 2, label: '2D座標平面'");
    expect(appSource).toContain("{ dimension: 3, label: '3D座標空間'");
    expect(appSource).toContain('role="tablist"');
    expect(appSource).toContain('initialization.activeDimension');
    expect(appSource).toContain('aria-selected={activeDimension === tab.dimension}');
  });

  it('左右・Home・Endキーでタブを切り替えられる', () => {
    expect(appSource).toContain("event.key === 'ArrowRight'");
    expect(appSource).toContain("event.key === 'ArrowLeft'");
    expect(appSource).toContain("event.key === 'Home'");
    expect(appSource).toContain("event.key === 'End'");
    expect(appSource).toContain('handleDimensionTabKeyDown');
  });

  it('1D・2D・3DのCurrentStateを別々に保持し、Resetの対象を現在の次元に限る', () => {
    expect(appSource).toContain('const [oneDimensionalState, setOneDimensionalState]');
    expect(appSource).toContain('const [state, setState]');
    expect(appSource).toContain('const [threeDimensionalState, setThreeDimensionalState]');
    expect(appSource).toContain('if (activeDimension === 3)');
    expect(appSource).toContain('setThreeDimensionalState(initial3DState)');
    expect(appSource).toContain('setState(initial2DState)');
    expect(appSource).toContain('setOneDimensionalState(initialOneDimensionalState)');
    expect(appSource).toContain('hidden={activeDimension !== 0}');
    expect(appSource).toContain('hidden={activeDimension !== 1}');
    expect(appSource).toContain('hidden={activeDimension !== 2}');
    expect(appSource).toContain('hidden={activeDimension !== 3}');
  });

  it('2D/3Dのエクスポートには現在の次元だけを渡し、0D/1Dは10.7まで停止する', () => {
    expect(appSource).toContain(
      'const activeShareState = activeDimension === 3 ? threeDimensionalState : state',
    );
    expect(appSource).toContain('const shareIsDeferredForDimension = activeDimension === 0 || activeDimension === 1');
    expect(appSource).toContain(
      'buildShareUrl(window.location.href, activeShareState)',
    );
  });

  it('狭い画面でも4択を横並びに保ち、短いラベルへ切り替える', () => {
    expect(cssSource).toMatch(
      /\.dimension-tablist\s*\{[^}]*grid-template-columns:\s*repeat\(4,/su,
    );
    expect(cssSource).toMatch(
      /@media \(max-width: 640px\)[\s\S]*?\.dimension-tab-label-wide\s*\{\s*display:\s*none;/u,
    );
  });
});

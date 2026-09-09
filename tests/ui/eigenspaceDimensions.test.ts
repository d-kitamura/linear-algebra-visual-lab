import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EigenspaceLab } from '../../src/labs/eigenspace/EigenspaceLab';
import { createEigenSceneForDimension, createEigenScene } from '../../src/labs/eigenspace/eigenScene';
import { VectorSpace3D } from '../../src/visualization/VectorSpace3D';

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const render = (n: 0 | 1 | 2 | 3, active = true) => renderToStaticMarkup(createElement(EigenspaceLab,
  { active, initialScene: createEigenSceneForDimension(n) }));

describe('12.4 固有値Labの次元別画面', () => {
  it('0Dは一点・g=1・固有値なしで、成分入力を置かない', () => {
    const html = render(0);
    expect(html).toContain('zero-space-point');
    expect(html).not.toContain('inputMode="decimal"');
    expect(html).toContain('固有値も固有ベクトルも固有空間もありません');
    expect(html).toContain('0×0行列の行列式は1です');
    expect(html).toContain('正の次元の零変換（固有値0）とは異なります');
    expect(html).not.toContain('空の組がこの空間の基底');
    expect(html.match(/aria-pressed=/g)).toHaveLength(4);
  });
  it('1Dは2個の入力と1個の編集可能な矢先。負と零固有値を扱う', () => {
    const html = render(1);
    expect(html.match(/inputMode="decimal"/g)).toHaveLength(2);
    expect(html.match(/class="line-vector-drag-handle/g)).toHaveLength(1);
    expect(html).toContain('λ'); expect(html).toContain('−2');
    expect(html).toContain('svg-map-symbol');
    expect(html).toContain('stroke-width:9');
    expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
    const zero = renderToStaticMarkup(createElement(EigenspaceLab, { active: true, initialScene: createEigenScene([[0]]) }));
    expect(zero).toContain('非零の入力が零へ写ります');
    expect(zero).toContain('固有空間の次元：1');
  });
  it('3Dは12個の成分入力、平面と直線の解析。非表示LabはThree.jsをマウントしない', () => {
    const html = render(3, false);
    expect(html.match(/inputMode="decimal"/g)).toHaveLength(12);
    expect(html).toContain('固有空間の次元：1');
    expect(html).toContain('固有空間の次元：2');
    expect(html).not.toContain('three-dimensional-render-host');
    expect(html.match(/role="tabpanel"/g)).toHaveLength(4);
  });
  it('3D previewは確定vectorsから分離し、取消し・像の保留と個別空間を接続する', () => {
    const source = read('src/labs/eigenspace/EigenspaceLab.tsx');
    expect(source).toContain('[committedResult.imageVector, scene.input]');
    expect(source).toContain('vectorCoordinatePreview={imagePreview}');
    expect(source).toContain('spanGroups={spaceGroups}');
    expect(source).toContain('dimension === 3 && active');
    expect(source).toContain('onVectorCoordinatesPreview={(_, coordinates) => setPreview(coordinates)}');
    expect(source).toContain('snapEigenSpaceInput(scene, analysis, coordinates, distance)');
    const common = read('src/visualization/VectorSpace3D.tsx');
    expect(common).toContain('for (const group of spanGroups) addSpanGeometry');
    expect(common).toContain('if (!preview.coordinates) { render(); return; }');
    expect(common).toContain('opaque ? 1 : 0.86');
    expect(common).toContain('clearObjectGroup(vectorCoordinatePreviewGroup)');
    expect(common).toContain('runtime.setVectorCoordinatePreview(vectorCoordinatePreviewRef.current)');
    expect(read('src/visualization/VectorLine1D.tsx')).toContain("event.type !== 'pointerup' && onVectorDragCancel");
  });
  it('共通3Dの代替テキストでも平面と直線を別々に説明する', () => {
    const noop = () => {};
    const html = renderToStaticMarkup(createElement(VectorSpace3D, {
      vectors: [], colors: [], spanVectors: [], spanRank: 1, showSpan: true,
      spanGroups: [{ vectors: [], rank: 1, label: 'λ=−1の固有空間' }, { vectors: [], rank: 2, label: 'λ=2の固有空間' }],
      linearCombinationVisible: false, linearCombinationTarget: null, linearCombinationCoefficients: null,
      active: true, resetKey: 0, camera: null, onCameraChange: noop, onVectorCoordinatesCommit: noop,
      onLinearCombinationTargetPlacement: noop, onLinearCombinationVisibility: noop,
      showLinearCombinationControl: false, showHelpText: false,
    }));
    expect(html).toContain('λ=−1の固有空間：');
    expect(html).toContain('λ=2の固有空間：');
    expect(html).toContain('個別の半透明');
    expect(html).not.toContain('一次結合を調べる');
  });
});

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { analyzeEigenInput, analyzeEigenMap } from '../../src/domain';
import { EigenspaceLab, EigenPanel, eigenRootLabels, eigenVectorPresentation } from '../../src/labs/eigenspace/EigenspaceLab';
import { createEigenScene } from '../../src/labs/eigenspace/eigenScene';
import { VectorPlane2D } from '../../src/visualization';
import { DEFAULT_PLANE_VIEWPORT } from '../../src/visualization/planeGeometry';

const read = (file: string) => readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
const markup = (matrix: number[][], input: readonly [number, number] = [2, 1]) => renderToStaticMarkup(createElement(EigenspaceLab,
  { active: true, initialScene: { ...createEigenScene(matrix), input } }));
describe('12.3 固有値Lab画面', () => {
  it('第五Labの独立マウント・1図・6数値入力・4解析タブを接続する', () => {
    const html = markup([[2, 1], [1, 2]]);
    expect(read('src/app/App.tsx')).toContain("<EigenspaceLab active={activeLabId === 'eigenspace'} />");
    expect(read('src/app/App.tsx')).toContain("hidden={activeLabId !== 'eigenspace'}");
    expect(read('src/app/LabMenu.tsx')).toContain("id: 'eigenspace'");
    expect(html).toContain('固有値と固有空間');
    expect(html.match(/<svg/g)).toHaveLength(1);
    expect(html.match(/type="text"/g)).toHaveLength(6);
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(4);
    expect(html.match(/role="tabpanel"[^>]*hidden=""/g)).toHaveLength(3);
    expect(html.match(/class="vector-drag-handle/g)).toHaveLength(1);
    expect(html).toContain('列ベクトル 5、4');
    expect(html).toMatch(/disabled=""[^>]*>共有URLをエクスポート/);
    expect(html).toContain('math-vector-subscript');
  });
  it('実固有値なしと判定保留を混同せず、不明な空間を描画しない', () => {
    const rotation = markup([[0, -1], [1, 0]]);
    expect(rotation).toContain('この線形変換には実固有値がありません');
    const pending = markup([[1, 1], [1e-24, 1]]);
    expect(pending).toContain('数値判定を保留しています');
    expect(pending).toContain('固有空間の次元：判定保留');
    expect(pending).not.toContain('class="span-geometry-label"');
    expect(pending).not.toContain('この線形変換には実固有値がありません');
  });
  it('重複度と空間次元を分け、零入力・零への像・選択外の所属も説明する', () => {
    const jordan = markup([[2, 1], [0, 2]], [1, 0]);
    expect(jordan).toContain('固有値の重複度：2'); expect(jordan).toContain('固有空間の次元：1');
    const scalar = markup([[2, 0], [0, 2]], [0, 0]);
    expect(scalar).toContain('固有空間の次元：2');
    expect(scalar).toContain('零ベクトルは固有ベクトルではありません');
    expect(scalar).toContain('選択した固有空間に属します');
    expect(markup([[0, 0], [0, 2]], [1, 0])).toContain('非零の入力が零へ写ります');
    expect(markup([[1, 0], [0, 2]], [0, 1])).toContain('選択中とは別の固有値');
  });
  it('固有方程式はdet(A−λE)の係数と符号を表示し、選択の表示丸めで根を併合しない', () => {
    const analysis = analyzeEigenMap(createEigenScene().definition);
    const html = renderToStaticMarkup(createElement(EigenPanel, { tab: 'equation', analysis, input: analyzeEigenInput(analysis, [2, 1]), selected: 0 }));
    expect(html).toContain('det('); expect(html).toContain('− 4'); expect(html).toContain('+ 3');
    const labels = eigenRootLabels(analyzeEigenMap(createEigenScene([[1, 0], [0, 1 + 1e-12]]).definition));
    expect(labels[0]).toContain('λ ≈ 1'); expect(labels[1]).toContain('1.000000000001');
  });
  it('完全一致は1本の矢印と両ラベル、近接終点は上下に分離する', () => {
    const viewport = DEFAULT_PLANE_VIEWPORT;
    const same = eigenVectorPresentation([1, 1], [1, 1], viewport);
    expect(same['eigen-image'].hideArrow).toBe(true);
    const html = renderToStaticMarkup(createElement(VectorPlane2D, { vectors: [
      { id: 'eigen-image', name: 'T(u)', coordinates: [1, 1] }, { id: 'eigen-input', name: 'u', coordinates: [1, 1] }],
      colors: ['red', 'blue'], editableVectorIds: ['eigen-input'], vectorPresentation: same }));
    expect(html.match(/<polygon/g)).toHaveLength(1);
    expect(html.match(/class="vector-label"/g)).toHaveLength(1);
    expect(html).toContain('svg-map-symbol');
    const near = eigenVectorPresentation([1, 1], [1.01, 1], viewport);
    expect(near['eigen-image'].labelOffset![1]).toBeGreaterThan(near['eigen-input'].labelOffset![1]);
    expect(near['eigen-image'].outline).toBe(true);
  });
  it('Reset、ドラッグの確定・取消し、範囲固定、キーボード・390px用構造を接続する', () => {
    const source = read('src/labs/eigenspace/EigenspaceLab.tsx');
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) expect(source).toContain(key);
    expect(source).toContain('setScene(initial); setTab(\'values\'); setManualViewport(null)');
    expect(source).toContain('dragViewport ?? manualViewport ?? createAutoFitViewport(vectors)');
    expect(source).toContain('analyzeEigenMap(scene.definition), [scene.definition]');
    expect(source).toContain('onVectorDragCancel={cancelDrag}');
    expect(read('src/visualization/VectorPlane2D.tsx')).toContain("event.type !== 'pointerup' && onVectorDragCancel");
    expect(read('src/labs/eigenspace/eigenspace.css')).toContain('@media (max-width: 640px)');
    expect(source).not.toContain('ShareExportDialog');
  });
});

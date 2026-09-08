import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RepresentationMatrixLab, RepresentationSceneView } from '../../src/labs/representation-matrix/RepresentationMatrixLab';
import { VectorPlane2D, VectorLine1D } from '../../src/visualization';
import { createRepresentationScene, REPRESENTATION_DIMENSIONS, setRepresentationVector } from '../../src/labs/representation-matrix/representationMatrixState';
import { createRepresentationViewState } from '../../src/labs/representation-matrix/representationWorkspace';

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const source = read('src/labs/representation-matrix/RepresentationMatrixLab.tsx');

describe('11.3 表現行列Labの画面接続', () => {
  it('第四Labを保持したまま切替できる', () => {
    expect(read('src/app/LabMenu.tsx')).toContain("id: 'representation-matrix'");
    expect(read('src/app/App.tsx')).toContain("<RepresentationMatrixLab active={activeLabId === 'representation-matrix'} />");
    expect(read('src/app/App.tsx')).toContain("hidden={activeLabId !== 'representation-matrix'}");
  });
  it('初期例を実際にレンダーし、2図・4タブ・数値入力・導出式を示す', () => {
    const html = renderToStaticMarkup(createElement(RepresentationMatrixLab, { active: true }));
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(4);
    expect(html.match(/<input/g)).toHaveLength(14);
    expect(html).toContain('表現行列の作り方');
    expect(html).toContain('列ベクトル 5、-3');
    expect(html).toContain('math-vector-subscript');
    expect(html).toContain('representation-source-plane');
    expect(html).toContain('representation-target-plane');
  });
  it('第四Labの共有を有効化し、Resetは起動時の現在場面だけへ戻す', () => {
    const html = renderToStaticMarkup(createElement(RepresentationMatrixLab, { active: true }));
    expect(html).not.toMatch(/disabled=""[^>]*>共有URLをエクスポート/);
    expect(source).toContain('createRepresentationShareState(committed, views, mode, direction)');
    expect(source).toContain('resetRepresentationWorkspace(w, initialization.initialWorkspace)');
  });
  it('像の矢先は操作対象にせず、既存の未指定時は操作ハンドルを維持する', () => {
    const props = { vectors: [{ id: 'a', name: 'u1', coordinates: [1, 0] }, { id: 'b', name: 'T(u1)', coordinates: [0, 1] }], colors: ['red', 'blue'] };
    const editable = renderToStaticMarkup(createElement(VectorPlane2D, { ...props, editableVectorIds: ['a'] }));
    expect(editable.match(/class="vector-drag-handle/g)).toHaveLength(1);
    expect(renderToStaticMarkup(createElement(VectorPlane2D, props)).match(/class="vector-drag-handle/g)).toHaveLength(2);
    expect(renderToStaticMarkup(createElement(RepresentationMatrixLab, { active: true })).match(/class="vector-drag-handle/g)).toHaveLength(5);
  });
  it('タブのキーボード操作と狭幅レイアウト、独立したパン・ズームを接続する', () => {
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) expect(source).toContain(key);
    expect(source).toContain('onViewportChange=');
    expect(source).toContain('dragViews ?? automaticViews(vectors, views)');
    const css = read('src/app/App.css');
    expect(css).toContain('.representation-edit-grid { grid-template-columns: 1fr; }');
    expect(css).toContain('.representation-column-grid { grid-template-columns: 1fr; }');
    expect(source).toContain('linear-map-diagram-grid');
    expect(source).toContain("hidden={tab !== id}");
  });
});

describe('11.4 次元別の画面接続', () => {
  const renderScene = (committed: ReturnType<typeof createRepresentationScene>) => renderToStaticMarkup(createElement(RepresentationSceneView, {
    active: true, committed, views: createRepresentationViewState(), setScene: () => {}, setViews: () => {}, onReset: () => {}, onDimensionChange: () => {},
  }));
  for (const n of REPRESENTATION_DIMENSIONS) for (const m of REPRESENTATION_DIMENSIONS) {
    it(n + '→' + m + 'の成分数・行列形状と同次元の基底変換を表示する', () => {
      const html = renderScene(createRepresentationScene(n, m));
      expect(html.match(/<input/g)).toHaveLength(m * n + n + n * n + m * m);
    expect(html.match(/<select/g)).toHaveLength(n === m ? 6 : 5);
      expect(html).toContain(m + '行' + n + '列');
      expect(html).toContain('repeat(' + n + ', minmax(0, auto))');
      expect(html.includes('基底変換は同じ次元の2基底')).toBe(n !== m);
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('undefined');
      if (n === 1) expect(html).toContain('representation-source-line');
      if (m === 1) expect(html).toContain('representation-target-line');
    });
  }
  it('1Dの零基底は基底と認めず、像は数値で表示し続ける', () => {
    const html = renderScene(setRepresentationVector(createRepresentationScene(1, 3), 'source', 'u1', [0]));
    expect(html).toContain('表現行列・基底座標は未確定');
    expect(html).toContain('列ベクトル 3、0、0');
  });
  it('数直線でも像を操作対象から除外し、未指定の既存Labのハンドルは維持する', () => {
    const props = { vectors: [{ id: 'u1', name: 'u1', coordinates: [1] }, { id: 'image-u1', name: 'T(u1)', coordinates: [2] }], colors: ['red', 'red'] };
    expect(renderToStaticMarkup(createElement(VectorLine1D, { ...props, editableVectorIds: ['u1'] })).match(/class="line-vector-drag-handle/g)).toHaveLength(1);
    expect(renderToStaticMarkup(createElement(VectorLine1D, props)).match(/class="line-vector-drag-handle/g)).toHaveLength(2);
  });
  it('3D操作対象は確定値で安定させ、カードと反対側の像にpreviewを渡す', () => {
    expect(source).toContain('vectors={stable.values[side]}');
    expect(source).toContain('onVectorCoordinatesPreview=');
    expect(source).toContain('vectorCoordinatePreview={side');
    expect(source).toContain('snapRepresentationSpaceVector(committed');
    expect(source).toContain('views.cameras[side]');
  });
});

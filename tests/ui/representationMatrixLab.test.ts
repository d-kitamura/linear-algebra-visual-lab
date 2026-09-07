import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RepresentationMatrixLab } from '../../src/labs/representation-matrix/RepresentationMatrixLab';
import { VectorPlane2D } from '../../src/visualization';

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
  it('共有は無効で他Labの状態を書き出さず、Resetは独立', () => {
    const html = renderToStaticMarkup(createElement(RepresentationMatrixLab, { active: true }));
    expect(html).toMatch(/disabled=""[^>]*>共有URLをエクスポート/);
    expect(source).not.toContain('buildShareUrl');
    expect(source).not.toContain('window.location');
    expect(source).toContain('setScene(createRepresentationScene())');
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
    expect(source).toContain('dragViews.source ?? manual.source');
    const css = read('src/app/App.css');
    expect(css).toContain('.representation-edit-grid { grid-template-columns: 1fr; }');
    expect(css).toContain('.representation-column-grid { grid-template-columns: 1fr; }');
    expect(source).toContain('linear-map-diagram-grid');
    expect(source).toContain("hidden={tab !== id}");
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RepresentationSceneView } from '../../src/labs/representation-matrix/RepresentationMatrixLab';
import { createRepresentationScene } from '../../src/labs/representation-matrix/representationMatrixState';
import { createRepresentationViewState } from '../../src/labs/representation-matrix/representationWorkspace';

describe('表現行列Labの次元共通見出し', () => {
  it('3Dも1D・2Dと同じ数式要素を使い、通常・基底変換モードの両側を表示する', async () => {
    const render = (n: 1 | 2 | 3, mode: 'map' | 'basis-change', kind: 'polynomial' | 'coordinate') => renderToStaticMarkup(createElement(RepresentationSceneView, {
      active: true, mode, committed: createRepresentationScene(n, n, kind, kind), views: createRepresentationViewState(),
      setScene: () => {}, setViews: () => {}, onReset: () => {}, onDimensionChange: () => {},
    }));
    // SSRではWebGLを起動せず、lazyの読み込み完了後に実際の3Dカード見出しを検証する。
    render(3, 'map', 'polynomial');
    await vi.dynamicImportSettled();
    for (const mode of ['map', 'basis-change'] as const) for (const kind of ['polynomial', 'coordinate'] as const) {
      const headings = ([1, 2, 3] as const).map((n) => [...render(n, mode, kind).matchAll(/<h2 id="representation-(source|target)-(?:space-)?title">(.*?)<\/h2>/g)].map((match) => match[2]));
      for (const pair of headings) expect(pair).toHaveLength(2);
      for (let side = 0; side < 2; side++) {
        const normalize = (html: string) => html.replace(/<(sub|sup)>[0-3]<\/(sub|sup)>/g, '<dimension/>');
        expect(normalize(headings[2][side])).toBe(normalize(headings[1][side]));
        expect(normalize(headings[2][side])).toBe(normalize(headings[0][side]));
        expect(headings[2][side]).not.toContain('高々');
        expect(headings[2][side]).toContain('math-scalar');
        if (kind === 'polynomial') expect(headings[2][side]).toContain('（係数空間）');
      }
    }
  });
});

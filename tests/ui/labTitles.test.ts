import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Labのページ見出し', () => {
  it.each([
    ['vector-space/VectorSpaceLab', 'page-title', 'ベクトルが生成する空間'],
    ['basis-dimension/BasisDimensionLab', 'basis-dimension-title', '基底と次元'],
    ['linear-map/LinearMapLab', 'linear-map-title', '線形写像'],
    ['representation-matrix/RepresentationMatrixLab', 'representation-title', '表現行列と基底の変換'],
    ['eigenspace/EigenspaceLab', 'eigenspace-title', '固有値と固有空間'],
  ])('%sは次元に依存しない指定の大見出しを使う', (path, id, title) => {
    const source = readFileSync(new URL('../../src/labs/' + path + '.tsx', import.meta.url), 'utf8');
    expect(source).toContain('<h1 id="' + id + '">' + title + '</h1>');
    // CSSだけの視覚順変更ではなく、見出し→操作→教材のDOM順もそろえる。
    expect(source).toMatch(/<main className="lab-page[^>]*>\s*<section className="lab-intro"/);
    const intro = source.slice(source.indexOf('<section className="lab-intro"'));
    const actions = intro.indexOf('<LabActionControls');
    expect(actions).toBeGreaterThan(intro.indexOf('<h1'));
    expect(actions).toBeLessThan(intro.indexOf('</section>'));
  });

  it('共通CSSでタイトル行へ操作をそろえ、狭幅では一列に戻す', () => {
    const css = readFileSync(new URL('../../src/app/App.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.lab-intro > div:first-child > h1\s*\{\s*grid-area: 2 \/ 1;/);
    expect(css).toMatch(/\.lab-intro > div:last-child\s*\{\s*grid-area: 2 \/ 2;/);
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*?\.lab-intro > div:last-child\s*\{\s*grid-area: 3 \/ 1;/);
    expect(css).toContain('.lab-menu-item:hover,');
    expect(css).toContain('.lab-menu-item:focus-visible {');
    expect(css).not.toContain('.lab-menu-item.is-current:hover');
  });

  it('ページ見出しを変更してもLabメニューの名称は維持する', () => {
    const source = readFileSync(new URL('../../src/app/LabMenu.tsx', import.meta.url), 'utf8');
    for (const name of ['ベクトル空間Lab', '基底・次元Lab', '線形写像Lab', '表現行列・基底変換Lab']) {
      expect(source).toContain("name: '" + name + "'");
    }
  });
});

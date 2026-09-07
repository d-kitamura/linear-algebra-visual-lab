import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Labのページ見出し', () => {
  it.each([
    ['vector-space/VectorSpaceLab', 'page-title', 'ベクトルが生成する空間'],
    ['basis-dimension/BasisDimensionLab', 'basis-dimension-title', '基底と次元'],
    ['linear-map/LinearMapLab', 'linear-map-title', '線形写像'],
    ['representation-matrix/RepresentationMatrixLab', 'representation-title', '表現行列と基底の変換'],
  ])('%sは次元に依存しない指定の大見出しを使う', (path, id, title) => {
    const source = readFileSync(new URL('../../src/labs/' + path + '.tsx', import.meta.url), 'utf8');
    expect(source).toContain('<h1 id="' + id + '">' + title + '</h1>');
  });

  it('ページ見出しを変更してもLabメニューの名称は維持する', () => {
    const source = readFileSync(new URL('../../src/app/LabMenu.tsx', import.meta.url), 'utf8');
    for (const name of ['ベクトル空間Lab', '基底・次元Lab', '線形写像Lab', '表現行列・基底変換Lab']) {
      expect(source).toContain("name: '" + name + "'");
    }
  });
});

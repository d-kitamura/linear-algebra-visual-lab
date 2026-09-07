import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { analyzeRepresentationMatrix } from '../../src/domain';
import { BasisChangePanel, RepresentationPaths } from '../../src/labs/representation-matrix/RepresentationCoordinatePanels';
import { RepresentationSceneView } from '../../src/labs/representation-matrix/RepresentationMatrixLab';
import { createRepresentationScene, setRepresentationVector } from '../../src/labs/representation-matrix/representationMatrixState';
import { createBasisChangeScene, createRepresentationViewState } from '../../src/labs/representation-matrix/representationWorkspace';

describe('11.5 経路と基底変換の表示', () => {
  it('2経路の途中値を列ベクトルで示し、同じ像に到達する', () => {
    const s = createRepresentationScene();
    const result = analyzeRepresentationMatrix(s.definition, s.source, s.target, s.input);
    const html = renderToStaticMarkup(createElement(RepresentationPaths, { scene: s, result, failure: '未確定' }));
    expect(html.match(/<li>/g)).toHaveLength(6);
    for (const phrase of ['標準座標の経路', '基底座標を経由する経路', '列ベクトル 1、2', '列ベクトル 5、-3', '列ベクトル 5、2', '両経路の像は数値許容誤差内で一致']) expect(html).toContain(phrase);
    expect(html).toContain('math-vector-subscript');
  });
  it('逆向きではCの座標からBの座標へ変換し、添え字も反転する', () => {
    const html = renderToStaticMarkup(createElement(BasisChangePanel, { scene: createBasisChangeScene(2), direction: 'C-to-B', onDirectionChange: () => {} }));
    expect(html).toContain('第1行 0、-1');
    expect(html).toContain('列ベクトル 3、-1');
    expect(html).toContain('列ベクトル 1、2');
    expect(html).toContain('ℬ</span>←<span class="basis-script-symbol">𝒞');
    expect(html).toContain('逆方向からの往復も確認');
  });
  it('基底不成立なら成功表示・古い行列を残さない', () => {
    const scene = setRepresentationVector(createBasisChangeScene(2), 'target', 'v1', [0, 0]);
    const html = renderToStaticMarkup(createElement(BasisChangePanel, { scene, direction: 'B-to-C', onDirectionChange: () => {} }));
    expect(html).toContain('逆変換は未確定');
    expect(html).not.toContain('逆方向からの往復も確認');
    expect(html).not.toContain('linear-map-display-matrix');
    const paths = renderToStaticMarkup(createElement(RepresentationPaths, { scene, result: analyzeRepresentationMatrix(scene.definition, scene.source, scene.target, scene.input), failure: '基底が未確定' }));
    expect(paths).toContain('標準座標の経路');
    expect(paths).toContain('基底が未確定');
    expect(paths).not.toContain('両経路の像は数値許容誤差内で一致');
  });
  it('精度不足を基底不成立と誤表示しない', () => {
    const scene = { ...createBasisChangeScene(1, 'standard'), input: [1e-16] };
    const html = renderToStaticMarkup(createElement(BasisChangePanel, { scene, direction: 'B-to-C', onDirectionChange: () => {} }));
    expect(html).toContain('数値計算の精度を確認できません');
    expect(html).not.toContain('片側または両側の候補が空間全体の基底ではない');
    expect(html).not.toContain('逆方向からの往復も確認');
  });
  for (const n of [1, 2, 3] as const) it(n + 'D恒等写像のMは入力欄ではなく固定値で、次元は1つの選択欄', () => {
    const html = renderToStaticMarkup(createElement(RepresentationSceneView, { active: true, mode: 'basis-change', committed: createBasisChangeScene(n), views: createRepresentationViewState(),
      setScene: () => {}, setViews: () => {}, onReset: () => {}, onDimensionChange: () => {} }));
    expect(html.match(/<input/g)).toHaveLength(n + 2 * n * n);
    expect(html.match(/<select/g)).toHaveLength(3);
    expect(html).not.toContain('行列Mの第');
    expect(html).toContain('単位行列に固定');
    expect(html).toContain('このモード・次元の両基底と入力を置き換え');
    if (n === 1) expect(html).toContain('disabled="">順序だけ異なる基底');
  });
});

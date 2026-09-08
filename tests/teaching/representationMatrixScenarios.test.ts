import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { REPRESENTATION_MATRIX_TEACHING_SCENARIOS as examples } from '../../src/teaching/representationMatrixScenarios';
import { analyzeRepresentationMatrix } from '../../src/domain';
import { buildShareUrl, createShareQrCodeDataUrl, readShareStateFromUrl } from '../../src/sharing';
import { restoreRepresentationWorkspace, openRepresentationTeachingState } from '../../src/labs/representation-matrix/representationSharing';
import { activeRepresentationScene, createRepresentationWorkspace, resetRepresentationWorkspace, updateActiveRepresentationScene } from '../../src/labs/representation-matrix/representationWorkspace';
import { editRepresentationValue } from '../../src/labs/representation-matrix/representationMatrixState';
import { representationSummary } from '../../src/labs/representation-matrix/representationSummary';
import { RepresentationTeachingPanel } from '../../src/labs/representation-matrix/RepresentationTeachingPanel';

describe('11.8 表現行列の代表例と読み上げ', () => {
  for (const e of examples) it(e.title + 'の期待値・共有・Reset・要約', () => {
    const initial = restoreRepresentationWorkspace(e.state);
    const s = activeRepresentationScene(initial);
    const r = analyzeRepresentationMatrix(s.definition, s.source, s.target, s.input);
    expect(r.imageVector).toEqual(e.expected.image);
    expect(r.representation?.matrix ?? null).toEqual(e.expected.matrix);
    expect(r.representation?.inputCoordinates ?? null).toEqual(e.expected.inputCoordinates);
    expect(r.representation?.imageCoordinates ?? null).toEqual(e.expected.imageCoordinates);
    const text = representationSummary(s, r, e.state.mode, 'B-to-C').join(' ');
    expect(text).toContain('基準行列エム');
    expect(text).toContain('候補ビー');
    expect(text).toContain('候補シー');
    expect(text).toContain('像の基準成分');
    expect(text).toContain(e.expected.matrix ? '2経路は許容誤差内で一致' : '一次従属');
    if (e.state.sourceKind === 'polynomial') expect(text).toContain('昇べき順');
    const url = buildShareUrl('https://d-kitamura.github.io/linear-algebra-visual-lab/', e.state);
    expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state: e.state });
    const changed = updateActiveRepresentationScene(initial, (scene) => editRepresentationValue(scene, 'input', 0, 0, 91));
    expect(activeRepresentationScene(resetRepresentationWorkspace(changed, initial))).toEqual(s);
    const workspace = createRepresentationWorkspace();
    const opened = openRepresentationTeachingState(workspace, e.state);
    expect(activeRepresentationScene(opened)).toEqual(s);
    if (opened.mode === 'map') {
      expect(opened.changeScenes).toBe(workspace.changeScenes);
      for (const key of Object.keys(workspace.scenes) as (keyof typeof workspace.scenes)[]) if (key !== opened.activeShapeId) expect(opened.scenes[key]).toBe(workspace.scenes[key]);
    } else expect(opened.scenes).toBe(workspace.scenes);
  });
  it('11例は固有のIDを持ち、最初の4例は写像・入力・像を維持する', () => {
    expect(examples).toHaveLength(11);
    expect(new Set(examples.map((e) => e.id)).size).toBe(11);
    for (const e of examples.slice(0, 4)) {
      expect(e.state.matrix).toEqual(examples[0].state.matrix);
      expect(e.state.input).toEqual(examples[0].state.input);
      expect(e.expected.image).toEqual(examples[0].expected.image);
    }
  });
  it('基底変換の逆方向と数値失敗を正しく読み上げる', () => {
    const e = examples.find((e) => e.id === 'identity')!;
    const s = activeRepresentationScene(restoreRepresentationWorkspace(e.state));
    const r = analyzeRepresentationMatrix(s.definition, s.source, s.target, s.input);
    expect(representationSummary(s, r, 'basis-change', 'C-to-B').join(' ')).toContain('基底シーから基底ビー');
    const failed = { ...r, status: 'numerical-failure', representation: null, failureReason: 'residual-too-large' } as const;
    const text = representationSummary(s, failed, 'map', 'B-to-C').join(' ');
    expect(text).toContain('数値計算の精度を確認できず');
    expect(text).not.toContain('2経路は許容誤差内で一致');
  });
  it('編集後は初期期待値を現在の結果として表示せず、カメラだけの変更は説明を保つ', () => {
    const e = examples[0];
    const render = (current: typeof e.state) => renderToStaticMarkup(createElement(RepresentationTeachingPanel, { current }));
    expect(render(e.state)).toContain('この例の期待値を確認する');
    expect(render({ ...e.state, input: [8, 9] })).not.toContain('この例の期待値を確認する');
    expect(render({ ...e.state, cameras: { source: null, target: null } })).toContain('この例の期待値を確認する');
    expect(render(e.state)).toContain('<select');
  });
  it('代表的な多項式例のQRをローカルPNGとして生成する', async () => {
    const e = examples.find((e) => e.id === 'derivative')!;
    expect(await createShareQrCodeDataUrl(buildShareUrl('https://d-kitamura.github.io/linear-algebra-visual-lab/', e.state))).toMatch(/^data:image\/png;base64,/);
  });
});

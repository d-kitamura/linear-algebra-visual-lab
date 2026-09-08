import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { REPRESENTATION_MATRIX_TEACHING_SCENARIOS as examples } from '../../src/teaching/representationMatrixScenarios';
import { analyzeRepresentationMatrix } from '../../src/domain';
import { buildShareUrl, createShareQrCodeDataUrl, readShareStateFromUrl } from '../../src/sharing';
import { restoreRepresentationWorkspace } from '../../src/labs/representation-matrix/representationSharing';
import { activeRepresentationScene, resetRepresentationWorkspace, updateActiveRepresentationScene } from '../../src/labs/representation-matrix/representationWorkspace';
import { editRepresentationValue } from '../../src/labs/representation-matrix/representationMatrixState';
import { RepresentationMatrixLab } from '../../src/labs/representation-matrix/RepresentationMatrixLab';


describe('11.8 表現行列の代表例と画面の簡素化', () => {
  for (const e of examples) it(e.title + 'の期待値・共有・Reset', () => {
    const initial = restoreRepresentationWorkspace(e.state);
    const s = activeRepresentationScene(initial);
    const r = analyzeRepresentationMatrix(s.definition, s.source, s.target, s.input);
    expect(r.imageVector).toEqual(e.expected.image);
    expect(r.representation?.matrix ?? null).toEqual(e.expected.matrix);
    expect(r.representation?.inputCoordinates ?? null).toEqual(e.expected.inputCoordinates);
    expect(r.representation?.imageCoordinates ?? null).toEqual(e.expected.imageCoordinates);
    const url = buildShareUrl('https://d-kitamura.github.io/linear-algebra-visual-lab/', e.state);
    expect(readShareStateFromUrl(url)).toEqual({ status: 'success', state: e.state });
    const changed = updateActiveRepresentationScene(initial, (scene) => editRepresentationValue(scene, 'input', 0, 0, 91));
    expect(activeRepresentationScene(resetRepresentationWorkspace(changed, initial))).toEqual(s);
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
  it('4つの補助パネルを表示せず、入力・共有・解析タブを維持する', () => {
    const html = renderToStaticMarkup(createElement(RepresentationMatrixLab, { active: true }));
    for (const label of ['授業用の代表例と観察課題', '現在の状態の読み上げ要約', '多項式の写像の例を開く', '0次元空間について']) expect(html).not.toContain(label);
    for (const label of ['共有URLをエクスポート', 'Reset', '表現行列の作り方', '座標での作用']) expect(html).toContain(label);
    expect(html).toContain('aria-label="');
  });
  it('授業Markdownの11例が正本から生成したURLと一致する', () => {
    const doc = readFileSync(new URL('../../docs/REPRESENTATION_TEACHING_GUIDE.md', import.meta.url), 'utf8');
    for (const e of examples) expect(doc).toContain(buildShareUrl('https://d-kitamura.github.io/linear-algebra-visual-lab/', e.state));
    const urls = [...doc.matchAll(/https:\/\/d-kitamura.github.io\/linear-algebra-visual-lab\/\?state=[A-Za-z0-9_-]+/g)].map((m) => m[0]);
    expect(urls).toHaveLength(14); // 11例＋平行移動＋既存の0D補足2例。
    for (const url of urls) expect(readShareStateFromUrl(url).status).toBe('success');
  });
  it('代表的な多項式例のQRをローカルPNGとして生成する', async () => {
    const e = examples.find((e) => e.id === 'derivative')!;
    expect(await createShareQrCodeDataUrl(buildShareUrl('https://d-kitamura.github.io/linear-algebra-visual-lab/', e.state))).toMatch(/^data:image\/png;base64,/);
  });
});

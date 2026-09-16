import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObjectName, PolynomialMapValue } from '../../src/labs/representation-matrix/representationObjects';
import { createRepresentationScene } from '../../src/labs/representation-matrix/representationMatrixState';
import { EigenPolynomialRule, EigenPolynomialValue } from '../../src/labs/eigenspace/eigenPolynomialMath';
import { RepresentationSceneView } from '../../src/labs/representation-matrix/RepresentationMatrixLab';
import { createRepresentationViewState } from '../../src/labs/representation-matrix/representationWorkspace';
import { createPolynomialMapExample } from '../../src/labs/representation-matrix/representationPolynomialExamples';

const text = (element: ReactElement) => renderToStaticMarkup(element).replace(/<[^>]*>/g, '');
const noop = () => {};

describe('D-121 多項式全体をTの引数とする授業表記', () => {
  it('関数の変数と添え字を変換の括弧の内側に置く', () => {
    expect(text(createElement(PolynomialMapValue))).toBe('T(f(x))');
    expect(text(createElement(PolynomialMapValue, { name: 'u1' }))).toBe('T(u1(x))');
  });
  it.each(['derivative', 'degree', 'translation', 'twice', 'zero'] as const)('固有値・対角化Labの%s例はT(f(x))で始まる', (rule) => {
    const result = text(createElement(EigenPolynomialRule, { rule }));
    expect(result.startsWith('T(f(x)) = ')).toBe(true);
    expect(result).not.toContain('T(f)(x)');
    if (rule === 'derivative') expect(result).toBe('T(f(x)) = f′(x)');
  });
  it('像の多項式もT(u)=T(f(x))と対応付ける', () => {
    expect(text(createElement(EigenPolynomialValue, { coefficients: [2, 6], mapped: true }))).toBe('T(u) = T(f(x)) = 2 + 6x');
  });
  for (const source of ['coordinate', 'polynomial'] as const) for (const target of ['coordinate', 'polynomial'] as const) {
    it(`${source}→${target}では引数を定義域の種類で決め、終域による後置(x)を付けない`, () => {
      const scene = createRepresentationScene(2, 2, source, target);
      expect(text(createElement(ObjectName, { scene, mapped: true }))).toBe(source === 'polynomial' ? 'T(f(x))' : 'T(w)');
      expect(text(createElement(ObjectName, { scene, name: 'u1', mapped: true }))).toBe(source === 'polynomial' ? 'T(u1(x))' : 'T(u1)');
    });
  }
  it('表現行列Labの規則と解析カードにも共通表記を使う', () => {
    const result = text(createElement(RepresentationSceneView, { active: false, committed: createPolynomialMapExample('derivative'),
      views: createRepresentationViewState(), setScene: noop, setViews: noop, onReset: noop, onDimensionChange: noop }));
    expect(result).toContain('現在の基準行列が定める写像：T(f(x)) = f′(x)');
    expect(result).toContain('T(u1(x))');
    expect(result).not.toMatch(/T\([^)]*\)\(x\)/);
  });
});

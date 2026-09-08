import { analyzeBasisChangeRoundTrip, type RepresentationMatrixAnalysis } from '../../domain';
import { formatMathNumber } from '../../ui';
import type { RepresentationScene } from './representationMatrixState';
import type { RepresentationMode, BasisChangeDirection } from './representationWorkspace';

/** 数式DOMや図が使えなくても、行・列・基底順・係数の役割を文として追える。 */
export function representationSummary(scene: RepresentationScene, result: RepresentationMatrixAnalysis, mode: RepresentationMode, direction: BasisChangeDirection): string[] {
  const number = (v: number) => { if (!Number.isFinite(v)) return '計算範囲外'; const f = formatMathNumber(v); return (f.approximate ? '約' : '') + f.text; };
  const column = (v: readonly number[]) => '列ベクトル、上から ' + v.map(number).join('、');
  const matrix = (v: readonly (readonly number[])[]) => `${v.length}行${v[0].length}列。` + v.map((r, i) => `第${i + 1}行は ${r.map(number).join('、')}`).join('。');
  const space = (side: 'source' | 'target') => (side === 'source' ? scene.sourceKind : scene.targetKind) === 'polynomial'
    ? `高々${scene[side].dimension - 1}次の多項式空間、次元${scene[side].dimension}。成分は定数項から昇べき順の基準係数` : `${scene[side].dimension}次元の数ベクトル空間。成分は標準座標`;
  const lines = [`定義域は${space('source')}。終域は${space('target')}。`, `基準行列エムは${matrix(scene.definition.matrix)}。`];
  for (const side of ['source', 'target'] as const) {
    const name = side === 'source' ? 'ビー' : 'シー';
    const check = side === 'source' ? result.sourceBasis : result.targetBasis;
    lines.push(`基底候補${name}の順序と基準成分：` + scene[side].vectors.map((v, i) => `${i + 1}番目は${v.name}、${column(v.coordinates)}`).join('。') + '。');
    lines.push(`候補${name}はrank ${check.analysis?.candidateRank ?? '未確定'}、対象次元${scene[side].dimension}。${check.isBasis ? '一次独立で、対象空間全体を生成する基底です。' : '基底ではありません。' + check.failureReasons.map((reason) => ({ 'dimension-mismatch': '成分数と対象次元が一致しません。', 'too-few-vectors': '候補が不足しています。', 'too-many-vectors': '候補が多すぎます。', 'linearly-dependent': '一次従属で、対象空間全体を生成できません。' })[reason]).join('')}`);
  }
  lines.push(`入力の基準成分は${column(scene.input)}。像の基準成分は${column(result.imageVector)}。`);
  const a = result.representation;
  if (a) {
    lines.push(`表現行列エーは${matrix(a.matrix)}。`);
    a.columnCoordinates.forEach((v, i) => lines.push(`第${i + 1}列は${scene.source.vectors[i].name}の像を基底シーで表した座標、${column(v)}。`));
    lines.push(`経路1：入力の基準成分に基準行列エムを掛け、像の基準成分${column(result.imageVector)}を得ます。`,
      `経路2：入力を基底ビーで表す座標シーは${column(a.inputCoordinates)}。表現行列エーを掛けた、基底シーでの像の座標ディーは${column(a.imageCoordinatesViaMatrix)}。終域の基底で再構成すると${column(a.imageViaCoordinates)}。2経路は許容誤差内で一致します。`);
  } else lines.push(result.status === 'invalid-basis' ? '表現行列と基底座標は未確定です。基準行列による像は引き続き確認できます。' : '数値計算の精度を確認できず、表現行列と基底座標は未確定です。基底不成立と同じ意味ではありません。');
  if (mode === 'basis-change') {
    const trip = analyzeBasisChangeRoundTrip(scene.source.dimension, scene.source, scene.target, scene.input);
    const reverse = direction === 'C-to-B';
    const r = (reverse ? trip.reverse : trip.forward).representation;
    lines.push(`恒等写像の基底変換です。変換方向は${reverse ? '基底シーから基底ビー' : '基底ビーから基底シー'}。ベクトルまたは多項式そのものは変わりません。`);
    if (r && trip.roundTrip) lines.push(`この方向の変換行列は${matrix(r.matrix)}。変換前の座標は${column(r.inputCoordinates)}、変換後は${column(r.imageCoordinates)}。逆方向への往復も許容誤差内で一致します。`);
    else lines.push('この方向の変換と往復検算は未確定です。');
  }
  return lines;
}

import type { EigenMapAnalysis } from '../../domain';
import { Formula, MapValue, Matrix, Scalar, Vector } from '../representation-matrix/representationMath';
import { EigenCoordinateName } from './eigenPolynomialMath';
import type { EigenScene } from './eigenScene';

function SpaceSymbol() {
  return <><Scalar>W</Scalar>(<Scalar>λ</Scalar>; <Scalar>T</Scalar>)</>;
}

/** 同次方程式は基準座標の式。多項式そのものへ行列を掛けた表記にしない。 */
export function EigenKernelExplanation({ kind }: { readonly kind: EigenScene['kind'] }) {
  return <div className="eigen-kernel-explanation">
    <Formula><SpaceSymbol /> = {'{'}<Vector name="u" /> ∈ <Scalar>U</Scalar> | <MapValue name="u" /> = <Scalar>λ</Scalar><Vector name="u" />{'}'}</Formula>
    <Formula><span className="representation-atom"><MapValue name="u" /> = <Scalar>λ</Scalar><Vector name="u" /></span>
      <span className="representation-atom"> ⇔ (<Vector name="A" /> − <Scalar>λ</Scalar><Vector name="E" />)<EigenCoordinateName kind={kind} /> = <Vector name="0" /></span></Formula>
    <p>{kind === 'polynomial' ? <>多項式の係数列が Ker(<Vector name="A" /> − <Scalar>λ</Scalar><Vector name="E" />) に属します。</>
        : <>同次方程式の解全体 Ker(<Vector name="A" /> − <Scalar>λ</Scalar><Vector name="E" />) が固有空間です。</>}
      一次独立な解を最大本数選ぶと、固有空間の基底が得られます。</p>
  </div>;
}

/** 数値行列は説明専用。丸めた根を使ったrank・核の再計算はせず、検証済み基底を用いる。 */
export function EigenShiftedMatrix({ analysis, index, rootLabel }: {
  readonly analysis: EigenMapAnalysis; readonly index: number; readonly rootLabel: string;
}) {
  const root = analysis.realEigenvalues[index];
  const shifted = analysis.definition.matrix.map((row, r) => row.map((value, c) => r === c ? value - root.value : value));
  // 等号は左辺と同じ行内要素へ置き、行列をFormulaの独立したflex項目として中央にそろえる。
  return <Formula><span className="representation-atom"><Vector name="A" /> − ({rootLabel})<Vector name="E" /> =</span>
    <Matrix values={shifted} /></Formula>;
}

export function EigenSpaceSpan({ dimension }: { readonly dimension: number }) {
  return <Formula><SpaceSymbol /> = span({Array.from({ length: dimension }, (_, i) => <span key={i}>
    {i > 0 && ', '}<Vector name={`q${i + 1}`} /></span>)})</Formula>;
}

/** APIが確認した非零固有入力にだけ使う。表示桁数から符号・倍率を判定しない。 */
export function eigenDirectionDescription(value: number): string {
  if (value === 0) return '非零の入力が零へ写ります。対応する固有値は0です。';
  if (value === 1) return '入力と像は一致します（固有値1）。';
  const direction = value > 0 ? '像は入力と同じ向きです。' : '像は入力と反対向きです。';
  const magnitude = Math.abs(value);
  return direction + (magnitude > 1 ? '長さは大きくなります。' : magnitude < 1 ? '長さは小さくなります。' : '長さは変わりません。');
}

import type { DiagonalizationAnalysis, DiagonalizationInputAnalysis } from '../../domain';
import { formatMathNumber } from '../../ui';
import { BasisName, Column, CoordinateName, Formula, MapValue, Matrix, Scalar, Vector } from '../representation-matrix/representationMath';
import { diagonalizationExplanation } from './diagonalizationScene';

export const DIAGONALIZATION_TABS = [['condition', '対角化の条件'], ['basis', '固有ベクトルの基底'], ['coordinates', '座標と作用']] as const;
export type DiagonalizationTab = typeof DIAGONALIZATION_TABS[number][0];
const PInverse = () => <span className="representation-atom"><Vector name="P" /><sup>−1</sup></span>;
const BasisTuple = ({ dimension }: { readonly dimension: number }) => <span className="representation-atom">({Array.from({ length: dimension }, (_, i) =>
  <span key={i}>{i > 0 && ', '}<Vector name={`p${i + 1}`} /></span>)})</span>;

/** UIで丸めた値は計算へ戻さない。確認済みの等式だけを通常の等号で示す。 */
export function DiagonalizationPanel({ tab, analysis, input, onSwap, disabled = false }: {
  readonly tab: DiagonalizationTab;
  readonly analysis: DiagonalizationAnalysis;
  readonly input: DiagonalizationInputAnalysis;
  readonly onSwap: (first: number, second: number) => void;
  readonly disabled?: boolean;
}) {
  const basis = analysis.basis;
  const dimension = analysis.definition.dimension;
  if (dimension === 0) return <>
    {tab === 'condition' ? <><p>固有値・非零の固有ベクトルはありません。空の基底によって形式的に対角化できます。</p>
      <p>必要な基底の本数は0本です。正の次元の零変換（固有値0）とは区別します。</p></>
      : tab === 'basis' ? <><Formula><BasisName name="B" /> = <BasisTuple dimension={0} /></Formula>
        <p>空の順序付き基底です。</p><Formula><Vector name="P" /> = <Vector name="D" /> = <PInverse /></Formula>
        <p>いずれも0×0の空行列です。行列の成分はありません。</p></>
        : <><Formula><Vector name="u" /> = <MapValue name="u" /> = <Vector name="0" /></Formula>
          <p>入力・像は零ベクトルのみです。座標ベクトル <Vector name="c" /> と <Vector name="D" /><Vector name="c" /> の成分は空です。</p></>}
  </>;
  if (tab === 'condition') return <>
    <p className={analysis.status === 'ready' ? 'diagonalization-success' : 'representation-warning'}><strong>{diagonalizationExplanation(analysis)}</strong></p>
    <p>一次独立な実固有ベクトルを空間の次元と同じ本数だけ選べることが、実数上で対角化できる条件です。</p>
    <div className="diagonalization-root-list">{analysis.eigenAnalysis.realEigenvalues.map((root, i, roots) => {
      const rounded = formatMathNumber(root.value).text;
      const text = roots.filter((r) => formatMathNumber(r.value).text === rounded).length > 1 ? String(root.value).replaceAll('-', '−') : rounded;
      return <div key={i}><Formula><Scalar>λ</Scalar> = {text}</Formula>
        <p>固有値の重複度：{root.algebraicMultiplicity ?? '判定保留'}<br />固有空間の次元：{root.eigenspace?.dimension ?? '判定保留'}</p></div>;
    })}</div>
    <p>実固有空間の次元の総和：{analysis.criterion.realSpaceDimensionSum ?? '判定保留'} ／ 必要な本数：{analysis.definition.dimension}本</p>
    <p>重複する固有値があっても、固有空間から十分な本数を選べれば対角化できます。未確認の固有空間は0次元として数えません。</p>
    <p className="diagonalization-note">数値は表示桁数に丸め、式は等号で表示しています。判定・検算には丸め前の値を使います。</p>
  </>;
  if (tab === 'basis') return basis ? <>
    <Formula><BasisName name="B" /> = <BasisTuple dimension={dimension} /></Formula>
    <div className="diagonalization-basis-columns">{basis.order.map((canonicalIndex, i) => <div key={canonicalIndex}>
      <Formula><Vector name={`p${i + 1}`} /> = <Column values={basis.canonicalColumns[canonicalIndex]} /></Formula>
      <Formula><MapValue name={`p${i + 1}`} /> = ({formatMathNumber(basis.d[i][i]).text})<Vector name={`p${i + 1}`} /></Formula>
    </div>)}</div>
    <div className="diagonalization-order-controls">{Array.from({ length: dimension - 1 }, (_, i) =>
      <button key={i} type="button" className="basis-fit-button" disabled={disabled} onClick={() => onSwap(i, i + 1)}>基底の{i + 1}番目と{i + 2}番目を交換</button>)}</div>
    <p>固有ベクトルの基底の一例です。基底の取り方は唯一ではありません。順序を変えると座標も変わりますが、入力とその像は変わりません。</p>
    <Formula><Vector name="P" /> = <span className="representation-atom">[{Array.from({ length: dimension }, (_, i) => <span key={i}>{i > 0 && '　'}<Vector name={`p${i + 1}`} /></span>)}]</span> = <Matrix values={basis.p} /></Formula>
    <Formula><Vector name="D" /> = <Matrix values={basis.d} /></Formula>
    <Formula><Vector name="A" /><Vector name="P" /> = <Vector name="P" /><Vector name="D" /></Formula>
    <Formula><PInverse /><Vector name="A" /><Vector name="P" /> = <Vector name="D" /></Formula>
    <Formula><Vector name="A" /> = <Vector name="P" /><Vector name="D" /><PInverse /></Formula>
    <p><Vector name="P" /> は、固有ベクトル基底の座標を基準基底の座標へ戻す行列です。</p>
    <details><summary>逆行列と数値検算</summary>
      <Formula><PInverse /> = <Matrix values={basis.inverseP} /></Formula>
      <p>基底行列の条件数（∞ノルム）：{basis.conditionInfinity.toExponential(3)}<br />
        <Vector name="A" /><Vector name="P" /> = <Vector name="P" /><Vector name="D" /> の正規化残差：{basis.residuals.intertwining.toExponential(3)}</p>
    </details>
  </> : <p className="representation-warning">{diagonalizationExplanation(analysis)} 完全な固有ベクトル基底・対角行列・逆行列は表示しません。</p>;
  return <>
    <Formula><Vector name="u" /> = <Column values={input.inputVector} /></Formula>
    <Formula><MapValue name="u" /> = <Vector name="A" /><Vector name="u" />{input.imageVector ? <> = <Column values={input.imageVector} /></> : '（像の数値計算を保留）'}</Formula>
    {input.status === 'ready' ? <>
      <Formula><Vector name="c" /> = <CoordinateName basis="B" object={<Vector name="u" />} /> = <Column values={input.coordinates.inputCoordinates} /></Formula>
      <Formula><Vector name="d" /> = <CoordinateName basis="B" object={<MapValue name="u" />} /> = <Vector name="D" /><Vector name="c" /> = <Column values={input.coordinates.imageCoordinatesViaDiagonal} /></Formula>
      <Formula><Vector name="u" /> = <BasisTuple dimension={dimension} /><Vector name="c" /> = <Vector name="P" /><Vector name="c" /> = <Column values={input.coordinates.inputViaCoordinates} /></Formula>
      <Formula><MapValue name="u" /> = <Vector name="A" /><Vector name="P" /><Vector name="c" /> = <Vector name="P" /><Vector name="D" /><Vector name="c" /> = <Column values={input.coordinates.imageViaCoordinates} /></Formula>
      <p>左右は同じ入力と同じ像の別座標表示です。右図は固有ベクトルそのものの配置ではなく、基底 <BasisName name="B" /> に関する座標の図です。</p>
      <p>対角行列では、各座標が対応する固有値でそれぞれ定数倍されます。</p>
    </> : <p className="representation-warning">{analysis.status !== 'ready' ? diagonalizationExplanation(analysis) : '入力座標の計算・検算を数値的に確かめられないため保留しています。行列の対角化可能性とは別の結果です。'}</p>}
  </>;
}

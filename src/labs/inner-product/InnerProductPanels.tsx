import type { ReactNode } from 'react';
import type { PairAnalysis, Value } from '../../domain';
import { formatMathNumber } from '../../ui';
import { Formula, Scalar, Vector } from '../representation-matrix/representationMath';

export const INNER_PRODUCT_TABS = [['pair', '内積・射影'], ['steps', '直交化の手順'], ['basis', '正規直交基底']] as const;
export type InnerProductTab = typeof INNER_PRODUCT_TABS[number][0];
export function innerProductNumber(value: number): string {
  // 共通の指数表記で微小な非零も残す。表示丸めを判定へ戻さない。
  return formatMathNumber(value).text;
}
function NumberValue({ value }: { readonly value: Value<number> | null }) {
  return value?.status === 'ready' ? <span>{innerProductNumber(value.value)}</span> : <span className="inner-unavailable">数値表示を保留</span>;
}
function ColumnValue({ value }: { readonly value: Value<readonly number[]> | null }) {
  return value?.status === 'ready' ? <span className="display-column-vector linear-map-column-vector" aria-label={`列ベクトル ${value.value.join('、')}`}>
    {value.value.map((x, i) => <span key={i}>{innerProductNumber(x)}</span>)}
  </span> : <span className="inner-unavailable">成分表示を保留</span>;
}
function Product({ left, right }: { readonly left: string; readonly right: string }) {
  return <span className="representation-atom">〈<Vector name={left} />, <Vector name={right} />〉</span>;
}
function Norm({ name }: { readonly name: string }) { return <span className="representation-atom">‖<Vector name={name} />‖</span>; }
function Fraction({ top, bottom }: { readonly top: ReactNode; readonly bottom: ReactNode }) {
  return <span className="inner-fraction"><span>{top}</span><span>{bottom}</span></span>;
}
export function InnerProductPanel({ tab, result, pair }: { readonly tab: InnerProductTab; readonly result: PairAnalysis; readonly pair: readonly [number, number] }) {
  if (tab !== 'pair') return <p className="inner-note">{tab === 'steps' ? '直交化の段階操作' : '正規直交基底の表示'}は14.4で追加予定です。現在は「内積・射影」で2本のベクトルを調べられます。</p>;
  const projection = result.projection;
  return <>
    <Formula><Vector name="u" /> = <Vector name={`a${pair[0]}`} /><span>、</span><Vector name="v" /> = <Vector name={`a${pair[1]}`} /></Formula>
    <Formula><Product left="u" right="v" /> = <NumberValue value={result.innerProduct?.numeric ?? null} /></Formula>
    <Formula><Norm name="u" /> = <NumberValue value={result.uNorm} /><span>、</span><Norm name="v" /> = <NumberValue value={result.vNorm} /></Formula>
    <Formula><Scalar>θ</Scalar> = {result.angle?.status === 'ready' ? <span>{innerProductNumber(result.angle.degrees)}°</span>
      : <span className="inner-unavailable">{result.angle?.status === 'undefined-zero-vector' ? '定義されません（零ベクトルを含む）' : '計算を保留'}</span>}</Formula>
    {result.angle?.status === 'ready' && <Formula>cos<Scalar>θ</Scalar> = <Fraction top={<Product left="u" right="v" />} bottom={<><Norm name="u" /><Norm name="v" /></>} /></Formula>}
    <h3><Vector name="v" />を<Vector name="u" />の生成する空間へ射影</h3>
    {projection?.kind === 'line' ? <Formula><Vector name="p" /> = <Fraction top={<Product left="v" right="u" />} bottom={<Product left="u" right="u" />} />
      <Vector name="u" /> = (<NumberValue value={projection.coefficient?.numeric ?? null} />)<Vector name="u" /></Formula>
      : projection?.kind === 'zero-subspace' ? <p>方向<Vector name="u" />が零なので直線は定まりません。零部分空間への射影は<Vector name="p" /> = <Vector name="0" />、残差は<Vector name="r" /> = <Vector name="v" />です。</p>
      : <p className="inner-unavailable">射影の計算を保留しています。</p>}
    <Formula><Vector name="p" /> = <ColumnValue value={projection?.vector.numeric ?? null} /></Formula>
    <Formula><Vector name="r" /> = <Vector name="v" /> − <Vector name="p" /> = <ColumnValue value={projection?.residual.numeric ?? null} /></Formula>
    {projection && result.status !== 'numerical-failure' && <>
      <Formula><Vector name="v" /> = <Vector name="p" /> + <Vector name="r" /><span>、</span><Product left="u" right="r" /> = 0</Formula>
      <p className="inner-note">残差は射影方向と直交します。零ベクトルとの内積も0ですが、角度は定義されません。</p>
    </>}
    {result.status !== 'complete' && <p className="representation-warning">一部の数値を安全に表示・検算できないため保留しています。零と判定したわけではありません。</p>}
  </>;
}

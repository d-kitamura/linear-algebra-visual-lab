import type { ReactNode } from 'react';
import type { InnerProductMetric, Value } from '../../domain';
import { Column, Formula, Matrix, Scalar, Vector } from '../representation-matrix/representationMath';
import { FunctionName, Polynomial, SpaceName, StandardPolynomialBasis, GenericPolynomialCoordinates } from '../representation-matrix/representationObjects';

export const InnerPolynomialSpace = ({ dimension }: { readonly dimension: number }) => <SpaceName kind="polynomial" dimension={dimension} />;
export function InnerPolynomialCoordinates({ polynomial, name }: { readonly polynomial: boolean; readonly name: string }) {
  return polynomial ? <span className="representation-atom">[<Vector name={name} />]<sub><span className="basis-script-symbol">ℰ</span></sub></span> : <Vector name={name} />;
}
/** 多項式そのものと、その標準係数列を無条件に等置しない。 */
export function InnerObjectValue({ value, polynomial }: { readonly value: Value<readonly number[]> | null; readonly polynomial: boolean }) {
  return value?.status === 'ready' ? polynomial ? <Polynomial coefficients={value.value} /> : <Column values={value.value} />
    : <span className="inner-unavailable">成分表示を保留</span>;
}
export function InnerIntegral({ children }: { readonly children: ReactNode }) {
  return <span className="representation-atom"><span className="inner-integral-sign"><span>∫</span><sup>1</sup><sub>−1</sub></span>{children}<span> d<Scalar>x</Scalar></span></span>;
}
export function InnerMetricExplanation({ metric, details }: { readonly metric: InnerProductMetric; readonly details: boolean }) {
  const integral = metric.definition.metric === 'integral', n = metric.definition.dimension;
  return <div className="inner-metric-explanation">
    <p className="inner-note">現在の内積：{integral ? '積分内積（区間 −1 から 1）' : '標準単項式係数の内積'}</p>
    {details && <details><summary>内積・標準係数と図の座標</summary>
      <Formula><span>〈<Scalar>f</Scalar>, <Scalar>g</Scalar>〉 = </span>{integral ? <InnerIntegral><FunctionName name="f" /><FunctionName name="g" /></InnerIntegral>
        : Array.from({ length: n }, (_, i) => <span className="representation-atom" key={i}>{i > 0 && ' + '}<Scalar>b</Scalar><sub>{i}</sub><Scalar>d</Scalar><sub>{i}</sub></span>)}</Formula>
      <p className="inner-note">係数は標準単項式基底に関する値です。内積を変えても元の多項式は変わりません。</p>
      <Formula><span className="basis-script-symbol">ℰ</span> = <StandardPolynomialBasis dimension={n} /></Formula>
      <Formula><FunctionName name="f" /> = <StandardPolynomialBasis dimension={n} /><GenericPolynomialCoordinates dimension={n} /></Formula>
      <Formula><Vector name="b" /> = <span>[<FunctionName name="f" />]<sub><span className="basis-script-symbol">ℰ</span></sub></span> = <GenericPolynomialCoordinates dimension={n} /></Formula>
      {!integral && <p className="inner-note"><Scalar>g</Scalar>の標準係数を<Scalar>d</Scalar><sub>0</sub>、…とします。</p>}
      <Formula><Vector name="z" /> = <Vector name="C" /><Vector name="b" /><span>、</span><span><sup>t</sup><Vector name="C" /><Vector name="C" /> = <Vector name="G" /></span></Formula>
      <Formula><Vector name="C" /> = <Matrix values={metric.transform} /></Formula>
      <p className="inner-note">図の座標は{integral ? '固定された正規直交基底に関する座標' : '標準単項式の係数'}です。今の入力からグラム・シュミットで求める基底𝒬とは区別します。列係数は編集欄、多項式・内積・射影は解析欄で確認できます。</p>
    </details>}
  </div>;
}

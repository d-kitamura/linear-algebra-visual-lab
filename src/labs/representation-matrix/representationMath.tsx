import type { ReactNode } from 'react';
import type { VectorSet } from '../../domain';
import { formatMathNumber, splitVectorName } from '../../ui';

// 全タブで数式のフォント、添え字、角括弧、丸め規則を共用する。
export function Vector({ name }: { readonly name: string }) {
  const parts = splitVectorName(name);
  return <span className="math-vector"><span className="math-vector-base">{parts.base}</span>{parts.subscript && <sub className="math-vector-subscript">{parts.subscript}</sub>}</span>;
}
export function Scalar({ children }: { readonly children: ReactNode }) { return <span className="math-scalar-base">{children}</span>; }
export function BasisName({ name }: { readonly name: 'B' | 'C' }) { return <span className="basis-script-symbol">{name === 'B' ? 'ℬ' : '𝒞'}</span>; }
export function MapValue({ name }: { readonly name: string }) { return <span className="representation-atom"><Scalar>T</Scalar>(<Vector name={name} />)</span>; }
export function Tuple({ basis, mapped = false }: { readonly basis: VectorSet; readonly mapped?: boolean }) {
  return <span className="representation-atom">({basis.vectors.map((v, i) => <span key={v.id}>{i > 0 && ', '}{mapped ? <MapValue name={v.name} /> : <Vector name={v.name} />}</span>)})</span>;
}
export function ChangeName({ from = 'B', to = 'C' }: { readonly from?: 'B' | 'C'; readonly to?: 'B' | 'C' }) { return <span className="representation-atom"><Vector name="P" /><sub><BasisName name={to} />←<BasisName name={from} /></sub></span>; }
export function CoordinateName({ basis, mapped = false }: { readonly basis: 'B' | 'C'; readonly mapped?: boolean }) {
  return <span className="representation-atom">[{mapped ? <MapValue name="w" /> : <Vector name="w" />}]<sub><BasisName name={basis} /></sub></span>;
}
export function Formula({ children }: { readonly children: ReactNode }) { return <div className="representation-formula linear-map-math">{children}</div>; }
export function Equals({ values }: { readonly values: readonly number[] }) { return <span>{values.some((v) => formatMathNumber(v).approximate) ? '≈' : '='}</span>; }
export function Column({ values }: { readonly values: readonly number[] }) {
  return <span className="display-column-vector linear-map-column-vector" aria-label={'列ベクトル ' + values.join('、')}>{values.map((v, i) => <span key={i}>{formatMathNumber(v).text}</span>)}</span>;
}
export function Matrix({ values, columnColors }: { readonly values: readonly (readonly number[])[]; readonly columnColors?: readonly string[] }) {
  return <span className="linear-map-display-matrix" style={{ gridTemplateColumns: `repeat(${values[0].length}, minmax(0, auto))` }} aria-label={values.length + '行' + values[0].length + '列。' + values.map((row, i) => '第' + (i + 1) + '行 ' + row.join('、')).join('。')}>{values.flatMap((row, r) => row.map((v, c) => <span key={r + '-' + c} style={{ color: columnColors?.[c] }}>{formatMathNumber(v).text}</span>))}</span>;
}
export function Combination({ basis, coefficients }: { readonly basis: VectorSet; readonly coefficients: readonly number[] }) {
  return <>{basis.vectors.map((v, i) => <span className="representation-atom" key={v.id}>{i > 0 && ' + '}({formatMathNumber(coefficients[i]).text})<Vector name={v.name} /></span>)}</>;
}

import type { ReactNode } from 'react';
import { createPolynomialTerms, formatPolynomialExpression } from '../../domain';
import { formatMathNumber, splitVectorName } from '../../ui';
import type { BasisSide, RepresentationScene, RepresentationSpaceKind } from './representationMatrixState';
import { Column, Equals, Formula, MapValue, Scalar, Vector, Tuple } from './representationMath';

export function Polynomial({ coefficients }: { readonly coefficients: readonly number[] }) {
  return <span className="basis-polynomial" aria-label={formatPolynomialExpression(coefficients)}>{createPolynomialTerms(coefficients).map((term, i) =>
    <span key={term.degree} aria-hidden="true">{i === 0 ? term.coefficient < 0 ? '−' : '' : term.coefficient < 0 ? ' − ' : ' + '}
      {term.degree === 0 || Math.abs(term.coefficient) !== 1 ? formatMathNumber(Math.abs(term.coefficient)).text : ''}
      {term.degree > 0 && <Scalar>x</Scalar>}{term.degree > 1 && <sup>{term.degree}</sup>}
    </span>)}</span>;
}
export function FunctionName({ name, argument = true }: { readonly name: string; readonly argument?: boolean }) {
  const parts = splitVectorName(name);
  return <span className="representation-atom"><Scalar>{parts.base}</Scalar>{parts.subscript && <sub>{parts.subscript}</sub>}{argument && <>(<Scalar>x</Scalar>)</>}</span>;
}
/** 授業では多項式f(x)全体をTの引数に入れる。変換後に(x)を付けない。 */
export function PolynomialMapValue({ name = 'f' }: { readonly name?: string }) {
  return <span className="representation-atom"><Scalar>T</Scalar>(<FunctionName name={name} />)</span>;
}
export function BasisElement({ name, kind }: { readonly name: string; readonly kind: RepresentationSpaceKind }) {
  return kind === 'polynomial' ? <FunctionName name={name} /> : <Vector name={name} />;
}
export function ObjectTuple({ scene, side, mapped = false }: { readonly scene: RepresentationScene; readonly side: BasisSide; readonly mapped?: boolean }) {
  return <Tuple basis={scene[side]} renderElement={(name) => mapped ? <ObjectName scene={scene} name={name} mapped /> : <BasisElement name={name} kind={side === 'source' ? scene.sourceKind : scene.targetKind} />} />;
}
export function ObjectName({ scene, mapped = false, name = 'w' }: { readonly scene: RepresentationScene; readonly mapped?: boolean; readonly name?: string }) {
  // 引数の表記は定義域で決まる。終域が多項式でもT(w)の外に(x)は付けない。
  if (scene.sourceKind === 'polynomial') return mapped ? <PolynomialMapValue name={name === 'w' ? 'f' : name} /> : <FunctionName name={name === 'w' ? 'f' : name} />;
  return mapped ? <MapValue name={name} /> : <Vector name={name} />;
}
export function ReferenceCoordinates({ kind, side, children }: { readonly kind: RepresentationSpaceKind; readonly side: BasisSide; readonly children: ReactNode }) {
  return kind === 'polynomial' ? <span className="representation-atom">[{children}]<sub><span className="basis-script-symbol">ℰ</span><sub><Scalar>{side === 'source' ? 'U' : 'V'}</Scalar></sub></sub></span> : <>{children}</>;
}
export function ReferenceObject({ scene, mapped = false, name = 'w' }: { readonly scene: RepresentationScene; readonly mapped?: boolean; readonly name?: string }) {
  return <ReferenceCoordinates side={mapped ? 'target' : 'source'} kind={mapped ? scene.targetKind : scene.sourceKind}><ObjectName scene={scene} mapped={mapped} name={name} /></ReferenceCoordinates>;
}
export function SpaceName({ dimension, kind }: { readonly dimension: number; readonly kind: RepresentationSpaceKind }) {
  return kind === 'polynomial' ? <span>ℝ[<Scalar>x</Scalar>]<sub>{dimension - 1}</sub></span> : <span>ℝ<sup>{dimension}</sup></span>;
}
export function StandardPolynomialBasis({ dimension }: { readonly dimension: number }) {
  return <span className="representation-atom">({Array.from({ length: dimension }, (_, i) => <span key={i}>{i > 0 && ', '}{i === 0 ? '1' : <><Scalar>x</Scalar>{i > 1 && <sup>{i}</sup>}</>}</span>)})</span>;
}
export function GenericPolynomialCoordinates({ dimension }: { readonly dimension: number }) {
  return <span className="display-column-vector linear-map-column-vector" aria-label={'昇べき順の係数 b0 から b' + (dimension - 1)}>{Array.from({ length: dimension }, (_, i) => <span key={i}><Scalar>b</Scalar><sub>{i}</sub></span>)}</span>;
}
export function PolynomialObjectValue({ scene, mapped = false, values }: { readonly scene: RepresentationScene; readonly mapped?: boolean; readonly values: readonly number[] }) {
  const kind = mapped ? scene.targetKind : scene.sourceKind;
  return <>
    {kind === 'polynomial' && <Formula>{!mapped && <><Vector name="w" /> = </>}<ObjectName scene={scene} mapped={mapped} /><Equals values={values} /><Polynomial coefficients={values} /></Formula>}
    <Formula><ReferenceObject scene={scene} mapped={mapped} /><Equals values={values} /><Column values={values} /></Formula>
  </>;
}

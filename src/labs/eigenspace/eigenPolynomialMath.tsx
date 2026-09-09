import { Column, Formula, MapValue, Scalar, Vector } from '../representation-matrix/representationMath';
import { FunctionName, GenericPolynomialCoordinates, Polynomial, SpaceName, StandardPolynomialBasis } from '../representation-matrix/representationObjects';
import type { EigenScene } from './eigenScene';
import type { eigenPolynomialRule } from './eigenPolynomial';

export function EigenCoordinateName({ kind, name = 'u', mapped = false }: { readonly kind: EigenScene['kind']; readonly name?: string; readonly mapped?: boolean }) {
  const object = mapped ? <MapValue name={name} /> : <Vector name={name} />;
  return kind === 'polynomial' ? <span className="representation-atom">[{object}]<sub><span className="basis-script-symbol">ℰ</span></sub></span> : object;
}
export function EigenPolynomialValue({ coefficients, name = 'u', mapped = false }: { readonly coefficients: readonly number[]; readonly name?: string; readonly mapped?: boolean }) {
  return <Formula>{mapped ? <><MapValue name="u" /> = <Scalar>T</Scalar>(<Scalar>f</Scalar>)(<Scalar>x</Scalar>)</>
    : <><Vector name={name} /> = <FunctionName name={name === 'u' ? 'f' : name} /></>} = <Polynomial coefficients={coefficients} /></Formula>;
}
export function EigenPolynomialCorrespondence({ dimension }: { readonly dimension: number }) {
  return <div className="eigen-polynomial-correspondence">
    <Formula><span className="basis-script-symbol">ℰ</span> = <StandardPolynomialBasis dimension={dimension} /></Formula>
    <Formula><Vector name="u" /> = <FunctionName name="f" /> = <StandardPolynomialBasis dimension={dimension} /><GenericPolynomialCoordinates dimension={dimension} /></Formula>
    <Formula><EigenCoordinateName kind="polynomial" /> = <GenericPolynomialCoordinates dimension={dimension} /> ∈ <SpaceName kind="coordinate" dimension={dimension} /></Formula>
    <p>同じ標準単項式基底を入出力に使います。多項式と係数列は同型によって対応し、図は関数グラフではなく係数空間です。</p>
  </div>;
}
export function EigenPolynomialRule({ rule }: { readonly rule: ReturnType<typeof eigenPolynomialRule> }) {
  if (!rule) return <p>この行列が標準単項式基底に関して定める線形変換です。</p>;
  return <Formula><Scalar>T</Scalar>(<Scalar>f</Scalar>)(<Scalar>x</Scalar>) = {rule === 'zero' ? '0' : rule === 'translation'
    ? <><Scalar>f</Scalar>(<Scalar>x</Scalar> + 1)</> : rule === 'twice' ? <>2<FunctionName name="f" /></>
      : <>{rule === 'degree' && <Scalar>x</Scalar>}<Scalar>f</Scalar>′(<Scalar>x</Scalar>)</>}</Formula>;
}
export function EigenPolynomialBasisValue({ name, coefficients }: { readonly name: string; readonly coefficients: readonly number[] }) {
  return <><EigenPolynomialValue name={name} coefficients={coefficients} />
    <Formula><EigenCoordinateName kind="polynomial" name={name} /> = <Column values={coefficients} /></Formula></>;
}

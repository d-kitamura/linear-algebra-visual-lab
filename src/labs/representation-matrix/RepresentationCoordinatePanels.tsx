import { useMemo, type ReactNode } from 'react';
import { analyzeBasisChangeRoundTrip, type RepresentationMatrixAnalysis } from '../../domain';
import type { RepresentationScene } from './representationMatrixState';
import type { BasisChangeDirection } from './representationWorkspace';
import { Vector, BasisName, ChangeName, CoordinateName, Formula, Equals, Column, Matrix } from './representationMath';
import { ObjectName, ObjectTuple, ReferenceObject, PolynomialObjectValue, Polynomial } from './representationObjects';

/** 経路の順番をDOMにも保つ。狭幅では各経路を上から下へ読む。 */
export function RepresentationPaths({ scene, result, failure }: {
  readonly scene: RepresentationScene; readonly result: RepresentationMatrixAnalysis; readonly failure: ReactNode;
}) {
  const derived = result.representation;
  return <div className="representation-paths">
    <p>上段は基準座標で写す経路、下段は選択した基底の座標を経由する経路です。数ベクトルでは標準座標、多項式では標準単項式基底に関する係数を使って描画します。多項式への写像と係数ベクトルに作用する行列を区別します。</p>
    <h3>経路1：標準座標で写す</h3>
    <ol className="representation-path representation-path-direct" aria-label="標準座標の経路">
      <PathStage title="入力" operation="出発点"><PolynomialObjectValue scene={scene} values={scene.input} /></PathStage>
      <PathStage title="像" operation={<><Vector name="M" /> を左から掛ける →</>}>
        <Formula><ReferenceObject scene={scene} mapped /> = <Vector name="M" /><ReferenceObject scene={scene} /><Equals values={result.imageVector} /><Column values={result.imageVector} /></Formula>
        {scene.targetKind === 'polynomial' && <Formula><ObjectName scene={scene} mapped /><Equals values={result.imageVector} /><Polynomial coefficients={result.imageVector} /></Formula>}
      </PathStage>
    </ol>
    <Formula><Matrix values={scene.definition.matrix} /><Column values={scene.input} /><Equals values={[...scene.definition.matrix.flat(), ...scene.input, ...result.imageVector]} /><Column values={result.imageVector} /></Formula>
    <h3>経路2：基底座標を経由して写す</h3>
    {derived ? <>
      <ol className="representation-path" aria-label="基底座標を経由する経路">
        <PathStage title="同じ入力" operation="出発点"><PolynomialObjectValue scene={scene} values={scene.input} /></PathStage>
        <PathStage title="入力の基底座標" operation={<>基底<BasisName name="B" />で座標を求める →</>}>
          <Formula><Vector name="c" /> = <CoordinateName basis="B" object={<ObjectName scene={scene} />} /><Equals values={derived.inputCoordinates} /><Column values={derived.inputCoordinates} /></Formula>
          {scene.sourceKind === 'polynomial' && <Formula><ObjectName scene={scene} /> = <ObjectTuple scene={scene} side="source" /><CoordinateName basis="B" object={<ObjectName scene={scene} />} /></Formula>}
        </PathStage>
        <PathStage title="像の基底座標" operation={<><Vector name="A" />を左から掛ける →</>}>
          <Formula><Vector name="d" /> = <CoordinateName basis="C" object={<ObjectName scene={scene} mapped />} /> = <Vector name="A" /><Vector name="c" /><Equals values={derived.imageCoordinatesViaMatrix} /><Column values={derived.imageCoordinatesViaMatrix} /></Formula>
        </PathStage>
        <PathStage title="標準座標の像へ戻す" operation={<>基底<BasisName name="C" />の一次結合で再構成 →</>}>
          <Formula><ObjectName scene={scene} mapped /> = <ObjectTuple scene={scene} side="target" /><Vector name="d" /><Equals values={derived.imageViaCoordinates} />{scene.targetKind === 'polynomial' ? <Polynomial coefficients={derived.imageViaCoordinates} /> : <Column values={derived.imageViaCoordinates} />}</Formula>
          {scene.targetKind === 'polynomial' && <Formula><ReferenceObject scene={scene} mapped /><Equals values={derived.imageViaCoordinates} /><Column values={derived.imageViaCoordinates} /></Formula>}
        </PathStage>
      </ol>
      <Formula><Vector name="d" /> = <Vector name="A" /><Vector name="c" /><Equals values={[...derived.matrix.flat(), ...derived.inputCoordinates, ...derived.imageCoordinatesViaMatrix]} /><Matrix values={derived.matrix} /><Column values={derived.inputCoordinates} /><Equals values={derived.imageCoordinatesViaMatrix} /><Column values={derived.imageCoordinatesViaMatrix} /></Formula>
      <p className="representation-path-result">両経路の像は数値許容誤差内で一致しています。基底を変えると座標と表現行列は変わりますが、写像と入力を変えなければ、到達する像は同じです。</p>
    </> : failure}
  </div>;
}

function PathStage({ title, operation, children }: { readonly title: string; readonly operation: ReactNode; readonly children: ReactNode }) {
  return <li><p className="representation-path-operation">{operation}</p><h4>{title}</h4>{children}</li>;
}

export function BasisChangePanel({ scene, direction, onDirectionChange }: {
  readonly scene: RepresentationScene; readonly direction: BasisChangeDirection; readonly onDirectionChange: (direction: BasisChangeDirection) => void;
}) {
  const result = useMemo(() => scene.source.dimension === scene.target.dimension && scene.sourceKind === scene.targetKind
    ? analyzeBasisChangeRoundTrip(scene.source.dimension, scene.source, scene.target, scene.input) : null, [scene]);
  if (!result) return <p>基底変換は同じ次元の2基底で考えます。空間の種類も同じである必要があります。現在は{scene.source.dimension}次元から{scene.target.dimension}次元への写像です。数ベクトルと多項式の係数対応は同型でも、異なる空間の間の恒等写像とは呼びません。基底変換モードでは同じ空間の2基底を比較できます。</p>;
  const from = direction === 'B-to-C' ? 'B' : 'C';
  const to = from === 'B' ? 'C' : 'B';
  const selected = (from === 'B' ? result.forward : result.reverse).representation;
  const Coordinate = ({ basis }: { readonly basis: 'B' | 'C' }) => <CoordinateName basis={basis} object={<ObjectName scene={scene} />} />;
  const trip = result.roundTrip;
  const returned = trip && (from === 'B' ? trip.returnedToB : trip.returnedToC);
  const product = trip && (from === 'B' ? trip.productOnB : trip.productOnC);
  return <>
    <p>同じ空間の恒等写像を考えます。基底座標の変換方向を切り替えても、基底の名前・順序、入力のベクトル自体は変更しません。</p>
    <label className="representation-direction">座標の変換方向 <select value={direction} onChange={(event) => onDirectionChange(event.target.value as BasisChangeDirection)}>
      <option value="B-to-C">基底Bの座標 → 基底Cの座標</option><option value="C-to-B">基底Cの座標 → 基底Bの座標</option>
    </select></label>
    <h3>基底<BasisName name={from} />の座標 → 基底<BasisName name={to} />の座標</h3>
    <Formula><ChangeName from={from} to={to} /><Coordinate basis={from} /> = <Coordinate basis={to} /></Formula>
    <Formula><ObjectTuple scene={scene} side={from === 'B' ? 'source' : 'target'} /> = <ObjectTuple scene={scene} side={to === 'B' ? 'source' : 'target'} /><ChangeName from={from} to={to} /></Formula>
    {selected && trip && returned && product ? <>
      <div className="representation-coordinate-pair">
        <article><h4>基底<BasisName name="B" />に関する座標</h4><Formula><Vector name="c" /> = <Coordinate basis="B" /><Equals values={result.forward.representation!.inputCoordinates} /><Column values={result.forward.representation!.inputCoordinates} /></Formula></article>
        <article><h4>基底<BasisName name="C" />に関する座標</h4><Formula><Vector name="d" /> = <Coordinate basis="C" /><Equals values={result.forward.representation!.imageCoordinates} /><Column values={result.forward.representation!.imageCoordinates} /></Formula></article>
      </div>
      <Formula><ChangeName from={from} to={to} /><Equals values={selected.matrix.flat()} /><Matrix values={selected.matrix} /></Formula>
      <Formula><Coordinate basis={to} /><Equals values={[...selected.matrix.flat(), ...selected.inputCoordinates, ...selected.imageCoordinatesViaMatrix]} /><Matrix values={selected.matrix} /><Column values={selected.inputCoordinates} /><Equals values={selected.imageCoordinatesViaMatrix} /><Column values={selected.imageCoordinatesViaMatrix} /></Formula>
      <h3>変換して、逆向きに戻す</h3>
      <Formula><Column values={selected.inputCoordinates} /><span>→ <ChangeName from={from} to={to} /> →</span><Column values={selected.imageCoordinatesViaMatrix} /><span>→ <ChangeName from={to} to={from} /> →</span><Column values={returned} /></Formula>
      <Formula><ChangeName from={to} to={from} /><ChangeName from={from} to={to} /><Equals values={product.flat()} /><Matrix values={product} /><span>≈</span><Vector name="E" /></Formula>
      <p>行列の積は単位行列<Vector name="E" />と、往復後の座標は出発時の座標と、数値許容誤差内で一致しています。逆方向からの往復も確認しています。</p>
      <Formula><ObjectName scene={scene} /> = <ObjectTuple scene={scene} side="source" /><Coordinate basis="B" /> = <ObjectTuple scene={scene} side="target" /><Coordinate basis="C" /><Equals values={scene.input} />{scene.sourceKind === 'polynomial' ? <Polynomial coefficients={scene.input} /> : <Column values={scene.input} />}</Formula>
      <p>変わったのはベクトルの表し方です。ベクトル自体が別の位置へ移動したわけではありません。</p>
    </> : <p className="representation-warning">{result.status === 'invalid-basis'
      ? '片側または両側の候補が空間全体の基底ではないため、座標・基底変換・逆変換は未確定です。'
      : '数値計算の精度を確認できません。基底条件の不成立とは区別し、往復の一致や逆変換は未確定とします。'}</p>}
    <p>固有値や、特別な基底で行列が対角になる理由は、後続の固有値・対角化の単元で扱います。</p>
  </>;
}

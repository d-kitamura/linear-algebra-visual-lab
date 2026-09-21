import type { GramSchmidtAnalysis, StageKey } from '../../domain';
import { Column, Formula, Scalar, Vector } from '../representation-matrix/representationMath';
import { ColumnValue, Fraction, Norm, NumberValue, Product } from './InnerProductPanels';
import { gramSchmidtFrame, stageLabel } from './gramSchmidtPresentation';
import { stageId } from './innerProductScene';

export function GramSchmidtControls({ analysis, stage, disabled, onStage }: {
  readonly analysis: GramSchmidtAnalysis; readonly stage: StageKey | null; readonly disabled: boolean;
  readonly onStage: (stage: StageKey) => void;
}) {
  const index = analysis.availableStages.findIndex(item => stageId(item) === stageId(stage));
  return <fieldset className="inner-stage-controls" disabled={disabled || index < 0}>
    <legend>直交化の表示段階</legend>
    <div><label>入力<select aria-label="直交化する入力" value={stage?.inputId ?? ''} onChange={event => {
      const first = analysis.availableStages.find(item => item.inputId === Number(event.target.value)); if (first) onStage(first);
    }}>{!stage && <option value="">入力なし</option>}{analysis.steps.map(step => <option key={step.sourceId} value={step.sourceId}>{step.inputPosition}番目：a{'₀₁₂₃₄₅₆₇₈'[step.sourceId]}</option>)}</select></label>
      <label>段階<select aria-label="直交化の段階" value={stageId(stage)} onChange={event => {
        const next = analysis.availableStages.find(item => stageId(item) === event.target.value); if (next) onStage(next);
      }}>{!stage && <option value="">段階なし</option>}{analysis.availableStages.filter(item => item.inputId === stage?.inputId).map(item => <option key={stageId(item)} value={stageId(item)}>{stageLabel(item)}</option>)}</select></label></div>
    <div><button type="button" disabled={index <= 0} onClick={() => onStage(analysis.availableStages[index - 1])}>前へ</button>
      <span>{index < 0 ? '0 / 0' : `${index + 1} / ${analysis.availableStages.length}`}</span>
      <button type="button" disabled={index < 0 || index >= analysis.availableStages.length - 1} onClick={() => onStage(analysis.availableStages[index + 1])}>次へ</button></div>
  </fieldset>;
}

export function GramSchmidtStepPanel({ analysis, stage }: { readonly analysis: GramSchmidtAnalysis; readonly stage: StageKey | null }) {
  const { step, projections, residual } = gramSchmidtFrame(analysis, stage);
  if (!stage || !step) return <p>入力がありません。ベクトルを追加すると直交化の過程を確認できます。</p>;
  const input = analysis.inputs.find(item => item.id === stage.inputId)!;
  const a = `a${input.id}`;
  return <>
    <p>{step.inputPosition}番目の入力：<Vector name={a} /> — {stageLabel(stage)}</p>
    <Formula><Vector name={a} /> = <Column values={input.components} /></Formula>
    {stage.phase === 'input' && <p>{step.previousSourceIds.length ? 'この元の入力から、既に採用した直交方向への射影を順に引きます。' : 'まだ採用した方向がないため、この入力をそのまま残差とします。'}</p>}
    {projections.map((projection, index) => {
      const accepted = analysis.accepted.find(item => item.sourceId === projection.ontoSourceId)!;
      const w = `w${accepted.outputIndex}`, p = `p${index + 1}`;
      return <div className="inner-step-projection" key={projection.ontoSourceId}>
        <p><Vector name={w} />は<Vector name={`a${projection.ontoSourceId}`} />から採用した直交ベクトルです。</p>
        <Formula><Vector name={w} /> = <ColumnValue value={accepted.w.numeric} /></Formula>
        <Formula><Vector name={p} /> = <Fraction top={<Product left={a} right={w} />} bottom={<Product left={w} right={w} />} /><Vector name={w} />
          = (<NumberValue value={projection.coefficient.numeric} />)<Vector name={w} /> = <ColumnValue value={projection.vector.numeric} /></Formula>
      </div>;
    })}
    {residual && <Formula><Vector name="r" /> = <Vector name={a} />{projections.map((_, index) => <span className="representation-atom" key={index}> − <Vector name={`p${index + 1}`} /></span>)} = <ColumnValue value={residual.numeric} /></Formula>}
    {residual && stage.phase !== 'hold' && projections.length > 0 && <Formula>{projections.map(projection => {
      const item = analysis.accepted.find(item => item.sourceId === projection.ontoSourceId)!;
      return <span className="representation-atom" key={item.sourceId}><Product left={`w${item.outputIndex}`} right="r" /> = 0</span>;
    })}</Formula>}
    {stage.phase === 'residual' && <p>射影をすべて引いた残差です。次の段階で、非零なら正規化し、正確に零なら飛ばします。</p>}
    {stage.phase === 'normalize' && step.outputIndex !== null && step.q && <>
      <Formula><Vector name={`w${step.outputIndex}`} /> = <Vector name="r" /> = <ColumnValue value={step.residual?.numeric ?? null} /></Formula>
      <Formula><Norm name={`w${step.outputIndex}`} /> = <NumberValue value={step.norm} /></Formula>
      <Formula><Vector name={`q${step.outputIndex}`} /> = <Fraction top={<Vector name={`w${step.outputIndex}`} />} bottom={<Norm name={`w${step.outputIndex}`} />} /> = <Column values={step.q} /></Formula>
      <p>正のノルムで割り、長さ1のベクトルとして採用します。符号は反転しません。</p>
    </>}
    {stage.phase === 'skip' && <p className="inner-note">{step.outcome === 'skipped-zero-input' ? '元の入力が零ベクトルなので、正規化せず飛ばします。' : 'この入力は既に採用したベクトルが生成する空間に含まれ、残差が正確に零になります。一次従属なので飛ばして次の入力へ進みます。'}</p>}
    {stage.phase === 'hold' && <p className="representation-warning">数値化・検算または計算上限により、ここで保留しています。零や一次従属と判定したわけではありません。以降の入力の結果は未確認です。</p>}
  </>;
}

export function GramSchmidtBasisPanel({ analysis }: { readonly analysis: GramSchmidtAnalysis }) {
  const complete = analysis.status === 'complete', count = analysis.accepted.length;
  return <>
    <p className="inner-note">全入力の解析結果です。グラフの表示段階とは別に確認できます。</p>
    <Formula><Scalar>S</Scalar> = {analysis.inputs.length ? <><span>{'{'}</span>{analysis.inputs.map((input, i) => <span className="representation-atom" key={input.id}>{i > 0 && ', '}<Vector name={`a${input.id}`} /></span>)}<span>{'}'}</span></> : '∅'}</Formula>
    <Formula><Scalar>W</Scalar> = <span className="representation-atom">span(<Scalar>S</Scalar>)</span><span>、</span><Scalar>V</Scalar> = <span>ℝ<sup>2</sup></span></Formula>
    {complete ? <p>{count ? '入力が生成する空間Wの正規直交基底です。' : '入力が生成する空間は零空間です。空の組がその正規直交基底です。'}
      {analysis.basisOfAmbient ? '周囲の空間Vの正規直交基底でもあります。' : '周囲の空間V全体の基底ではありません。'}</p>
      : <p className="representation-warning">計算を保留しています。以下は確認済みの組だけであり、全入力が生成する空間の完成した基底とは断定しません。</p>}
    <Formula><span className="basis-script-symbol">𝒬</span> = <span>(</span>{analysis.accepted.map((item, index) => <span className="representation-atom" key={item.sourceId}>{index > 0 && ', '}<Vector name={`q${item.outputIndex}`} /></span>)}<span>)</span></Formula>
    {complete && <Formula>dim(<Scalar>W</Scalar>) = {count}</Formula>}
    {analysis.accepted.map(item => <div className="inner-basis-item" key={item.sourceId}>
      <Formula><Vector name={`q${item.outputIndex}`} /> = <Column values={item.q} /></Formula><p><Vector name={`a${item.sourceId}`} />から採用</p>
    </div>)}
    <p className="inner-note">入力順から得た一例です。順序を変えると、同じ生成空間でも異なる正規直交基底になることがあります。</p>
    {analysis.steps.some(step => step.outcome.startsWith('skipped-')) && <p>飛ばした入力：{analysis.steps.filter(step => step.outcome.startsWith('skipped-')).map((step, i) => <span key={step.sourceId}>{i > 0 && '、'}<Vector name={`a${step.sourceId}`} />（{step.outcome === 'skipped-zero-input' ? '零入力' : '一次従属'}）</span>)}</p>}
  </>;
}

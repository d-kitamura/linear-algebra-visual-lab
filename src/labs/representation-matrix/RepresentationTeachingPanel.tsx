import { REPRESENTATION_MATRIX_TEACHING_SCENARIOS } from '../../teaching/representationMatrixScenarios';
import type { RepresentationMatrixShareState } from '../../sharing';
import { Formula, Vector, Matrix, Column, Equals } from './representationMath';

export function RepresentationTeachingPanel({ current, onOpen }: { readonly current: RepresentationMatrixShareState; readonly onOpen?: (state: RepresentationMatrixShareState) => void }) {
  const mathematics = ({ cameras: _cameras, ...state }: RepresentationMatrixShareState) => JSON.stringify(state);
  // 編集後に古い期待値を現在の結果として表示しない。カメラ操作だけでは説明を消さない。
  const match = REPRESENTATION_MATRIX_TEACHING_SCENARIOS.find((s) => mathematics(s.state) === mathematics(current));
  return <details className="representation-teaching"><summary>授業用の代表例と観察課題</summary>
    <label>代表例を開く <select value="" onChange={(event) => {
      const next = REPRESENTATION_MATRIX_TEACHING_SCENARIOS.find((s) => s.id === event.target.value);
      if (next) onOpen?.(next.state);
    }}><option value="">例を選択してください</option>{REPRESENTATION_MATRIX_TEACHING_SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
    <p>選ぶと、その例の種類・次元・モードの場面を置き換えます。他の場面と起動時のReset基準は変更しません。</p>
    <ol><li>比較する例で写像と入力は同じですか。</li><li>定義域・終域の基底と、その順序は何ですか。</li><li>表現行列の各列は、どの基底ベクトルの像を、どの基底で表した座標ですか。</li><li>座標変換はどちらの基底からどちらの基底への変換ですか。</li></ol>
    {match ? <><h3>{match.title}</h3><p>{match.observation}</p>
      <details><summary>この例の期待値を確認する</summary>
        <p>入力は基底ビーの座標へ、像は基底シーの座標へ読み替えます。表現行列は前者から後者へ作用します。</p>
        {match.expected.matrix ? <>
          <Formula><Vector name="A" /><Equals values={match.expected.matrix.flat()} /><Matrix values={match.expected.matrix} /></Formula>
          <Formula><Vector name="c" /><Equals values={match.expected.inputCoordinates!} /><Column values={match.expected.inputCoordinates!} /></Formula>
          <Formula><Vector name="d" /><Equals values={match.expected.imageCoordinates!} /><Column values={match.expected.imageCoordinates!} /></Formula>
        </> : <p>候補が基底ではないため、表現行列・基底座標は未確定です。</p>}
        <Formula>像の基準成分：<Column values={match.expected.image} /></Formula>
      </details></> : <p>現在の数学状態は代表例の初期値と異なります。下の「現在の状態の読み上げ要約」や解析タブで編集結果を確認してください。</p>}
    <p>授業では、例を選ぶ → 各列と2経路を確認 → URL・QRを配布 → 学生が別タブで開いて編集 → Resetで配布状態へ戻す、の順に進めます。例の名称・課題はURLに含めません。</p>
  </details>;
}

# 対角化Lab 教材・数学API・状態契約（13.1）

2026-09-14。全体方針D-115は利用者承認済み。**13.1具体契約はD-116承認済み**。実装・操作確認後の見直しを認める。13.2数学API・D-117は承認済み。13.3・D-118は承認済み。13.4の0D・1D・3D画面は実装済み・D-119確認待ち。共有形式は13.6まで未接続。

教材方針は[設計書](./DIAGONALIZATION_LAB_DESIGN.md)、工程は[ROADMAP](../ROADMAP.md)。ケイリー・ハミルトン・次数落とし・行列のべきの機能は作らない。既存5Labの数学API・共有形式は変更しない。

## 1. 入力と公開APIの責務

実装した関数を次の3段階に分ける。公開窓口はsrc/domain/index.ts、型の正本はsrc/domain/diagonalizationTypes.ts。

```ts
analyzeDiagonalization(definition: EigenMapDefinition): DiagonalizationAnalysis
reorderDiagonalization(analysis: DiagonalizationAnalysis, order: readonly number[]): DiagonalizationAnalysis
analyzeDiagonalizationInput(analysis: DiagonalizationAnalysis, input: readonly number[]): DiagonalizationInputAnalysis
```

- `definition`は既存の正方行列型（dimension=0〜3、matrixはn×nの行配列）。0Dはdimension=0、matrix=[]。有限数、絶対値100万以下を要求する。
- inputは基準基底に関するuの列成分。長さn、有限数、絶対値100万以下。数ベクトル／多項式の種別は数学APIの外で管理し、多項式では昇べき順の基準係数を渡す。
- 種別・次元・形状不正、NaN／Infinity、上限超過、不正な置換は入力エラーとして拒否する。数学上の対角化不可は例外ではなく解析結果。
- 行列解析は入力uを持たず、既存`analyzeEigenMap`を一度実行して結果を再利用する。列順交換で根を再計算しない。入力ドラッグでは行列解析とPの分解を再実行しない。
- 入力はコピーし、結果を不変snapshotとする。React、カメラ、丸め表示、URL、数値下書き、ドラッグpreviewは数学APIへ入れない。

## 2. 行列解析結果と表示の優先順位

`DiagonalizationAnalysis`はdefinition、元の`EigenMapAnalysis`、criterion、status、issues、basisを持つ。criterionは`{ status: 'satisfied' | 'not-satisfied' | 'undetermined', reason, realSpaceDimensionSum: number | null }`。basisは成功時の構成、非成功時はnullとする。

| status | 根拠と結果 |
|---|---|
| ready | criterion=satisfiedかつ基底構成・検算成功。basisが存在し、右図を使用可能 |
| not-diagonalizable | 確定した非実根が存在、または全実根・全空間が確認できて次元総和がn未満。criterion=not-satisfied、basis=null |
| inconclusive | 根／空間が未確認、または基底の数値条件・残差が不十分。basis=null。criterionはsatisfiedのままになる場合もある |
| numerical-failure | 演算上限・表現不能などで計算を続けられない。basis=null。得られたcriterionは失わない |

判定順序は、(1)0D、(2)確定した非実根の存在、(3)全実根・全空間の確認、(4)次元条件、(5)P/D構成と検算。

- `nonRealRootCount`が確定した正数なら、実数上の不可を説明できる。nullや未確認の根を非実根と見なさない。
- `spectrumComplete=true`、非実根0、全実根の重複度と空間が確認済みの場合だけ実固有空間の次元総和を確定する。nullの空間は0次元に置換しない。
- 全体statusだけを見て判断しない。例えば固有多項式の係数の数値化に失敗していても、実根と空間の必要情報が確認できれば次元条件を評価できる。
- 次元総和=nでもPが悪条件なら「固有空間の次元条件は満たしますが、基底を安定して構成できないため数値的に保留」と説明し、対角化不可とは呼ばない。逆に`ready`でない時にP^{-1}AP=Dを計算済みとして提示しない。
- 次元総和>n、重複度より大きい空間次元などの矛盾は入力の数学的不可ではなく内部整合の失敗。部分空間の情報だけから無理にPを作らない。

理由コードを情報源から引き継ぎ、新規には`non-real-spectrum`、`insufficient-eigenvectors`、`incomplete-eigenspaces`、`ill-conditioned-basis`、`basis-solve-failed`、`residual-too-large`、`unrepresentable-result`、`inconsistent-analysis`を区別する。issuesの列挙の確定は13.2で型と一致させる。

## 3. P・Dの構成と列順

基底構成には、基準順の列ベクトル配列canonicalColumns、各列の実固有値の序数eigenvalueIndices、適用中order、行配列P／D／inverseP、条件指標と残差を含める。配列が列を表すのか行を表すのか、型コメントに必ず記載する。

1. 実固有値を未丸め値の昇順、同じ固有空間では既存APIの基底順とする。順序の異なるだけの根を統合しない。
2. 各基底列qの絶対値が最大の成分を探す。同率なら最初の成分を選び、**その符号付き成分で割る**。選んだ成分が正の1になる。結果を丸めず、非零成分の消失・非有限値と残差を点検する。
3. 異なる固有値の列をまとめてGram–Schmidt処理しない。既存APIが同じ固有空間内で行った直交化は再利用できる。生成した基底が唯一とは説明しない。
4. orderは基準順の列番号0〜n−1の置換。表示列jにはcanonicalColumns[order[j]]を置き、Dのj番目にもその列に対応する固有値を置く。直前の順序に対する置換ではない。
5. n=0ではP、D、inverseP、列、orderはすべて空配列。基底の次元条件は成立、status=ready。空行列の条件指標は便宜上1、残差0とし、固有値0は追加しない。

inversePは単位列をPの連立方程式として解いて作り、順序変更も再検算する。一般の逆行列公式の丸め値を使わない。既存表現行列APIの「導出値を入力上限で切らない」考え方を継承するが、微小値を整理する経路をそのまま再利用しない。固有値APIやD-009の既存動作を変更しない。

## 4. 数値確認の採用値（D-116承認済み、13.2で変更なし）

| 項目 | 初期値・理由 |
|---|---|
| 基底を解く際の相対ピボット基準 | 1e-10（既存D-009）。小さいピボットは数値保留の根拠であり、数学的な対角化不可の証明には使わない |
| Pの条件指標 | κ∞(P)=‖P‖∞‖G‖∞≤1e8、Gは検算する逆行列候補。固有方向識別の既存1e-8とは別の検査。8桁の正しさを保証する値ではない |
| 固有列とAP=PD | 既存の固有列相対残差1e-12を満たし、行列全体の相対残差も1e-12以下 |
| 逆行列の検算 | ‖PG−E‖∞と‖GP−E‖∞の両方が1e-8以下。条件数で割って大きな誤差を隠さない |
| 座標・像の経路 | Pc=u、P(Dc)=Au、P d=Au、d=Dcを相対1e-10以下で確認。dはAuをPで独立に解いた座標 |
| UI吸着 | 左図のみ、2D表示幅2%、3D表示幅3%、原点優先。空間表示オフは原点のみ。数値判定の閾値と混ぜない |

‖・‖∞は行列では最大絶対行和、ベクトルでは最大絶対成分。行列全体のAP=PD残差は ‖AP−PD‖∞/(‖A‖∞‖P‖∞+‖P‖∞‖D‖∞)。Pc=uの残差は ‖Pc−u‖∞/(‖P‖∞‖c‖∞+‖u‖∞)、他の積も同じ規則。2つの座標の一致は ‖d−Dc‖∞/(‖d‖∞+‖Dc‖∞) とする。

分母が0なら分子0に限り残差0、そうでなければ失敗。分母に一律の1を足さず、先にスケーリングして微小値や大きい値でのunderflow／overflowを避ける。非零の積が数値化で0へ落ちるなど、検証不能な結果を零への写像と誤表示しない。検出した表現不能は理由付き失敗とする。

これらは通常の低次元教材向けの保守的な初期値。13.2の近接根・悪条件・微小非零例で検証し、必要なら根拠を添えて再提案する。条件や残差の閾値を画面の都合で緩めない。固有根・重複度の判定と探索上限は既存APIの契約をそのまま使う。

## 5. 入力解析と描画の責務

`DiagonalizationInputAnalysis`はinputVector、imageVector（基準座標）、status、coordinates、issuesを持つ。statusは`ready`／`unavailable-basis`／`inconclusive`／`numerical-failure`。座標が安全に得られる時だけcoordinatesにc、d、Dc、Pc、P(Dc)、各経路の残差を返し、それ以外はnull。基準座標での像は計算可能なら残し、像自体が表現不能ならimageVector=nullとする。

- 基底がない場合も左のAuは計算する。入力解析の失敗は行列のcriterionやstatusを変更しない。
- 全成分が厳密に0の入力は零入力。正次元では座標0と像0であり、行列自体の対角化可能性とは無関係。0Dでは全配列が空、入力解析もready。
- Pに関するcとAuに関するdを解き、D cの経路を別に計算して照合する。座標変更を同じ空間上の新しい写像と説明しない。
- 描画の可否は数学APIではなくLab側で判断する。**一つの図へ渡すすべての成分の絶対値が100万以下**を初期の描画条件とする。超過時はその図全体を理由付き代替表示へ切り替え、数値・式は維持する。他方の図は描画可能なら残す。値をクリップした矢印は描かない。
- 1D/2Dは既存の表示半幅上限200万に余白込みで収まり、3Dも既存入力と同じ規模へ制限できる。3Dには共通の厳密な成分上限がないため、この条件は新Labの描画境界であり共通関数の変更ではない。
- 例: A=10^6 E、u={}^t[10^6,0]の像は{}^t[10^12,0]。これは対角化成功・座標計算成功でも、描画のみ保留になる。共有する入力は上限内であり共有を妨げない。

## 6. 状態・数値入力・共有の契約

Lab側の場面を`{ kind, dimension, matrix, input, order, showEigenspace }`とし、種類はcoordinate／polynomial、多項式は1〜3D。Workspaceのslotを数ベクトル0〜3、多項式1〜3の計7個に分ける。slotはsceneと左右のView（line／plane／camera）を持つ。数学解析・入力下書き・ドラッグpreview・タブは共有用sceneには入れない。

| 操作 | 変更する状態 |
|---|---|
| Aの確定編集 | 現在slotのAを変更し、自動基底を再計算。構成可能ならorderを恒等置換、不可ならnullへ戻す。u・他slot・起動時snapshotは維持 |
| uの編集／drag | 基準座標のuだけを変更。根・基底は再計算せず、右図を再解析。previewと確定を分け、キャンセルは確定状態へ戻す |
| 列順交換 | orderを変更し、Pの列・Dの対角・cとdを連動更新。u・Auは変わらない |
| 種類・次元切替 | 対応するslotを表示。多項式0Dは選べず、0Dから多項式へは最後の多項式次元（初期2）へ戻す |
| Reset | 現在の種類・次元slotのsceneと左右Viewを起動時snapshotへ戻す。他slotは不変。下書き・preview・共有ダイアログを閉じ、タブは条件へ |
| エクスポート | 確定した現在sceneと両3Dカメラをsnapshot化。下書き不正／drag中は無効。再共有はReset基準を更新しない |

共有の予定形は次のとおり。**13.6までは既存デコーダーへ追加しない。**

```json
{"v":1,"lab":"diagonalization","kind":"coordinate","dim":2,"matrix":[[4,1],[0,2]],"input":[1,2],"order":[0,1],"showEigenspace":false,"cameras":{"reference":null,"eigenbasis":null}}
```

```json
{"v":1,"lab":"diagonalization","dim":0}
```

通常形は上記の全項目が必須。n=3の各cameraは既存SharedCameraState、n=1,2はnull。3D未操作時も既定カメラを保存し、右図が保留中なら保持している直近の視点（未操作なら既定）を保存する。0Dは上の3項目のみ許可する。

orderは構成可能な場面で長さnの完全な置換、構成不能時はnull。共有層は形状・値・順序・版・未知項目を検証するだけで、他Labの初期化時に固有値解析を走らせない。対象Labの復元時に一度解析し、orderの有無と基底構成を意味的に照合する。不整合はメッセージ付き復元失敗とし、別の列順に黙って直さない。図の保留だけでorderをnullにしない。

最初の基底生成順・符号付き最大成分での正規化は共有v1の再現条件。アルゴリズム変更で列対応を変える場合は、正式リリース前も版変更／移行の要否を明示的に判断する。0D復元は空状態、通常形の1D/2D Viewは全体表示へ戻す。URL長2048、QR・保存・公開path・既存5Lab非干渉は共通契約を維持する。

## 7. 初期値と独立期待値

全slotは空間非表示、左右全体表示／既定カメラ、初期タブは「対角化の条件」。各列を前記規則で揃え、既存APIが標準基底を返す例はその順を保つ。

| 種類・次元 | A | 基準成分u | 期待値 |
|---|---|---|---|
| 数ベクトル0D | 空行列 | 空列 | 空基底、P=D=G=[]、ready |
| 数ベクトル1D | [−2] | [1] | P=[1]、D=[−2]、c=[1]、d=[−2] |
| 数ベクトル2D | 第1行(4,1)、第2行(0,2) | {}^t[1,2] | Pの列は{}^t[−0.5,1],{}^t[1,0]、D=diag(2,4)、Gの行は(0,1),(1,0.5)、c={}^t[2,2]、d={}^t[4,8]、Au={}^t[6,4] |
| 数ベクトル3D | diag(2,2,−1) | {}^t[1,1,1] | 基準順は(e3,e1,e2)、D=diag(−1,2,2)、c={}^t[1,1,1]、d={}^t[−1,2,2] |
| 多項式1D | [2] | [1] | 基底(1)、D=[2]、f(x)=1→2 |
| 多項式2D | diag(0,1) | {}^t[1,1] | 基底(1,x)、D=diag(0,1)、1+x→x |
| 多項式3D | diag(0,1,2) | {}^t[1,1,1] | 基底(1,x,x²)、D=diag(0,1,2)、1+x+x²→x+2x² |

2Dの列順を[1,0]にすると、D=diag(4,2)、d={}^t[8,4]、uとAuは不変。一般入力の例u={}^t[3,2]ではc={}^t[2,4]→{}^t[4,2]となり、順序の影響が分かる。

境界例を次のように固定し、13.2では既存ソルバーから期待値を自動生成しない。

- 第1行(2,1)・第2行(0,2): 重複度2、空間次元1、not-diagonalizable。
- 第1行(0,−1)・第2行(1,0): 非実根2、実数上でnot-diagonalizable。
- 2E・正次元のO: 基底をn本取れる。零入力にしても行列の結果は不変。
- 第1行(1,1)・第2行(10^-24,1): 根は2つでも方向が近すぎる既存境界例。空間nullを使って不可と断定しない。
- diag(1,1+10^-12): 別根を表示丸めで重根へ統合しない。
- 1DでA=[10^-200]、u=[10^-200]: 行列の対角化成功と、像の数値化が0へ落ちる失敗を区別する。
- 高々2次の微分／平行移動: 実根の重複度3・空間次元1、不可。高々0次は1Dで可。

## 8. 13.1の確認記録（以下は契約策定時点）

D-116ではAPIの責務分離、数値基準、基底生成と共有列順、0D、描画上限、初期例を確認する。新しい数値基準は13.2で実際に検証してから画面へ接続する。D-115の承認は実装途中で再検討可能という利用者意向を維持する。

13.1では契約文書・表記規則・独立した手計算例のテストまで。共有デコーダー、ソルバー、UIは未実装。次の13.2は既存固有値APIと安定した基底構成を結ぶため**「高」を推奨**する。

検証記録: 文書関連12ファイル57テストと差分の空白検査に成功。新規`tests/documentation/diagonalizationContract.test.ts`は独立したP/D/Gの例、列順交換、共有予定JSON、責務境界を検証する。新規ソルバーの数値精度を検証済みとするものではない。

## 9. 13.2実装記録（D-117承認済み、以下は13.2時点）

2026-09-14。D-116承認を反映し13.1完了。3関数と型・入力エラーを実装し、domain/index.tsから公開した。数値の採用値は変更していない。状態・共有・UIは未接続。

### 実装と呼び出し

- `src/domain/diagonalization.ts`: 次元条件、P/Dの構成、列順交換、入力座標。既存analyzeEigenMapを再利用する。
- `src/domain/diagonalizationTypes.ts`: 不変な結果型。statusがreadyの時だけbasis／coordinatesを持つ判別共用体。行配列と列配列の役割を型コメントへ記載した。
- `src/domain/diagonalizationNumerics.ts`: 既存eigenExactの有理数算術で最大3次の部分ピボットLUと残差を計算。表現行列APIの微小値整理を通さず、同じピボット基準1e-10を使う。既存rank・固有値ソルバー・表示用cleanNumberは変更しない。

```ts
const result = analyzeDiagonalization({ dimension: 2, matrix: [[4, 1], [0, 2]] });
if (result.status === 'ready') {
  const { p, d, inverseP, order, conditionInfinity } = result.basis;
  const input = analyzeDiagonalizationInput(result, [3, 2]);
  // input.coordinates.inputCoordinates は [2,4]（丸め前の数値）。
  const swapped = reorderDiagonalization(result, [1, 0]);
  const after = analyzeDiagonalizationInput(swapped, [3, 2]);
  // afterでは座標が[4,2]、像の基準座標は同じ[14,4]。
}
```

入力解析は行列解析時のLU閉包をWeakMapから再利用し、分解も根探索も行わない。列順変更では同じ根解析と正規化済み基準列を使って再検算する。公開結果はデータだけで深くfreezeする。**後続2関数にはこのAPIが直接返した解析オブジェクトを渡す**。JSON復元・structuredCloneした解析はINVALID_ANALYSISで拒否する。数学結果は保存せず、保存した行列から再解析する既存の共有方針と一致する。

入力行列・入力成分のエラーは既存InvalidEigenInputError。順序や解析オブジェクトの不正はInvalidDiagonalizationInputError（INVALID_ORDER／UNAVAILABLE_BASIS／INVALID_ANALYSIS）。これらを教材上の不可として表示しない。

### 数値と境界の確認

- binary64行列と近似固有基底を有理数として扱い、消去・残差比の中間演算による消失を避ける。比を作ってから数値化することで、13.1で要求した微小値・大きい値の残差の正規化を満たす。新規依存は追加していない。
- 右辺の解や像は数値へ戻す段階で非零→0・非有限を検出。積のunderflowも失敗として返す。一方、正確な相殺による0は正常に保持する。演算上限は既存有理数の32768bitを引き継ぎ、例外はprecision-limitへ変換する。
- 条件数1e8超の実例（第1行(1,1)、第2行(0,1+1.5e-8)）はcriterion=satisfied、status=inconclusive、basis=null。数学的な不可へ置換しない。
- diag(1e-200,2e-200)は固有多項式の係数が数値化不能でも根・空間は確認できるためready。元のeigenAnalysisとissuesを残す。readyは固有値APIの全ての表示項目の成功を意味しない。
- A=[1e-200]、u=[1e-200]では行列はready、入力解析はnumerical-failure、imageVector=null。座標経路だけの失敗なら計算済みの基準座標の像は残す。
- 初期例、0D、1Dの零／負／微小スカラー、3D重根・非対称行列、非有理実根、多項式、列順の絶対的な置換、不正入力、不変性を検証。関数呼出しの計測で入力変更時の根再計算・再分解がないことも回帰する。

テスト正本は`tests/domain/diagonalization.test.ts`と`tests/domain/diagonalizationNumerics.test.ts`（新規2ファイル36テスト）。既存固有値・表現行列・授業例・文書を含む関連19ファイル206テスト、型検査、差分の空白検査に成功。上限／未完状態の下流の区別は注入テスト、通常例と数値境界は実際の既存ソルバー経由で検証する。全入力・全端末の性能や厳密な実数計算を保証するものではない。全体テスト・全体ビルド・ブラウザ確認・コミット・プッシュは行っていない。

次はD-117確認後、別途指示で13.3の数ベクトル2D画面へ接続する。既存2D・数式・編集部品への接続が中心のため**「中」を推奨**。コミット・プッシュ・ブラウザ・実機確認は利用者担当。

## 10. 13.3実装記録（D-118承認済み、以下は13.3時点）

2026-09-15。13.2・D-117承認を反映。第六Labの数ベクトル2D画面を接続した。数値基準・数学API・既存共有形式は変更していない。

- `src/labs/diagonalization/DiagonalizationLab.tsx`: 独立マウント、左右2図、常設の成分編集、タブ、Reset。行列解析はdefinition変更時のみ、列順でreorder、入力／previewで入力解析だけを実行する。不正下書きは有効状態へ流さない。
- `diagonalizationScene.ts`: 初期状態、編集、列順の解決、描画値と図単位の上限、判定理由。既存EigenSceneのdefinition形状を共用し、7場面のWorkspace化は13.4〜13.5で行う。A編集直後のorder=nullは再解析後に構成成功なら基準順、不可／保留ならnullとして確定する。
- `DiagonalizationPanels.tsx`: 対角化の条件・基底・座標の3枚。数学的な不可、構成保留、入力だけの数値失敗を分ける。検算済みのP/Dと等式だけ表示し、逆行列と残差は詳細へ折りたたむ。根の丸め表示が一致した場合は元の数値桁を使って区別する。
- `diagonalization.css`: PCは2図の下に常設編集と全幅タブ、760px以下で1列。共通の見出し・Math・入力括弧・操作ボタンを使用。
- 共通VectorPlane2Dと第五Labの空間幾何・吸着を使用。`visualization/inputImagePresentation.tsx`へ第五Labの入力／像の重なり対策を抽出し、既存関数の窓口と表示を維持しつつc／Dcでも共用する。別の固有直線を合成して平面にしない。
- ドラッグ中は両図の表示範囲を固定してプレビューを更新。pointerupで最新入力を確定、取消し／Lab非表示で破棄する。左図が描画限界を越えてSVGを外す場合は有効入力を確定してdragロックを解除する。右図だけの上限超過では左の操作を維持する。
- Resetは初期scene・左右auto・条件タブへ戻し、入力下書きとプレビューも破棄。右図は矢先読取専用。共有ボタンは13.6まで無効とし、その理由を併記する。旧5Labのwire／初期化は変更しない。

検証: `tests/ui/diagonalizationLab.test.ts`に初期値・列順・行列編集・不可／保留・underflow・片側だけの描画上限・共通吸着・重なりラベル・Resetと操作接続を追加。静的描画・純粋状態・数学APIの検証であり、ブラウザイベントや実機の390px表示の確認を代替しない。最終の関連テスト結果は[現在地](./PROJECT_STATUS.md)に記録する。

D-118は承認済み。次の13.4（0D・1D・3D）は3D操作・座標の意味と保留、0Dの空状態を横断するため**「高」推奨**とした。共有13.6・教材資料13.7・全体棚卸し13.8へは先行しない。コミット・プッシュ・ブラウザ／実機確認は利用者担当。

## 11. 13.4実装記録・再開点（D-119確認待ち）

2026-09-15。13.3の補修を含めD-118承認済み。数ベクトル0〜3Dへ拡張し、設計済みの初期値・数値基準を維持した。

- `diagonalizationWorkspace.ts`はdimensionと4個のslotを保持。slot={scene, views:{reference,eigenbasis}}、各Viewは{plane,line,camera}。scene.definitionに次元・行列を持つ既存EigenScene形式を維持。入力解析結果・draft・preview・tabは保存しない。初期slotは共有せず生成し、Resetは現在の次元だけ起動時slotへ戻す。多項式slotは13.5で追加する。
- `DiagonalizationLab.tsx`はWorkspaceと、次元／Resetのkeyを持つSceneViewに分割。0DはZeroSpace0D、1DはVectorLine1D、2Dは既存経路、3Dは遅延ロードしたDiagonalizationSpaceへ渡す。入力previewは確定解析から分離し、確定値が変わらない限り固有値解析・基底構成を再実行しない。
- `DiagonalizationPanels.tsx`は0Dを独立分岐し、空基底・空行列・空座標を短く説明する。正の次元では基底の組・行列列数と隣接交換を一般化する。3Dでは(1,2)・(2,3)の隣接交換で全ての置換へ到達する。
- `DiagonalizationSpace.tsx`は確定解析から固定IDの矢印を構築し、左のAu、右のc／Dcを専用previewへ渡す。右は矢先読取専用で、カメラは独立。共通3Dの単体preview呼出しを維持したまま配列にも対応し、全プレビューを差し替えてから描画する。数値化不能の成分はnullで隠す。内部の固定IDの受け皿に使う零座標は教材の計算結果として表示しない。
- 3Dの平面・直線の各固有空間と原点優先3%吸着は第五Labと共用。軸は既存の黒色右手系、右はc₁,c₂,c₃。構築用propsはmemo／定数とし、ドラッグ途中にThree.jsのruntimeを再構築しない。非表示Labや別次元へ移ると3Dを破棄する。入力や像の描画限界の扱いは13.3を維持。
- CSSは外側2図だけでなく内側のthree-dimensional-plot-cardも通常スクロールへ固定。視点ボタン以外の重複見出し・操作モード・授業説明パネルは追加していない。

回帰は`tests/ui/diagonalizationDimensions.test.ts`の11テスト（0D・1D・3D、独立slot／両ViewのReset、列順・吸着・preview・代替・上限）を追加。共通3D変更に伴う既存のソース接続検査も更新する。静的描画・純粋関数・接続の検査であり、実ブラウザのThree.jsイベントや性能・実機表示を確認済みとはしない。最終の検証数はPROJECT_STATUSを参照。

次はD-119確認後の13.5、多項式1〜3D（推奨「中」）。共有13.6、授業資料13.7、全体棚卸し13.8は未着手。既存数学API・5Labの共有形式・依存を変更しない。

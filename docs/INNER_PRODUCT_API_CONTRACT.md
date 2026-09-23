# 内積・正規直交基底Lab 教材・数学API・状態契約（14.1）

2026-09-23更新。**D-125・D-126・D-127は利用者承認済み。14.3・14.4（D-128・D-129）承認済み、14.5・D-130承認済み、14.6・D-131承認済み、14.7共有実装済み・D-132承認済み、14.8資料整備済み・D-133承認済み。** 共有デコーダーと対象Labの意味検証を接続済み。14.2〜14.8の実装記録は第10〜16節を参照。実画面確認後の見直しを認める。

[詳細設計](./INNER_PRODUCT_LAB_DESIGN.md)、[工程](../ROADMAP.md)、[判断](./DECISIONS.md)、[表記](../math-writing-rules.txt)を参照。既存6Lab・88授業例・共有形式を変更しない。フェーズ7は延期、ケイリー・ハミルトン・次数落としは対象外。

## 1. 記号と入力の境界

- 周囲の空間Vは数ベクトルのR^n（n=0〜3）、多項式のR[x]_(n−1)（n=1〜3）。生成空間W=span(S)とは区別する。
- 入力の組は𝒜=(a_i₁,…,a_iₘ)、集合はS={a_i₁,…,a_iₘ}。aの添え字は固定ID、処理位置は別の序数。順序交換でa₁をa₂へ改名しない。出力は採用順の𝒬=(q₁,…,qᵣ)。
- 正次元では0〜8本。IDは整数1〜8で重複不可、追加時は未使用の最小IDを使い末尾に追加、削除後は再利用可。並べ替えは現在のIDの完全な置換。元入力と出力の対応をsourceIdで保持する。
- 入力成分は有限binary64、絶対値1e6以下、長さnの列成分配列。−0は0に統一。多項式の配列は標準単項式基底𝓔=(1,x,…,x^(n−1))の昇べき係数であり、多項式そのものと無条件に等置しない。
- 入力行列Aはこれらを列に持つn×m行列。多項式の成分はb₀,b₁,b₂、選択した2入力はu=a_i、v=a_j（同じIDも可）。射影は「vをuの生成する空間へ」。射影p、残差r=v−p、GSの非零直交出力w_j、その正規化q_jを用いる。
- 内積は山括弧、ノルムは二重縦棒。このLabでは生成空間はspan(S)とし、山括弧を生成空間の意味に併用しない。数値は小数、通常式は等号、ベクトル文字だけ太字斜体・数字添え字は立体。
- 不正な次元・形・内積ID・成分・重複IDは入力エラー。数学的な零・従属と、正しい入力に対する計算保留は例外にしない。

## 2. 数学APIの境界（14.2実装済み）

公開窓口はsrc/domain/index.ts、型はinnerProductTypes.ts、解析はinnerProduct.ts、数値検算はinnerProductNumerics.ts。URL、React、視点、丸め表示、入力下書きは渡さない。以下の関数と型は14.2で実装済み。

```ts
type MetricId = 'euclidean' | 'coefficient' | 'integral';
type MetricDefinition = Readonly<{ dimension: 0 | 1 | 2 | 3; metric: MetricId }>;
type OrderedInput = Readonly<{ id: number; components: readonly number[] }>;
type ExactScalar = Readonly<{ numerator: bigint; denominator: bigint }>;
type Value<T> =
  | Readonly<{ status: 'ready'; value: T }>
  | Readonly<{ status: 'unavailable'; reason: 'unrepresentable-result' | 'residual-too-large' }>;
type StageKey =
  | Readonly<{ inputId: number; phase: 'input' | 'residual' | 'normalize' | 'skip' | 'hold' }>
  | Readonly<{ inputId: number; phase: 'projection'; count: number }>;

createInnerProductMetric(definition: MetricDefinition): InnerProductMetric
analyzeInnerProductPair(metric: InnerProductMetric, u: readonly number[], v: readonly number[]): PairAnalysis
analyzeGramSchmidt(metric: InnerProductMetric, inputs: readonly OrderedInput[]): GramSchmidtAnalysis
toInnerProductCoordinates(metric: InnerProductMetric, components: readonly number[]): Value<readonly number[]>
fromInnerProductCoordinates(metric: InnerProductMetric, coordinates: readonly number[]): Value<readonly number[]>
```

- metricは不変snapshotとして、定義、正確な有理G、数値C／逆変換と軸名を持つ。euclideanは0〜3、coefficient／integralは1〜3のみ。数ベクトル／多項式の種別との照合は場面側で行う。
- APIに渡すOrderedInputの配列順が処理順。行列は行配列、各input.componentsと出力vectorは列成分配列。計算結果も入力をコピーした不変snapshotとする。
- ExactScalarは既約・分母正の内部計算結果。零は0/1。BigIntをUI／共有へ直接渡さず表示アダプターを介する。正確な有理数から入力した1/3や根号を推測復元する機能ではない。
- PairAnalysisはexactな内積・ノルム二乗・射影係数／成分・残差と、各々独立したValueの数値表示を持つ。内積が数値化できなくてもノルムや射影が安全なら残す。未選択はLab側の状態であり、APIへ偽の零を渡さない。
- ノルムはValue<number>、角度はready（度数値）／undefined-zero-vector／inconclusiveを区別。方向u=0はprojection.kind='zero-subspace'、p=0,r=v、係数はnull。u≠0はkind='line'、係数は正確な比。零ベクトルは任意のベクトルと内積0だが、角度90度とはしない。
- PairAnalysis全体はcomplete／partial／numerical-failure。個別に残せる確定値をpartialで返す。演算上限以前に確定できた値のみ残し、未計算を0や空列にしない。

## 3. 固定内積と表示座標

euclidean／coefficientではG=C=E。integralは区間[-1,1]、G_ij=0（i+j奇数）、2/(i+j+1)（偶数）、添え字i,jは0始まり。Gは2/3をbinary64から有理数化せず、整数の比として構成する。

3Dの行配列は次で固定し、1・2Dは左上小行列を使う。

```text
G = [[2,0,2/3], [0,2/3,0], [2/3,0,2/5]]
C = [[√2,0,√2/3], [0,√(2/3),0], [0,0,√(8/45)]]
z = C b,  CᵀC = G
b₂ = z₃/√(8/45)
b₁ = z₂/√(2/3)
b₀ = z₁/√2 − b₂/3
```

低次元では存在しないb₂等を0とする。多項式の図は「内積を反映した座標」、積分時の軸はξ₁,ξ₂,ξ₃。固定表示基底(1/√2,√(3/2)x,√(5/8)(3x²−1))の座標であり、GSで得た𝒬と混同しない。係数内積では軸b₀,b₁,b₂、数ベクトルは既存のx,y,z。すべての軸と軸名は黒。

往復APIは導出成分の1e6超過を数値エラーにしない。有限性・非零成分消失・往復残差を検査し、入力上限と描画上限はLab側で別途適用する。図から入力へ戻す時だけC逆変換後の元成分の上限を検査し、超過は確定せず理由を表示する。

## 4. 正確なGS過程と結果

元のa_iから各採用w_jへの係数α_ij=⟨a_i,w_j⟩/⟨w_j,w_j⟩、射影成分p_ij=α_ij w_jを正確な有理数で求める。p_iはそれらの和、残差r_i=a_i−p_i。画面で射影を一つずつ表示しても計算式の被射影ベクトルは元のa_iで固定する。

GramSchmidtAnalysisはmetric定義、入力snapshot、steps、accepted、availableStages、status、issues、processedCount、basisOfSpan、basisOfAmbientを持つ。

| 項目 | 契約 |
|---|---|
| status=complete | 全入力を処理し、全ての採用列の正規化・検算が成功。空／全零もcomplete |
| status=inconclusive | 正確な非零は分かったが数値化・正規化・検算を保証できず停止 |
| status=numerical-failure | 有理数予算・非有限演算・内部整合の失敗で停止 |
| step.outcome | accepted／skipped-zero-input／skipped-dependent／inconclusive／numerical-failure |
| stepの情報 | sourceId、処理序数、以前の採用sourceId一覧、正確な各α/p、残差、ノルム二乗、数値Value、成功時のoutputIndexとq |
| accepted | 確認済みのw（exact）・q（数値）・sourceId・1始まりoutputIndex。保留した列は含めない |
| processedCount | 完了したaccepted／skippedの入力数。停止中の入力とそれ以降は数えない |
| basisOfSpan | completeならtrue、それ以外はnull。保留の前までの組を全入力の基底と呼ばない |
| basisOfAmbient | completeならaccepted.length===n、それ以外はnull。確定しないものをfalseにしない |

- 正確に全成分零ならスキップして続行。非零残差が小さいだけではスキップしない。採用は検算後に確定し、次の計算には正規化した数値qではなくexactなwを使う。
- 正規化は正のノルムで割るのみ。wが負向きならqも負向き。任意の符号統一をしない。
- 保留／失敗した入力以降は未処理とする。正確な射影まで分かればその段階は残す。得られなかった後続の段階や完成基底を表示しない。
- 正次元の空入力はS=空集合、span(S)={0}、空の正規直交基底、周囲の空間の基底ではない。0Dは入力配列[]固定、空基底が周囲の空間の基底でもある。

### 段階キーと順序

各入力はinput→projection(count=1,…,k)→residual→normalize（採用）またはskip（厳密零）。kはそれ以前に採用した本数。projectionは先頭count本の射影成分と累積残差を表示し、対応sourceIdも併記する。k=0ならprojection段階を作らない。

停止時は計算済みの段階まで＋holdを返す（残差不明ならresidualも作らない）。normalizeは採用成功時のみ。空入力／0DのavailableStagesは[]、現在stage=null。末尾から次へは進めず、先頭から前へも進めない。各キーは一意で、URLの意味検証はavailableStagesとの完全一致を使う。

## 5. 数値安全性の初期採用値（D-126）

厳密な零判定にD-009の1e-10や吸着距離を使わない。入力は入力後のbinary64値そのものとして正確に扱う（10進数文字列の数学的な実数を復元するのではない）。

| 境界 | 採用契約 |
|---|---|
| 有理数の大きさ | 既約分子の絶対値bit数＋分母bit数≤32768。既存eigenExactと同じ。演算前の積／和の一時整数は65536bit以下を保守的に見積もり、超える演算を始めない |
| 演算回数 | API呼出しごとに有理数の生成・四則・比較の呼出しを合計20000回まで、GCDの剰余計算は合計200000回まで。時間による打切りは使わず同じ入力の再現性を守る |
| 直交単位性 | 数値q列についてmax_ij|⟨q_i,q_j⟩−δ_ij|≤1e-12（Gの内積）。正規化後に再確認 |
| 相対再構成 | 射影と残差、入力の採用基底による再構成は1e-12以下。相殺する小残差もexact値との相対検査を別に通す |
| 正規化成分 | 数値qを正確な有理数へ戻し、厳密なw/‖w‖の方向・大きさとスケーリングして比較。各非零成分の相対誤差≤1e-12、厳密零の成分は数値も0 |
| 座標往復 | b→Cb→C⁻¹Cbおよび逆向きの相対誤差≤1e-12。元の非零成分が消失したら失敗 |
| cosの丸め補正 | 正規化したu,vからcosを求める。範囲[-1,1]のはみ出しが32×Number.EPSILON以下だけclamp。それ以上は角度保留 |
| 描画 | 図に出す変換後の全成分の絶対値≤1e6、有限かつ必要な非零成分が失われていないこと。満たさなければ図だけ保留 |

相対ベクトル誤差は‖actual−expected‖∞/(‖actual‖∞+‖expected‖∞)。再構成a=p+rは分母‖a‖∞+‖p‖∞+‖r‖∞。基底再構成の分母は元入力ノルム＋各一次結合項ノルムの総和。分母に一律の1を足さず、分母0は分子0の時だけ誤差0とする。underflow/overflowを避けるスケーリングまたはexactな比で比較する。大きな入力に対する相対誤差だけで微小残差の消失を見逃さない。

normSquaredの数値化が0になっても、exact値が非零ならnorm=0とはしない。まずexactベクトルを最大絶対成分sで割り、d=w/sについて√⟨d,d⟩を求め、q=d/√⟨d,d⟩を作る。ノルムはsとの積を指数分離して求める。非零内積などの値がbinary64で表せなければ、そのValueだけunavailable。ノルム二乗の表示不能だけでGSを止めず、qと残差等の必要な経路が検算できる場合は続ける。正規化に必要な非零成分が消えればinconclusiveで止める。

検算のqはbinary64を再度有理数化し、Gとの積をexactに比較できる。sqrtの方向・成分確認は二乗比と符号による確認を用い、丸め値を同じ経路で再計算しただけの自己一致を正しさの根拠にしない。実装時に定数と測定値をdiagnosticsへ残す。

失敗理由はrational-budget、unrepresentable-result、residual-too-large、inconsistent-analysisを区別。数値が取得できない場合に0、Infinity、NaN、古い図を代入しない。演算予算はデバイス時間上限の保証ではないため、14.2で最大8本の負荷を測り、厳しすぎる／遅い場合は基準変更を再提案する。

### 既存の有理数ヘルパーとの境界

src/domain/eigenExact.tsのfromNumber／有理四則は再利用候補だが、固有多項式・根探索・核・固有ベクトル正規化は使わない。14.2では低水準演算をexactRational.tsへ抽出し、既存eigenExactの公開関数・EigenPrecisionLimitを互換ラッパー／再exportで維持する。GSだけ呼出し単位の予算を渡し、既存ソルバーの予算や挙動を変えない。抽出には固有値・対角化の回帰を必須とする。14.1では抽出しない。

## 6. 教材状態と操作

Workspaceはcoordinate:0/1/2/3とpolynomial:1/2/3の7slot。scene、view、起動時snapshotを分離する。

- 正次元scene: kind, dimension, metric, inputs（ID＋成分、配列順）, mode（pair／gram-schmidt）, pair（[uId,vId]またはnull）, stage（StageKeyまたはnull）, showGeometry。
- 0Dscene: dimension=0, modeのみ。暗黙にkind=coordinate、metric=euclidean、inputs=[]、pair/stage=null。0Dでのpair表示は暗黙のu=v=[]を解析し内積／ノルム0・角度未定義。入力0本の正次元とは異なる。
- viewは次元対応の数直線／平面／3Dカメラ。タブ、折り畳み、編集中文字列、drag preview、共有ダイアログは一時UI状態。showGeometryは射影・残差・直角印や手順の補助図の一括ON/OFF、元入力は消さない。

| 操作 | 契約 |
|---|---|
| 確定成分編集 | 元成分を更新して解析。存在するpairとstageは維持し、stageが消えたら先頭inputへ戻す。理由を操作領域の短い状態通知で示す |
| 追加・削除・順序変更 | GSは先頭inputへ戻す。空ならstage=null。削除でpairの片方でも無効ならpair=null（別入力へ黙って置換しない）。追加してもpair未選択は維持 |
| 内積変更 | 元入力・順序・pairを維持。stageは新解析に存在するなら維持、なければ先頭。変換された図を全体表示、3Dは向きを保持して距離／中心をfit |
| モード変更 | 入力、pair、stage、内積、viewを維持。対応する解析タブへ移る。未選択・空でも勝手に入力を追加しない |
| 種類・次元変更 | 別slotを復元。0Dから多項式は最後の多項式次元（初回2D）。一時状態を破棄 |
| Reset | 現在slotのsceneとviewを起動時snapshotへ。モードも含む。他slotと起動時snapshotは変えず、共有／下書き／previewを破棄、対応タブへ |
| 図のdrag | 元入力だけ編集。原点吸着優先、方向吸着なし（2D幅2%・3D幅3%）。previewの数学と図を同一snapshotから更新。取消しは確定状態へ |

原点吸着はC変換後の図の座標で適用し、吸着成立時は元成分を厳密な零へ設定する。3Dは既存の画面平行面内dragと背景回転。1Dも原点吸着のみ、共通数直線の表示幅2%を採用する。q/p/rは直接編集不可。

入力・順序・内積変更時だけGS解析を更新する。pairの選択変更はpair解析のみ、段階／タブ／カメラ変更では数学APIを再実行しない。showGeometryがオフでも数学値は同じ。ドラッグ中のstageが一時的に消えればpreview内で先頭に退避し、取消しで元stageを戻す。確定時に正式に検証する。

## 7. 共有v1と意味検証（14.7実装済み）

正次元の例（全項目必須、未知項目は拒否）:

```json
{"v":1,"lab":"inner-product","kind":"coordinate","dim":2,"metric":"euclidean","inputs":[{"id":1,"components":[1,1]},{"id":2,"components":[1,0]}],"mode":"gram-schmidt","pair":[1,2],"stage":{"inputId":2,"phase":"projection","count":1},"showGeometry":true,"camera":null}
```

0Dはモードだけを追加した最小4項目で、kind、metric等は含めない:

```json
{"v":1,"lab":"inner-product","dim":0,"mode":"pair"}
```

- cameraは3Dで既存SharedCameraState必須、1/2Dはnull。初期3Dも既定値を保存。手動1/2D表示範囲は保存せず全体表示する。showGeometryはboolean。
- pairはnullまたは現存ID2個（重複可）。部分選択は一時UIだけ。stageは非空入力で必須のStageKey、空入力でnull。pairモードでもstageを保存し、戻った時の手順を再現する。
- 共有層は構造・数・列長・ID・内積とkindの組・phaseごとの項目・count整数1〜3・cameraを検証。そこでソルバーを呼ばない。
- 対象Labの復元時に一度GSを解析し、stageがavailableStagesに存在するか照合する。存在しない／必要な処理が保留で再現できない段階なら、理由付きで復元失敗とする。別の段階へ黙って修正しない。保留入力のinput／holdなど再現可能な段階は共有可能。
- 局所編集時の段階退避と、外部URL復元時の厳密な照合は意図して異なる。再現失敗時は既存の不正共有警告経路を使い、半端な入力を起動時snapshotへ適用しない。
- p/r/q/G/C、解析・数値予算、他slot、タブ／折り畳み、下書き／previewは保存しない。入力ID・配列順・内積・数値基準・段階列挙はv1の再現条件。変更時はリリース前でも版変更の要否を記録する。
- 現在のorigin/path、完全URL2048文字、共通QR／PNG／テキストを維持。長い8本の成分を丸めて押し込まず理由を表示。不正／未確定下書き・drag中の共有は停止。共有が成功してもReset基準を変更しない。
- 復元されたslotだけ共有時snapshotを基準とし、他slotは既定値。共有時3DカメラをResetで復元し、1/2Dは共有入力の全体表示に戻す。

## 8. 初期値と独立期待値

全slotはpairモード、showGeometry=true、初期解析タブは内積・射影、全体表示／既定3Dカメラ。入力IDは1から、順序はそのまま、stageは先頭input（空ならnull）。正次元で2本以上のpairは[1,2]、1本は[1,1]。

| 場面 | 元入力の列成分／多項式 | 内積・GSの独立期待値 |
|---|---|---|
| 数0D | [] | 暗黙u=v=[]、内積0・ノルム0・角度なし、空基底がVの基底 |
| 数1D | [1],[2] | 内積2、角0度、p=[2],r=[0]。q₁=[1]、2本目は従属 |
| 数2D（起動時、14.3補修で変更） | [2,2],[3,0] | 内積6、45度、p=[3/2,3/2],r=[3/2,−3/2]、q=( [1,1]/√2, [1,−1]/√2 ) |
| 数3D | [1,1,0],[1,0,1],[0,1,1] | pair内積1・60度、p=[1/2,1/2,0],r=[1/2,−1/2,1]。w=( [1,1,0], [1/2,−1/2,1], [−2/3,2/3,2/3] ) |
| 多項式1D | (1)、integral | pairは同じ1、内積2・ノルム√2・角0度、q₁=1/√2 |
| 多項式2D | (1,x)、integral | 内積0・90度、射影0・残差x、q=(1/√2,√(3/2)x) |
| 多項式3D | (1,x,x²)、integral | w=(1,x,x²−1/3)、最後のノルム二乗8/45。qは固定表示基底と一致 |

14.2で追加する境界例:

- (e₁,2e₁,e₂): 2番をskipして3番を採用、sourceIdは1,3、出力番号は1,2。
- R³内の(e₁,e₂): Wの基底だがVの基底でない。空／全零もWの空基底。
- 1Dの(−2,3): 最初のqは−1。零の先行入力は除算せずスキップ。
- u=0,v≠0／u≠0,v=0: どちらも角度未定義、前者p=0,r=v、後者p=r=0。
- 積分u=1,v=x²: 内積2/3、p=1/3、r=x²−1/3。係数内積では内積・射影0。
- (e₁,[1,1e-200]): 正確な非零残差を採用しq₂=e₂。normSquaredのbinary64化が0でも従属としない。
- 1Dでu=v=Number.MIN_VALUE: 内積の数値はunavailable、ノルムはMIN_VALUE、角度0、p=v,r=0、q=1が得られる。値の一部の表示不能で全体を偽の零にしない。
- [Number.MIN_VALUE,1e6]: 正規化の非零成分が表せない場合は保留、黙ってe₂にしない。
- 積分3D入力[1e6,0,1e6]: 変換後ξ₁>1e6なので図のみ保留、元入力は合法。内積・成分と共有は利用可能。
- 予算の境界、逆変換相殺、近従属、内積変更／ID再利用／段階無効化／保留段階URL／0Dの両モードを回帰する。予算境界は内部テスト用budget注入で再現し、URLに予算設定は持たせない。

## 9. 作業境界と確認（14.1時点の記録）

14.1は契約、表記規則、文書の現在地、独立例の検算テストまで。14.2で低水準算術の抽出・数学API・境界検証、14.3以降で画面、14.7で共有を接続する。手計算例の文書テスト合格を、新ソルバーの精度や実機性能の検証済みとはしない。

D-126では結果／保留の型、演算予算・精度基準、段階と編集・復元の相違、0Dモードを含む共有、7場面の初期値を確認する。数値基準は14.2で検証し変更が必要なら根拠付き再提案。**次の14.2は「高」推奨**。有理数演算の再利用と極小値の正規化・保留を実装し、既存固有値／対角化への回帰を確認するため。

14.1検証記録: 文書関連14ファイル66テスト成功。独立した射影・直交化の期待値、C逆変換、underflow例、予定共有JSONと文書の現在地を検算した。全体111ファイル1079テストも成功。実機確認・ビルドは未実施であり、まだ存在しない新APIの計算精度・性能を検証済みとはしない。

## 10. 14.2実装記録（D-127承認済み）

2026-09-17。D-126承認を反映し14.1完了。5関数と関連型をdomain/index.tsから公開した。新UI・共有デコーダー・依存の追加はない。

- `exactRational.ts`: 既存eigenExactの有理数変換・四則を抽出。従来の窓口から同じ関数を再exportし、EigenPrecisionLimitも同じ例外クラスの別名として維持。既存経路へ新しい演算回数／一時bit上限を課さず、GS／pairだけ呼出し単位の予算を使う。
- `innerProductTypes.ts`: exactな値と数値Value、pair、段階・採用出力・GS判定を定義。snapshotは入力をコピーして再帰的にfreezeする。G/Cは固定metricのfactoryで構築し、改変／手作りmetricや不正形状を拒否する。
- `innerProductNumerics.ts`: 正確な内積・射影計算と数値化検査を分離。normSquaredを先にnumberにせず二進指数を分離して平方根を取る。qの各成分もw_i²/⟨w,w⟩から同様に求める。これは最大成分スケーリングと同値で、中間の小成分の消失も防ぐ。符号を維持し、正確な二乗比・直交単位性・入力再構成で検算する。
- `innerProduct.ts`: pair解析、GS解析、固定Cの往復。入力IDと処理順を区別し、確認済みの段階だけ列挙。厳密零はスキップして続行、保留後の入力は未処理。0D／空入力／部分空間基底／極小値を特別な偽入力で代用しない。
- 数値基準と予算はD-126から変更なし。Cの往復は全体残差に加え、元の非零成分の相対誤差も1e-12で確認する。大きい他成分が微小成分の別の丸め値への置換を隠すテスト例に対応した。逆変換で保留しても元入力を変更しない。

### 呼び出し例と結果の扱い

```ts
const metric = createInnerProductMetric({ dimension: 2, metric: 'euclidean' });
const pair = analyzeInnerProductPair(metric, [1, 1], [1, 0]);
// pair.projection.vector.numericがreadyなら[0.5, 0.5]。
const gs = analyzeGramSchmidt(metric, [
  { id: 1, components: [1, 1] }, { id: 2, components: [1, 0] },
]);
// completeならacceptedに2本。gs.availableStagesから表示する段階を選ぶ。
```

内積などは`{exact:{numerator,denominator}, numeric:Value}`、ベクトルもexact列／numeric列を持つ。未計算の項目はnull、数値化不能はunavailableで区別する。pairがpartialでも安全な他の値は表示可能。ノルム二乗だけの数値化不能でGSを止めない。一方、図に必要な残差の成分消失・正規化の検算失敗はinconclusive、演算予算超過はnumerical-failureとする。UIはstatusだけでなく各Valueを確認し、失敗値を0へ置換しない。

`diagnostics`は実際の演算／GCD回数、採用許容誤差、検査した最大残差を返す。最大残差にはunavailableになった表示値の検査も含むため、GSがcompleteでも、表示不能なノルム二乗等の検査値を含む場合がある。正規化・採用の成否は結果とValueで判定する。

内部の`createInnerProductEngine`による予算注入はテスト用で、共通domain窓口・UI・共有へは公開しない。段階／カメラ変更で再解析しない設計を維持する。数値previewと実図の同期、3Dの実操作性能は14.3以降の責務。

検証は独立した初期値・射影・積分内積・直交化、従属中間入力、0D〜3D／全零／空入力、順序、微小非零／相殺、演算予算、prefix保持、C往復・大きい導出値、snapshot不変性を対象とする。最大8本の積分3Dを32回反復して予算の分離と決定性を確認し、その反復を含む新API40テストは本環境のVitestで約130ms。これは1フレームの保証や実機ドラッグ計測ではない。最終検証件数はPROJECT_STATUSに記録する。

D-127は2026-09-21に承認済み。数2D画面は14.3、GS操作は14.4、数0〜3Dは14.5、多項式1〜3Dは14.6で接続した（第11〜14節）。共有は14.7で接続済み（第15節）。14.8の教材資料・既存UI導線の整理は第16節を参照する。

## 11. 14.3画面接続（D-128承認済み）

以下は14.3時点（2026-09-21）の記録。数2D・固定2本を実装。`innerProductScene.ts`が入力・pair参照・補助図設定を保持し、`InnerProductLab.tsx`が下書き・表示範囲・ドラッグpreview・タブを分離する。共有形式は未接続（14.7）。現在は14.4でGS解析／段階操作を接続済み。

14.3補修（利用者指示）: 初期値・Resetをa₁の列成分(2,2)、a₂の列成分(3,0)へ変更。内積は「2×3+2×0=6」のように成分同士の積和も表示し、成分編集・ドラッグ・u/v選択へ追従する。負の因子は括弧で囲む。第7節の共有JSON例、第10節のAPI呼出し例と従来の数学回帰例は初期値とは別の例として維持する。補修後の関連UI・文書3ファイル21テストと型検査に成功。実機・デプロイ確認は利用者担当。

- `analyzeInnerProductPair`だけを入力／pairの変更で呼び、パン・ズーム・タブ・補助図チェックだけでは再計算しない。
- SVGは元入力と導出p/rを原点から描き、破線の補助図と直角印はclip内・pointer-eventsなし。元入力だけにハンドルを付ける。previewで図と式を同じ値から更新し、ドラッグ終了時に確定、取消・Lab非表示時には破棄する。
- 原点への吸着は表示幅の2%、方向吸着はなし。成分入力は吸着なしで非零を維持。描画中の自動fitは停止し、終了後に自動範囲を更新する。
- 各Valueのreadyを確認して表示。零方向の射影は零部分空間、零との角度は未定義。数値保留を零にせず、図に必要な値が欠けたら派生図を消す。描画上限1e6超過は図だけ保留し、入力を残す。
- 共通Mathフォント・角括弧・等号と6桁の小数表示を使用。微小値は指数表記のまま残す。直交性は丸め前のAPI結果に従い、描画を丸めて判定しない。
- 自動テストは純粋な編集／選択／吸着とSSR・接続ソース検査。実際のpointer・キーボード・390pxの検証とは区別し、D-128で利用者確認を依頼する。

## 12. 14.4数2Dグラム・シュミット接続（D-129承認済み）

2026-09-21実装、14.5開始指示時にD-128・D-129の承認を受領。以下は14.4時点の記録。第6節の正次元sceneのうち数2Dを実装し、0〜8本・固定ID・mode・nullable pair・stageを保持する。数学APIの型・判定・予算と既存共有には変更なし。

- 追加は最小未使用IDの零ベクトル。削除／順序変更でも既存の名前と色を保持。参照入力削除時はpair=nullとし、u/v両選択が揃うまで内積を計算しない。入力未選択を数0や0Dと混同しない。
- GSは入力変更だけで再解析。段階選択はavailableStagesから取得し、`gramSchmidtFrame`はsnapshotの値を取り出すだけ。projection(count)では先頭countの射影とその累積残差、normalizeで初めて現在のqを図へ追加する。
- 操作は前／次と入力番号・段階の選択。空入力は段階なし、端で進行停止。成分変更時にstageが消える場合は先頭へ戻し理由を通知。previewでは一時退避、取消なら元状態へ戻す。追加／削除／順序変更は先頭へ戻す。
- 残差を各直交方向へ再射影する式に変えず、常に元a_iからの係数を表示。画面のp_jは現在入力からw_j方向への射影で、その元のsourceIdも示す。射影の和・累積残差・直交性・正規化の式と図を同じ段階から表示。
- 正規化成功のみ採用。零入力と一次従属を説明し飛ばす。保留以降の入力は未処理。基底タブでは全入力の解析結果と明記し、確認済みprefixを完成基底と呼ばず、Wの基底と周囲Vの基底を分離する。
- 補助図は現在段階だけ。既採用q・現在入力を明瞭にし、他の元入力は薄く表示。導出値は編集不可、図の上限・成分保留と数学結果の成功を区別する。2D内の確認済み直交分解だけに直角印を付ける。
- 自動テストは状態・段階の純粋関数、SSRと接続ソース検査。14.4の実操作・390px・キーボードはD-129で利用者確認済み。14.5・D-130も利用者確認済み。

## 13. 14.5数0D・1D・3D接続（D-130承認済み）

2026-09-22。D-130承認済み。以下は14.5時点の記録。数ベクトルの4場面を実装。数学APIの判定・演算予算は不変。多項式は14.6で接続、共有14.7は第15節で接続済み。

- sceneにdimensionを保持し、metricは0〜3Dのユークリッド内積定義を再利用。workspaceの各slotはsceneとplane／line／cameraを分離して保持。Resetは現在slotだけを初期snapshotに戻す。
- 0Dの内部sceneはinputs=[]、pair=null、stage=null。解析だけ暗黙の零同士を渡し、画面は成分欄なし・零・空基底・角度未定義を表示。正次元のpair=nullは従来どおり未選択であり、零同士とみなさない。将来の0D共有payload最小契約は第7節のまま。
- 1Dは共通数直線、3Dは共通右手系・黒軸・視点操作を利用。0Dにはズーム／成分編集を作らない。元入力のみドラッグ可能。原点吸着は1D／2D幅2%、3D幅3%、方向への吸着なし。
- 解析snapshotは確定入力とpreview入力に分離。段階・タブ・カメラ変更では数学APIを再実行しない。3Dの構築用配列は確定状態だけでメモ化し、ドラッグ中の派生図・式は同じpreview解析から取得する。
- 3Dは固定の派生slotを用意し、現在段階にない値は座標nullで非表示。normalize段階消失時は先頭へ一時退避、取消で復元し、確定編集のみsceneの段階を更新する。色はsourceId、番号は現在の出力順を維持する。
- 補助線は2〜3個の確認済み非零直交成分から構成し、原点からの矢印と平行移動した辺を示す。世界座標上の直角印は数値直交性も確認し、投影画面上の角度では判定しない。旧previewのCSSラベル・GPU資源を毎回破棄して残像を避ける。
- 入力成分上限1e6、派生図上限1e6、数値失敗／WebGL失敗時も入力・解析・Resetが残る責務は維持。0D・1D・3Dの状態／SSR・純粋な幾何・共有3D接続を自動検証し、実ドラッグと狭幅はD-130で利用者確認済み。

## 14. 14.6多項式と内積対応座標（D-131承認済み）

2026-09-22。7場面と2つの多項式内積を接続。14.2数学APIの計算・判定・予算は変更しない。共有14.7は第15節で接続済み。

- sceneにkind／metricを追加。数0〜3Dの既存slotsと多項式1〜3DのpolynomialSlotsをworkspaceで独立保持し、activeInnerSlot／updateActiveInnerSlotをUI窓口とする。種類ごとの最後の次元へ復帰する（初期は双方2D）。内積ごとの別slotは作らず、多項式を保って内積を比較する。
- 元入力と解析snapshotは標準単項式の係数。図のアダプターだけがtoInnerProductCoordinatesを呼び、全入力・q/p/rをC座標へ変換。射影とGS補助線も同じ変換。coefでは恒等変換、integralの軸はξ、元係数入力はb。
- 表示座標が上限内なら元の派生係数が1e6を超えるだけで図を拒否しない。一方、元入力が上限内でもC座標が上限超過／成分消失／検算失敗なら図だけを保留する。偽の零座標を挿入しない。
- 逆ドラッグは吸着後にfromInnerProductCoordinatesと入力上限を検証し、成功した元係数だけpreview／sceneへ渡す。3DはdragGuardが直前の有効な図座標を保持し、拒否候補を描く前に戻す。拒否通知を有効値の再通知で消さず、cancel時は確定値へ戻す。
- 内積変更は入力・順序・pairを維持、GSを新metricで解析。段階は既存の存在検査、viewはfit。3Dは新しい確定配列でruntimeを再構築し、向きを保ったtarget=0・zoom=1のcameraを適用する。段階／カメラ変更では再解析しない。
- 多項式自体と座標列の等置を避け、編集は[a_i]_ℰ、入力はa_i=f_i(x)、結果は多項式として表示。積分内積の評価式と係数内積の成分積和を分ける。既存3タブ内の折り畳みにℰ、b、z=Cb、Cを示す。
- 回帰は独立期待値（定数1、1とx²、(1,x,x²)のGS）、7場面、表示の内積／直角、逆変換・上限・非零消失、Reset・段階保持・表記を対象とする。実機操作はD-131で利用者確認済み。

## 15. 14.7共有・意味検証・共有時Reset（D-132承認済み）

2026-09-22。第7節のinner-product v1を実装。数値基準・演算予算・既存6Labのwire形式は変更しない。

- `sharing/shareState.ts`は型、必須項目、ID・pair・stage参照、metricとkind、成分、カメラを検証する。数学APIの実行はしない。0Dのcompact処理でもmodeを落とさない。
- `innerProductSharing.ts`は対象Labの復元時だけGSを一度解析し、availableStagesとの完全一致を検証する。非空入力のnull段階、空入力の段階、射影の余剰count、存在しないnormalize／未処理段階を拒否する。再現できるinput／holdは共有可。
- exportでは確定sceneと画面の局所段階退避規則を用いる。派生p/r/q、手動1D/2D範囲、他slot・下書き・タブは保存しない。3Dの未操作カメラは共通既定値を明示する。
- 初期化が全検証に成功した時だけ現在slotのsceneとcameraを初期snapshotへ適用する。失敗時は理由付きで既定数2Dへ戻す。再共有では初期snapshotを更新しない。
- 無効入力・drag preview中の共有を停止する。Reset／種類・次元切替で一時UIを破棄、Lab非表示時もダイアログを閉じる。共通ShareExportDialogのQR・PNG・コピー・テキスト保存と、完全URL2048文字上限を利用する。
- `tests/fixtures/share-url-inner-product-v1.json`で多項式の順序(3,1,2)、積分、3本目の射影2段階目、カメラを固定。残差−1/3+x²とノルム二乗8/45を独立期待値とする。既存fixtureは変更しない。
- 14.7完了時に14.8を「中」推奨と予告済み。次の推奨設定は第16節を参照する。

## 16. 14.8授業資料と既存操作導線（D-133承認済み）

2026-09-23。D-132・D-133は2026-09-23に利用者承認済み。以下は14.8の実装記録。数学API・数値基準・共有v1を変更せず、教材資料と操作説明のみを整備した。

- `innerProductScenarios.ts`に18例の独立期待値、`INNER_PRODUCT_TEACHING_GUIDE.md`に公開URLと観察課題を記録。7場面、零・空入力・従属スキップ、入力順、部分空間の基底、積分／係数内積を扱う。既存88例は変更せず計106例。例をアプリへimportしない。
- 手計算の射影・残差・ノルム・正規直交基底と、単項式積分による独立の内積検算、URL・Resetをテストする。小さい非零残差、成分消失による保留、図だけの上限は通常教材とは別に検証する。
- 多項式fieldset名、前／次の説明名、現在段階の視覚非表示テキスト、3D代替説明を補修。dragごとのlive通知や独立要約パネルは追加しない。フォーカス輪郭と44pxの操作領域、段階選択の折返しは内積Labだけに適用する。
- SSR・ソース・CSSテストは操作名・接続とレイアウト制約を確認するもので、実際の発音・フォーカス移動・390px表示・WebGL失敗操作を保証しない。実機確認はD-133の利用者ゲート。
- 14.8完了時に次の14.9を「高」推奨と予告済み。現在の結果は第17節を参照する。

## 17. 14.9統合棚卸し（D-134確認待ち）

2026-09-23。D-132・D-133承認済み。[棚卸し結果](./INVENTORY_PHASE14.md)を参照。統合回帰を7Lab・106例へ拡張し、配布／互換／進捗文書の追随漏れを補修した。数学API・固定G/C・演算予算・描画・共有v1は変更しない。フェーズ14の完了はD-134承認後、フェーズ7の授業評価は延期を維持する。

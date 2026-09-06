# 表現行列・基底変換の数学API（11.2）

最終更新: 2026-09-07

実装済み・利用者確認待ち（D-093）。採用記号と対象範囲は[設計書](./REPRESENTATION_MATRIX_DESIGN.md)を参照する。画面接続は11.3、共有は11.7であり、今回の公開画面の変更はない。

## 呼び出しと入力

- 実装: [representationMatrix.ts](../src/domain/representationMatrix.ts)。公開窓口は [domain/index.ts](../src/domain/index.ts)。
- 表現行列: `analyzeRepresentationMatrix(definition, sourceBasis, targetBasis, inputVector, options?)`。
- 基底変換: `analyzeBasisChange(dimension, sourceBasis, targetBasis, inputVector, options?)`。同一空間の恒等写像を使う。逆方向は2基底を交換する。
- `definition`は既存の`LinearMapDefinition`。`matrix`は基準行列Mのm行n列の行配列、次元は0〜3。0×nでもnは`sourceDimension`に残す。
- 各基底は`VectorSet`。`vectors`の配列順を基底順とし、各`coordinates`は基準座標の列。選択IDを別に持つ画面は、選択順に並べたVectorSetを渡す。
- `inputVector`は基準座標のwであり、Bに関するcではない。基底編集でwやM自体を変更しない。
- 数ベクトル／多項式の種別はこのAPIには持たせない。多項式は標準単項式基底の昇べき順の係数で計算する。恒等写像モードを同じ空間種別に限る制約は11.3以降の呼出側で守る。
- `options.relativeTolerance`はD-009（既定1e-10）。基底判定には必ず`ambient`を指定し、span(S)の基底との混同を防ぐ。

## 結果と失敗の区別

共通結果は入出力次元、基準座標の`inputVector`と`imageVector`、両側の基底判定を持つ。成功・失敗は`status`で区別する。

| status | 意味 | representation |
|---|---|---|
| ready | 両基底が成立し、列の再構成と2経路の整合も確認できた | 下記の派生値 |
| invalid-basis | 片側または両側が対象空間全体の基底でない | null |
| numerical-failure | 基底判定は通るが、有限で整合する座標を得られない | null |

基底の`failureReasons`は`dimension-mismatch`、`too-few-vectors`、`too-many-vectors`、`linearly-dependent`。複数理由も返す。座標数・空間次元の不一致では`analysis`はnull。基底の本数不足でこのwだけを表せても、正規の基底座標とは呼ばない。0Dの空の組は有効な基底だが、零ベクトル1本の組は基底ではない。

構造不正、非有限の入力、基準行列・wの既存上限超過、無効な許容誤差は既存の型付き例外を引き継ぐ。基底VectorSetは既存数学APIと同じ有限値の契約で、画面・共有の成分上限検証は呼出側で行う。入力上限を派生するAやcへ流用しない。

成功時の派生値:

- `basisImages`: 各M u_iの基準座標列。
- `columnCoordinates`: 各像をCで解いた座標列。これを列に並べた行配列が`matrix`（A）。
- `inputCoordinates`: c、`imageCoordinates`: 基準座標の像をCで解いたd。
- `imageCoordinatesViaMatrix`: A c、`imageViaCoordinates`: Cの組でA cを再構成した像。
- `pathsAgree`: true。失敗時は以前の成功値を使わず、representationがnullであることを表示へ反映する。

逆行列は明示計算せず、既存`analyzeBasisCoordinates`で各列を解く。派生値の積は入力上限や表示用の微小値丸めを適用せず計算する。

## 数値境界

非有限の計算結果は`non-finite-result`、一意な基底座標を得られなければ`coordinate-solve-failed`、再構成や経路の相対残差が許容誤差を超えたら`residual-too-large`を返す。これらは数学的な「基底でない」「表現不能」とは区別する。

比較は両ベクトルの最大絶対成分を基準に正規化する。絶対値1を下限にしないため、微小な値をすべて0とみなして経路一致にしない。既存の一次結合ソルバーが微小係数を0へ整理する場合や、悪条件の基底で桁落ちする場合は保守的に数値計算の失敗とする。D-009のrank閾値や既存Labのソルバーは変更しない。

例えば標準1D基底でw=[1e-16]は数学的には座標を持つが、既存ソルバーの微小値整理による再構成不一致を検知する。11.3では「数値計算の精度を確認できません」などと表示し、「基底ではありません」とは表示しない。一方、基底[1e-12]でw=[1]の座標[1e12]は有限で整合するため有効となる。

## 利用者確認用の数値例

行列の行・列と係数の詳細は設計書にも記載している。

| 例 | 条件 | 期待値 |
|---|---|---|
| 数ベクトル | Mの行が[1,1], [0,1]、Bの列が[1,0], [1,1]、Cの列が[1,1], [0,1]、wの列が[3,2] | Aの行が[1,2], [-1,-1]、cの列が[1,2]、dの列が[5,-3]、像の列が[5,2] |
| 基底変換 | 同じB,Cで恒等写像 | P(C←B)の行が[1,1], [-1,0]。座標の列[1,2]から[3,-1]へ。逆方向行列の行は[0,-1], [1,1] |
| 多項式の微分 | B=(1,x,x²)、C=(1,1+x)、w=1+2x+3x² | Aの行が[0,1,-2], [0,0,2]、dの列が[-4,6]、像は2+6x |
| 不成立 | 2Dの基底候補が[1,0]の1本だけ | too-few-vectors。wがその直線上でもrepresentationはnull |
| 0D | 入出力とも0D、基底・入力・行列が空 | ready。各座標・行列も空 |

図や画面の操作確認はまだ不要。上の数値例と失敗時の扱いをD-093として確認後、11.3の2→2画面へ進む。

# 固有値・固有空間Labの授業導線（12.8）

最終更新: 2026-09-10

シラバス第12週に対応する教員用資料。18例の状態と独立期待値の正本は `src/teaching/eigenScenarios.ts`。既存52例は変更せず、第五Labの18例を別枠で追加する。アプリに授業例一覧・観察課題・読み上げ要約パネルは追加しない。

## 授業での進め方

1. 下の本番URLを開き、まず固有空間を隠したまま入力を動かす。すべての例は空間表示オフで始まる。
2. 「入力と像」で定数倍の関係を確認し、「固有空間を表示」をオンにして観察と比較する。
3. 「固有方程式」→「固有空間」で、実根・同次方程式・基底・次元を対応づける。変換同士の和や差、対角化は扱わない。
4. 授業中の編集結果は共有URL・QRで配布できる。別タブで開いた状態がReset基準となる。再エクスポートは元タブのReset基準を更新しない。

以下の入力・像は列ベクトル（多項式では標準単項式基底に関する係数列）。基底の一例の定数倍や符号・正規化はアプリと異なってよい。固有空間は零を含み、固有ベクトルは零を除く。行列は $\bm A$、入力は $\bm u$、像は $T(\bm u)$。多項式係数と多項式自体を等置しない。

## 代表URLと観察課題

### 1. 最初の探索

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjIsIm1hdHJpeCI6W1s0LDFdLFswLDJdXSwiaW5wdXQiOlsxLDJdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6bnVsbH0) <!-- discover -->

$\bm A=\begin{bmatrix}4 & 1 \\ 0 & 2\end{bmatrix}$。入力：$ {}^t[1, 2]$、像：$ {}^t[6, 4]$。

問い：固有空間を表示せず入力を動かし、像が定数倍になる方向を探す。

期待：固有値2・4。固有直線はy=−2xとx軸。最初の入力は固有ベクトルではない。

### 2. 1Dの反転

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjEsIm1hdHJpeCI6W1stMl1dLCJpbnB1dCI6WzFdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6bnVsbH0) <!-- line-negative -->

$\bm A=\begin{bmatrix}-2\end{bmatrix}$。入力：$ {}^t[1]$、像：$ {}^t[-2]$。

問い：入力を正負に動かす。零入力との違いは何か。

期待：固有値−2。非零入力すべてが固有ベクトルで、像は逆向き・長さ2倍。

### 3. 2Dの伸縮と反転

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjIsIm1hdHJpeCI6W1syLDBdLFswLC0xXV0sImlucHV0IjpbMSwxXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmEiOm51bGx9) <!-- plane-sign -->

$\bm A=\begin{bmatrix}2 & 0 \\ 0 & -1\end{bmatrix}$。入力：$ {}^t[1, 1]$、像：$ {}^t[2, -1]$。

問い：各座標軸の方向に入力を置き、像の向きと長さを比較する。

期待：x軸では2倍、y軸では−1倍。一般の入力には共通の固有倍率を割り当てられない。

### 4. 斜めの固有直線と倍率1

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjIsIm1hdHJpeCI6W1syLDFdLFsxLDJdXSwiaW5wdXQiOlsxLDFdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6bnVsbH0) <!-- oblique -->

$\bm A=\begin{bmatrix}2 & 1 \\ 1 & 2\end{bmatrix}$。入力：$ {}^t[1, 1]$、像：$ {}^t[3, 3]$。

問い：y=xとy=−xで比較する。入力と像が一致するとき何が見えるか。

期待：固有値3では長さ3倍。固有値1の方向では入力と像が一致するが、両ラベルを確認できる。

### 5. 固有値0

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjIsIm1hdHJpeCI6W1syLDBdLFswLDBdXSwiaW5wdXQiOlswLDFdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6bnVsbH0) <!-- zero-eigenvalue -->

$\bm A=\begin{bmatrix}2 & 0 \\ 0 & 0\end{bmatrix}$。入力：$ {}^t[0, 1]$、像：$ {}^t[0, 0]$。

問い：入力は非零、像は零。この入力は固有ベクトルか。

期待：固有値0の固有空間はy軸（行列の核）。非零入力が零へ写っても固有ベクトルである。

### 6. 重複度2・固有空間次元2

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjIsIm1hdHJpeCI6W1syLDBdLFswLDJdXSwiaW5wdXQiOlsxLDJdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6bnVsbH0) <!-- scalar -->

$\bm A=\begin{bmatrix}2 & 0 \\ 0 & 2\end{bmatrix}$。入力：$ {}^t[1, 2]$、像：$ {}^t[2, 4]$。

問い：どの非零入力を選んでも2倍になるか。次の例と比較する。

期待：固有値2の重複度は2、固有空間は平面全体で次元2。

### 7. 同じ重複度でも直線のみ

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjIsIm1hdHJpeCI6W1syLDFdLFswLDJdXSwiaW5wdXQiOlswLDFdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6bnVsbH0) <!-- jordan -->

$\bm A=\begin{bmatrix}2 & 1 \\ 0 & 2\end{bmatrix}$。入力：$ {}^t[0, 1]$、像：$ {}^t[1, 2]$。

問い：前例と固有方程式が同じでも、固有空間の次元は同じか。

期待：固有値2の重複度は2だが、固有空間はx軸で次元1。対角化の話題には進まない。

### 8. 実固有値なし

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjIsIm1hdHJpeCI6W1swLC0xXSxbMSwwXV0sImlucHV0IjpbMSwwXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmEiOm51bGx9) <!-- rotation -->

$\bm A=\begin{bmatrix}0 & -1 \\ 1 & 0\end{bmatrix}$。入力：$ {}^t[1, 0]$、像：$ {}^t[0, 1]$。

問い：どの非零入力も回転する。固有方程式に実数解はあるか。

期待：固有多項式はλ²+1。実固有値・実固有空間なし。数値判定保留とは異なる。

### 9. 3Dの平面と直線

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjMsIm1hdHJpeCI6W1syLDAsMF0sWzAsMiwwXSxbMCwwLC0xXV0sImlucHV0IjpbMSwxLDBdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6eyJkaXJlY3Rpb24iOlswLjUwMzA1NTQ2LC0wLjY4MDYwNDQ1LDAuNTMyNjQ2OTZdLCJ0YXJnZXQiOlswLDAsMF0sInVwIjpbMCwwLDFdLCJ6b29tIjoxfX0) <!-- space-plane -->

$\bm A=\begin{bmatrix}2 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & -1\end{bmatrix}$。入力：$ {}^t[1, 1, 0]$、像：$ {}^t[2, 2, 0]$。

問い：固有空間を表示して視点を変える。平面内とz軸上の入力を比較する。

期待：固有値2の固有空間はxy平面、−1の固有空間はz軸。両者を一つの全空間として描かない。

### 10. 3Dでも実固有値は1個

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjMsIm1hdHJpeCI6W1swLC0xLDBdLFsxLDAsMF0sWzAsMCwyXV0sImlucHV0IjpbMCwwLDFdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6eyJkaXJlY3Rpb24iOlswLjUwMzA1NTQ2LC0wLjY4MDYwNDQ1LDAuNTMyNjQ2OTZdLCJ0YXJnZXQiOlswLDAsMF0sInVwIjpbMCwwLDFdLCJ6b29tIjoxfX0) <!-- space-one -->

$\bm A=\begin{bmatrix}0 & -1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 2\end{bmatrix}$。入力：$ {}^t[0, 0, 1]$、像：$ {}^t[0, 0, 2]$。

問い：xy平面の回転とz方向の伸縮を比較する。

期待：実固有値は2のみ、固有空間はz軸。残る2根は実数ではなく、この授業の固有値に含めない。

### 11. 正の次元の零変換

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjIsIm1hdHJpeCI6W1swLDBdLFswLDBdXSwiaW5wdXQiOlsxLDJdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6bnVsbH0) <!-- zero-map -->

$\bm A=\begin{bmatrix}0 & 0 \\ 0 & 0\end{bmatrix}$。入力：$ {}^t[1, 2]$、像：$ {}^t[0, 0]$。

問い：固有空間と固有ベクトルの違いを説明する。

期待：固有値0・固有空間は平面全体。零入力だけは固有ベクトルではない。

### 12. 零入力から固有値は特定できない

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6ImNvb3JkaW5hdGUiLCJkaW0iOjIsIm1hdHJpeCI6W1s0LDFdLFswLDJdXSwiaW5wdXQiOlswLDBdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6bnVsbH0) <!-- zero-input -->

$\bm A=\begin{bmatrix}4 & 1 \\ 0 & 2\end{bmatrix}$。入力：$ {}^t[0, 0]$、像：$ {}^t[0, 0]$。

問い：零入力が等式を満たしても、なぜ固有ベクトルと呼ばないか。

期待：任意の実数λで零の等式が成立。入力には非零条件が必要。行列の固有値自体は2・4のまま。

### 13. 0Dと零変換の違い

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwiZGltIjowfQ) <!-- zero-space -->

0×0の空行列。入力：成分なし、像：成分なし。

問い：正の次元の零変換と比較する。

期待：非零ベクトルが存在しないので固有値・固有ベクトルなし。固有多項式は1。

### 14. 定数多項式の微分

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6InBvbHlub21pYWwiLCJkaW0iOjEsIm1hdHJpeCI6W1swXV0sImlucHV0IjpbMl0sInNob3dFaWdlbnNwYWNlIjpmYWxzZSwiY2FtZXJhIjpudWxsfQ) <!-- polynomial-constant -->

$\bm A=\begin{bmatrix}0\end{bmatrix}$。入力：$ {}^t[2]$、像：$ {}^t[0]$。

問い：定数多項式の空間は0次元なのか。

期待：定数多項式空間は1次元。微分は零変換で固有値0を持つ。

### 15. 高々1次の次数作用

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6InBvbHlub21pYWwiLCJkaW0iOjIsIm1hdHJpeCI6W1swLDBdLFswLDFdXSwiaW5wdXQiOlsxLDJdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYSI6bnVsbH0) <!-- polynomial-linear -->

$\bm A=\begin{bmatrix}0 & 0 \\ 0 & 1\end{bmatrix}$。入力：$ {}^t[1, 2]$、像：$ {}^t[0, 2]$。

問い：定数とxの係数を別々に変える。

期待：xf′の固有値は0・1。入力1+2xの像は2x。

### 16. 高々2次の微分

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6InBvbHlub21pYWwiLCJkaW0iOjMsIm1hdHJpeCI6W1swLDEsMF0sWzAsMCwyXSxbMCwwLDBdXSwiaW5wdXQiOlsxLDIsM10sInNob3dFaWdlbnNwYWNlIjpmYWxzZSwiY2FtZXJhIjp7ImRpcmVjdGlvbiI6WzAuNTAzMDU1NDYsLTAuNjgwNjA0NDUsMC41MzI2NDY5Nl0sInRhcmdldCI6WzAsMCwwXSwidXAiOlswLDAsMV0sInpvb20iOjF9fQ) <!-- polynomial-derivative -->

$\bm A=\begin{bmatrix}0 & 1 & 0 \\ 0 & 0 & 2 \\ 0 & 0 & 0\end{bmatrix}$。入力：$ {}^t[1, 2, 3]$、像：$ {}^t[2, 6, 0]$。

問い：重複度3でも固有空間の次元が1なのはなぜか。

期待：入力1+2x+3x²の像は2+6x。固有値0の重複度3、固有空間は定数多項式の直線。

### 17. 高々2次の次数作用

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6InBvbHlub21pYWwiLCJkaW0iOjMsIm1hdHJpeCI6W1swLDAsMF0sWzAsMSwwXSxbMCwwLDJdXSwiaW5wdXQiOlsxLDIsM10sInNob3dFaWdlbnNwYWNlIjpmYWxzZSwiY2FtZXJhIjp7ImRpcmVjdGlvbiI6WzAuNTAzMDU1NDYsLTAuNjgwNjA0NDUsMC41MzI2NDY5Nl0sInRhcmdldCI6WzAsMCwwXSwidXAiOlswLDAsMV0sInpvb20iOjF9fQ) <!-- polynomial-degree -->

$\bm A=\begin{bmatrix}0 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 2\end{bmatrix}$。入力：$ {}^t[1, 2, 3]$、像：$ {}^t[0, 2, 6]$。

問い：1・x・x²がそれぞれどう写るか。

期待：xf′の固有値は0・1・2。入力の像は2x+6x²。固有空間は各単項式の倍数。

### 18. 高々2次の平行移動

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJlaWdlbnNwYWNlIiwia2luZCI6InBvbHlub21pYWwiLCJkaW0iOjMsIm1hdHJpeCI6W1sxLDEsMV0sWzAsMSwyXSxbMCwwLDFdXSwiaW5wdXQiOlsxLDIsM10sInNob3dFaWdlbnNwYWNlIjpmYWxzZSwiY2FtZXJhIjp7ImRpcmVjdGlvbiI6WzAuNTAzMDU1NDYsLTAuNjgwNjA0NDUsMC41MzI2NDY5Nl0sInRhcmdldCI6WzAsMCwwXSwidXAiOlswLDAsMV0sInpvb20iOjF9fQ) <!-- polynomial-translation -->

$\bm A=\begin{bmatrix}1 & 1 & 1 \\ 0 & 1 & 2 \\ 0 & 0 & 1\end{bmatrix}$。入力：$ {}^t[1, 2, 3]$、像：$ {}^t[6, 8, 3]$。

問い：係数空間の矢印と関数グラフの平行移動を混同しないよう説明する。

期待：f(x+1)の固有値は1（重複度3）、固有空間は定数多項式の直線。像は6+8x+3x²。

## 数値境界の検証は授業例と分ける

近接根、重根の微小摂動、ほぼ実数の根、極小／極大スケールは `docs/EIGENSPACE_NUMERICS.md` と `tests/domain/eigen*.test.ts` の検証対象。18例に紛れ込ませない。例えば $\bm A=\begin{bmatrix}1&1\\10^{-24}&1\end{bmatrix}$ は数学的には異なる実根を持つが、アプリは固有空間を十分な精度で確認できず保留する場合がある。「実固有値なし」と説明しない。表示は等号でも数値判定が厳密な記号計算であることを意味しない。

## 図を見られない場合の導線

- 0Dは一点の図に対応した説明、成分なし・固有値なし・固有多項式1を読む。
- 1D〜3Dは「行列と入力」のラベル付き成分入力で同じ教材を操作する。図のドラッグを必須にしない。
- 解析タブで根・重複度・固有空間次元と列ベクトルの基底・入力・像を確認する。多項式では係数列と式の両方がある。
- WebGLが使えない場合でも数値入力・解析タブ・共有・Resetを使える。3D図には代替説明が関連づく。
- 種類・次元はTabとEnter／Space、解析タブは左右矢印・Home／End、数値欄の取消しはEscape。共有ダイアログはURLを選択して開き、Escapeまたは閉じるで戻る。

## 利用者確認ゲート（自動検証と区別）

- 本番URLの別タブ復元とQR読取、編集後の共有時Reset、3D視点の復元。
- PC／390px幅で全種類・次元、特に3D行列・長い数式・タブがカードからはみ出さず操作できること。
- キーボードのみで種類・次元・入力・タブ・共有を操作でき、フォーカス位置が分かること。
- 読み上げ環境で入力名と行列の行・列、解析タブ、QRのLab名、共有内容が適切に伝わること。
- 原点への像（固有値0）、完全一致（固有値1）、近接する矢先のラベル、3Dの黒い軸を確認する。

この段階の自動検証はURLの復元・独立期待値・静的DOM／CSSの構造。実ブラウザの390pxレイアウト、実機読み上げ、QR読取は利用者確認に残す。授業評価のフェーズ7は引き続き延期する。

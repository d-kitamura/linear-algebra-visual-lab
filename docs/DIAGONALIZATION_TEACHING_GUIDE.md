# 対角化Labの授業資料（第13〜14週）

最終更新: 2026-09-16。13.7・D-123。実機確認は確認ゲートに残す。

## ねらいと使い方

実数上の対角化可能性、同じ写像の座標変更、重根と固有空間の次元の比較に絞る。ケイリー・ハミルトンの定理・行列のべき・次数落としは扱わない。フェーズ7の授業評価は延期のまま。

既存5Labの70例を変更せず、以下の18例を追加（合計88例）。正本は [diagonalizationScenarios.ts](../src/teaching/diagonalizationScenarios.ts)。期待値は数学APIの出力から作らず手計算で固定し、URL・復元・Resetと合わせて回帰検証する。アプリに課題一覧・読み上げ要約の独立パネルは追加しない。

1. リンクを開き、左の入力と像を観察する。必要に応じて「固有空間を表示」をオンにする（全例初期オフ）。
2. 「対角化の条件」で固有値の重複度、固有空間の次元、必要な基底の本数を比較する。
3. 対角化可能なら「固有ベクトルの基底」で列順を交換し、「座標と作用」で左右が同じ入力・像であることを確かめる。
4. 授業中に編集した場面は共通の共有URL・QRで配布する。Resetはリンクを開いた時点の同じ種類・次元の状態へ戻る。

$\bm{P}$ の列は固有ベクトルの基準座標、$\bm{c}$ はその基底に関する入力の座標である。
$\bm{A}\bm{P}=\bm{P}\bm{D}$、$\bm{P}^{-1}\bm{A}\bm{P}=\bm{D}$ を確認し、
$\bm{P}\bm{c}$ と $\bm{P}\bm{D}\bm{c}$ が元の入力・像の基準座標に戻ることを読む。
多項式の場合は多項式そのものと係数列を区別する。以下の「入力・像の基準座標」は標準単項式基底 $(1,x,x^2)$ 等に関する係数列であり、関数グラフ上の点ではない。

## 代表例

### 1. 基準座標と固有基底座標

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MiwibWF0cml4IjpbWzQsMV0sWzAsMl1dLCJpbnB1dCI6WzEsMl0sIm9yZGVyIjpbMCwxXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- initial -->

- 行列：$\bm{A}=\begin{bmatrix}4&1\\0&2\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2]\ \longmapsto\ {}^t[6,4]$。
- 実固有値（重複度／固有空間の次元）：2（1／1）、4（1／1）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}-0.5&1\\1&0\end{bmatrix}$、$\bm{D}=\begin{bmatrix}2&0\\0&4\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[2,2]$、$\bm{D}\bm{c}={}^t[4,8]$。

問い：左右の図は異なるベクトルを示しているのか。

期待する説明：同じ入力と像の別座標表示。Pは右の座標を左の基準座標へ戻す。

### 2. 基底の列順だけを交換

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MiwibWF0cml4IjpbWzQsMV0sWzAsMl1dLCJpbnB1dCI6WzEsMl0sIm9yZGVyIjpbMSwwXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- reordered -->

- 行列：$\bm{A}=\begin{bmatrix}4&1\\0&2\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2]\ \longmapsto\ {}^t[6,4]$。
- 実固有値（重複度／固有空間の次元）：2（1／1）、4（1／1）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}1&-0.5\\0&1\end{bmatrix}$、$\bm{D}=\begin{bmatrix}4&0\\0&2\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[2,2]$、$\bm{D}\bm{c}={}^t[8,4]$。

問い：前例から基底の1番目と2番目を交換し、何が変わらないかを確かめる。

期待する説明：PとDの対応順は変わるが入力と像は不変。この入力ではcの両成分は同じだが、Dcの順序は変わる。

### 3. 斜めの固有ベクトル基底

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MiwibWF0cml4IjpbWzIsMV0sWzEsMl1dLCJpbnB1dCI6WzMsMV0sIm9yZGVyIjpbMCwxXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- symmetric -->

- 行列：$\bm{A}=\begin{bmatrix}2&1\\1&2\end{bmatrix}$。
- 入力・像の基準座標：${}^t[3,1]\ \longmapsto\ {}^t[7,5]$。
- 実固有値（重複度／固有空間の次元）：1（1／1）、3（1／1）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}1&1\\-1&1\end{bmatrix}$、$\bm{D}=\begin{bmatrix}1&0\\0&3\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[1,2]$、$\bm{D}\bm{c}={}^t[1,6]$。

問い：固有値1の方向で入力と像が重なる場合も、数値で確認する。

期待する説明：基底(1,−1)、(1,1)で対角成分は1、3。座標ごとの倍率として読める。

### 4. 重根でも対角化できる

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MiwibWF0cml4IjpbWzIsMF0sWzAsMl1dLCJpbnB1dCI6WzEsMl0sIm9yZGVyIjpbMCwxXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- scalar -->

- 行列：$\bm{A}=\begin{bmatrix}2&0\\0&2\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2]\ \longmapsto\ {}^t[2,4]$。
- 実固有値（重複度／固有空間の次元）：2（2／2）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}1&0\\0&1\end{bmatrix}$、$\bm{D}=\begin{bmatrix}2&0\\0&2\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[1,2]$、$\bm{D}\bm{c}={}^t[2,4]$。

問い：次の例と、重複度だけでなく固有空間の次元を比較する。

期待する説明：固有値2の重複度2、固有空間の次元2。基底は一意ではない。

### 5. 同じ重根でも基底が足りない

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MiwibWF0cml4IjpbWzIsMV0sWzAsMl1dLCJpbnB1dCI6WzEsMl0sIm9yZGVyIjpudWxsLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYXMiOnsicmVmZXJlbmNlIjpudWxsLCJlaWdlbmJhc2lzIjpudWxsfX0) <!-- jordan -->

- 行列：$\bm{A}=\begin{bmatrix}2&1\\0&2\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2]\ \longmapsto\ {}^t[4,4]$。
- 実固有値（重複度／固有空間の次元）：2（2／1）。
- 実数上で対角化不可。完全な基底・P・D・cを補って表示しない。

問い：前例と固有値が同じなのに、なぜ右の座標を構成できないか。

期待する説明：固有値2の重複度2に対して固有空間の次元1。完全な実固有ベクトル基底を作れない。

### 6. 実数上で対角化できない回転

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MiwibWF0cml4IjpbWzAsLTFdLFsxLDBdXSwiaW5wdXQiOlsxLDJdLCJvcmRlciI6bnVsbCwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- rotation -->

- 行列：$\bm{A}=\begin{bmatrix}0&-1\\1&0\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2]\ \longmapsto\ {}^t[-2,1]$。
- 実固有値（重複度／固有空間の次元）：なし。
- 実数上で対角化不可。完全な基底・P・D・cを補って表示しない。

問い：実固有値がない場合と数値判定保留を区別する。

期待する説明：90度回転は実固有値を持たず、実数上の対角化は不可。複素数の対角化は扱わない。

### 7. 3Dの重根と固有平面

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MywibWF0cml4IjpbWzIsMCwwXSxbMCwyLDBdLFswLDAsLTFdXSwiaW5wdXQiOlsxLDIsM10sIm9yZGVyIjpbMCwxLDJdLCJzaG93RWlnZW5zcGFjZSI6ZmFsc2UsImNhbWVyYXMiOnsicmVmZXJlbmNlIjp7ImRpcmVjdGlvbiI6WzAuNTAzMDU1NDYsLTAuNjgwNjA0NDUsMC41MzI2NDY5Nl0sInRhcmdldCI6WzAsMCwwXSwidXAiOlswLDAsMV0sInpvb20iOjF9LCJlaWdlbmJhc2lzIjp7ImRpcmVjdGlvbiI6WzAuNTAzMDU1NDYsLTAuNjgwNjA0NDUsMC41MzI2NDY5Nl0sInRhcmdldCI6WzAsMCwwXSwidXAiOlswLDAsMV0sInpvb20iOjF9fX0) <!-- repeated-3d -->

- 行列：$\bm{A}=\begin{bmatrix}2&0&0\\0&2&0\\0&0&-1\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2,3]\ \longmapsto\ {}^t[2,4,-3]$。
- 実固有値（重複度／固有空間の次元）：-1（1／1）、2（2／2）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}0&1&0\\0&0&1\\1&0&0\end{bmatrix}$、$\bm{D}=\begin{bmatrix}-1&0&0\\0&2&0\\0&0&2\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[3,1,2]$、$\bm{D}\bm{c}={}^t[-3,2,4]$。

問い：固有値2の平面から何本選べるか。

期待する説明：固有値−1の直線から1本、固有値2の平面から2本選べる。自動基底は(e3,e1,e2)の順。

### 8. 正の次元の零変換

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MiwibWF0cml4IjpbWzAsMF0sWzAsMF1dLCJpbnB1dCI6WzEsMl0sIm9yZGVyIjpbMCwxXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- zero-map -->

- 行列：$\bm{A}=\begin{bmatrix}0&0\\0&0\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2]\ \longmapsto\ {}^t[0,0]$。
- 実固有値（重複度／固有空間の次元）：0（2／2）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}1&0\\0&1\end{bmatrix}$、$\bm{D}=\begin{bmatrix}0&0\\0&0\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[1,2]$、$\bm{D}\bm{c}={}^t[0,0]$。

問い：像が零でも対角化できるか。

期待する説明：固有値0の固有空間は2次元全体。標準基底を選べてDは零行列。

### 9. 零入力でも行列の判定は不変

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MiwibWF0cml4IjpbWzQsMV0sWzAsMl1dLCJpbnB1dCI6WzAsMF0sIm9yZGVyIjpbMCwxXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- zero-input -->

- 行列：$\bm{A}=\begin{bmatrix}4&1\\0&2\end{bmatrix}$。
- 入力・像の基準座標：${}^t[0,0]\ \longmapsto\ {}^t[0,0]$。
- 実固有値（重複度／固有空間の次元）：2（1／1）、4（1／1）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}-0.5&1\\1&0\end{bmatrix}$、$\bm{D}=\begin{bmatrix}2&0\\0&4\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[0,0]$、$\bm{D}\bm{c}={}^t[0,0]$。

問い：入力を零に変えると対角化の可否は変わるか。

期待する説明：行列の固有値2、4と対角化可能性は不変。零入力を固有ベクトルとは呼ばない。

### 10. 0Dの空基底

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJkaW0iOjB9) <!-- zero-space -->

- 行列：$\bm{A}=\text{0×0の空行列}$。
- 入力・像の基準座標：$\text{成分のない座標}\ \longmapsto\ \text{成分のない座標}$。
- 実固有値（重複度／固有空間の次元）：なし。
- 基底行列と対角行列：$\bm{P}=\text{0×0の空行列}$、$\bm{D}=\text{0×0の空行列}$。
- 固有基底座標：$\bm{c}=\text{成分のない座標}$、$\bm{D}\bm{c}=\text{成分のない座標}$。

問い：正の次元の零変換と比較する。

期待する説明：固有値・非零固有ベクトルはない。空基底と0×0行列で形式的に対角化できる。

### 11. 1Dの反転

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MSwibWF0cml4IjpbWy0yXV0sImlucHV0IjpbMV0sIm9yZGVyIjpbMF0sInNob3dFaWdlbnNwYWNlIjpmYWxzZSwiY2FtZXJhcyI6eyJyZWZlcmVuY2UiOm51bGwsImVpZ2VuYmFzaXMiOm51bGx9fQ) <!-- negative-1d -->

- 行列：$\bm{A}=\begin{bmatrix}-2\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1]\ \longmapsto\ {}^t[-2]$。
- 実固有値（重複度／固有空間の次元）：-2（1／1）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}1\end{bmatrix}$、$\bm{D}=\begin{bmatrix}-2\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[1]$、$\bm{D}\bm{c}={}^t[-2]$。

問い：負の対角成分を数直線で読む。

期待する説明：P=[1]、D=[−2]。1次元の自己写像は初めから対角行列。

### 12. 1Dの零変換

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoiY29vcmRpbmF0ZSIsImRpbSI6MSwibWF0cml4IjpbWzBdXSwiaW5wdXQiOlsyXSwib3JkZXIiOlswXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- zero-1d -->

- 行列：$\bm{A}=\begin{bmatrix}0\end{bmatrix}$。
- 入力・像の基準座標：${}^t[2]\ \longmapsto\ {}^t[0]$。
- 実固有値（重複度／固有空間の次元）：0（1／1）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}1\end{bmatrix}$、$\bm{D}=\begin{bmatrix}0\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[2]$、$\bm{D}\bm{c}={}^t[0]$。

問い：0Dと違い、基底が1本必要であることを確認する。

期待する説明：固有値0、固有空間の次元1。非零の基底を選べる。

### 13. 定数多項式の微分

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoicG9seW5vbWlhbCIsImRpbSI6MSwibWF0cml4IjpbWzBdXSwiaW5wdXQiOlsyXSwib3JkZXIiOlswXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- polynomial-constant -->

- 行列：$\bm{A}=\begin{bmatrix}0\end{bmatrix}$。
- 入力・像の基準座標：${}^t[2]\ \longmapsto\ {}^t[0]$。
- 実固有値（重複度／固有空間の次元）：0（1／1）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}1\end{bmatrix}$、$\bm{D}=\begin{bmatrix}0\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[2]$、$\bm{D}\bm{c}={}^t[0]$。

問い：定数多項式空間は0Dか1Dか。

期待する説明：T(f(x))=f′(x)はここでは零変換。基底(1)でD=[0]、対角化可能。

### 14. 高々1次の次数作用

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoicG9seW5vbWlhbCIsImRpbSI6MiwibWF0cml4IjpbWzAsMF0sWzAsMV1dLCJpbnB1dCI6WzEsMl0sIm9yZGVyIjpbMCwxXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- polynomial-linear -->

- 行列：$\bm{A}=\begin{bmatrix}0&0\\0&1\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2]\ \longmapsto\ {}^t[0,2]$。
- 実固有値（重複度／固有空間の次元）：0（1／1）、1（1／1）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}1&0\\0&1\end{bmatrix}$、$\bm{D}=\begin{bmatrix}0&0\\0&1\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[1,2]$、$\bm{D}\bm{c}={}^t[0,2]$。

問い：1とxの像をそれぞれ求める。

期待する説明：T(f(x))=xf′(x)。基底(1,x)で対角成分0、1。入力1+2xの像は2x。

### 15. 高々2次の次数作用

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoicG9seW5vbWlhbCIsImRpbSI6MywibWF0cml4IjpbWzAsMCwwXSxbMCwxLDBdLFswLDAsMl1dLCJpbnB1dCI6WzEsMiwzXSwib3JkZXIiOlswLDEsMl0sInNob3dFaWdlbnNwYWNlIjpmYWxzZSwiY2FtZXJhcyI6eyJyZWZlcmVuY2UiOnsiZGlyZWN0aW9uIjpbMC41MDMwNTU0NiwtMC42ODA2MDQ0NSwwLjUzMjY0Njk2XSwidGFyZ2V0IjpbMCwwLDBdLCJ1cCI6WzAsMCwxXSwiem9vbSI6MX0sImVpZ2VuYmFzaXMiOnsiZGlyZWN0aW9uIjpbMC41MDMwNTU0NiwtMC42ODA2MDQ0NSwwLjUzMjY0Njk2XSwidGFyZ2V0IjpbMCwwLDBdLCJ1cCI6WzAsMCwxXSwiem9vbSI6MX19fQ) <!-- polynomial-degree -->

- 行列：$\bm{A}=\begin{bmatrix}0&0&0\\0&1&0\\0&0&2\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2,3]\ \longmapsto\ {}^t[0,2,6]$。
- 実固有値（重複度／固有空間の次元）：0（1／1）、1（1／1）、2（1／1）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}1&0&0\\0&1&0\\0&0&1\end{bmatrix}$、$\bm{D}=\begin{bmatrix}0&0&0\\0&1&0\\0&0&2\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[1,2,3]$、$\bm{D}\bm{c}={}^t[0,2,6]$。

問い：関数グラフではなく、基底に関する係数空間であることを説明する。

期待する説明：T(f(x))=xf′(x)。基底(1,x,x²)で対角成分0、1、2。入力1+2x+3x²の像は2x+6x²。

### 16. 高々2次の微分

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoicG9seW5vbWlhbCIsImRpbSI6MywibWF0cml4IjpbWzAsMSwwXSxbMCwwLDJdLFswLDAsMF1dLCJpbnB1dCI6WzEsMiwzXSwib3JkZXIiOm51bGwsInNob3dFaWdlbnNwYWNlIjpmYWxzZSwiY2FtZXJhcyI6eyJyZWZlcmVuY2UiOnsiZGlyZWN0aW9uIjpbMC41MDMwNTU0NiwtMC42ODA2MDQ0NSwwLjUzMjY0Njk2XSwidGFyZ2V0IjpbMCwwLDBdLCJ1cCI6WzAsMCwxXSwiem9vbSI6MX0sImVpZ2VuYmFzaXMiOnsiZGlyZWN0aW9uIjpbMC41MDMwNTU0NiwtMC42ODA2MDQ0NSwwLjUzMjY0Njk2XSwidGFyZ2V0IjpbMCwwLDBdLCJ1cCI6WzAsMCwxXSwiem9vbSI6MX19fQ) <!-- polynomial-derivative -->

- 行列：$\bm{A}=\begin{bmatrix}0&1&0\\0&0&2\\0&0&0\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2,3]\ \longmapsto\ {}^t[2,6,0]$。
- 実固有値（重複度／固有空間の次元）：0（3／1）。
- 実数上で対角化不可。完全な基底・P・D・cを補って表示しない。

問い：定数多項式だけの例との違いは何か。

期待する説明：T(f(x))=f′(x)。固有値0の重複度3、固有空間の次元1で対角化不可。像は2+6x。

### 17. 高々2次の平行移動

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoicG9seW5vbWlhbCIsImRpbSI6MywibWF0cml4IjpbWzEsMSwxXSxbMCwxLDJdLFswLDAsMV1dLCJpbnB1dCI6WzEsMiwzXSwib3JkZXIiOm51bGwsInNob3dFaWdlbnNwYWNlIjpmYWxzZSwiY2FtZXJhcyI6eyJyZWZlcmVuY2UiOnsiZGlyZWN0aW9uIjpbMC41MDMwNTU0NiwtMC42ODA2MDQ0NSwwLjUzMjY0Njk2XSwidGFyZ2V0IjpbMCwwLDBdLCJ1cCI6WzAsMCwxXSwiem9vbSI6MX0sImVpZ2VuYmFzaXMiOnsiZGlyZWN0aW9uIjpbMC41MDMwNTU0NiwtMC42ODA2MDQ0NSwwLjUzMjY0Njk2XSwidGFyZ2V0IjpbMCwwLDBdLCJ1cCI6WzAsMCwxXSwiem9vbSI6MX19fQ) <!-- polynomial-translation -->

- 行列：$\bm{A}=\begin{bmatrix}1&1&1\\0&1&2\\0&0&1\end{bmatrix}$。
- 入力・像の基準座標：${}^t[1,2,3]\ \longmapsto\ {}^t[6,8,3]$。
- 実固有値（重複度／固有空間の次元）：1（3／1）。
- 実数上で対角化不可。完全な基底・P・D・cを補って表示しない。

問い：重複度3というだけで対角化できると言えるか。

期待する説明：T(f(x))=f(x+1)。固有値1の重複度3、固有空間の次元1で対角化不可。像は6+8x+3x²。

### 18. 単項式とは異なる固有基底

[この場面を開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJkaWFnb25hbGl6YXRpb24iLCJraW5kIjoicG9seW5vbWlhbCIsImRpbSI6MiwibWF0cml4IjpbWzAsMV0sWzAsMV1dLCJpbnB1dCI6WzIsM10sIm9yZGVyIjpbMCwxXSwic2hvd0VpZ2Vuc3BhY2UiOmZhbHNlLCJjYW1lcmFzIjp7InJlZmVyZW5jZSI6bnVsbCwiZWlnZW5iYXNpcyI6bnVsbH19) <!-- polynomial-oblique -->

- 行列：$\bm{A}=\begin{bmatrix}0&1\\0&1\end{bmatrix}$。
- 入力・像の基準座標：${}^t[2,3]\ \longmapsto\ {}^t[3,3]$。
- 実固有値（重複度／固有空間の次元）：0（1／1）、1（1／1）。
- 基底行列と対角行列：$\bm{P}=\begin{bmatrix}1&1\\0&1\end{bmatrix}$、$\bm{D}=\begin{bmatrix}0&0\\0&1\end{bmatrix}$。
- 固有基底座標：$\bm{c}={}^t[-1,3]$、$\bm{D}\bm{c}={}^t[0,3]$。

問い：入力2+3xを基底(1,1+x)の一次結合で表す。

期待する説明：T(1)=0、T(x)=1+xで定義される線形変換。2+3x=−1·1+3(1+x)。像は3+3xであり、固有基底では座標ごとに0倍・1倍する。

## 数値境界の検証は授業例と分ける

近接根、ほぼ従属の固有ベクトル、極小値・underflow、不正入力、描画だけの上限超過は、
[数学API契約](./DIAGONALIZATION_API_CONTRACT.md) と
[数学回帰](../tests/domain/diagonalization.test.ts)、
[数値・座標回帰](../tests/domain/diagonalizationNumerics.test.ts)、
[共有回帰](../tests/sharing/diagonalizationSharing.test.ts) を参照する。
例えば $\bm{A}=\begin{bmatrix}1&1\\10^{-24}&1\end{bmatrix}$ は数値判定保留になり得る。
数学的な「対角化不可」と、基底構成・座標計算の「数値的な保留」を混同しない。
表示を丸めた等式を判定へ戻さない。授業URLへ数値境界例は混在させない。

## 図を利用できないときの確認経路

- 「行列と入力」の各成分は行列の行・列番号、または入力の成分番号／多項式係数名で識別でき、ドラッグせず編集できる。不正値には説明が関連づく。
- 「対角化の条件」で可否・固有値・重複度・固有空間の次元を確認し、「固有ベクトルの基底」で各列・P・D・逆行列を確認する。
- 「座標と作用」で入力、像、c、Dc、基準座標への再構成を確認する。右図は同じ対象の別座標であり、直接編集しない。
- 0Dでは空基底と空行列の文章を使う。1Dでは数直線が見えなくても1成分の数値で追える。
- WebGLが利用できない3Dでも、下の行列・入力編集、解析タブ、Resetは利用できる。図の代替を独立パネルとしては増やさない。

## キーボード・狭幅・配布の確認ゲート（利用者）

- TabとEnter／Spaceで種類・次元、入力、固有空間表示、基底列交換、Resetを操作する。解析タブは左右矢印・Home・Endで切り替える。入力途中のEscapeで直前の有効値へ戻す。
- 共有ダイアログのURLへフォーカスが移り、コピー・QR PNG・テキスト保存・閉じるを操作できること、Escapeと閉じる操作で元のボタンへ戻ることを確認する。
- 数ベクトル0〜3D・多項式1〜3Dでラベルと数式を読み上げ、入力と像／基準係数と固有基底座標を区別できることを確認する。
- 実ブラウザの390pxレイアウトで種類・次元ボタン、上下の2図、入力、3解析タブ、列交換、長い数式、共有ダイアログにページ横はみ出しや重なりがないことを確認する。
- 本番URL・QRを別タブ／スマートフォンで開き、期待値と一致すること、編集後Resetで共有時の場面へ戻ることを確認する。

静的DOM・CSSの回帰はラベルと接続の確認に限定する。実ブラウザの配置、フォーカス移動、スクリーンリーダーの実際の読み上げ品質、WebGL無効時の動作を確認済みとは扱わない。

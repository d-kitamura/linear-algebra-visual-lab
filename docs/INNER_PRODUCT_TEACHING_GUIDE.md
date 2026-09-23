# 内積・正規直交基底Lab 授業用ガイド

2026-09-23作成（14.8／D-133）。シラバス第15週の「内積を説明する」「グラム・シュミットで基底を正規直交化する」に対応します。既存6Labの88例は変更しません。以下の18例を加えて計106例です。アプリへ課題一覧や独立要約カードは追加しません。

## 進め方と記号

- 内積・射影（ip01、04、05）→直交化・順序（ip02、03、06、07）→基底の対象空間（ip08〜13）→多項式の内積比較（ip14〜18）の順を推奨します。
- 入力の組𝒜と集合S、生成空間W=span(S)と周囲Vを区別します。山括弧は内積だけに使います。横書きの列は左肩の転置記号を付けた{}^t[...]で示します（セミコロンによる列記法は使いません）。
- 多項式の標準係数bと多項式そのものを等置しません。積分時の図はz=Cbの固定座標ξ、係数内積時は標準係数の座標です。固定表示基底と、入力から得る𝒬を区別します。
- 画面の小数は丸め表示です。以下の分数・根号は手計算の期待値で、画面に分数入力・記号計算があるという意味ではありません。
- 教員が段階・視点を調整して「共有URLをエクスポート」を押すと、学生が同じ状態を開けます。編集後のResetは開いた共有時へ戻ります。1D・2Dの手動範囲は保存しません。

## 通常の授業例（18例）

### 1. 内積と射影の出発点

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoyLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjEsImNvbXBvbmVudHMiOlsyLDJdfSx7ImlkIjoyLCJjb21wb25lbnRzIjpbMywwXX1dLCJtb2RlIjoicGFpciIsInBhaXIiOlsxLDJdLCJzdGFnZSI6eyJpbnB1dElkIjoxLCJwaGFzZSI6ImlucHV0In0sInNob3dHZW9tZXRyeSI6dHJ1ZSwiY2FtZXJhIjpudWxsfQ) <!-- ip01 -->

- 観察課題：vをuの方向と残りに分け、v=p+rと直交性を確認する。
- 独立期待値：u={}^t[2,2]、v={}^t[3,0]。内積6、ノルム2√2と3、角45度。p={}^t[1.5,1.5]、r={}^t[1.5,−1.5]。

### 2. 2Dの正規化まで進む

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoyLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjEsImNvbXBvbmVudHMiOlsyLDJdfSx7ImlkIjoyLCJjb21wb25lbnRzIjpbMywwXX1dLCJtb2RlIjoiZ3JhbS1zY2htaWR0IiwicGFpciI6WzEsMl0sInN0YWdlIjp7ImlucHV0SWQiOjIsInBoYXNlIjoibm9ybWFsaXplIn0sInNob3dHZW9tZXRyeSI6dHJ1ZSwiY2FtZXJhIjpudWxsfQ) <!-- ip02 -->

- 観察課題：「前へ」で射影・残差へ戻り、正規化で何が変わるか説明する。
- 独立期待値：w₁={}^t[2,2]、w₂={}^t[1.5,−1.5]。q₁={}^t[1,1]/√2、q₂={}^t[1,−1]/√2。

### 3. 入力順だけを逆にする

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoyLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjIsImNvbXBvbmVudHMiOlszLDBdfSx7ImlkIjoxLCJjb21wb25lbnRzIjpbMiwyXX1dLCJtb2RlIjoiZ3JhbS1zY2htaWR0IiwicGFpciI6WzEsMl0sInN0YWdlIjp7ImlucHV0SWQiOjEsInBoYXNlIjoibm9ybWFsaXplIn0sInNob3dHZW9tZXRyeSI6dHJ1ZSwiY2FtZXJhIjpudWxsfQ) <!-- ip03 -->

- 観察課題：ip02と生成空間を比べる。番号a₁・a₂は固定したまま処理順を変える。
- 独立期待値：組(a₂,a₁)からq₁={}^t[1,0]、q₂={}^t[0,1]。生成空間は同じでも正規直交基底は一般に変わる。

### 4. 直交する入力

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoyLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjEsImNvbXBvbmVudHMiOlsxLDBdfSx7ImlkIjoyLCJjb21wb25lbnRzIjpbMCwyXX1dLCJtb2RlIjoicGFpciIsInBhaXIiOlsxLDJdLCJzdGFnZSI6eyJpbnB1dElkIjoyLCJwaGFzZSI6Im5vcm1hbGl6ZSJ9LCJzaG93R2VvbWV0cnkiOnRydWUsImNhbWVyYSI6bnVsbH0) <!-- ip04 -->

- 観察課題：射影が零でも残差が零とは限らないことを確かめる。
- 独立期待値：u={}^t[1,0]、v={}^t[0,2]。内積0、角90度、p=0、r=v。

### 5. 方向が零の射影

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoyLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjEsImNvbXBvbmVudHMiOlswLDBdfSx7ImlkIjoyLCJjb21wb25lbnRzIjpbMSwyXX1dLCJtb2RlIjoicGFpciIsInBhaXIiOlsxLDJdLCJzdGFnZSI6eyJpbnB1dElkIjoyLCJwaGFzZSI6Im5vcm1hbGl6ZSJ9LCJzaG93R2VvbWV0cnkiOnRydWUsImNhbWVyYSI6bnVsbH0) <!-- ip05 -->

- 観察課題：u=0のとき角度と射影の説明を読む。
- 独立期待値：角度は未定義。零部分空間への射影p=0、残差r=v={}^t[1,2]。零を正規化しない。

### 6. 従属な入力を飛ばす

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoyLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjEsImNvbXBvbmVudHMiOlsxLDBdfSx7ImlkIjoyLCJjb21wb25lbnRzIjpbMiwwXX0seyJpZCI6MywiY29tcG9uZW50cyI6WzAsMV19XSwibW9kZSI6ImdyYW0tc2NobWlkdCIsInBhaXIiOlsxLDJdLCJzdGFnZSI6eyJpbnB1dElkIjoyLCJwaGFzZSI6InNraXAifSwic2hvd0dlb21ldHJ5Ijp0cnVlLCJjYW1lcmEiOm51bGx9) <!-- ip06 -->

- 観察課題：2番目の残差と「次へ」で進む3番目を確認する。
- 独立期待値：(e₁,2e₁,e₂)の2番目の残差は厳密に零。出力は(e₁,e₂)であり、入力の組は一次従属。

### 7. 先頭が零ベクトル

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoyLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjEsImNvbXBvbmVudHMiOlswLDBdfSx7ImlkIjoyLCJjb21wb25lbnRzIjpbMSwwXX0seyJpZCI6MywiY29tcG9uZW50cyI6WzAsMV19XSwibW9kZSI6ImdyYW0tc2NobWlkdCIsInBhaXIiOlsxLDJdLCJzdGFnZSI6eyJpbnB1dElkIjoxLCJwaGFzZSI6InNraXAifSwic2hvd0dlb21ldHJ5Ijp0cnVlLCJjYW1lcmEiOm51bGx9) <!-- ip07 -->

- 観察課題：零入力を飛ばしても後続の処理が続くことを確認する。
- 独立期待値：(0,e₁,e₂)から(e₁,e₂)。最初の零にqの番号を割り当てない。

### 8. すべて零の入力

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoyLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjEsImNvbXBvbmVudHMiOlswLDBdfSx7ImlkIjoyLCJjb21wb25lbnRzIjpbMCwwXX1dLCJtb2RlIjoiZ3JhbS1zY2htaWR0IiwicGFpciI6WzEsMl0sInN0YWdlIjp7ImlucHV0SWQiOjIsInBoYXNlIjoic2tpcCJ9LCJzaG93R2VvbWV0cnkiOnRydWUsImNhbWVyYSI6bnVsbH0) <!-- ip08 -->

- 観察課題：空の正規直交基底がどの空間の基底か説明する。
- 独立期待値：W={0}の基底は空の組。周囲V=ℝ²の基底ではない。角度も未定義。

### 9. 正次元空間の空入力

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoyLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W10sIm1vZGUiOiJncmFtLXNjaG1pZHQiLCJwYWlyIjpudWxsLCJzdGFnZSI6bnVsbCwic2hvd0dlb21ldHJ5Ijp0cnVlLCJjYW1lcmEiOm51bGx9) <!-- ip09 -->

- 観察課題：入力がないことと、周囲の空間の次元が零であることを区別する。
- 独立期待値：入力・pair・段階なし。W={0}の基底は空、V=ℝ²の基底ではない。未選択の内積を0と読まない。

### 10. 1Dで符号を保って正規化

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoxLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjEsImNvbXBvbmVudHMiOlstMl19LHsiaWQiOjIsImNvbXBvbmVudHMiOlszXX1dLCJtb2RlIjoiZ3JhbS1zY2htaWR0IiwicGFpciI6WzEsMl0sInN0YWdlIjp7ImlucHV0SWQiOjIsInBoYXNlIjoic2tpcCJ9LCJzaG93R2VvbWV0cnkiOnRydWUsImNhbWVyYSI6bnVsbH0) <!-- ip10 -->

- 観察課題：最初の出力が+1でなく−1になる理由を説明する。
- 独立期待値：入力(−2,3)からq₁=−1。2番目は一次従属。正のノルムで割り、向きを勝手に反転しない。

### 11. 0Dの空の基底

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjowLCJtb2RlIjoiZ3JhbS1zY2htaWR0In0) <!-- ip11 -->

- 観察課題：ip09と周囲の空間Vを比べる。
- 独立期待値：V=W={0}なので空の組がVの正規直交基底でもある。内積・ノルムは0、角度は未定義。

### 12. 3Dの直交化

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjozLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjEsImNvbXBvbmVudHMiOlsxLDEsMF19LHsiaWQiOjIsImNvbXBvbmVudHMiOlsxLDAsMV19LHsiaWQiOjMsImNvbXBvbmVudHMiOlswLDEsMV19XSwibW9kZSI6ImdyYW0tc2NobWlkdCIsInBhaXIiOlsxLDJdLCJzdGFnZSI6eyJpbnB1dElkIjozLCJwaGFzZSI6Im5vcm1hbGl6ZSJ9LCJzaG93R2VvbWV0cnkiOnRydWUsImNhbWVyYSI6eyJkaXJlY3Rpb24iOlswLjUwMzA1NTQ2LC0wLjY4MDYwNDQ1LDAuNTMyNjQ2OTZdLCJ0YXJnZXQiOlswLDAsMF0sInVwIjpbMCwwLDFdLCJ6b29tIjoxfX0) <!-- ip12 -->

- 観察課題：前の段階へ戻り、元の入力から各射影を引く手順を確認する。
- 独立期待値：w₁={}^t[1,1,0]、w₂={}^t[1/2,−1/2,1]、w₃={}^t[−2/3,2/3,2/3]。qは各wを正のノルムで割る。3D投影の見かけの角度で直交を判定しない。

### 13. 3D内の平面の基底

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjozLCJraW5kIjoiY29vcmRpbmF0ZSIsIm1ldHJpYyI6ImV1Y2xpZGVhbiIsImlucHV0cyI6W3siaWQiOjEsImNvbXBvbmVudHMiOlsxLDAsMF19LHsiaWQiOjIsImNvbXBvbmVudHMiOlswLDEsMF19XSwibW9kZSI6ImdyYW0tc2NobWlkdCIsInBhaXIiOlsxLDJdLCJzdGFnZSI6eyJpbnB1dElkIjoyLCJwaGFzZSI6Im5vcm1hbGl6ZSJ9LCJzaG93R2VvbWV0cnkiOnRydWUsImNhbWVyYSI6eyJkaXJlY3Rpb24iOlswLjUwMzA1NTQ2LC0wLjY4MDYwNDQ1LDAuNTMyNjQ2OTZdLCJ0YXJnZXQiOlswLDAsMF0sInVwIjpbMCwwLDFdLCJ6b29tIjoxfX0) <!-- ip13 -->

- 観察課題：正規直交な2本がℝ³全体の基底と呼べるか説明する。
- 独立期待値：(e₁,e₂)はxy平面Wの正規直交基底。V=ℝ³の基底ではない。

### 14. 定数多項式の長さ

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoxLCJraW5kIjoicG9seW5vbWlhbCIsIm1ldHJpYyI6ImludGVncmFsIiwiaW5wdXRzIjpbeyJpZCI6MSwiY29tcG9uZW50cyI6WzFdfV0sIm1vZGUiOiJncmFtLXNjaG1pZHQiLCJwYWlyIjpbMSwxXSwic3RhZ2UiOnsiaW5wdXRJZCI6MSwicGhhc2UiOiJub3JtYWxpemUifSwic2hvd0dlb21ldHJ5Ijp0cnVlLCJjYW1lcmEiOm51bGx9) <!-- ip14 -->

- 観察課題：積分内積から定数1のノルムを計算する。
- 独立期待値：∫₋₁¹1 dx=2よりノルム√2、q₁=1/√2。係数1と長さ1を混同しない。

### 15. 一次多項式の直交化

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjoyLCJraW5kIjoicG9seW5vbWlhbCIsIm1ldHJpYyI6ImludGVncmFsIiwiaW5wdXRzIjpbeyJpZCI6MSwiY29tcG9uZW50cyI6WzEsMF19LHsiaWQiOjIsImNvbXBvbmVudHMiOlswLDFdfV0sIm1vZGUiOiJncmFtLXNjaG1pZHQiLCJwYWlyIjpbMSwyXSwic3RhZ2UiOnsiaW5wdXRJZCI6MiwicGhhc2UiOiJub3JtYWxpemUifSwic2hvd0dlb21ldHJ5Ijp0cnVlLCJjYW1lcmEiOm51bGx9) <!-- ip15 -->

- 観察課題：1とxが直交する理由と正規化係数を計算する。
- 独立期待値：∫₋₁¹x dx=0。q₁=1/√2、q₂=√(3/2)x。入力欄は標準単項式係数、図の積分座標はξ。

### 16. 積分内積で(1,x,x²)

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjozLCJraW5kIjoicG9seW5vbWlhbCIsIm1ldHJpYyI6ImludGVncmFsIiwiaW5wdXRzIjpbeyJpZCI6MSwiY29tcG9uZW50cyI6WzEsMCwwXX0seyJpZCI6MiwiY29tcG9uZW50cyI6WzAsMSwwXX0seyJpZCI6MywiY29tcG9uZW50cyI6WzAsMCwxXX1dLCJtb2RlIjoiZ3JhbS1zY2htaWR0IiwicGFpciI6WzEsMl0sInN0YWdlIjp7ImlucHV0SWQiOjMsInBoYXNlIjoicHJvamVjdGlvbiIsImNvdW50IjoyfSwic2hvd0dlb21ldHJ5Ijp0cnVlLCJjYW1lcmEiOnsiZGlyZWN0aW9uIjpbMC41MDMwNTU0NiwtMC42ODA2MDQ0NSwwLjUzMjY0Njk2XSwidGFyZ2V0IjpbMCwwLDBdLCJ1cCI6WzAsMCwxXSwiem9vbSI6MX19) <!-- ip16 -->

- 観察課題：射影を2本分引く段階を開く。「次へ」で残差と正規化を確認する。
- 独立期待値：r=x²−1/3、ノルム二乗8/45。q₃=√(5/8)(3x²−1)。図の固定表示基底と、現在の入力から求める基底を区別する。

### 17. 係数内積で同じ(1,x,x²)

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjozLCJraW5kIjoicG9seW5vbWlhbCIsIm1ldHJpYyI6ImNvZWZmaWNpZW50IiwiaW5wdXRzIjpbeyJpZCI6MSwiY29tcG9uZW50cyI6WzEsMCwwXX0seyJpZCI6MiwiY29tcG9uZW50cyI6WzAsMSwwXX0seyJpZCI6MywiY29tcG9uZW50cyI6WzAsMCwxXX1dLCJtb2RlIjoiZ3JhbS1zY2htaWR0IiwicGFpciI6WzEsMl0sInN0YWdlIjp7ImlucHV0SWQiOjMsInBoYXNlIjoibm9ybWFsaXplIn0sInNob3dHZW9tZXRyeSI6dHJ1ZSwiY2FtZXJhIjp7ImRpcmVjdGlvbiI6WzAuNTAzMDU1NDYsLTAuNjgwNjA0NDUsMC41MzI2NDY5Nl0sInRhcmdldCI6WzAsMCwwXSwidXAiOlswLDAsMV0sInpvb20iOjF9fQ) <!-- ip17 -->

- 観察課題：ip16と比べ、元の多項式が同じでも何が変わるか説明する。
- 独立期待値：係数内積では(1,x,x²)はすでに正規直交。積分内積へ切り替えても元の係数は変わらないが、ノルムと直交性は変わる。

### 18. 1とx²の射影

[この例を公開ページで開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoxLCJsYWIiOiJpbm5lci1wcm9kdWN0IiwiZGltIjozLCJraW5kIjoicG9seW5vbWlhbCIsIm1ldHJpYyI6ImludGVncmFsIiwiaW5wdXRzIjpbeyJpZCI6MSwiY29tcG9uZW50cyI6WzEsMCwwXX0seyJpZCI6MiwiY29tcG9uZW50cyI6WzAsMCwxXX1dLCJtb2RlIjoicGFpciIsInBhaXIiOlsxLDJdLCJzdGFnZSI6eyJpbnB1dElkIjoyLCJwaGFzZSI6Im5vcm1hbGl6ZSJ9LCJzaG93R2VvbWV0cnkiOnRydWUsImNhbWVyYSI6eyJkaXJlY3Rpb24iOlswLjUwMzA1NTQ2LC0wLjY4MDYwNDQ1LDAuNTMyNjQ2OTZdLCJ0YXJnZXQiOlswLDAsMF0sInVwIjpbMCwwLDFdLCJ6b29tIjoxfX0) <!-- ip18 -->

- 観察課題：積分内積と係数内積を切り替え、射影1/3と0を比較する。
- 独立期待値：積分内積は2/3、p=1/3、r=x²−1/3。係数内積は0。標準係数軸の直角を積分内積の直交性と同一視しない。

## 数値境界の検証は授業例と分ける

これは授業導入用の代表URLには含めません。自動テストと開発時の確認で扱います。

- ほぼ従属でも非零：数2Dの列(1,0)、(1,10⁻¹²)は残差(0,10⁻¹²)で、2本目を飛ばしません。表示の吸着でこの値を作るのではなく、成分欄から入力します。
- 非零の成分消失による保留：数2Dの列(5×10⁻³²⁴,10⁶)、(1,0)は正規化で微小成分を保持できず保留。従属・零と断定せず、後続を完成基底に数えません。
- 図だけの上限：積分内積の定数多項式10⁶は入力上限内でも表示座標√2×10⁶が描画上限を超えます。図を保留し、内積・係数編集・Resetは残します。
- 8本・3D・長い小数の共有は完全URL2048文字上限を守り、超過時に丸めて収めません（14.7の共有テストも参照）。

## キーボード・読み上げ・実機確認

独立した要約パネルを使わず、既存入力欄・段階操作・解析タブで追います。

1. Tab／Shift+Tabで種類・次元・モード、内積、成分、選択・順序・段階・共有へ移動。ボタンはEnter／Space、プルダウンはブラウザ標準の矢印キーで操作します。
2. 成分欄は「a番号の第何成分」、多項式は「f番号の係数b番号」で識別します。無効入力の理由を確認し、Escapeで直前の有効値へ戻します。ドラッグしなくても成分編集で図・式を更新できます。
3. GSの「直交化する入力」「直交化の段階」、前／次と現在の段階数を確認。先頭・末尾では進めないボタンが無効になります。零入力・従属のskipと保留holdを区別します。
4. 解析タブは左右矢印・Home・Endで切替。内積、ノルム、角度、射影・残差、生成空間の基底を読みます。多項式の標準係数と図の座標対応は既存タブ内の折り畳みにあります。
5. WebGLが使えなくても成分入力・解析タブ・Resetを使います。多項式の3D表示は関数グラフではありません。
6. 共有ダイアログのURL選択・コピー・PNG／テキスト保存・Escapeで閉じる動作、戻ったフォーカスを確認します。
7. 実ブラウザの390pxレイアウト、拡大表示、8本・長い小数、タッチ、キーボードのフォーカス、実スクリーンリーダーの数式・積分・段階の読み上げは利用者の確認ゲートです。SSR・ソース・CSS検査だけでは見え方や発音の正しさを保証しません。ドラッグ中の毎フレームをlive通知しません。

## 検証の正本

入力・独立期待値は[innerProductScenarios.ts](../src/teaching/innerProductScenarios.ts)、計算・URL・Reset・数値境界の検算は[innerProductScenarios.test.ts](../tests/teaching/innerProductScenarios.test.ts)、操作名・接続の静的検査は[innerProductAccessibility.test.ts](../tests/ui/innerProductAccessibility.test.ts)です。共有D-132と資料・操作D-133は2026-09-23に利用者承認済みです。7Lab統合棚卸しのD-134も利用者承認済みで、フェーズ14は完了しました。

# 2D・3D教材シナリオ

最終更新: 2026-08-24

## 目的

フェーズ3〜6の統合確認と授業準備に共通して使える2D・3Dの代表例を定義する。初版候補の全リンクは、最初の正式保証対象となる共有状態v3で生成する。2Dはベクトル、span選択、幾何表示、一次結合エクスプローラとターゲット、3Dはこれらに加えてカメラも復元する。リンクを開いた時点の状態がInitialStateとなるため、操作後にResetすると同じ例へ戻る。

状態の正本は `src/teaching/twoDimensionalScenarios.ts` と `src/teaching/threeDimensionalScenarios.ts` とし、期待する数学結果と本番共有URLの往復を自動テストする。

## 代表例

### 1. 空集合

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOltdLCJzcGFuU2VsZWN0aW9uIjpbXSwidmlzdWFsaXphdGlvbiI6eyJzaG93U3BhbiI6dHJ1ZSwiY2FtZXJhIjpudWxsfSwibGluZWFyQ29tYmluYXRpb24iOnsidmlzaWJsZSI6ZmFsc2UsInRhcmdldCI6bnVsbH19)
- 期待結果: ベクトル数0、`rank(A) = 0`、生成する空間の次元0、一次独立。
- 観察点: 生成する空間は零部分空間であり、座標面では原点として示される。「ベクトルを追加」で通常の編集へ移れる。

### 2. 零ベクトル

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMCwwXX1dLCJzcGFuU2VsZWN0aW9uIjpbImExIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWUsImNhbWVyYSI6bnVsbH0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOmZhbHNlLCJ0YXJnZXQiOm51bGx9fQ)
- 期待結果: ベクトル数1、`rank(A) = 0`、生成する空間の次元0、一次従属。
- 観察点: 空集合と同じ空間を生成するが、零ベクトルを含む集合は一次従属となる。

### 3. 平行な2本

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMiwxXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6Wy00LC0yXX1dLCJzcGFuU2VsZWN0aW9uIjpbImExIiwiYTIiXSwidmlzdWFsaXphdGlvbiI6eyJzaG93U3BhbiI6dHJ1ZSwiY2FtZXJhIjpudWxsfSwibGluZWFyQ29tYmluYXRpb24iOnsidmlzaWJsZSI6ZmFsc2UsInRhcmdldCI6bnVsbH19)
- 期待結果: ベクトル数2、`rank(A) = 1`、生成する空間の次元1、一次従属。
- 観察点: 2本の向きが反対でも同じ原点を通る直線を生成する。先端ドラッグの平行スナップも確認できる。

### 4. 一次独立な2本

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6WzAsMV19XSwic3BhblNlbGVjdGlvbiI6WyJhMSIsImEyIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWUsImNhbWVyYSI6bnVsbH0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOmZhbHNlLCJ0YXJnZXQiOm51bGx9fQ)
- 期待結果: ベクトル数2、`rank(A) = 2`、生成する空間の次元2、一次独立。
- 観察点: 2本が異なる方向を持つと2次元座標平面全体を生成する。

### 5. 3本以上の一次従属

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6WzAsMV19LHsiaWQiOiJhMyIsIm5hbWUiOiJh4oKDIiwiY29vcmRpbmF0ZXMiOlsxLDFdfV0sInNwYW5TZWxlY3Rpb24iOlsiYTEiLCJhMiIsImEzIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWUsImNhbWVyYSI6bnVsbH0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOmZhbHNlLCJ0YXJnZXQiOm51bGx9fQ)
- 期待結果: ベクトル数3、`rank(A) = 2`、生成する空間の次元2、一次従属。
- 観察点: 集合が一次従属でも、生成する空間は2次元座標平面全体になり得る。3本目のspan選択を外す操作と比較できる。

## 一次結合エクスプローラの代表例

### 6. 1本で一意に表す

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMiwxXX1dLCJzcGFuU2VsZWN0aW9uIjpbImExIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWUsImNhbWVyYSI6bnVsbH0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOnRydWUsInRhcmdldCI6WzQsMl19fQ)
- 期待結果: `rank(A) = rank([A | v]) = 1`、唯一解、`v = 2a₁`。
- 観察点: 零ベクトルでない1本は、生成する直線上のターゲットを一意な係数で表す。ターゲットを直線外へ動かすと不能へ変わる。

### 7. 一次従属な2本では表現不能

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6WzIsMF19XSwic3BhblNlbGVjdGlvbiI6WyJhMSIsImEyIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWUsImNhbWVyYSI6bnVsbH0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOnRydWUsInRhcmdldCI6WzAsMV19fQ)
- 期待結果: `rank(A) = 1 < rank([A | v]) = 2`、不能（解なし）。
- 観察点: 一次従属な2本が生成する直線の外にターゲットがあるため表現できない。ターゲットを直線上へ置くと不定へ変わる。

### 8. 一次独立な2本で唯一解

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6WzAsMV19XSwic3BhblNlbGVjdGlvbiI6WyJhMSIsImEyIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWUsImNhbWVyYSI6bnVsbH0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOnRydWUsInRhcmdldCI6WzAuNSwwLjI1XX19)
- 期待結果: `rank(A) = rank([A | v]) = 2`、唯一解、`v = 0.5a₁ + 0.25a₂`。
- 観察点: 2次元座標平面全体を生成する一次独立な2本では、どこへターゲットを動かしても係数の組が一意に定まる。

### 9. 3本では表し方が無数

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6WzAsMV19LHsiaWQiOiJhMyIsIm5hbWUiOiJh4oKDIiwiY29vcmRpbmF0ZXMiOlsxLDFdfV0sInNwYW5TZWxlY3Rpb24iOlsiYTEiLCJhMiIsImEzIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWUsImNhbWVyYSI6bnVsbH0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOnRydWUsInRhcmdldCI6WzAuNSwwLjI1XX19)
- 期待結果: `rank(A) = rank([A | v]) = 2 < 3`、不定（解が無数）。
- 観察点: 2次元座標平面全体を生成しても、3本を使うと係数の組は一意でない。常時表示の2例と、展開できる一般解を比較する。

## 3Dの代表例

### 10. 3Dの空集合

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjMsInZlY3RvcnMiOltdLCJzcGFuU2VsZWN0aW9uIjpbXSwidmlzdWFsaXphdGlvbiI6eyJzaG93U3BhbiI6dHJ1ZSwiY2FtZXJhIjp7ImRpcmVjdGlvbiI6WzAuNTAzMDU1NDYsLTAuNjgwNjA0NDUsMC41MzI2NDY5Nl0sInRhcmdldCI6WzAsMCwwXSwidXAiOlswLDAsMV0sInpvb20iOjF9fSwibGluZWFyQ29tYmluYXRpb24iOnsidmlzaWJsZSI6ZmFsc2UsInRhcmdldCI6bnVsbH19)
- 期待結果: ベクトル数0、`rank(A) = 0`、生成する空間の次元0、一次独立。
- 観察点: 3次元でも空集合が生成する空間は原点だけであり、空集合は一次独立である。

### 11. 3Dの零ベクトル

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjMsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMCwwLDBdfV0sInNwYW5TZWxlY3Rpb24iOlsiYTEiXSwidmlzdWFsaXphdGlvbiI6eyJzaG93U3BhbiI6dHJ1ZSwiY2FtZXJhIjp7ImRpcmVjdGlvbiI6WzAsLTEsMF0sInRhcmdldCI6WzAsMCwwXSwidXAiOlswLDAsMV0sInpvb20iOjF9fSwibGluZWFyQ29tYmluYXRpb24iOnsidmlzaWJsZSI6ZmFsc2UsInRhcmdldCI6bnVsbH19)
- 期待結果: ベクトル数1、`rank(A) = 0`、生成する空間の次元0、一次従属。
- 観察点: 空集合と同じ零部分空間を生成する一方、零ベクトルを含む集合は一次従属となる。

### 12. 1本が生成する直線

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjMsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwyLDFdfV0sInNwYW5TZWxlY3Rpb24iOlsiYTEiXSwidmlzdWFsaXphdGlvbiI6eyJzaG93U3BhbiI6dHJ1ZSwiY2FtZXJhIjp7ImRpcmVjdGlvbiI6WzEsMCwwXSwidGFyZ2V0IjpbMCwwLDBdLCJ1cCI6WzAsMCwxXSwiem9vbSI6MX19LCJsaW5lYXJDb21iaW5hdGlvbiI6eyJ2aXNpYmxlIjpmYWxzZSwidGFyZ2V0IjpudWxsfX0)
- 期待結果: ベクトル数1、`rank(A) = 1`、生成する空間の次元1、一次独立。
- 観察点: 灰色の直線を視点回転し、1本が原点を通る1次元部分空間を生成することを確認する。

### 13. 同一平面上の3本

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjMsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwLDBdfSx7ImlkIjoiYTIiLCJuYW1lIjoiYeKCgiIsImNvb3JkaW5hdGVzIjpbMCwxLDBdfSx7ImlkIjoiYTMiLCJuYW1lIjoiYeKCgyIsImNvb3JkaW5hdGVzIjpbMSwxLDBdfV0sInNwYW5TZWxlY3Rpb24iOlsiYTEiLCJhMiIsImEzIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWUsImNhbWVyYSI6eyJkaXJlY3Rpb24iOlswLDAsMV0sInRhcmdldCI6WzAsMCwwXSwidXAiOlswLDEsMF0sInpvb20iOjF9fSwibGluZWFyQ29tYmluYXRpb24iOnsidmlzaWJsZSI6ZmFsc2UsInRhcmdldCI6bnVsbH19)
- 期待結果: ベクトル数3、`rank(A) = 2`、生成する空間の次元2、一次従属。
- 観察点: 上から見ると2Dに見える例を等角視点へ変え、灰色の平面が3次元座標空間の一部であることを確認する。矢先を平面外へ動かしてrank 3にした後、平面へ近づけて吸着させる比較にも使える。

## 3D一次結合エクスプローラの代表例

### 14. 一次独立な3本で唯一解

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjMsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwxLDBdfSx7ImlkIjoiYTIiLCJuYW1lIjoiYeKCgiIsImNvb3JkaW5hdGVzIjpbMCwxLDFdfSx7ImlkIjoiYTMiLCJuYW1lIjoiYeKCgyIsImNvb3JkaW5hdGVzIjpbMSwwLDFdfV0sInNwYW5TZWxlY3Rpb24iOlsiYTEiLCJhMiIsImEzIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWUsImNhbWVyYSI6eyJkaXJlY3Rpb24iOlswLjUwMzA1NTQ2LC0wLjY4MDYwNDQ1LDAuNTMyNjQ2OTZdLCJ0YXJnZXQiOlswLDAsMF0sInVwIjpbMCwwLDFdLCJ6b29tIjoxfX0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOnRydWUsInRhcmdldCI6WzMsMiw0XX19)
- 期待結果: `rank(A) = rank([A | v]) = 3`、唯一解、`v = 0.5a₁ + 1.5a₂ + 2.5a₃`。
- 観察点: 直観的でない3本でも3次元座標空間全体を生成し、ターゲットの係数が一意に定まる。平行六面体を回転して、3本の係数倍ベクトルと対角のターゲットを確認する。

### 15. 3Dの直線外では表現不能

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjMsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwxLDBdfSx7ImlkIjoiYTIiLCJuYW1lIjoiYeKCgiIsImNvb3JkaW5hdGVzIjpbMiwyLDBdfV0sInNwYW5TZWxlY3Rpb24iOlsiYTEiLCJhMiJdLCJ2aXN1YWxpemF0aW9uIjp7InNob3dTcGFuIjp0cnVlLCJjYW1lcmEiOnsiZGlyZWN0aW9uIjpbMCwtMSwwXSwidGFyZ2V0IjpbMCwwLDBdLCJ1cCI6WzAsMCwxXSwiem9vbSI6MX19LCJsaW5lYXJDb21iaW5hdGlvbiI6eyJ2aXNpYmxlIjp0cnVlLCJ0YXJnZXQiOlswLDAsMV19fQ)
- 期待結果: `rank(A) = 1 < rank([A | v]) = 2`、不能（解なし）。
- 観察点: 正面視点では重なりに注意し、等角視点へ変えてターゲットが灰色の直線外にあることを確認する。ターゲットの矢先を灰色の直線へ近づけると吸着して不定へ変わる。数値入力では操作用吸着を適用しないため、直線上の値を直接指定して同じ分類を確認できる。

### 16. 同一平面上の3本では表し方が無数

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjozLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjMsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwLDBdfSx7ImlkIjoiYTIiLCJuYW1lIjoiYeKCgiIsImNvb3JkaW5hdGVzIjpbMCwxLDBdfSx7ImlkIjoiYTMiLCJuYW1lIjoiYeKCgyIsImNvb3JkaW5hdGVzIjpbMSwxLDBdfV0sInNwYW5TZWxlY3Rpb24iOlsiYTEiLCJhMiIsImEzIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWUsImNhbWVyYSI6eyJkaXJlY3Rpb24iOlswLjUwMzA1NTQ2LC0wLjY4MDYwNDQ1LDAuNTMyNjQ2OTZdLCJ0YXJnZXQiOlswLDAsMF0sInVwIjpbMCwwLDFdLCJ6b29tIjoxfX0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOnRydWUsInRhcmdldCI6WzIsLTEsMF19fQ)
- 期待結果: `rank(A) = rank([A | v]) = 2 < 3`、不定（解が無数）。
- 観察点: ターゲットと3本が同じ平面にあり、係数例と一般解が同じターゲットを表すことを確認する。ターゲットの矢先を平面外へ動かすと不能へ変わり、再び灰色の平面へ近づけると吸着して不定へ戻る。

## 共有URLを使う授業内の確認手順

端末・ブラウザの能力別対応、授業前チェック、QR・ネットワーク・WebGL等の復旧手順は [`CLASSROOM_DISTRIBUTION.md`](./CLASSROOM_DISTRIBUTION.md) を参照する。
共有状態、個人情報、配信基盤、利用条件の学生向け案内は [`USAGE_AND_PRIVACY.md`](./USAGE_AND_PRIVACY.md) を参照する。

1. 教員が上記の共有URLを提示し、学生が同じInitialStateを開く。
2. 学生が座標面、選択した集合、全ベクトルの3箇所で期待結果を照合する。
3. 数値入力、先端ドラッグ、span選択、追加・削除のいずれかで状態を変え、rank・次元・一次独立性の変化を説明する。
4. 学生が編集後の共有URLをエクスポートし、別タブまたは別端末で同じ状態が復元されることを確認する。
5. 元のタブでResetを実行し、教員が配布したInitialStateへ戻ることを確認する。

一次結合の代表例では、ターゲット `v` を動かして分類と2つのrankがどう変わるかを確認し、共有URLとResetがターゲットを含む初期状態を復元することも照合する。

3Dの代表例では、次の順に操作すると「見え方」と数学的な状態を混同しにくい。

1. まず右側（狭い画面では3D表示の下）の数式カードでrank、次元、一次独立・一次従属を確認する。
2. 「正面」「右」「上」「等角」で同じベクトルとspanを見比べ、視点を変えても数学的な状態は変わらないことを確認する。
3. 背景をドラッグして視点を回転し、ベクトルの矢先をドラッグして画面平行面内で座標を変更する。直線・平面への吸着時は、灰色のspanとrankがドラッグ中に切り替わることを確認する。
4. 一次結合モードでは背景の短いタップでターゲット `v` を配置し、その矢先をドラッグする。rank 2の選択集合では灰色の平面へ近づけて吸着させ、span外の「不能」から平面上の「唯一解」または「不定」へ変わることを確認する。唯一解の例では平行六面体、不定の例では平行四辺形が追従する。
5. 教員は共有URLまたはQRコードを提示し、学生は別端末でベクトル、span選択、ターゲット、カメラが一致することを確認する。操作後のResetでも配布時のカメラへ戻る。

## 端末・アクセシビリティ・失敗時の確認

- デスクトップでは3D表示と解析カードが2列、タブレット・スマートフォンでは1列になる。縦向き・横向きの切替後に「全体を表示」を押し、Canvasとカードが横にはみ出さないことを確認する。
- Canvas内の1本指ドラッグとピンチは3D操作に使う。ページをスクロールするときはCanvas外を操作する。Canvasにはキーボードフォーカスがあり、視点プリセットと「全体を表示」は通常のボタンとしてキーボードでも操作できる。
- 幾何表示は色だけに依存せず、ベクトル名、線種、数式カード、状態文を併用する。Canvasを利用できない場合も、数値入力と解析カードで座標・rank・生成する空間・一次独立性・一次結合の結果を確認できる。
- WebGL初期化失敗または描画コンテキスト喪失時は3D表示内に案内を出す。数値入力、共有URL、ResetはCanvasと独立して利用し、授業を継続できる。
- 座標の不正入力、8本の上限、長すぎる・壊れた共有URL、クリップボードやQR保存の失敗は、該当操作の近くに日本語で理由と復帰方法を表示する。
- 本番確認では最新のChrome・Edge・Safari系ブラウザを少なくとも1つずつ、PCと実機スマートフォンで確認する。代表例14は描画要素が多いため、視点回転とターゲットドラッグの追従性を性能確認にも使う。

## 2D・3Dで再利用する責務境界

次の責務は2Dと3Dで共通して再利用している。

- `VectorValue` と次元を持つベクトル集合。
- `analyzeVectorSet` によるrank、生成する空間の次元、一次独立・一次従属の判定。
- `analyzeLinearCombination` による不能・唯一解・不定の分類、特解、異なる係数例、自由係数、零空間基底による一般解。
- 共有状態v3の検証、v1・v2からの移行、Base64URL変換、URLの生成・読込。
- 0〜8本の追加・削除、次元に応じた既定座標、自動命名、span選択。
- `TeachingScenario` の状態・学習目的・期待結果という構造。
- ターゲットを含む `LinearCombinationTeachingScenario` の状態・期待する2つのrank・解分類という構造。

次の責務は2D固有であり、3DではThree.js、カメラ、3D用の直接操作へ置き換えている。

- SVG座標平面、自動表示範囲、目盛、2Dのズーム・パン。
- 2D座標へのポインター変換、先端ドラッグ、平行スナップ。
- 2Dターゲットのクリック・タップ配置、直線・原点への吸着、原点基準の平行四辺形、2×2逆行列による一般ターゲット公式。
- 2Dと3Dで異なる描画層、カメラ、一時UIを使いながら、次元別InitialState・CurrentStateを維持する境界。

フェーズ4では一次結合の数学・共有・教材表現を2Dで確立した。フェーズ5ではD-037の右手座標系・z軸上向きの正投影、カメラ共有、数値編集を3Dへ実装した。直接編集はD-042の操作モード・軸拘束試作を経て、D-043で矢先ドラッグを画面平行面内のベクトル移動、背景ドラッグを視点回転として自動分離する方式へ改修し、D-044で他の1本との平行、または他の独立な2本との同一平面上へ吸着できるようにした。D-045では吸着した瞬間に灰色のspan形状も立体・平面・直線へ切り替わる。D-046では一次結合モード中の短い背景タップを、原点を通る現在の画面平行面上へのターゲット`v`配置とし、視点ドラッグや2点操作と分離した。D-047では配置済みターゲットの矢先を画面平行面内で動かし、平行四辺形・平行六面体と係数倍ベクトルをドラッグ中に追従させる。D-057ではターゲットをrank 2の平面spanへ、D-059ではrank 0の原点とrank 1の生成直線へ吸着させ、span上で一次結合により表現できる例を直接作れるようにした。D-060により3Dの通常ベクトルとターゲットの吸着距離は共通して表示幅3%とし、2Dの表示幅1%とは分離している。D-048の代表例と本番共有URLには、上・正面・右・等角の視点を使った直接操作、吸着、span変化、ターゲット配置・ドラッグと係数幾何の観察手順を含め、公開版のPC・スマートフォンで利用者確認を完了した。

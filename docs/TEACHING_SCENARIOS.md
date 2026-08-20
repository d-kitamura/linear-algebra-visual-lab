# 2D教材シナリオ

最終更新: 2026-08-20

## 目的

フェーズ3・4の統合確認と授業準備に共通して使える2Dの代表例を定義する。各リンクはベクトル、生成する空間（span）の選択、幾何表示、一次結合エクスプローラの表示とターゲットを共有状態v2として保持する。リンクを開いた時点の状態がInitialStateとなるため、操作後にResetすると同じ例へ戻る。

状態の正本は `src/teaching/twoDimensionalScenarios.ts` とし、期待する数学結果と本番共有URLの往復を自動テストする。

## 代表例

### 1. 空集合

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoyLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOltdLCJzcGFuU2VsZWN0aW9uIjpbXSwidmlzdWFsaXphdGlvbiI6eyJzaG93U3BhbiI6dHJ1ZX0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOmZhbHNlLCJ0YXJnZXQiOm51bGx9fQ)
- 期待結果: ベクトル数0、`rank(A) = 0`、生成する空間の次元0、一次独立。
- 観察点: 生成する空間は零部分空間であり、座標面では原点として示される。「ベクトルを追加」で通常の編集へ移れる。

### 2. 零ベクトル

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoyLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMCwwXX1dLCJzcGFuU2VsZWN0aW9uIjpbImExIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWV9LCJsaW5lYXJDb21iaW5hdGlvbiI6eyJ2aXNpYmxlIjpmYWxzZSwidGFyZ2V0IjpudWxsfX0)
- 期待結果: ベクトル数1、`rank(A) = 0`、生成する空間の次元0、一次従属。
- 観察点: 空集合と同じ空間を生成するが、零ベクトルを含む集合は一次従属となる。

### 3. 平行な2本

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoyLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMiwxXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6Wy00LC0yXX1dLCJzcGFuU2VsZWN0aW9uIjpbImExIiwiYTIiXSwidmlzdWFsaXphdGlvbiI6eyJzaG93U3BhbiI6dHJ1ZX0sImxpbmVhckNvbWJpbmF0aW9uIjp7InZpc2libGUiOmZhbHNlLCJ0YXJnZXQiOm51bGx9fQ)
- 期待結果: ベクトル数2、`rank(A) = 1`、生成する空間の次元1、一次従属。
- 観察点: 2本の向きが反対でも同じ原点を通る直線を生成する。先端ドラッグの平行スナップも確認できる。

### 4. 一次独立な2本

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoyLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6WzAsMV19XSwic3BhblNlbGVjdGlvbiI6WyJhMSIsImEyIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWV9LCJsaW5lYXJDb21iaW5hdGlvbiI6eyJ2aXNpYmxlIjpmYWxzZSwidGFyZ2V0IjpudWxsfX0)
- 期待結果: ベクトル数2、`rank(A) = 2`、生成する空間の次元2、一次独立。
- 観察点: 2本が異なる方向を持つと2次元座標平面全体を生成する。

### 5. 3本以上の一次従属

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoyLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6WzAsMV19LHsiaWQiOiJhMyIsIm5hbWUiOiJh4oKDIiwiY29vcmRpbmF0ZXMiOlsxLDFdfV0sInNwYW5TZWxlY3Rpb24iOlsiYTEiLCJhMiIsImEzIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWV9LCJsaW5lYXJDb21iaW5hdGlvbiI6eyJ2aXNpYmxlIjpmYWxzZSwidGFyZ2V0IjpudWxsfX0)
- 期待結果: ベクトル数3、`rank(A) = 2`、生成する空間の次元2、一次従属。
- 観察点: 集合が一次従属でも、生成する空間は2次元座標平面全体になり得る。3本目のspan選択を外す操作と比較できる。

## 一次結合エクスプローラの代表例

### 6. 1本で一意に表す

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoyLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMiwxXX1dLCJzcGFuU2VsZWN0aW9uIjpbImExIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWV9LCJsaW5lYXJDb21iaW5hdGlvbiI6eyJ2aXNpYmxlIjp0cnVlLCJ0YXJnZXQiOls0LDJdfX0)
- 期待結果: `rank(A) = rank([A | v]) = 1`、唯一解、`v = 2a₁`。
- 観察点: 零ベクトルでない1本は、生成する直線上のターゲットを一意な係数で表す。ターゲットを直線外へ動かすと不能へ変わる。

### 7. 一次従属な2本では表現不能

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoyLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6WzIsMF19XSwic3BhblNlbGVjdGlvbiI6WyJhMSIsImEyIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWV9LCJsaW5lYXJDb21iaW5hdGlvbiI6eyJ2aXNpYmxlIjp0cnVlLCJ0YXJnZXQiOlswLDFdfX0)
- 期待結果: `rank(A) = 1 < rank([A | v]) = 2`、不能（解なし）。
- 観察点: 一次従属な2本が生成する直線の外にターゲットがあるため表現できない。ターゲットを直線上へ置くと不定へ変わる。

### 8. 一次独立な2本で唯一解

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoyLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6WzAsMV19XSwic3BhblNlbGVjdGlvbiI6WyJhMSIsImEyIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWV9LCJsaW5lYXJDb21iaW5hdGlvbiI6eyJ2aXNpYmxlIjp0cnVlLCJ0YXJnZXQiOlswLjUsMC4yNV19fQ)
- 期待結果: `rank(A) = rank([A | v]) = 2`、唯一解、`v = 0.5a₁ + 0.25a₂`。
- 観察点: 2次元座標平面全体を生成する一次独立な2本では、どこへターゲットを動かしても係数の組が一意に定まる。

### 9. 3本では表し方が無数

- [本番環境で開く](https://d-kitamura.github.io/linear-algebra-visual-lab/?state=eyJ2IjoyLCJsYWIiOiJ2ZWN0b3Itc3BhY2UiLCJkaW0iOjIsInZlY3RvcnMiOlt7ImlkIjoiYTEiLCJuYW1lIjoiYeKCgSIsImNvb3JkaW5hdGVzIjpbMSwwXX0seyJpZCI6ImEyIiwibmFtZSI6ImHigoIiLCJjb29yZGluYXRlcyI6WzAsMV19LHsiaWQiOiJhMyIsIm5hbWUiOiJh4oKDIiwiY29vcmRpbmF0ZXMiOlsxLDFdfV0sInNwYW5TZWxlY3Rpb24iOlsiYTEiLCJhMiIsImEzIl0sInZpc3VhbGl6YXRpb24iOnsic2hvd1NwYW4iOnRydWV9LCJsaW5lYXJDb21iaW5hdGlvbiI6eyJ2aXNpYmxlIjp0cnVlLCJ0YXJnZXQiOlswLjUsMC4yNV19fQ)
- 期待結果: `rank(A) = rank([A | v]) = 2 < 3`、不定（解が無数）。
- 観察点: 2次元座標平面全体を生成しても、3本を使うと係数の組は一意でない。常時表示の2例と、展開できる一般解を比較する。

## 共有URLを使う授業内の確認手順

1. 教員が上記の共有URLを提示し、学生が同じInitialStateを開く。
2. 学生が座標面、選択した集合、全ベクトルの3箇所で期待結果を照合する。
3. 数値入力、先端ドラッグ、span選択、追加・削除のいずれかで状態を変え、rank・次元・一次独立性の変化を説明する。
4. 学生が編集後の共有URLをエクスポートし、別タブまたは別端末で同じ状態が復元されることを確認する。
5. 元のタブでResetを実行し、教員が配布したInitialStateへ戻ることを確認する。

一次結合の代表例では、ターゲット `v` を動かして分類と2つのrankがどう変わるかを確認し、共有URLとResetがターゲットを含む初期状態を復元することも照合する。

## 後続フェーズで再利用する境界

次の責務は2Dと3Dで再利用する。

- `VectorValue` と次元を持つベクトル集合。
- `analyzeVectorSet` によるrank、生成する空間の次元、一次独立・一次従属の判定。
- `analyzeLinearCombination` による不能・唯一解・不定の分類、特解、異なる係数例、自由係数、零空間基底による一般解。
- 共有状態v2の検証、v1からの互換移行、Base64URL変換、URLの生成・読込。
- 0〜8本の追加・削除、次元に応じた既定座標、自動命名、span選択。
- `TeachingScenario` の状態・学習目的・期待結果という構造。
- ターゲットを含む `LinearCombinationTeachingScenario` の状態・期待する2つのrank・解分類という構造。

次の責務は2D固有であり、フェーズ5の3D実装で置き換えるか拡張する。

- SVG座標平面、自動表示範囲、目盛、2Dのズーム・パン。
- 2D座標へのポインター変換、先端ドラッグ、平行スナップ。
- 2Dターゲットのクリック・タップ配置、直線・原点への吸着、原点基準の平行四辺形、2×2逆行列による一般ターゲット公式。
- 2D画面が3D共有状態を既定例へフォールバックさせる現在の初期化ゲート。

フェーズ4では一次結合の数学・共有・教材表現を2Dで確立する。フェーズ5では、3D描画とカメラ操作、直接編集とのジェスチャー競合、spanが直線・平面・3次元空間になる場合の表現、カメラ状態を共有するかを新たに決める。

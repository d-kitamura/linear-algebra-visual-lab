# Linear Algebra Visual Lab

線形代数を学ぶ学生が、2D/3D のベクトル、一次独立・一次従属、ベクトルが張る空間をブラウザ上で視覚的・対話的に理解するための教材アプリです。

フェーズ6「共有と配布の仕上げ」までの実装・利用者確認・統合棚卸しが完了しています。2D/3D切替、右手座標系・正投影カメラ、数値編集・解析・共有、rankに応じたspan幾何、一次結合、モードなしの矢先ドラッグ、平行・同一平面上への吸着、spanと係数幾何のドラッグ中更新を利用できます。直接操作の吸着距離は3Dを表示幅の3%、2Dを2%とし、通常ベクトルとターゲットは原点吸着を平行・同一平面吸着より優先します。2D・3D合わせて16件の代表例、現行v3の本番共有URL、QR表示・PNG保存、授業手順、Canvasを利用できない場合の代替導線、MIT License、利用・プライバシー案内も整備済みです。現在は初版候補 `1.0.0-rc.1` です。授業実施までフェーズ7の評価を延期し、フェーズ8「複数Lab基盤と基底・次元Lab」を進めています。8.5bまで利用者確認済みです。8.6では同じ基底・座標状態を「数ベクトル／多項式」で切り替え、2Dを`\mathbb{R}[x]_1`、3Dを`\mathbb{R}[x]_2`へ対応させました。標準基底は昇べき順で、図は`b_0,b_1,b_2`を軸とする係数空間として表示します。現在は8.6の利用者確認待ちで、基底・次元Labの共有URL・QRは8.7で扱います。公開版は [Linear Algebra Visual Lab](https://d-kitamura.github.io/linear-algebra-visual-lab/) です。

## 文書の役割

- [`SPEC.md`](./SPEC.md): 決定済み要件、未決定事項、受入条件を管理する正本
- [`syllabus.txt`](./syllabus.txt): 授業の到達目標と週ごとの内容
- [`ROADMAP.md`](./ROADMAP.md): 開発段階、確認ゲート、完了条件
- [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md): 現在地、検証結果、再開時に必要な実装コンテキスト、次に行う小さな作業
- [`docs/DECISIONS.md`](./docs/DECISIONS.md): 技術・教材設計上の意思決定と保留事項
- [`docs/GITHUB_PAGES.md`](./docs/GITHUB_PAGES.md): GitHub Actions、pnpm、GitHub Pagesによる公開の仕組みと利用者の操作手順
- [`docs/NGINX.md`](./docs/NGINX.md): 学内nginx向けのルート／サブパスビルド、設定例、配置後の確認手順
- [`docs/SHARE_URL_COMPATIBILITY.md`](./docs/SHARE_URL_COMPATIBILITY.md): 正式リリース後の共有URL互換契約、版ごとの扱い、fixture更新手順
- [`docs/TEACHING_SCENARIOS.md`](./docs/TEACHING_SCENARIOS.md): 2Dの代表例、本番共有URL、授業内の確認手順、3Dへ再利用する境界
- [`docs/CLASSROOM_DISTRIBUTION.md`](./docs/CLASSROOM_DISTRIBUTION.md): 授業前チェック、対応環境、URL・QR配布、学生操作、失敗時の復旧手順
- [`docs/USAGE_AND_PRIVACY.md`](./docs/USAGE_AND_PRIVACY.md): 学生・教員向けの利用上の注意、共有状態、保存、配信基盤の案内
- [`docs/PHASE6_ACCEPTANCE.md`](./docs/PHASE6_ACCEPTANCE.md): 初版候補の自動・公開版回帰、配布・文書棚卸し、残る授業前確認
- [`CHANGELOG.md`](./CHANGELOG.md): 配布版ごとの主要機能と既知の境界
- [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md): 公開アプリが利用する第三者ライブラリの著作権・ライセンス
- [`math-writing-rules.txt`](./math-writing-rules.txt): 学生向け画面で使う数学用語・数式表記の基準

## 開発の進め方

1. 一度に一つの小さな成果を実装する。
2. 各成果について、自動テストと必要な動作確認を行う。
3. 利用者の確認と意見を受けて、仕様・ロードマップを更新する。
4. 作業終了時に `PROJECT_STATUS.md` を更新し、次回の開始点を明確にする。
5. 検証と文書更新後、Codexが既存履歴に合わせた短い日本語のメッセージでmainへコミットし、originへpushする。
6. push後のGitHub Actionsと公開結果を確認し、利用者がスマートフォン等から公開版を確認できる状態で引き渡す。

仕様と実装が食い違う場合は、実装を正として暗黙に進めず、差分を記録して確認します。

## ローカル開発

Node.js 20 以上と pnpm 11 を使用します。

```text
pnpm install
pnpm test
pnpm build
pnpm dev
```

`pnpm dev` で表示されるローカル URL をブラウザで開きます。ビルド成果物は `dist/` に生成されます。

Vite の公開ベースパスは環境変数 `APP_BASE_PATH` で指定できます。D-025によりGitHub Pagesのプロジェクトサイト用の `/linear-algebra-visual-lab/` をGitHub Actionsのビルドで指定します。mainへpushするとテスト・ビルド・デプロイが自動実行され、成功後に公開版が更新されます。公開手順は `docs/GITHUB_PAGES.md` を参照してください。

## ライセンス

Copyright © 2026 Daichi Kitamura. 本プロジェクトは [MIT License](./LICENSE) で提供します。旧MATLAB教材 [`plot2d_plot3d`](https://github.com/d-kitamura/plot2d_plot3d) は着想・表示仕様の参照元であり、本リポジトリの実装コードは新規実装です。第三者ライブラリはそれぞれのライセンスに従います。

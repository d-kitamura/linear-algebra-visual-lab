# Linear Algebra Visual Lab

線形代数を学ぶ学生が、2D/3D のベクトル、一次独立・一次従属、ベクトルが張る空間をブラウザ上で視覚的・対話的に理解するための教材アプリです。

フェーズ 4「2D 一次結合エクスプローラ」までの実装・利用者確認・統合棚卸しと、共有URLのQR表示・PNG保存が完了しています。現在はフェーズ5「3D教材版」を進行中です。5.1〜5.5で次元切替、右手座標系・正投影カメラ、3D数値編集・解析・共有、rank 0〜3のspan幾何表示、3D一次結合を利用者確認済みです。5.6では矢先ドラッグを画面に平行な面内のベクトル移動、背景ドラッグを視点回転としてモードなしで自動分離する3D直接編集を試作しました。公開版は [Linear Algebra Visual Lab](https://d-kitamura.github.io/linear-algebra-visual-lab/) です。

## 文書の役割

- [`SPEC.md`](./SPEC.md): 決定済み要件、未決定事項、受入条件を管理する正本
- [`syllabus.txt`](./syllabus.txt): 授業の到達目標と週ごとの内容
- [`ROADMAP.md`](./ROADMAP.md): 開発段階、確認ゲート、完了条件
- [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md): 現在地、検証結果、再開時に必要な実装コンテキスト、次に行う小さな作業
- [`docs/DECISIONS.md`](./docs/DECISIONS.md): 技術・教材設計上の意思決定と保留事項
- [`docs/GITHUB_PAGES.md`](./docs/GITHUB_PAGES.md): GitHub Actions、pnpm、GitHub Pagesによる公開の仕組みと利用者の操作手順
- [`docs/TEACHING_SCENARIOS.md`](./docs/TEACHING_SCENARIOS.md): 2Dの代表例、本番共有URL、授業内の確認手順、3Dへ再利用する境界
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

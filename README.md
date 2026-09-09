# Linear Algebra Visual Lab

線形代数を学ぶ学生のための対話型教材アプリです。ベクトル空間Lab、基底・次元Lab、線形写像Labは0〜3次元（線形写像は全16次元組）、表現行列・基底変換Labは数ベクトル・多項式の1〜3次元に対応します。

フェーズ0〜6・8〜11は完了、フェーズ7の授業評価は延期しています。フェーズ11・D-101は利用者確認済みです。フェーズ12「固有値・固有空間Lab」の全体計画はD-102承認済みです。12.1・D-103は確認済みです。12.2・D-104は確認済みです。12.3の数ベクトル2D画面を実装しました（D-105確認待ち）。共有は後続12.7で接続します。現行は初版候補 `1.0.0-rc.1` で、正式リリースと共有URL互換保証は未開始です。

## 文書の役割

4つのLabの操作・数式表示・URL／QR共有・共有時Resetを提供します。第四Labでは同じ写像を基準基底と選択基底で表し、基底変換の往復や多項式の係数対応を確認できます。画面は簡素に保ち、授業用の観察課題・52代表例はMarkdownへ集約しています（D-100）。現在地は [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md)、最新の棚卸しと引継ぎは [`docs/INVENTORY_PHASE11.md`](./docs/INVENTORY_PHASE11.md) を参照してください。

- [`SPEC.md`](./SPEC.md): 決定済み要件、未決定事項、受入条件を管理する正本
- [`docs/EIGENSPACE_LAB_DESIGN.md`](./docs/EIGENSPACE_LAB_DESIGN.md): フェーズ12の対象・数学・UI・数値計算・状態の採用設計（D-102承認済み）
- [`docs/EIGENSPACE_API_CONTRACT.md`](./docs/EIGENSPACE_API_CONTRACT.md): 12.1の具体契約・判定保留・状態・共有（D-103承認済み）
- [`docs/EIGENSPACE_NUMERICS.md`](./docs/EIGENSPACE_NUMERICS.md): 12.2の採用解法・許容値・保留例・検証（D-104承認済み）
- [`syllabus.txt`](./syllabus.txt): 授業の到達目標と週ごとの内容
- [`ROADMAP.md`](./ROADMAP.md): 開発段階、確認ゲート、完了条件
- [`docs/REPRESENTATION_MATRIX_DESIGN.md`](./docs/REPRESENTATION_MATRIX_DESIGN.md): 11.1の具体案、記号、変換方向、数値例、状態・共有の採用方針
- [`docs/INVENTORY_PHASE11.md`](./docs/INVENTORY_PHASE11.md): 4Labの統合棚卸し、検証結果、フェーズ12への境界
- [`docs/REPRESENTATION_TEACHING_GUIDE.md`](./docs/REPRESENTATION_TEACHING_GUIDE.md): 第四Labの授業用共有URL、観察課題・期待値
- [`docs/INVENTORY_PHASE10.md`](./docs/INVENTORY_PHASE10.md): フェーズ10の統合棚卸し、補修、検証範囲、フェーズ11への引継ぎ
- [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md): 現在地、検証結果、再開時に必要な実装コンテキスト、次に行う小さな作業
- [`docs/DECISIONS.md`](./docs/DECISIONS.md): 技術・教材設計上の意思決定と保留事項
- [`docs/GITHUB_PAGES.md`](./docs/GITHUB_PAGES.md): GitHub Actions、pnpm、GitHub Pagesによる公開の仕組みと利用者の操作手順
- [`docs/NGINX.md`](./docs/NGINX.md): 学内nginx向けのルート／サブパスビルド、設定例、配置後の確認手順
- [`docs/SHARE_URL_COMPATIBILITY.md`](./docs/SHARE_URL_COMPATIBILITY.md): 正式リリース後の共有URL互換契約、版ごとの扱い、fixture更新手順
- [`docs/LOW_DIMENSIONAL_SCENARIOS.md`](./docs/LOW_DIMENSIONAL_SCENARIOS.md): 0D・1Dの13代表例、共有URL、確認手順
- [`docs/TEACHING_SCENARIOS.md`](./docs/TEACHING_SCENARIOS.md): 2Dの代表例、本番共有URL、授業内の確認手順、3Dへ再利用する境界
- [`docs/CLASSROOM_DISTRIBUTION.md`](./docs/CLASSROOM_DISTRIBUTION.md): 授業前チェック、対応環境、URL・QR配布、学生操作、失敗時の復旧手順
- [`docs/USAGE_AND_PRIVACY.md`](./docs/USAGE_AND_PRIVACY.md): 学生・教員向けの利用上の注意、共有状態、保存、配信基盤の案内
- [`docs/PHASE6_ACCEPTANCE.md`](./docs/PHASE6_ACCEPTANCE.md): 初版候補の自動・公開版回帰、配布・文書棚卸し、残る授業前確認
- [`CHANGELOG.md`](./CHANGELOG.md): 配布版ごとの主要機能と既知の境界
- [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md): 公開アプリが利用する第三者ライブラリの著作権・ライセンス
- [`math-writing-rules.txt`](./math-writing-rules.txt): 学生向け画面で使う数学用語・数式表記の基準

## 開発の進め方

1. 一度に一つの小さな成果を実装する。
2. Codexは変更箇所に関係する最小限の自動テスト・型検査を必要に応じて行い、未確認範囲を明示する。ブラウザ・実端末の動作確認は利用者が行う。
3. 利用者の確認と意見を受けて、仕様・ロードマップを更新する。
4. 作業終了時に `PROJECT_STATUS.md` を更新し、次回の開始点を明確にする。
5. コミット・プッシュは利用者が行う。Codexはローカルファイルの変更までを担当する（D-090、D-030を置換）。
6. GitHub Actions・デプロイ・公開版の確認も利用者が行う。Codexによる全テスト・全体ビルド・棚卸しは明示依頼時または変更リスク上必要な場合に絞り、通常作業での反復を避ける。

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

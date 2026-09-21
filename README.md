# Linear Algebra Visual Lab

次の単元は[内積・正規直交基底Labの詳細設計案](docs/INNER_PRODUCT_LAB_DESIGN.md)と[フェーズ14ロードマップ](ROADMAP.md)を参照してください（D-125承認済み、[14.1具体契約](docs/INNER_PRODUCT_API_CONTRACT.md)・D-126承認済み、14.2数学API・D-127承認済み、14.4数2Dグラム・シュミット過程実装済み・D-129確認待ち）。

対角化Labの18例は[対角化Labの授業資料](docs/DIAGONALIZATION_TEACHING_GUIDE.md)、固有値Labの授業用18例は[固有値・固有空間Labの授業資料](docs/EIGENSPACE_TEACHING_GUIDE.md)を参照してください。

線形代数を学ぶ学生のための対話型教材アプリです。ベクトル空間Lab、基底・次元Lab、線形写像Labは0〜3次元（線形写像は全16次元組）、表現行列・基底変換Labは数ベクトル・多項式の1〜3次元に対応します。

フェーズ0〜6・8〜13は完了、フェーズ7の授業評価は延期しています。フェーズ11・D-101は利用者確認済みです。フェーズ12「固有値・固有空間Lab」の全体計画はD-102承認済みです。12.1・D-103は確認済みです。12.2・D-104は確認済みです。12.3・D-105／D-106は利用者確認済みです。12.4・D-107は利用者確認済みです。12.5で多項式1〜3D、係数空間との対応、微分・x倍した微分・平行移動の例を実装しました（D-108／D-109利用者確認済み）。12.6の数式説明として、固有方程式・核・基底と入力の伸縮／反転を既存タブ内で接続しました（D-110／D-111利用者確認済み、12.6完了）。D-106で初期固有値2・4、全固有空間同時表示（初期オフ）、等号表示へ修正しました。12.7で第五Labの共有URL・QR・共有時Resetを接続しました（D-112利用者確認済み）。12.8では固有値Labの18代表URL・観察課題とアクセシビリティ点検を追加しました（D-113利用者確認済み）。12.9・D-114は利用者確認済みでフェーズ12を完了しました。フェーズ13「対角化Lab」の詳細設計D-115は利用者承認済みです。13.1・D-116は承認済み。13.2・D-117は承認済みです。13.3で第六の対角化Lab（数ベクトル2D）を接続しました（D-118承認済み）。基準座標と固有基底座標の2図、列順交換、3解析タブを利用できます。13.4で数ベクトル0〜3Dと次元別Reset、3Dの左右連動を接続しました（D-119承認済み）。13.5で多項式1〜3Dと7場面の独立保持、係数空間と固有基底座標、微分・x倍した微分・平行移動を接続しました（D-120承認済み）。13.6で対角化Labの共有URL・QR・列順と左右3D視点の復元・共有時Resetを接続しました（D-122承認済み）。13.7で18代表URL・独立期待値とアクセシビリティ点検を追加しました（D-123承認済み）。13.8・D-124は利用者確認済みでフェーズ13完了です。フェーズ14「内積・正規直交基底Lab」は詳細設計D-125承認済み、14.1具体契約D-126承認済み、14.2数学APIはD-127承認済み、14.3で数ベクトル2Dの内積・射影画面を接続しました。14.4で0〜8本の入力・順序変更とGS段階操作を接続しました（D-129確認待ち）。共有URL・QRは14.7で追加予定です。ケイリー・ハミルトンの定理は利用者指示により対象外です。現行は初版候補 `1.0.0-rc.1` で、正式リリースと共有URL互換保証は未開始です。

## 文書の役割

既存6Labの操作・数式表示・URL／QR共有・共有時Resetを提供します。第7の内積・正規直交基底Labは数2Dの内積・射影画面を実装済みで、共有は14.7予定です。対角化Labは数ベクトル0〜3D・多項式1〜3Dに対応し、基底列順と左右3D視点も共有します。第四Labでは同じ写像を基準基底と選択基底で表し、基底変換の往復や多項式の係数対応を確認できます。画面は簡素に保ち、授業用の観察課題・6Lab計88例はMarkdownへ集約しています（D-100）。現在地は [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md)、最新の棚卸しと引継ぎは [`docs/INVENTORY_PHASE13.md`](./docs/INVENTORY_PHASE13.md) を参照してください。

- [`SPEC.md`](./SPEC.md): 決定済み要件、未決定事項、受入条件を管理する正本
- [`docs/EIGENSPACE_LAB_DESIGN.md`](./docs/EIGENSPACE_LAB_DESIGN.md): フェーズ12の対象・数学・UI・数値計算・状態の採用設計（D-102承認済み）
- [`docs/EIGENSPACE_API_CONTRACT.md`](./docs/EIGENSPACE_API_CONTRACT.md): 12.1の具体契約・判定保留・状態・共有（D-103承認済み）
- [`docs/EIGENSPACE_NUMERICS.md`](./docs/EIGENSPACE_NUMERICS.md): 12.2の採用解法・許容値・保留例・検証（D-104承認済み）
- [`syllabus.txt`](./syllabus.txt): 授業の到達目標と週ごとの内容
- [`ROADMAP.md`](./ROADMAP.md): 開発段階、確認ゲート、完了条件
- [`docs/REPRESENTATION_MATRIX_DESIGN.md`](./docs/REPRESENTATION_MATRIX_DESIGN.md): 11.1の具体案、記号、変換方向、数値例、状態・共有の採用方針
- [`docs/INVENTORY_PHASE13.md`](./docs/INVENTORY_PHASE13.md): 6Lab・88例の統合棚卸し、検証結果、次の単元への境界
- [`docs/INVENTORY_PHASE12.md`](./docs/INVENTORY_PHASE12.md): フェーズ12終了時の棚卸し記録
- [`docs/DIAGONALIZATION_LAB_DESIGN.md`](./docs/DIAGONALIZATION_LAB_DESIGN.md): フェーズ13の採用設計（D-124まで承認済み、フェーズ13完了）
- [`docs/DIAGONALIZATION_API_CONTRACT.md`](./docs/DIAGONALIZATION_API_CONTRACT.md): 13.1の承認済み契約、13.2数学APIと13.3〜13.6画面・共有の実装記録（D-120／D-122承認済み）
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
5. 作業終了後のコミット・プッシュはCodexが行う（2026-09-16利用者指示、D-120）。D-090のGit作業分担のみ置換し、ブラウザ・実機確認は引き続き利用者が行う。
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

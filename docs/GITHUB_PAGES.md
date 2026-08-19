# GitHub Pages公開手順

最終更新: 2026-08-19

## 目的と状態

現在のmainを、GitHub Pagesのプロジェクトサイトとして次のURLへ公開する。

`https://d-kitamura.github.io/linear-algebra-visual-lab/`

この文書は作業単位5.1の実装記録と利用者向け操作手順である。GitHub Actionsワークフロー、Pages設定、初回公開、本番環境での共有URL・Reset等の確認まで完了している。

## 処理の流れ

1. プロジェクト所有者がローカルの変更をコミットし、mainへpushする。
2. mainへのpushをGitHub Actionsが検知し、一時的なLinux実行環境でリポジトリを取得する。
3. `package.json` の `packageManager` に従ってpnpm 11.19.0とNode.js 24を準備し、`pnpm install --frozen-lockfile` で `pnpm-lock.yaml` どおりに依存関係をインストールする。
4. `pnpm test` を実行する。失敗した場合は公開しない。
5. `APP_BASE_PATH=/linear-algebra-visual-lab/` を指定して `pnpm build` を実行する。
6. Viteが `dist/index.html`、CSS、JavaScript等の公開用ファイル一式を `dist/` に生成する。
7. GitHub Actionsが `dist/` だけをPages artifactとしてアップロードする。
8. GitHub Pagesがartifactを公開し、成功した実行のURLをActions画面へ表示する。

`dist/` はビルドのたびに再生成できる成果物であり、mainへコミットしない。

## 理解するときの要点

- pnpmは、依存ライブラリの準備と `package.json` に定義したテスト・ビルドコマンドの実行を担当する。pnpm自体がWebページを公開するわけではない。
- Viteのビルドは、開発用のTypeScript・Reactソースをブラウザが配信可能なHTML・CSS・JavaScriptへ変換する。
- Base pathは単独の入口ファイルではない。`/linear-algebra-visual-lab/` が、ビルドされたHTMLや静的アセットの参照先へ反映される。
- GitHub Pagesへ渡す入口は `dist/index.html` である。リポジトリ直下の開発用 `index.html` を直接公開しない。
- GitHub Actionsはmainを書き換えず、実行ごとに生成した一時的なartifactをPagesへ渡す。
- mainへのpushで自動実行するほか、Actions画面から手動実行できるようにする。

## 初回公開時のGitHub操作

ワークフローのローカル追加とCodexの検証は完了している。次を行う。

1. ワークフローファイルを含む変更をコミットし、GitHubのmainへpushする。
2. GitHubでリポジトリを開き、Settingsを選ぶ。
3. 左側の「Code and automation」からPagesを選ぶ。
4. 「Build and deployment」のSourceを「GitHub Actions」にする。
5. Actionsタブを開き、GitHub Pages用ワークフローの実行を確認する。
6. 各ステップが成功し、deployステップに公開URLが表示されることを確認する。
7. 公開URLを開き、下記の本番確認を行う。

設定とpushの順序により最初の実行がPages設定前に失敗または保留になった場合は、SourceをGitHub Actionsへ変更した後、Actions画面からワークフローを手動実行する。

このワークフローはGitHubが実行時に発行する `GITHUB_TOKEN` と最小権限を使うため、アクセストークンやパスワードをSecretsへ登録する必要はない。リポジトリのActions利用制限によって `pnpm/setup` が拒否された場合だけ、Settings → Actions → Generalでpnpm公式Actionの利用を許可する。

## 本番確認

- 公開URLで教材画面と座標面が表示される。
- CSSとJavaScriptが404にならず、数値入力、ドラッグ、ズーム、span表示が動作する。
- ページを再読み込みしても同じ画面を開ける。
- エクスポートURLが `https://d-kitamura.github.io/linear-algebra-visual-lab/?state=...` になる。
- 共有URLを別タブで開き、ベクトル、span選択、幾何表示が復元される。
- 共有URLから編集した後のReset、クリップボードコピー、テキスト保存が動作する。
- Actionsの実行対象コミットが、公開したいmainの最新コミットと一致する。

## 通常の更新

初回公開後は、検証済みの変更をmainへpushすると同じワークフローが自動実行される。テストまたはビルドが失敗した場合は新しい成果物をデプロイせず、直前に成功した公開版を維持する構成にする。

## 変更時に見直す項目

- リポジトリ名を変更した場合は `APP_BASE_PATH` を変更する。
- GitHub Pagesのカスタムドメインを設定した場合は、通常base pathを `/` へ変更する。
- 学内nginxへ移す場合は、配置するサブパス、HTTPS、リクエスト行長、キャッシュ方針を別途確認する。
- GitHub Actionsで使用する各Actionの参照バージョンは、ワークフロー実装時と定期棚卸し時に公式ドキュメントで確認する。

## 公式資料

- [Vite: Deploying a Static Site](https://vite.dev/guide/static-deploy)
- [GitHub Docs: Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [pnpm: Continuous Integration](https://pnpm.io/continuous-integration)

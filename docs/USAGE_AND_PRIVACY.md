# 利用・プライバシー案内

対象版: `1.0.0-rc.1`

最終更新: 2026-08-24

## 利用目的

Linear Algebra Visual Labは、2次元・3次元数ベクトル、一次独立・一次従属、生成する空間、一次結合を授業で対話的に確認する教材アプリである。正規の公開URLは次のとおりである。

`https://d-kitamura.github.io/linear-algebra-visual-lab/`

## アプリが扱う情報

- 入力したベクトル、spanの選択、幾何表示、一次結合ターゲット、3Dカメラはブラウザ内で処理する。
- 「共有URLをエクスポート」すると、共有対象の数学状態をURLの`state`クエリーパラメーターへ格納する。
- QRコード画像は、その共有URLからブラウザ内で生成する。QR生成や数学計算のために外部APIへ状態を送信しない。
- 手動表示範囲、詳細タブ、折り畳み状態、ドラッグ途中の値は共有しない。

## 保存・追跡

- 本アプリ独自の利用者アカウント、Cookie、アクセス解析、データベース、サーバー保存機能はない。
- 共有状態はURLまたは利用者が保存したテキスト・QR画像に残る。不要になったファイルと投稿済みURLは利用者側で管理する。
- 配信基盤のGitHub Pagesおよび通信経路では、IPアドレスやUser-Agent等の通常のアクセス情報がGitHubの方針に従って取り扱われる場合がある。

## 利用時の注意

- 氏名、学籍番号、メールアドレス等の個人情報をベクトル名や共有URLへ含めない。
- 共有URLを受け取った人は、URLに含まれる教材状態を閲覧できる。授業用URLは必要な範囲で配布する。
- 数学的な判定には浮動小数点演算と許容誤差を用いる。厳密な証明や成績評価の唯一の根拠にはせず、授業内の説明と併用する。
- WebGL、Clipboard API、ダウンロードを利用できない場合は、`CLASSROOM_DISTRIBUTION.md`の代替導線を使う。

## 利用条件

- 本アプリのソースコードはMIT Licenseで提供する。
- Copyright © 2026 Daichi Kitamura
- 依存ライブラリの著作権とライセンスは`THIRD_PARTY_NOTICES.md`を参照する。
- 本アプリは無保証で提供される。MIT License全文はリポジトリ直下の`LICENSE`を参照する。

## 関連文書

- [`CLASSROOM_DISTRIBUTION.md`](./CLASSROOM_DISTRIBUTION.md): 授業前チェックと復旧手順
- [`SHARE_URL_COMPATIBILITY.md`](./SHARE_URL_COMPATIBILITY.md): 共有URL互換契約
- [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md): 第三者ライセンス
- [`../LICENSE`](../LICENSE): MIT License全文

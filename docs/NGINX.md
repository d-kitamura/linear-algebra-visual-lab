# 学内nginxへの静的配布手順

最終更新: 2026-08-24

## 位置づけ

初版の主配布先はGitHub Pagesとする。本書は、学内nginxを将来併用または代替配布先にする場合の引渡し手順であり、フェーズ6では実サーバーへの配置を必須にしない。アプリはサーバーAPI、認証、データベース、クライアント側ルーティングを持たない静的サイトである。

## 配置前に決める値

- 公開URLのorigin。例: `https://example.ac.jp`
- ルート配信かサブパス配信か。例: `/` または `/linear-algebra-visual-lab/`
- `dist/`を配置できる絶対ディレクトリ
- TLS証明書とHTTPS終端の管理者
- 2048文字の完全URLを許容するリクエスト行設定

クリップボードへの自動コピーは安全なコンテキストを前提とするため、学生向け公開はHTTPSを使用する。HTTPしか使えない場合も、URL欄の手動コピーとテキスト保存は利用できる。

## ビルドと成果物検証

Viteの`base`は公開パスに合わせる。`APP_BASE_PATH`は先頭・末尾が`/`の絶対パスにする。

ルート配信:

```powershell
$env:APP_BASE_PATH='/'
pnpm build
$env:EXPECTED_BASE_PATH='/'
pnpm verify:dist
```

サブパス配信:

```powershell
$env:APP_BASE_PATH='/linear-algebra-visual-lab/'
pnpm build
$env:EXPECTED_BASE_PATH='/linear-algebra-visual-lab/'
pnpm verify:dist
```

`verify:dist`は、`dist/index.html`が存在すること、JavaScript・CSS等が期待したbase pathを使うこと、参照したハッシュ付きアセットが`dist/assets/`に存在することを確認する。配置するのはソースではなく、検証済みの`dist/`の内容だけである。

## nginx設定例

次の例はサイト固有のTLS設定、ログ、アクセス制御を省略している。学内管理者の基準を優先し、適用前に`nginx -t`と`nginx -T`で有効な設定を確認する。

### ルート配信

`dist/`の内容を`/srv/www/linear-algebra-visual-lab/`へ配置する例:

```nginx
server {
    listen 443 ssl;
    server_name example.ac.jp;

    root /srv/www/linear-algebra-visual-lab;
    index index.html;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location = /index.html {
        add_header Cache-Control "no-cache" always;
        try_files $uri =404;
    }

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### サブパス配信

`dist/`の内容を`/srv/www/linear-algebra-visual-lab/`へ配置し、同名のサブパスで公開する例:

```nginx
server {
    listen 443 ssl;
    server_name example.ac.jp;

    root /srv/www;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location = /linear-algebra-visual-lab {
        return 308 /linear-algebra-visual-lab/;
    }

    location = /linear-algebra-visual-lab/index.html {
        add_header Cache-Control "no-cache" always;
        try_files $uri =404;
    }

    location /linear-algebra-visual-lab/assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }

    location /linear-algebra-visual-lab/ {
        try_files $uri $uri/ =404;
    }
}
```

現在はクエリーパラメーター`?state=...`だけで状態を復元し、`/example/route`のようなクライアント側ルートを使わない。このため、存在しないパスを一律に`index.html`へ返すSPA fallbackは設定しない。将来ルーティングを導入した場合にだけ再検討する。

## URL長

D-050でアプリが生成する完全URLを2048文字以内に制限している。nginx公式文書では、リクエスト行が`large_client_header_buffers`の1バッファを超えると414になると説明されている。一般的な既定値を想定するだけでなく、学内の有効設定を`nginx -T`で確認し、リバースプロキシ、WAF、LMS等が間にある場合は経路全体で境界URLを開く。

アプリの2048文字上限に合わせるために8192文字の状態防御上限までサーバー設定を広げる必要はない。両者は別の目的の値である。

## 配置後の確認

1. 公開URLと`index.html`が200になる。
2. JavaScript、CSS、3D遅延チャンクが200で正しいMIME typeになる。
3. 存在しない静的ファイルが404になり、`index.html`へ偽装されない。
4. 2Dと3Dを切り替え、3Dを初めて開いたときもチャンクを読み込める。
5. 共有URLを生成すると、nginx側のoriginとサブパスが維持される。
6. 代表例と1309文字の境界URLを別端末で開ける。
7. Reset、QR生成、コピー、テキスト・PNG保存が動作する。
8. `index.html`は再検証され、ハッシュ付き`assets/`は長期キャッシュされる。
9. nginx再起動または設定反映後も`nginx -t`が成功する。

## 更新とロールバック

- 新しい`dist/`を別ディレクトリへ配置・検証してから切り替え、直前の成果物を一定期間残す。
- HTMLと`assets/`を別更新にせず、同じビルド成果物として切り替える。
- 失敗時は直前の検証済み成果物へ戻す。共有URLはD-051の互換fixtureで回帰確認する。
- GitHub Pagesとnginxを併用する場合、教員が学生へ案内する正規URLを一つ決める。異なるoriginで生成した共有URLは自動的には別originへ転送されない。

## 公式資料

- [Vite: Shared Options — base](https://vite.dev/config/shared-options.html#base)
- [nginx: Core module — root, try_files, large_client_header_buffers](https://nginx.org/en/docs/http/ngx_http_core_module.html)
- [nginx: Headers module — add_header](https://nginx.org/en/docs/http/ngx_http_headers_module.html)
- [nginx: Gzip module](https://nginx.org/en/docs/http/ngx_http_gzip_module.html)

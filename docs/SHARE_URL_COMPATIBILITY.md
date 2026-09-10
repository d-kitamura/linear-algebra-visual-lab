# 共有URLの互換方針

最終更新: 2026-09-10

## 目的

授業スライド、LMS、配布資料、QRコードに保存した教材状態を、アプリ更新後も同じ数学的状態として開けるようにする。本書はD-032、D-039、D-050、D-051、D-073、D-079、D-080、D-089、D-098を運用手順へまとめたものである。

## 保証開始前の現在地

- 現行の生成形式はLabごとに分かれ、ベクトル空間Labは`vector-space` v4、基底・次元Labは`basis-dimension` v2、線形写像Labは`linear-map` v2である（D-089）。第四の表現行列Labは独立した`representation-matrix` v1を追加した（D-098）。
- 既存3形式は0〜3次元と全16写像を扱う。0Dの固定状態や空行列はURLで省略し、復元時に正規形へ戻す。旧vector-space v1〜v3、basis-dimension v1、linear-map v1は定義済みの2D/3D状態として厳密検証して読み込む。
- 第五の固有値Labは独立した`eigenspace` v1を追加した（D-112）。数ベクトル0〜3D／多項式1〜3Dの現在場面と3Dカメラを保存する。0D形式はv・lab・dimだけで、余剰フィールドを拒否する。
- 5形式は最初の正式リリースで保証対象になる候補として固定fixtureを用意している。
- 正式リリースと保証開始は、フェーズ7でプロジェクト所有者が明示的に承認する。それまではD-032どおり開発中URLの互換性を保証しない。
- 状態には生成時期を示すフィールドがないため、正式リリース後に各`(lab, v)`を保証すると、現在までに生成された同形式の有効URLも同じデコーダーで保証対象になる。

## 正式リリース後の契約

1. 現行の`vector-space` v4、`basis-dimension` v2、`linear-map` v2、`representation-matrix` v1、`eigenspace` v1を最初の保証対象候補とし（対象版は正式リリース時に再確認）、正式承認後は本アプリを提供している期間、固定の年数を設けず読み込みを維持する。
2. 新しいURLは、その時点の現行スキーマだけで生成する。旧スキーマを選んで生成するUIは設けない。
3. 将来さらに新しい版を導入しても、正式リリースで保証した全旧版を厳密に検証し、現行の`ShareState`へ移行してから利用する。
4. 旧版のフィールドを推測で補完せず、版ごとに定義した既定値だけを追加する。未知フィールド、未知バージョン、不正値は安全に拒否する。
5. 互換処理はデコーダーだけに置き、互換用の冗長なフィールドを新規URLへ重複して埋め込まない。
6. アプリ自体を終了または互換不能な全面刷新へ移行する場合は、事前告知と利用可能な移行手段を別途決定する。

## バージョン表

| Lab・状態版 | 新規生成 | 読込 | 正式保証 | 備考 |
|---|---|---|---|---|
| `vector-space` v1 | しない | 当面維持 | 対象外 | 2Dのベクトル・span・表示だけを持つ開発版 |
| `vector-space` v2 | しない | 当面維持 | 対象外 | 2D一次結合ターゲットを追加した開発版 |
| `vector-space` v3 | しない | 維持 | 未開始 | 2D/3D、一次結合、3Dカメラを保持 |
| `basis-dimension` v1 | しない | 維持 | 未開始 | 候補順、表示方式、一次結合、比較用基底、3Dカメラを保持 |
| `linear-map` v1 | しない | 維持 | 未開始 | 入出力次元、行列、2入力、スカラー、格子表示、両側3Dカメラを保持 |
| `vector-space` v4 | 現行 | 維持 | 正式承認待ち | 0〜3次元、0D固定値省略 |
| `basis-dimension` v2 | 現行 | 維持 | 正式承認待ち | 0〜3次元、1D定数多項式・比較基底 |
| `linear-map` v2 | 現行 | 維持 | 正式承認待ち | 全16次元組、0D空行列・空入力省略 |
| `representation-matrix` v1 | 現行 | 維持 | 正式承認待ち | 1〜3次元、両側空間種別、M、両基底・順序、入力、モード・方向、3Dカメラ |
| 未知の将来版 | しない | 拒否 | 対象外 | 既定例へフォールバックし理由を表示 |
| `eigenspace` v1 | 現行 | 維持 | 正式承認待ち | 現在のkind・dim・matrix・input・showEigenspace・camera。0Dはv・lab・dimのみ |

## 固定fixtureと変更手順

- `tests/fixtures/share-url-eigenspace-v1.json`は多項式3D微分、入力[1,2,3]、固有空間表示と3Dカメラを含む第五LabのURLを固定する。`tests/sharing/eigenSharing.test.ts`で同一URL再生成・7場面・共有時Reset・既存4Labへの非干渉を確認する。授業用代表URL18例は[固有値Lab授業資料](./EIGENSPACE_TEACHING_GUIDE.md)を参照（12.8・D-113）。

- `tests/fixtures/share-url-representation-matrix-v1.json`は多項式微分3→2、基底順u3,u1,u2、3Dカメラを含む第四Labのv1 URLと期待状態を固定する。`tests/sharing/representationSharing.test.ts`で同一URL再生成・場面別Reset・既存3Labへの非干渉を確認する。
- `tests/fixtures/share-url-v3.json`は、3本の3Dベクトル、全span選択、3Dカメラ、一次結合ターゲットを含むv3 URLと期待状態を固定する。
- `tests/fixtures/share-url-basis-dimension-v1.json`は、2Dの全ベクトル、候補順、ターゲット、比較用基底を含む基底・次元Lab v1 URLと期待状態を固定する。
- `tests/fixtures/share-url-linear-map-v1.json`は、`2→3`の行列、入力`u,w`、スカラー、終域3Dカメラを含む線形写像Lab v1 URLと期待状態を固定する。
- `tests/sharing/shareCompatibility.test.ts`は旧固定URLの数学状態を現行版へ正規化して照合し、現行版での決定的な再生成を確認する。旧URLと新版URLの文字列一致は要求しない。
- `tests/fixtures/share-url-low-dimensions.json`は現行版の低次元8例を固定する。`tests/sharing/lowDimensionalSharing.test.ts`で復元と同一URL再生成、13追加教材例の数学・描画・QR・読み上げ要約を検証する。既存28例と計41例になる。
- `tests/integration/multiLabRegression.test.ts`は、各固定URLが対象Labだけを共有InitialStateにすること、Reset基準からの決定的再生成、4件のQR生成、旧3Labの28例＋低次元13例＋第四Lab11例（計52代表例）を横断して確認する。
- 将来いずれかのLabを更新するときは、別Labを含む既存fixtureを変更または削除しない。旧版の復元テストを残し、新版fixtureと旧版からの移行テストを追加する。
- 互換fixtureのURLはコード整形、表示名変更、既定値変更を理由に更新しない。fixture自体が誤っていた場合だけ、理由を意思決定記録へ残して修正する。

## URL長との関係

表現行列Labも数値を丸めず、通常36場面と同種恒等写像6場面のうち現在の1場面だけを保存する。基底の固定名u_i/v_iはindexから復元し、候補の配列順を維持する。入力下書きや派生値を省くのは状態境界であり、精度の切捨てではない。最大次元の高精度成分と2048文字ちょうど／超過の境界をテストする。

### representation-matrix v1の正規形

`v, lab, mode, sourceDimension, targetDimension, sourceKind, targetKind, matrix, sourceBasis, targetBasis, input, direction, cameras`の全項目を必須とする。基底の各要素は`{index, coordinates}`で、番号は1〜次元の重複しない整数。`matrix`は終域行数×定義域列数。`cameras`は`{source,target}`で、3D側は既存SharedCameraState、非3D側はnull。通常モードのdirectionはnull、基底変換モードはB-to-CまたはC-to-Bであり、後者は同種・同次元かつM=Eを要求する。未知項目はネスト内も拒否する。

種別はcoordinateまたはpolynomial、次元は1〜3。一次従属な候補や零候補は有効な教材状態として受理する。共有URLを開いたときだけInitialStateを確定し、編集後のエクスポートでReset基準は更新しない。共有していない他場面は既定InitialStateのまま保持する。

D-050により、アプリが生成する完全URLは2048文字以内、受信状態のデコード防御上限は8192文字である。旧版デコーダーを残しても新規URLの長さは増えない。共有項目を追加して2048文字へ近づく場合は、現行版を変更する前に境界テスト、QR生成、移行方針を同時に見直す。

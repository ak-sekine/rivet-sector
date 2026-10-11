# rivet-sector
A voxel-style sci-fi third-person shooter built with Babylon.js and TypeScript.

PC・スマートフォン向けボクセル風SF TPS「Rivet Sector」。Codexを中心に開発します。
現在はTPS基本操作の試作環境です。移動、視点操作、衝突判定を実装しています。
8方向ステップ回避、中央照準、エネルギー銃のHitscan射撃と静止ロボット標的を実装しています。敵AIは未実装です。

## 使用技術と開発環境

- TypeScript / Vite / Babylon.js（npm管理、WebGL）/ HTML / CSS
- Vitest / GitHub Actions / GitHub Pages
- Node.js 24 LTS推奨（22.12以上）、npm、Git、WebGL対応ブラウザ
- 正確な依存バージョンはpackage.jsonとpackage-lock.jsonで管理

## セットアップと実行

```sh
git clone https://github.com/ak-sekine/rivet-sector.git
cd rivet-sector
npm ci
npm run dev
```

表示されたURLの `/rivet-sector/` を開きます。スマートフォンからは同じネットワークのPCのIPアドレスを使用します。
OSのファイアウォールで開発サーバーの接続許可が必要な場合があります。

```sh
npm test
npm run build
npm run preview
```

テストは移動方向、斜め正規化、30/60FPS、停止、衝突と壁沿い移動、角度制限、カメラ障害物回避、描画解像度、NullEngineシーン構成を確認します。buildはTypeScript検証後にdistへ出力します。
previewは本番ビルドの確認用です。

## シーンと構成

床・壁・障害物・照明・ボクセル風ロボットをTypeScriptから生成します。
PCはWASDで移動、クリック＋マウスで視点、Escでマウス固定解除。固定不可の場合はドラッグ。
最初のクリックはマウス固定のみ。固定後の左クリックまたはFで射撃、タッチは回避ボタンの上の「射撃」。
1入力1発、0.25秒間隔、射程60、弾薬無制限、リロード・スタミナ消費なし。
カメラ中央のレイと右腕の銃口からのレイを検査し、壁・障害物・床で遮蔽します。
橙色の静止標的へ命中すると0.15秒発光、射線と着弾光は0.06秒表示。標的は破壊されず、移動時は通過できます。
移動・視点・回避・射撃の同時入力と回避中の射撃に対応。敵AI・HP・ダメージ・武器切替・連射・音・勝敗は未実装。
回避はPCでShift、タッチ端末で右下の「回避」。距離2.5、時間0.20秒を維持し固定クールダウンを廃止。
スタミナ最大・初期100、消費25、最後の消費から0.5秒待機して毎秒40回復（回避中は回復しない）。
残量25以上なら終了直後に新しい入力で連続回避可能。不足入力は破棄し、通常移動は継続する。
上部に現在値／最大値と青緑バーを表示し、回避ボタンは動作中・不足を区別する。
中断時は回避・入力・姿勢を解除し、スタミナと待機時間を保持してゲーム時間を停止、復帰後に再開する。
移動入力をカメラ基準の8方向へ丸め、入力なしでは後方へ回避します。詳細は操作仕様を参照してください。
スマートフォンは左下スティックで移動、その他の画面スワイプで視点。同時操作に対応します。
右肩後方TPSカメラには障害物回避を備えます。WebGL初期化エラー表示も維持しています。
移動・カメラ・衝突判定の数値と仕様は[操作仕様](docs/controls.md)を参照してください。

- `src/main.ts`: 起動
- `src/rendering/`: エンジン、ステージ描画、ロボット、TPSカメラ、描画ループとリサイズ
- `src/game/`: DOMに依存しない移動・衝突判定・カメラ設定
- `src/input.ts`、`src/stage.ts`: PC／タッチ入力、共通ステージ定義
- `src/ui.ts`、`src/style.css`: 状態表示とレスポンシブUI
- `tests/`: 単体テスト
- `docs/development-plan.md`: 将来の開発方針
- `AGENTS.md`: 開発ルールの正本

viewport、セーフエリア、画面リサイズ、タッチ操作を考慮しています。横画面推奨ですが縦画面でも表示できます。
iPhoneで通常移動速度6.0・タッチ視点感度0.010の操作感は確認済みです。
既存の回避距離・速度・ボタン配置・3本指操作はユーザーがiPhoneで確認済みです。
既存のスタミナ方式・ゲージはユーザーがiPhoneで基本動作を確認済みです。
今回の射撃・4本指操作はiPhone Safari・Android Chromeの実機未検証です。
TPS実装はヘッドレスEdgeでPC（1280×720）、スマートフォン相当の縦（390×844）・横（844×390）、
WASD、停止・フォーカス喪失、Pointer Lock／Esc／ドラッグ代替、壁・障害物、2本指の移動＋視点、
リサイズ、WebGL初期化失敗表示を検証しています。実機検証とは異なります。
射撃は単体テストで中央レイ、銃口遮蔽、射程、自身の除外、間隔と入力・演出を検証。
ヘッドレスEdgeで左クリック／F／タッチ、標的命中・発光、壁遮蔽、4本指、横画面の射撃ボタンとゲージの配置も確認しています。
再現用は`npm run dev -- --port 4173`起動後に`node scripts/browser-check.cjs`。
別途PlaywrightとEdgeが必要です。Playwrightを外部に置く場合は`PLAYWRIGHT_MODULE`でモジュールパスを指定します。

## GitHub Pages

公開URL: https://ak-sekine.github.io/rivet-sector/

GitHubの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。
mainへのpushで依存パッケージのインストール、テスト、ビルド、Pagesデプロイを実行します。
Viteのbaseは `/rivet-sector/` に設定しています。実行結果はActionsタブとPages設定で確認してください。
リポジトリまたは組織でActions／Pagesが制限されている場合は管理者側の許可が必要です。

## ホーム画面から起動（PWA）

iPhone:

1. Safariで https://ak-sekine.github.io/rivet-sector/ を開く。
2. 共有メニューから「ホーム画面に追加」を選ぶ。
3. 「Webアプリとして開く」が表示される場合は有効にして追加する。
4. ホーム画面のRivet Sectorアイコンから起動する。
5. 端末の画面縦向きロックを解除し、横向きでプレイする。

既存のショートカットが通常のSafariで開く場合は、ホーム画面のショートカットを削除し、
Safariで公開URLを開いて上記の手順で追加し直してください。
[Appleの現行手順](https://support.apple.com/ja-jp/guide/iphone/iphea86e5236/ios)と
[WebKitのホーム画面Webアプリ仕様](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)を参照。

Android:

1. Chromeで公開URLを開く。
2. メニューから「ホーム画面に追加」または「アプリをインストール」を選び、表示された案内に従う。
3. ホーム画面から起動し、横向きでプレイする。項目名やインストール方法はChrome・端末の仕様によって異なります。

Manifestは`display: standalone`、`orientation: landscape`、start_url／scopeは`/rivet-sector/`、
背景色／テーマ色は`#101923`です。Viteのbaseを維持し、開発時も`/rivet-sector/`で読み込みます。
iPhone用capable／title／status-bar-styleと180px Apple Touch Icon、192px／512pxのPNGを設定しています。
ステータスバーは`black-translucent`を希望設定とし、ノッチとホームインジケーターにはSafe Areaで余白を確保します。
アイコンは外部素材を使わず、`node scripts/generate-icons.ts`（Node 24推奨）でSVGとPNGを生成します。
暗い背景に青緑のRを幾何学図形で描き、Node標準機能でPNGをエンコードします。

iPhoneでは画面方向を強制できない場合があります。Manifestの方向指定は希望設定です。
ブラウザ・OS・追加方法によって表示が異なり、ステータスバーやホームインジケーターの完全非表示は保証しません。
スタンドアロン起動、Safariのタブ／アドレスバーの非表示、WebGL、Safe Area、横回転、2本指操作は実機確認が必要です。
Service Worker、オフライン機能、独自のキャッシュ制御は導入していません。起動にはネット接続が必要です。

開発者はリモートWeb Inspectorなどのコンソールで次を確認できます（画面上にデバッグ表示は出しません）。
通常ブラウザではfalse、対応環境のホーム画面起動ではtrueになることを確認します。

```js
window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
```

`npm test`はManifest、アイコンのPNG形式・寸法・展開、Vite本番出力と参照パスも検証します。
ブラウザ検証はPC／スマートフォン相当の表示・操作確認であり、iPhone Safari実機の起動成功とは別です。

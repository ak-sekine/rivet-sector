# rivet-sector
A voxel-style sci-fi third-person shooter built with Babylon.js and TypeScript.

PC・スマートフォン向けボクセル風SF TPS「Rivet Sector」。Codexを中心に開発します。
現在はTPS基本操作の試作環境です。移動、視点操作、衝突判定を実装しています。
射撃、敵AI、ステップ回避は未実装です。次はステップ回避を開発します。

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
iPhone Safari・Android Chromeの実機動作は未検証です。
TPS実装はヘッドレスEdgeでPC（1280×720）、スマートフォン相当の縦（390×844）・横（844×390）、
WASD、停止・フォーカス喪失、Pointer Lock／Esc／ドラッグ代替、壁・障害物、2本指の移動＋視点、
リサイズ、WebGL初期化失敗表示を検証しています。実機検証とは異なります。
再現用は`npm run dev -- --port 4173`起動後に`node scripts/browser-check.cjs`。
別途PlaywrightとEdgeが必要です。Playwrightを外部に置く場合は`PLAYWRIGHT_MODULE`でモジュールパスを指定します。

## GitHub Pages

公開予定: https://ak-sekine.github.io/rivet-sector/

GitHubの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。
mainへのpushで依存パッケージのインストール、テスト、ビルド、Pagesデプロイを実行します。
Viteのbaseは `/rivet-sector/` に設定しています。実行結果はActionsタブとPages設定で確認してください。
リポジトリまたは組織でActions／Pagesが制限されている場合は管理者側の許可が必要です。

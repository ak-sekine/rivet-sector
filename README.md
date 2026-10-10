# rivet-sector
A voxel-style sci-fi third-person shooter built with Babylon.js and TypeScript.

PC・スマートフォン向けボクセル風SF TPS「Rivet Sector」。Codexを中心に開発します。
現在は開発基盤と静的3Dシーンのみです。移動、射撃、敵AI、ステップ回避は未実装です。

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

テストはブラウザに依存しない描画解像度設定とNullEngineによるシーン構成を確認します。buildはTypeScript検証後にdistへ出力します。
previewは本番ビルドの確認用です。

## シーンと構成

床・壁・直方体・照明はTypeScriptから生成します。ドラッグ／1本指で回転、ホイール／ピンチでズームできます。
カメラは開発確認用で、TPSカメラではありません。WebGL初期化失敗時は画面にエラーを表示します。

- `src/main.ts`: 起動
- `src/rendering/`: エンジン、シーン、仮カメラ、描画ループとリサイズ
- `src/ui.ts`、`src/style.css`: 状態表示とレスポンシブUI
- `tests/`: 単体テスト
- `docs/development-plan.md`: 将来の開発方針
- `AGENTS.md`: 開発ルールの正本

viewport、セーフエリア、画面リサイズ、タッチ操作を考慮しています。横画面推奨ですが縦画面でも表示できます。
iPhone Safari・Android Chromeの実機動作は未検証です。
初期実装はヘッドレスEdgeでPC（1280×720）、スマートフォン相当の縦（390×844）・横（844×390）表示、
リサイズ、マウス・タッチによる視点変更、WebGL初期化失敗時の表示を検証しています。実機検証とは異なります。

## GitHub Pages

公開予定: https://ak-sekine.github.io/rivet-sector/

GitHubの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。
mainへのpushで依存パッケージのインストール、テスト、ビルド、Pagesデプロイを実行します。
Viteのbaseは `/rivet-sector/` に設定しています。実行結果はActionsタブとPages設定で確認してください。
リポジトリまたは組織でActions／Pagesが制限されている場合は管理者側の許可が必要です。

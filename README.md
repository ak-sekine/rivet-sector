# Rivet Sector

Phaser・TypeScriptで開発する、見下ろし型2Dアクションシューティングです。スマートフォンの縦画面を標準とし、HUD・ゲーム描画・操作パネルを上下に分離しています。

公開URL: https://ak-sekine.github.io/rivet-sector/

旧 `/rivet-sector/2d/` は正式URLへ転送します。

スマートフォン：左スティックで8方向移動、右スティックで360度照準と連射、中央ボタンで回避。3本指同時操作に対応。
PC：WASD移動、マウス照準、左クリック長押し射撃、Space回避、Mミュート。縦長表示を中央に配置します。

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview -- --port 4173
```

`npm run generate:2d` で既存の画像・効果音・BGMを再生成できます。Node 24推奨。
`npm run check:2d` はPlaywrightとChromiumが必要です。`PLAYWRIGHT_MODULE` と `BROWSER_EXECUTABLE` でインストール先を指定できます。

[ゲーム仕様](docs/2d-prototype.md)・[検証記録](docs/validation.md)を参照してください。開発ルールの正本は [AGENTS.md](AGENTS.md) です。
GitHub Actionsでmainのテスト・ビルド後にGitHub Pagesへ公開します。
PWAはstandalone・portrait指定。iOSでの方向固定は保証されません。オフラインキャッシュは未実装です。
iPhone Safari・Android Chrome・ホーム画面起動の実機検証は未実施です。

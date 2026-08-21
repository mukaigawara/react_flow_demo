# React Flow サンプル

[Vite](https://vite.dev/) + [React](https://react.dev/) で [React Flow](https://reactflow.dev/) のフローチャートを表示するデモです。

ページ上部のナビから、次の 2 つのデモを切り替えられます。

- **フローチャート**（`#/`）：ユーザー登録の分岐を含むサンプルフロー
- **スイムレーン**（`#/swimlane`）：フロントエンド・バックエンド・データベースの処理分担

ノードのドラッグ、ズーム、ハンドル同士の接続ができます。スイムレーンではレーン／処理／判定の追加、線のつなぎ直し、整形、削除もできます。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで表示された URL（通常は `http://localhost:5173`）を開いてください。

## ビルド

```bash
npm run build
npm run preview
```

## GitHub Pages

このリポジトリは GitHub Actions で `dist` をビルドし、[GitHub Pages](https://mukaigawara.github.io/react_flow_demo/) へ公開します。

Vite のソース（`index.html` や `.tsx`）をそのまま Pages の配信元にすると、ブラウザが TypeScript を実行できず真っ白になります。Pages の Source は **GitHub Actions** にしてください（Deploy from a branch / `main` 直下ではありません）。

1. このリポジトリの Settings → Pages を開く
2. Build and deployment の Source を **GitHub Actions** にする
3. `main` へマージすると workflow がビルドして公開する

ローカル開発時の URL は `http://localhost:5173/react_flow_demo/` です。

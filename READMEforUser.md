# ユーザー向けREADME（認証＋自分の投稿取得版）
- 開発者でなく、使う人向け

## 事前準備（X Developer Portal）
- CLIENT_ID と CLIENT_SECRET を取得
- 後で Callback URI / Redirect URL を設定（GAS デプロイ後の URL）

## スクリプトの準備
1. スプレッドシートで 機能拡張＞Apps Script を開く
2. `コード.gs` の中身を空にして、`src/code.js` の内容を貼り付け
3. 関数プルダウンで `initialize` を実行（設定用シート `XAppSetup` を作成）
4. デプロイ
   - デプロイ＞新しいデプロイ＞ウェブアプリを選択→そのままデプロイ
   - 表示にしたがってアクセスを承認
   - 表示された「ウェブアプリURL」をコピー
5. スプレッドシートの `XAppSetup` シートに以下を入力
   - `CLIENT_ID`: X Developer PortalのClient ID
   - `CLIENT_SECRET`: X Developer PortalのClient Secret
   - `REDIRECT_URI`: 手順4でコピーしたウェブアプリURL（Callback URL と同じ）
6. 関数プルダウンで `savePropertiesFromSetupSheet` を実行（必要なら `true` を渡して実行するとシートを削除）
7. X Developer Portal の Callback URL / Redirect URL にも、手順4のURLを設定

## 認証フロー
1. 関数プルダウンで `main` を実行
2. ログに URL が出るのでブラウザで開き、X アカウントで許可
3. 画面に「準備完了!!」と出れば認証完了

## 自分の投稿（ツイート）を取得
- もう一度 `main` を実行すると、ログに認証済みアカウントの直近ツイートが JSON で出力されます
- 直接呼ぶ場合は、以下の関数も利用可能
  - `xGetMyAccount()`
  - `xGetMyRecentTweets(maxResults)`

## 注意
- 本版は投稿（ツイート作成）は行いません
- 必要スコープ：`users.read tweet.read offline.access`


## 目的
認証済み（ユーザーコンテキスト）のアカウントに対して、「特定のユーザーがフォローしているか」を判定する機能をGASに実装する。

## 参照
- 仕様・背景（connection_status）: `@参考資料.md`
- アナウンス: `https://devcommunity.x.com/t/announcing-connection-status-field-in-the-user-object-in-the-x-api-v2/212588`

## 要点の再確認
- `connection_status` は Users Lookup のレスポンスに含まれる追加フィールド。
- 認可はユーザーコンテキスト（OAuth 2.0 Authorization Code + PKCE）。App-only では返らない。
- スコープは `users.read`（併記で `tweet.read`）で十分。リフレッシュ用に `offline.access` を推奨。
- 判定ルール（認証済みユーザー = 自分、対象ユーザー = 相手）
  - `following` が含まれる → 自分 → 相手 をフォロー
  - `followed_by` が含まれる → 相手 → 自分 をフォロー（本機能で判定したいのはコレ）

## 対象エンドポイント
- Users Lookup: `GET /2/users/by/username/:username?user.fields=connection_status`
  - 例: `https://api.twitter.com/2/users/by/username/{username}?user.fields=connection_status,name,username`

## スコープ/認可
- 既存のSCOPE設定: `users.read tweet.read offline.access`（現行コードの `SCOPE` はOK）
- 既存のPKCE + リフレッシュ実装（`xApiCall` 内の401→refresh動線）をそのまま活用する。

## 実装タスク
1. API関数を追加
   - `xGetUserByUsername(username)` を追加
     - URL: `/users/by/username/:username?user.fields=connection_status,name,username`
     - `xApiCall("GET", url, {}, undefined)` で呼び出し
2. 判定関数を追加
   - `checkUserFollowsMe(username)` を追加
     - `xGetUserByUsername` の結果から `data.connection_status` を取得
     - `followed_by` を含むかで true/false を返す
     - 返却形式はブールに加えて付随情報（対象ユーザー、raw配列、判定文字列）を含める
3. サンプル実行関数
   - `debugCheckFollow(username)` を追加
     - 認証未完了なら認証URLを出し、完了後に判定実行してログ出力
4. README追記
   - 使い方（関数の署名、例、注意点）を `READMEforUser.md` に追記

## 関数仕様（案）
```javascript
// 対象ユーザー情報（connection_status付き）を取得
function xGetUserByUsername(username) {
  const url = `${API_BASE_URL}/users/by/username/${encodeURIComponent(username)}?user.fields=connection_status,name,username`;
  return xApiCall('GET', url, {}, undefined);
}

// 対象ユーザーが「認証済みの自分」をフォローしているか判定
function checkUserFollowsMe(username) {
  const user = xGetUserByUsername(username);
  const status = user?.data?.connection_status || [];
  const followedBy = Array.isArray(status) && status.includes('followed_by');
  const following = Array.isArray(status) && status.includes('following');
  return {
    target: user?.data?.username || username,
    followed_by: followedBy,     // 相手 → 自分
    following: following,        // 自分 → 相手
    raw: status,
    relation: followedBy && following ? 'mutual' : (followedBy ? 'they_follow_you' : (following ? 'you_follow_them' : 'none')),
  };
}

// デバッグ用: 認証を促し、判定を出力
function debugCheckFollow(username) {
  if (!hasAccess()) {
    Logger.log('下記URLで認証してください:');
    Logger.log(getAuthorizationUrl());
    return;
  }
  const result = checkUserFollowsMe(username);
  Logger.log(JSON.stringify(result, null, 2));
}
```

## エラーハンドリング/考慮点
- 404/非公開/ブロック等のケースでは `connection_status` が空や別状態になりうるため、`raw` を返して呼び出し側で分岐可能にする。
- `xApiCall` は401でトークンリフレッシュを試行済み。その他 429/5xx はそのままJSONで返却するのでログに出して判断。
- ユーザー名の正規化（`@`の除去、大小文字）は事前に行う。

## 検証手順
1. 認証済みでない場合は `main()` を1度実行してURLから認可。
2. スクリプトエディタで `debugCheckFollow('対象のユーザー名')` を実行。
3. ログに `followed_by: true/false` と `relation` が出力されることを確認。
4. 相互/片方向/無関係のユーザーを用意してケースを網羅。

## 将来的な拡張
- 複数ユーザーのバルク判定: `/users/by?usernames=a,b,c&user.fields=connection_status` で一括取得
- WebアプリUIに入力欄を用意して判定→表示
- レート制限/失敗時の再試行・指数バックオフ



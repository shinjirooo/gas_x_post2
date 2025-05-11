# gas_x_post2
GASを使ってXへPOSTする

# 準備
## 1. プロジェクトを作成
```
mkdir myApp
cd _$
npm init -y
npm i @google/clasp 
```

## 2. ログイン
```
npx clasp login
```

## 3. アプリケーションの作成（同期）
- すでにApp Scriptを作っていたため、今回はcloneした
```
npx clasp clone ${GAS_SCRIPT_ID}
```
- 一から作るときは下記
  - スプレッドシートのIDを指定して作成する
  - `--type sheets` は、`--parentId`を指定すると無視されるので、指定しない
```
npx clasp create --parentId ${SHEET_ID}
```
### 3.1. 解説
- `.clasp.json`：claspの設定ファイル
- `appsscript.json`：App Scriptの設定ファイル

## 4. ignoreファイルの作成
- ローカルには不要なファイルをignoreするためのファイルを作成
```
touch .claspignore
```
- 実際のコードだけが対象（ignoreしないファイルを指定）
- ファイルが追加されたら随時更新する
```:.claspignore
**/**
!コード.js
!appsscript.json
```

# アップロード
```
npx clasp push
```

# テスト
- ローカルではテストできない
- テストはApp Scriptのテストツールで行う

# そのほかメモ
- ファイルは分割してもよいが、`import` `export` `require` は使えない。構文エラーになる
- フォルダ名に無関係で、ファイル名だけで昇順ソートされ、その順番で実行される
- 同じ名前の関数があると、後ろの関数で上書きされる

## IDやパスワード、SECRETなど
- GASでは、`.env`などは使えない
- 実際には、Apps Scriptの画面上で、下記などを一度実行すること
```
PropertiesService.getScriptProperties().setProperty("CLIENT_ID", "**MY_CLIENT_ID**");
```


# 参考
- GASの開発環境
  - [VSCodeを使ったGoogle Apps Script開発の環境構築](https://zenn.dev/cordelia/articles/3107aaf8b7a3d6)
    - ここでは `npm i -g @google/clasp` と書いてあるが、 `npm i @google/clasp` でインストールした
  - [claspのREADMEを日本語訳 #GAS - Qiita](https://qiita.com/kjfsm4/items/a8d59a660176deac62cb)
- Xへの投稿
  - [簡単！X(旧Twitter)に自動投稿する方法とは？｜なおき | AI×時短術](https://note.com/naoki_35/n/nd5ffa4f7e950)
  - [★GAS 画像つきポスト定期投稿 #XAPI - Qiita](https://qiita.com/sawayamakouji/items/79ecb3ab22370512fd2d)
- OAuth2.0
  - [GitHub - googleworkspace/apps-script-oauth2: An OAuth2 library for Google Apps Script.](https://github.com/googleworkspace/apps-script-oauth2)
    - Google公式のOAuth2.0のライブラリ
    - GASのライブラリ追加から `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF` を追加する
      - このIDは、上記の公式サイトに書いてある


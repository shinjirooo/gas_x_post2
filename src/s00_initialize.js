
// 初期処理
// 初めての実行時に、正しい値を入れて１回実行する
// githubには、このコードを登録しない
function initialize() {
    PropertiesService.getScriptProperties().setProperty("CLIENT_ID", "");
    PropertiesService.getScriptProperties().setProperty("CLIENT_SECRET", "");
}

// 正しく格納できているか確認
function check() {
    const client_id = PropertiesService.getScriptProperties().getProperty("CLIENT_ID");
    const client_secret = PropertiesService.getScriptProperties().getProperty("CLIENT_SECRET");
    Logger.log(client_id);
    Logger.log(client_secret);
    Logger.log(script_id);
}

// 実行時に使用する固定値
const CLIENT_ID = PropertiesService.getScriptProperties().getProperty("CLIENT_ID");
const CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty("CLIENT_SECRET");
const SHEET_NAME = 'Contents';
const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
//const REDIRECT_URI = `https://script.google.com/macros/d/${SCRIPT_ID}/usercallback`;
//const REDIRECT_URI = PropertiesService.getScriptProperties().getProperty("REDIRECT_URI");
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const API_URL = "https://api.twitter.com/2/tweets";
const SCOPE = "users.read tweet.read offline.access tweet.write";
const STATE = "1234567890";

function setRedirectUri() {
    const redirect_uri = `https://script.google.com/macros/d/${SCRIPT_ID}/usercallback`;
    PropertiesService.getScriptProperties().setProperty("REDIRECT_URI", redirect_uri);
}

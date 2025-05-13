// 固定値
const SHEET_NAME = 'Contents';
const CLIENT_ID = PropertiesService.getScriptProperties().getProperty("CLIENT_ID");
const CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty("CLIENT_SECRET");
const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const API_URL = "https://api.twitter.com/2/tweets";
const SCOPE = "users.read tweet.read offline.access tweet.write";
const STATE = "1234567890";

// 初期処理
// 初めての実行時に、正しい値を入れて１回実行する。
// githubに、ここにコードを入れて登録しないようにするため。
function initialize() {
    PropertiesService.getScriptProperties().setProperty("CLIENT_ID", "");
    PropertiesService.getScriptProperties().setProperty("CLIENT_SECRET", "");
    Logger.log("initialized");
}
function checkProperties() {
    const clientId = PropertiesService.getScriptProperties().getProperty("CLIENT_ID");
    const clientSecret = PropertiesService.getScriptProperties().getProperty("CLIENT_SECRET");
    Logger.log(clientId);
    Logger.log(clientSecret);
    
    const accessToken = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
    const refreshToken = PropertiesService.getScriptProperties().getProperty("REFRESH_TOKEN");
    Logger.log(accessToken);
    Logger.log(refreshToken);

    let verifier = PropertiesService.getScriptProperties().getProperty("VERIFIER");
    let code_challenge = PropertiesService.getScriptProperties().getProperty("CODE_CHALLENGE");
    Logger.log(verifier);
    Logger.log(code_challenge);
}

// デプロイ後に得られる、redirect_uriを設定して、この関数を１回実行する。
// デプロイしないと、リダイレクト先がわからないため。
// ここに入れた redirect_uri を、X Developer Portal の Callback URI / Redirect URL へ設定する。
// 承認するときだけでいいので、承認後にデプロイして変わったとしても、X Developer Portal の設定は変えなくていい。
function setRedirectUri() {
    const redirect_uri = "ここにredirect_uriを設定";
    PropertiesService.getScriptProperties().setProperty("REDIRECT_URI", redirect_uri);
}

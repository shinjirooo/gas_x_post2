

function getAccessToken() {
    return PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
}
function hasAccess() {
    return PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN") !== null;
}
function checkAccessToken() {
    const access_token = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
    Logger.log(access_token);
}

function getAuthorizationUrl() {
    const { code_challenge } = getPKCE();
    const redirect_uri = PropertiesService.getScriptProperties().getProperty("REDIRECT_URI");

    const params = {
        client_id: PropertiesService.getScriptProperties().getProperty("CLIENT_ID"),
        redirect_uri: encodeURIComponent(redirect_uri),
        response_type: "code",
        code_challenge_method: "S256",
        code_challenge: code_challenge,
        scope: SCOPE,
        state: STATE,
        grant_type: "authorization_code",
    };
    
    const url = AUTHORIZE_URL + "?" + Object.entries(params).map(([key, value]) => `${key}=${value}`).join("&");
    return url;
}

// "Basic クライアントID:クライアントシークレット" を生成
function getAuthorization() {
    const client_id = PropertiesService.getScriptProperties().getProperty("CLIENT_ID");
    const client_secret = PropertiesService.getScriptProperties().getProperty("CLIENT_SECRET");
    return "Basic " + Utilities.base64Encode(client_id + ":" + client_secret);
}

function getToken(code) {
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": getAuthorization(),
    }
    const params = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": PropertiesService.getScriptProperties().getProperty("REDIRECT_URI"),
        "client_id": PropertiesService.getScriptProperties().getProperty("CLIENT_ID"),
        "code_verifier": getPKCE().verifier,
    }
    const url = TOKEN_URL;
    const response = UrlFetchApp.fetch(url, {
        method: "POST",
        headers: headers,
        payload: params,
    });
    const data = JSON.parse(response.getContentText());

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); // スプレッドシートの取得
    sheet.getRange(10,2).setValue(data);

    // アクセストークンとリフレッシュトークンを保存
    PropertiesService.getScriptProperties().setProperty("ACCESS_TOKEN", data.access_token);
    PropertiesService.getScriptProperties().setProperty("REFRESH_TOKEN", data.refresh_token);
}

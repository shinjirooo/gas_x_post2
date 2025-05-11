// PKCEのverifierとcode_challengeを生成
function getPKCE() {
    const generateVerifier = () => {
        let verifier = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
        for (let i = 0; i < 128; i++) {
            verifier += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return verifier;
    }
    const generateCodeChallenge = (verifier) => {
        const sha256Hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier);
        const challenge = Utilities.base64Encode(sha256Hash)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        return challenge;
    }

    // verifierとcode_challengeを取得
    let verifier = PropertiesService.getScriptProperties().getProperty("VERIFIER");
    let code_challenge = PropertiesService.getScriptProperties().getProperty("CODE_CHALLENGE");

    // 取得できない場合は生成
    if (!verifier || !code_challenge) {
        Logger.log("verifierとcode_challengeを生成");
        verifier = generateVerifier();
        code_challenge = generateCodeChallenge(verifier);
        PropertiesService.getScriptProperties().setProperty("VERIFIER", verifier);
        PropertiesService.getScriptProperties().setProperty("CODE_CHALLENGE", code_challenge);
    }

    return { verifier, code_challenge };
}

// アクセストークンを取得
function getAccessToken() {
    return PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
}

// アクセストークンを持っているか確認
function hasAccess() {
    return PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN") !== null;
}

// アクセストークンを確認
function checkAccessToken() {
    const access_token = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
    Logger.log(access_token);
}

// 認証URLを取得
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

// アクセストークンを取得
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


// リフレッシュされたアクセストークンを取得（単純なリフレッシュトークンの取得ではない）
function getRefreshedToken() {
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": getAuthorization(),
    }
    const params = {
        "grant_type": "refresh_token",
        "refresh_token": PropertiesService.getScriptProperties().getProperty("REFRESH_TOKEN"),
        "code_verifier": getPKCE().verifier,
    }
    const response = UrlFetchApp.fetch(
        TOKEN_URL,
        {
            method: "POST",
            headers: headers,
            payload: params,
        }
    );
    const data = JSON.parse(response.getContentText());

    // 取得したアクセストークンとリフレッシュトークンを保存
    PropertiesService.getScriptProperties().setProperty("ACCESS_TOKEN", data.access_token);
    PropertiesService.getScriptProperties().setProperty("REFRESH_TOKEN", data.refresh_token);

    return data.access_token;
}


// Callbackされたときに実行する関数
function doGet(e) {
    // codeを使って、tokenを取得し、保存
    const code = e.parameter.code;
    if (!code) {
        return HtmlService.createHtmlOutput("認証コードがありません");
    }
    getToken(code);
    return HtmlService.createHtmlOutput('準備完了!!');
}


// Xへの処理処理に認証情報の取得処理をラップする関数
function xApiCall(method, url, headers, payload) {
    // まずはアクセストークンを使ってAPIを呼び出す
    const authorizedHeaders = {
        ...headers,
        "Authorization": "Bearer " + getAccessToken(),
    };
    const response = UrlFetchApp.fetch(
        url,
        {
            method,
            contentType: 'application/json',
            headers: authorizedHeaders,
            payload: JSON.stringify(payload),
        }
    );
    const result = JSON.parse(response.getContentText());
    Logger.log(1);
    Logger.log(result);

    // エラーがない場合はここで正常終了
    if (!result.errors) {
        return result;
    }
    
    // エラーコードが89の場合は、expiredなので、リフレッシュトークンを使って新しいトークンを取得する
    if ((result.errors) && (result.errors[0].code === 89)) {
        Logger.log(2);
        const refreshedAuthorizedHeaders = {
            ...headers,
            "Authorization": "Bearer " + getRefreshedToken(),
        };
        const response = UrlFetchApp.fetch(
            url,
            {
                method,
                contentType: 'application/json',
                headers: refreshedAuthorizedHeaders,
                payload: JSON.stringify(payload),
            }
        );
        const result = JSON.parse(response.getContentText());
        Logger.log(3);
        Logger.log(result);
        return result;
    }

    // エラーがない場合はここで正常終了
    if (!result.errors) {
        Logger.log(4);
        return result;
    }

    // 何かのエラー
    Logger.log(9);
    return result;
}

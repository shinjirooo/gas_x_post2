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
// リフレッシュトークンを取得
function getRefreshToken() {
    return PropertiesService.getScriptProperties().getProperty("REFRESH_TOKEN");
}


// アクセストークンを持っているか確認
function hasAccess() {
    return PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN") !== null;
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
function getBasicAuthorization() {
    const client_id = PropertiesService.getScriptProperties().getProperty("CLIENT_ID");
    const client_secret = PropertiesService.getScriptProperties().getProperty("CLIENT_SECRET");
    return "Basic " + Utilities.base64Encode(client_id + ":" + client_secret);
}


// アクセストークンを取得
function getToken(code) {
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": getBasicAuthorization(),
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
        "Authorization": getBasicAuthorization(),
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


// httpステータスコードで成功かどうかの判定(200番台かどうか)
function isSuccess(responseCode) {
    return responseCode >= 200 && responseCode < 300;
}


// Xへの処理処理に認証情報の取得処理をラップする関数
function xApiCall(method, url, headers, payload) {
    // アクセストークンを使ってAPIを呼び出す
    function callXApi(method, url, headers, payload) {
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
                muteHttpExceptions: true,
            },
        );
        const result = JSON.parse(response.getContentText());
        const responseCode = response.getResponseCode();
        return { result, responseCode };
    }
    // リフレッシュトークンを使って新しいトークンを取得
    function refreshToken() {
        const refreshedAuthorizedHeaders = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": getBasicAuthorization(),
        };
        const getRefresTokenPayload = {
            grant_type: "refresh_token",
            refresh_token: getRefreshToken(),
            code_verifier: getPKCE().verifier,
        };
        const response = UrlFetchApp.fetch(
            TOKEN_URL,
            {
                method: "POST",
                contentType: 'application/json',
                headers: refreshedAuthorizedHeaders,
                payload: JSON.stringify(getRefresTokenPayload),
                muteHttpExceptions: true,
            }
        );
        const result = JSON.parse(response.getContentText());
        const responseCode = response.getResponseCode();
        return { result, responseCode };
    }

    // まずは、今のアクセストークンを使ってAPIを呼び出す
    Logger.log("[I] Calling the API...");
    const { result, responseCode } = callXApi(method, url, headers, payload);
    
    // JavaScriptのfetchでは、errorが含まれないので、404エラーの場合は、expiredと判断する
    let isExpired = false;
    if (isSuccess(responseCode)) {
        Logger.log("[I] Successfully called the API!");
        // エラーがない場合はここで正常終了
        return result;
    } else if (responseCode === 401) {  // 401: Unauthorized
        // 401エラーの場合は、expiredと判断する
        Logger.log("[W] The access_token is expired...");
        isExpired = true;
    } else {
        // それ以外のエラーは、そのまま返す
        Logger.log(`[E] First API call failed: ${responseCode}`);
        Logger.log(result);
        return result;
    }
    // 401エラーの場合だけ、続く
    
    // エラーコードが89の場合は、expiredなので、リフレッシュトークンを使って新しいトークンを取得
    if (isExpired) {
        Logger.log("[I] Refreshing the access_token...");
        // リフレッシュトークンを使って新しいトークンを取得
        const { result: resultRefreshedToken, responseCode: responseCodeRefreshedToken } = refreshToken();
        Logger.log(resultRefreshedToken);
        if (responseCodeRefreshedToken !== 200) {
            Logger.log(`[E] Failed to refresh token...: ${responseCodeRefreshedToken}`);
            Logger.log(resultRefreshedToken);
            return result;
        }
        Logger.log("[I] Successfully refreshed the access_token!");
        // 取得したアクセストークンとリフレッシュトークンを保存
        PropertiesService.getScriptProperties().setProperty("ACCESS_TOKEN", resultRefreshedToken.access_token);
        PropertiesService.getScriptProperties().setProperty("REFRESH_TOKEN", resultRefreshedToken.refresh_token);
    }

    // 再び、アクセストークンを使って新しいトークンを取得して、再度APIを呼び出す
    Logger.log("[I] Calling the API again...");
    const { result: resultXApiCall2, responseCode: responseCode2 } = callXApi(method, url, headers, payload);

    // 成功時はここで正常終了
    if (isSuccess(responseCode2)) {
        Logger.log("[I] Success using the refreshed token!"); // リフレッシュ後のトークンを使って成功
        return resultXApiCall2;
    }

    // 何かのエラー
    Logger.log(`[E] Failed to call the API...: ${responseCode2}`);
    Logger.log(resultXApiCall2);
    return result;
}

// 初期設定手順（認証＋取得版）
// 1. createSetupSheet() を実行（設定入力用シートを作成）
// 2. シートに CLIENT_ID / CLIENT_SECRET / REDIRECT_URI を入力
// 3. savePropertiesFromSetupSheet() を実行（プロパティへ保存、シートは任意で削除）
// 4. ウェブアプリとしてデプロイ（URLをX Developer PortalのCallbackに設定）
// 5. main() を実行 → URLで認証 → 再度 main() でツイート取得



// 設定
const SETUP_SHEET_NAME = "XAppSetup";


// 固定値
const DEBUG = true;
const CLIENT_ID = PropertiesService.getScriptProperties().getProperty("CLIENT_ID");
const CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty("CLIENT_SECRET");
const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const API_URL = "https://api.twitter.com/2/tweets";
const API_BASE_URL = "https://api.twitter.com/2";
const SCOPE = "users.read%20tweet.read%20offline.access";
const STATE = "1234567890";

// 初期処理
// 初めての実行時に、正しい値を入れて１回実行する。
// githubに、ここにコードを入れて登録しないようにするため。
function initialize() {
    Logger.log("initialize(): create setup sheet");
    createSetupSheet();
}

// 設定入力用のシートを作成
function createSetupSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SETUP_SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(SETUP_SHEET_NAME);
    }
    sheet.clear();
    sheet.getRange(1, 1, 1, 3).setValues([["Key", "Value", "Note"]]);
    const rows = [
        ["CLIENT_ID", "", "X Developer PortalのClient IDを入力"],
        ["CLIENT_SECRET", "", "X Developer PortalのClient Secretを入力"],
        ["REDIRECT_URI", "", "GASデプロイURLを入力（Callback URLと同じ）"],
    ];
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
    sheet.setColumnWidths(1, 3, 240);
    Logger.log(`[I] 設定シート '${SETUP_SHEET_NAME}' を用意しました。必要項目を入力してください。`);
}

// 設定シートの値をスクリプトプロパティへ保存（保存後にシート削除するかは引数で制御）
function savePropertiesFromSetupSheet(deleteSheetAfter) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SETUP_SHEET_NAME);
    if (!sheet) {
        Logger.log(`[E] 設定シート '${SETUP_SHEET_NAME}' が見つかりません。createSetupSheet() を実行してください。`);
        return;
    }
    const values = sheet.getDataRange().getValues();
    const props = PropertiesService.getScriptProperties();
    let savedCount = 0;
    for (let i = 1; i < values.length; i++) {
        const [key, value] = values[i];
        if (key && value) {
            props.setProperty(String(key), String(value));
            savedCount++;
        }
    }
    Logger.log(`[I] ${savedCount} 件の設定を保存しました。`);
    if (deleteSheetAfter === true) {
        ss.deleteSheet(sheet);
        Logger.log(`[I] 設定シート '${SETUP_SHEET_NAME}' を削除しました。`);
    }
}
function checkProperties() {
    Logger.log("checkProperties()");

    const clientId = PropertiesService.getScriptProperties().getProperty("CLIENT_ID");
    const clientSecret = PropertiesService.getScriptProperties().getProperty("CLIENT_SECRET");
    Logger.log(clientId);
    Logger.log(clientSecret);
    
    const accessToken = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
    const refreshToken = PropertiesService.getScriptProperties().getProperty("REFRESH_TOKEN");
    Logger.log(accessToken);
    Logger.log(refreshToken);

    const verifier = PropertiesService.getScriptProperties().getProperty("VERIFIER");
    const code_challenge = PropertiesService.getScriptProperties().getProperty("CODE_CHALLENGE");
    Logger.log(verifier);
    Logger.log(code_challenge);

    const redirectUri = PropertiesService.getScriptProperties().getProperty("REDIRECT_URI");
    Logger.log(redirectUri);
}

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
    if (DEBUG) {
        Logger.log("getAuthorizationUrl()");
    }

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
    if (DEBUG) {
        Logger.log("Authorization URL params: " + JSON.stringify(params));
    }
    
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
    if (DEBUG) {
        Logger.log("xApiCall()");
    }

    // アクセストークンを使ってAPIを呼び出す
    function callXApi(method, url, headers, payload) {
        if (DEBUG) {
            Logger.log("callXApi()");
        }
        const authorizedHeaders = {
            ...headers,
            "Authorization": "Bearer " + getAccessToken(),
        };
        const options = {
            method,
            headers: authorizedHeaders,
            muteHttpExceptions: true,
        };
        if (method !== 'GET' && payload !== undefined) {
            options.contentType = 'application/json';
            options.payload = JSON.stringify(payload);
        }
        const response = UrlFetchApp.fetch(url, options);
        const result = JSON.parse(response.getContentText());
        const responseCode = response.getResponseCode();
        return { result, responseCode };
    }
    // リフレッシュトークンを使って新しいトークンを取得
    function refreshToken() {
        if (DEBUG) {
            Logger.log("refreshToken()");
        }
        const refreshedAuthorizedHeaders = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": getBasicAuthorization(),
        };
        const getRefresTokenPayload = {
            grant_type: "refresh_token",
            refresh_token: getRefreshToken(),
            code_verifier: getPKCE().verifier,
        };
        const response = UrlFetchApp.fetch(TOKEN_URL, {
            method: "POST",
            headers: refreshedAuthorizedHeaders,
            payload: getRefresTokenPayload,
            muteHttpExceptions: true,
        });
        const result = JSON.parse(response.getContentText());
        const responseCode = response.getResponseCode();
        return { result, responseCode };
    }

    // まずは、今のアクセストークンを使ってAPIを呼び出す
    Logger.log("[I] Calling the API...");
    const { result, responseCode } = callXApi(method, url, headers, payload);
    
    // JavaScriptのfetchでは、errorが含まれないので、401エラーの場合は、expiredと判断する
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
    if (DEBUG) {
        Logger.log("401 Error Occured.");
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

// 認証済みアカウント情報を取得
function xGetMyAccount() {
    const url = `${API_BASE_URL}/users/me?user.fields=id,name,username`; 
    return xApiCall("GET", url, {}, undefined);
}

// 認証済みアカウントの最新ツイートを取得
function xGetMyRecentTweets(maxResults) {
    const me = xGetMyAccount();
    if (!me || !me.data || !me.data.id) {
        Logger.log('[E] Failed to get my account info');
        return me;
    }
    const userId = me.data.id;
    const url = `${API_BASE_URL}/users/${userId}/tweets?max_results=${maxResults || 10}&tweet.fields=created_at,public_metrics`;
    return xApiCall("GET", url, {}, undefined);
}


function main() {
    if (DEBUG) {
        Logger.log("main()");
        checkProperties();
    }

    if (!hasAccess()) {
        const url = getAuthorizationUrl();
        Logger.log("下記のURLをブラウザで開いて、認証を完了してください。");
        Logger.log(url);
        return;
    }

    const tweets = xGetMyRecentTweets(10);
    Logger.log('[I] My recent tweets:');
    Logger.log(JSON.stringify(tweets, null, 2));
}

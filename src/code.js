// 初期設定手順
// 1. 設定のREDIRECT_URI"以外"を入力する
// 2. initialize()を実行する
// 3. ウェブアプリとしてデプロイする（ウェブアプリURLを取得する）
// 4. 設定のREDIRECT_URIへ、ウェブアプリURLを設定して、もう一度initialize()を実行する
// 5. X Developer Portalで、Callback URI / Redirect URLに、ウェブアプリURLを設定する
// 6. main()を実行する
//      - "下記のURLをブラウザで開いて、認証コードを取得してください。"の下に出るURLをブラウザで開いて、許可する



// 設定
const SHEET_NAME = "Contents";
const INITIAL_CLIENT_ID = "";
const INITIAL_CLIENT_SECRET = "";
const REDIRECT_URI = "";    // デプロイ後に得られる、ウェブアプリURLを設定して、initialize()を実行する


// 固定値
const DEBUG = true;
const CLIENT_ID = PropertiesService.getScriptProperties().getProperty("CLIENT_ID");
const CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty("CLIENT_SECRET");
const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const API_URL = "https://api.twitter.com/2/tweets";
const SCOPE = "users.read%20tweet.read%20offline.access%20tweet.write";
const STATE = "1234567890";

// 初期処理
// 初めての実行時に、正しい値を入れて１回実行する。
// githubに、ここにコードを入れて登録しないようにするため。
function initialize() {
    Logger.log("initialize()");

    PropertiesService.getScriptProperties().setProperty("CLIENT_ID", INITIAL_CLIENT_ID);
    PropertiesService.getScriptProperties().setProperty("CLIENT_SECRET", INITIAL_CLIENT_SECRET);
    PropertiesService.getScriptProperties().setProperty("REDIRECT_URI", REDIRECT_URI);
    Logger.log("initialized");
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

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); // スプレッドシートの取得
    //sheet.getRange(10,2).setValue(data);

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

// X API: Public Metricsを取得
function xGetPublicMetrics() {
    xApiCall(
        "GET",
        `${API_URL}/1866319451081306620/?tweet.fields=public_metrics`,
        {},
        {}
    );
}

// X API: ツイートを投稿
function xPostSomething(postMessage) {
    xApiCall(
        "POST",
        `${API_URL}`,
        {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        {
            "text": postMessage
        }
    );
}


// メイン関数
// postしたときはtrue、しないときはfalseを返す
function postTweet(postMessage) {
    if (DEBUG) {
        Logger.log("postTweet()");
    }

    if (hasAccess()) {
        if (DEBUG) {
            Logger.log("hasAccess: true");
        }

        // メッセージを投稿
        xPostSomething(postMessage);

    } else {
        if (DEBUG) {
            Logger.log("hasAccess: false");
        }

        // アクセストークンを持っていない場合は、URLを発行
        const url = getAuthorizationUrl();
        Logger.log("下記のURLをブラウザで開いて、認証コードを取得してください。");
        Logger.log(url);
        return false;
    }

    if (DEBUG) {
        Logger.log("postTweet(): retrun true");
    }
    return true;
}


// スプレッドシートからポストするメッセージを取得
function getPostMessage() {
    if (DEBUG) {
        Logger.log("getPostMessage()");
    }

    // 現在の日時を取得
    const now = new Date();
    if (DEBUG) {
        Logger.log("now: " + now);
    }

    // シートの情報を取得
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); // スプレッドシートの取得
    const rows = sheet.getDataRange().getValues(); // 全行のデータを取得
    if (DEBUG) {
        Logger.log("rows.length: " + rows.length);
    }

    // POSTする行を探す(データが始まるi=1から)
    for (let i=1; i<rows.length; i++) {
        const [_dt, _tm, dateTime, content, isPosted] = rows[i];
        if (DEBUG) {
            Logger.log("i: " + i);
            Logger.log("dateTime: " + dateTime);
            Logger.log("isPosted: " + isPosted);
        }
        // Date/Timeが"今"より過去で、Status列がPOSTEDでない行を探す
        if ((dateTime < now) && (isPosted !== 'POSTED')) {
            Logger.log(`[I] Found the line: ${i+1}`);
            // 見つけたら、行番号とメッセージを返して終了
            return { line: i+1, message: content };
        }
    }

    // 見つからなかったらundefinedを返す
    if (DEBUG) {
        Logger.log("[W] Not found");
    }
    return { line: undefined, message: undefined };
}

function updatePostedMark(line) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); // スプレッドシートの取得
    sheet.getRange(line, 5).setValue('POSTED');
}


function main() {
    if (DEBUG) {
        Logger.log("main()");
        checkProperties();
        Logger.log("SHEET_NAME: " + SHEET_NAME);
    }

    // メッセージを取得
    const { line, message } = getPostMessage();
    if (DEBUG) {
        Logger.log("line: " + line);
        Logger.log("message: \"" + message + "\"");
    }

    if (message) {
        // メッセージを投稿
        const isPosted = postTweet(message);
        if (!isPosted) {
            Logger.log('[E] Failed to post');
            return;
        }

        // 行を更新
        updatePostedMark(line);

        Logger.log(`[I] Posted: ${message}`);
    } else {
        Logger.log('[E] No message');
    }
}

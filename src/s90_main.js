
// Authorize
function authorize() {
    const { code_challenge } = getPKCE();

    
}


function testCalled() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); // スプレッドシートの取得
    sheet.getRange(10,1).setValue(new Date());
}


// Callbackされたときに実行する関数
function authCallback(request) {
    testCalled();

    //const { code } = request.parameter;
    //Logger.log(code);
    // リクエストパラメータに含まれているcodeを保存
    //// リクエストパラメータに含まれているcodeを保存
    //PropertiesService.getScriptProperties().setProperty("AUTH_CODE", code);

    const service = getService_();
    const isAuthrized = service.handleCallback(request);
    if (isAuthrized) {
        return HtmlService.createHtmlOutput('Success! You can close this tab.');
        //const accessToken = service.getAccessToken();
        //Logger.log(accessToken);
    } else {
        return HtmlService.createHtmlOutput('Denied. You can close this tab');
    }
}


function getToken() {
    const { code_challenge } = getPKCE();

}


function postTweet() {
    const service = getService_();
    if (service.hasAccess()) {
        const response = UrlFetchApp.fetch(
            `${API_URL}/1866319451081306620/?tweet.fields=public_metrics`,
            {
                method: "GET",
                contentType: "application/json",
                headers: {
                    "Authorization": "Bearer " + service.getAccessToken(),
                },
            }
        );
        console.log(response);
        Logger.log(response.getContentText());

    } else {
        // アクセストークンを持っていない場合は、URLを発行
        const url = service.getAuthorizationUrl();
        Logger.log(url);
    }
}

function reset() {
    getService_().reset();
}

function main() {
    postTweet();
}
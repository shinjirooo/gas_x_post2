
// Authorize
function authorize() {
    const { code_challenge } = getPKCE();

    
}


function testCalled() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); // スプレッドシートの取得
    sheet.getRange(10,1).setValue(new Date());
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




function postTweet() {
    if (hasAccess()) {
        const response = UrlFetchApp.fetch(
            `${API_URL}/1866319451081306620/?tweet.fields=public_metrics`,
            {
                method: "GET",
                contentType: "application/json",
                headers: {
                    "Authorization": "Bearer " + getAccessToken(),
                },
            }
        );
        console.log(response);
        Logger.log(response.getContentText());

    } else {
        // アクセストークンを持っていない場合は、URLを発行
        const url = getAuthorizationUrl();
        Logger.log(url);
    }
}

function reset() {
    getService_().reset();
}

function main() {
    postTweet();
}

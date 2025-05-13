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
function postTweet(postMessage) {
    if (hasAccess()) {
        //xGetPublicMetrics();
        xPostSomething(postMessage);

    } else {
        // アクセストークンを持っていない場合は、URLを発行
        const url = getAuthorizationUrl();
        Logger.log("下記のURLをブラウザで開いて、認証コードを取得してください。");
        Logger.log(url);
    }
}


// スプレッドシートからポストするメッセージを取得
function getPostMessage() {
    // 現在の日時を取得
    const now = new Date();

    // シートの情報を取得
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); // スプレッドシートの取得
    const rows = sheet.getDataRange().getValues(); // 全行のデータを取得

    // POSTする行を探す(データが始まるi=1から)
    for (let i=1; i<rows.length; i++) {
        const [_dt, _tm, dateTime, content, isPosted] = rows[i];
        // Date/Timeを"今"を過ぎていて、Status列がPOSTEDでない行を探す
        if ((isPosted !== 'POSTED') && (dateTime < now)) {
            Logger.log(`[I] Found the line: ${i+1}`);
            // 見つけたら返して終了
            return content;
        }

        // 行を更新
        sheet.getRange(i + 1, 5).setValue('POSTED');
    }

    // 見つからなかったらundefinedを返す
    return undefined;
}


function main() {
    const message = getPostMessage();
    
    if (message) {
        postTweet(message);
        Logger.log(`[I] Posted: ${message}`);
    } else {
        Logger.log('[E] No message');
    }
}

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
function xPostSomething() {
    xApiCall(
        "POST",
        `${API_URL}`,
        {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        {
            "text": "今日は暑かった..."
        }
    );
}


// メイン関数
function postTweet() {
    if (hasAccess()) {
        //xGetPublicMetrics();
        xPostSomething();

    } else {
        // アクセストークンを持っていない場合は、URLを発行
        const url = getAuthorizationUrl();
        Logger.log(url);
    }
}

function main() {
    postTweet();
}




function xGetPublicMetrics() {
    xApiCall(
        "GET",
        `${API_URL}/1866319451081306620/?tweet.fields=public_metrics`,
        {},
        {}
    );
}

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

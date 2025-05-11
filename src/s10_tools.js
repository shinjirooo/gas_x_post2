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
function checkPKCE() {
    let verifier = PropertiesService.getScriptProperties().getProperty("VERIFIER");
    let code_challenge = PropertiesService.getScriptProperties().getProperty("CODE_CHALLENGE");
    Logger.log(verifier);
    Logger.log(code_challenge);
}



// OAuth2.0サービスを取得
function getService_() {
    //const { code_verifier, code_challenge } = getPKCE();

    return OAuth2.createService("Twitter")
        // Set the endpoint URLs.
        .setAuthorizationBaseUrl(AUTHORIZE_URL)
        .setTokenUrl(`${TOKEN_URL}?code_verifier=${code_verifier}`)

        // Set the client ID and secret, from the X Console.
        .setClientId(CLIENT_ID)
        .setClientSecret(CLIENT_SECRET)

        // Set the name of the callback function in the script referenced
        // above that should be invoked to complete the OAuth flow.
        .setCallbackFunction("authCallback")

        // Set the property store where authorized tokens should be persisted.
        .setPropertyStore(PropertiesService.getScriptProperties())

        // Set the scopes to request (space-separated for Google services).
        .setScope(SCOPE)

        // Below are X OAuth2 parameters.
        //.setParam("response_type", "code")
        //.setParam("code_challenge_method", "S256")
        //.setParam("code_challenge", code_challenge)
        //.setParam("state", STATE)
        .generateCodeVerifier()
        .setTokenHeaders({
            "Authorization": "Basic " + Utilities.base64Encode(CLIENT_ID + ":" + CLIENT_SECRET),
            "Content-Type": "application/x-www-form-urlencoded",
        })
        .setParam("grant_type", "authorization_code")
    ;

}

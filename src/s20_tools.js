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


function getService() {
    
}

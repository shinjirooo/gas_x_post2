// GX.Auth: X(OAuth2 PKCE) 認証 + トークン更新 + API呼び出しラッパ
// グローバル公開は GX.Auth のみ。内部実装は IIFE で閉じる。

this.GX = this.GX || {};

this.GX.Auth = (function () {
  var DEBUG = false;

  // 固定URL・スコープ
  var AUTHORIZE_URL = 'https://twitter.com/i/oauth2/authorize';
  var TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
  var REVOKE_URL = 'https://api.twitter.com/2/oauth2/revoke';
  var API_BASE_URL = 'https://api.twitter.com/2';
  var SCOPE = 'users.read%20tweet.read%20offline.access';
  var STATE = 'gx_default_state';

  // 既存キーとの互換を保ちながら、新キーに移行
  var KEYS = {
    CLIENT_ID: ['GX_AUTH_CLIENT_ID', 'CLIENT_ID'],
    CLIENT_SECRET: ['GX_AUTH_CLIENT_SECRET', 'CLIENT_SECRET'],
    REDIRECT_URI: ['GX_AUTH_REDIRECT_URI', 'REDIRECT_URI'],
    ACCESS_TOKEN: ['GX_AUTH_ACCESS_TOKEN', 'ACCESS_TOKEN'],
    REFRESH_TOKEN: ['GX_AUTH_REFRESH_TOKEN', 'REFRESH_TOKEN'],
    VERIFIER: ['GX_AUTH_VERIFIER', 'VERIFIER'],
    CODE_CHALLENGE: ['GX_AUTH_CODE_CHALLENGE', 'CODE_CHALLENGE']
  };

  function log() {
    if (DEBUG) {
      var args = Array.prototype.slice.call(arguments);
      Logger.log.apply(Logger, args);
    }
  }

  function getPropAny(prefFirst) {
    var props = PropertiesService.getScriptProperties();
    for (var i = 0; i < prefFirst.length; i++) {
      var v = props.getProperty(prefFirst[i]);
      if (v !== null && v !== undefined && v !== '') return v;
    }
    return null;
  }

  function setPropBoth(prefFirst, value) {
    var props = PropertiesService.getScriptProperties();
    for (var i = 0; i < prefFirst.length; i++) {
      props.setProperty(prefFirst[i], String(value));
    }
  }

  function deletePropBoth(prefFirst) {
    var props = PropertiesService.getScriptProperties();
    for (var i = 0; i < prefFirst.length; i++) {
      props.deleteProperty(prefFirst[i]);
    }
  }

  function isSuccess(responseCode) {
    return responseCode >= 200 && responseCode < 300;
  }

  // PKCE
  function generateVerifier() {
    var verifier = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    for (var i = 0; i < 128; i++) {
      verifier += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return verifier;
  }

  function generateCodeChallenge(verifier) {
    var sha256Hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier);
    var challenge = Utilities.base64Encode(sha256Hash).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return challenge;
  }

  function getPKCE() {
    var verifier = getPropAny(KEYS.VERIFIER);
    var codeChallenge = getPropAny(KEYS.CODE_CHALLENGE);
    if (!verifier || !codeChallenge) {
      log('[GX.Auth] Generating PKCE');
      verifier = generateVerifier();
      codeChallenge = generateCodeChallenge(verifier);
      setPropBoth(KEYS.VERIFIER, verifier);
      setPropBoth(KEYS.CODE_CHALLENGE, codeChallenge);
    }
    return { verifier: verifier, code_challenge: codeChallenge };
  }

  function getBasicAuthorization() {
    var clientId = getPropAny(KEYS.CLIENT_ID) || '';
    var clientSecret = getPropAny(KEYS.CLIENT_SECRET) || '';
    return 'Basic ' + Utilities.base64Encode(clientId + ':' + clientSecret);
  }

  function getAuthorizationUrl() {
    log('[GX.Auth] getAuthorizationUrl');
    var pkce = getPKCE();
    var redirectUri = getPropAny(KEYS.REDIRECT_URI) || '';
    var params = {
      client_id: getPropAny(KEYS.CLIENT_ID) || '',
      redirect_uri: encodeURIComponent(redirectUri),
      response_type: 'code',
      code_challenge_method: 'S256',
      code_challenge: pkce.code_challenge,
      scope: SCOPE,
      state: STATE,
      grant_type: 'authorization_code'
    };
    var url = AUTHORIZE_URL + '?' + Object.keys(params).map(function (k) { return k + '=' + params[k]; }).join('&');
    return url;
  }

  function exchangeCodeForToken(code) {
    log('[GX.Auth] exchangeCodeForToken');
    var headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': getBasicAuthorization() };
    var params = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: getPropAny(KEYS.REDIRECT_URI) || '',
      client_id: getPropAny(KEYS.CLIENT_ID) || '',
      code_verifier: getPKCE().verifier
    };
    var response = UrlFetchApp.fetch(TOKEN_URL, { method: 'POST', headers: headers, payload: params });
    var data = JSON.parse(response.getContentText());
    if (data && data.access_token) setPropBoth(KEYS.ACCESS_TOKEN, data.access_token);
    if (data && data.refresh_token) setPropBoth(KEYS.REFRESH_TOKEN, data.refresh_token);
    return data;
  }

  function refreshAccessToken() {
    log('[GX.Auth] refreshAccessToken');
    var headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': getBasicAuthorization() };
    var params = {
      grant_type: 'refresh_token',
      refresh_token: getPropAny(KEYS.REFRESH_TOKEN) || '',
      code_verifier: getPKCE().verifier
    };
    var response = UrlFetchApp.fetch(TOKEN_URL, { method: 'POST', headers: headers, payload: params, muteHttpExceptions: true });
    var data = JSON.parse(response.getContentText());
    var responseCode = response.getResponseCode();
    if (responseCode === 200 && data) {
      if (data.access_token) setPropBoth(KEYS.ACCESS_TOKEN, data.access_token);
      if (data.refresh_token) setPropBoth(KEYS.REFRESH_TOKEN, data.refresh_token);
    }
    return { data: data, responseCode: responseCode };
  }

  function revoke() {
    log('[GX.Auth] revoke');
    var access = getPropAny(KEYS.ACCESS_TOKEN);
    var refresh = getPropAny(KEYS.REFRESH_TOKEN);
    var headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': getBasicAuthorization() };
    try {
      if (access) {
        UrlFetchApp.fetch(REVOKE_URL, { method: 'POST', headers: headers, payload: { token: access, token_type_hint: 'access_token' }, muteHttpExceptions: true });
      }
    } catch (e1) {}
    try {
      if (refresh) {
        UrlFetchApp.fetch(REVOKE_URL, { method: 'POST', headers: headers, payload: { token: refresh, token_type_hint: 'refresh_token' }, muteHttpExceptions: true });
      }
    } catch (e2) {}
    deletePropBoth(KEYS.ACCESS_TOKEN);
    deletePropBoth(KEYS.REFRESH_TOKEN);
    deletePropBoth(KEYS.VERIFIER);
    deletePropBoth(KEYS.CODE_CHALLENGE);
    return true;
  }

  function call(method, url, headers, payload) {
    log('[GX.Auth] call', method, url);

    function doCall() {
      var authorizedHeaders = Object.assign({}, headers || {}, { 'Authorization': 'Bearer ' + (getPropAny(KEYS.ACCESS_TOKEN) || '') });
      var options = { method: method, headers: authorizedHeaders, muteHttpExceptions: true };
      if (method !== 'GET' && typeof payload !== 'undefined') {
        options.contentType = 'application/json';
        options.payload = JSON.stringify(payload);
      }
      var response = UrlFetchApp.fetch(url, options);
      var result = {};
      var text = response.getContentText();
      try { result = JSON.parse(text); } catch (e) { result = { raw: text }; }
      var responseCode = response.getResponseCode();
      return { result: result, responseCode: responseCode };
    }

    var first = doCall();
    if (isSuccess(first.responseCode)) {
      return first.result;
    }

    if (first.responseCode === 401) {
      log('[GX.Auth] 401 detected. refreshing...');
      var ref = refreshAccessToken();
      if (ref.responseCode !== 200) {
        log('[GX.Auth] refresh failed', ref.responseCode, ref.data);
        return first.result;
      }
      var second = doCall();
      if (isSuccess(second.responseCode)) return second.result;
      log('[GX.Auth] call failed after refresh', second.responseCode, second.result);
      return second.result;
    }

    log('[GX.Auth] call failed', first.responseCode, first.result);
    return first.result;
  }

  function hasAccess() {
    return !!(getPropAny(KEYS.ACCESS_TOKEN));
  }

  function handleOAuthCallback(e) {
    var code = e && e.parameter ? e.parameter.code : null;
    if (!code) {
      return HtmlService.createHtmlOutput('認証コードがありません');
    }
    try {
      var data = exchangeCodeForToken(code);
      if (!data || !data.access_token) {
        return HtmlService.createHtmlOutput('トークンの取得に失敗しました');
      }
      return HtmlService.createHtmlOutput('準備完了!!');
    } catch (err) {
      return HtmlService.createHtmlOutput('エラー: ' + String(err));
    }
  }

  function setDebug(enabled) {
    DEBUG = !!enabled;
  }

  // 任意: 旧キー -> 新キーへコピーする簡易移行関数
  function migrateProperties() {
    var p = PropertiesService.getScriptProperties();
    var map = {
      CLIENT_ID: 'GX_AUTH_CLIENT_ID',
      CLIENT_SECRET: 'GX_AUTH_CLIENT_SECRET',
      REDIRECT_URI: 'GX_AUTH_REDIRECT_URI',
      ACCESS_TOKEN: 'GX_AUTH_ACCESS_TOKEN',
      REFRESH_TOKEN: 'GX_AUTH_REFRESH_TOKEN',
      VERIFIER: 'GX_AUTH_VERIFIER',
      CODE_CHALLENGE: 'GX_AUTH_CODE_CHALLENGE'
    };
    for (var k in map) {
      if (map.hasOwnProperty(k)) {
        var v = p.getProperty(k);
        if (v) p.setProperty(map[k], v);
      }
    }
  }

  return {
    call: call,
    getAuthorizationUrl: getAuthorizationUrl,
    hasAccess: hasAccess,
    handleOAuthCallback: handleOAuthCallback,
    setDebug: setDebug,
    migrateProperties: migrateProperties,
    revoke: revoke,
    // 参照用
    API_BASE_URL: API_BASE_URL
  };
})();



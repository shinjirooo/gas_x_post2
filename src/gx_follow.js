// GX.Follow: ユーザー取得 + フォロー関係判定
// 依存: GX.Auth.call

this.GX = this.GX || {};

this.GX.Follow = (function () {
  var API_BASE_URL = (this.GX && this.GX.Auth && this.GX.Auth.API_BASE_URL) || 'https://api.twitter.com/2';

  function normalize(name) {
    return String(name || '').trim().replace(/^@/, '');
  }

  function getUserByUsername(username) {
    var u = normalize(username);
    var url = API_BASE_URL + '/users/by/username/' + encodeURIComponent(u) + '?user.fields=connection_status,name,username';
    return GX.Auth.call('GET', url, {}, undefined);
  }

  function checkUserFollowsMe(username) {
    var user = getUserByUsername(username);
    var status = (user && user.data && user.data.connection_status) ? user.data.connection_status : [];
    var followedBy = Array.isArray(status) && status.indexOf('followed_by') !== -1;
    var following = Array.isArray(status) && status.indexOf('following') !== -1;
    return {
      target: (user && user.data && user.data.username) ? user.data.username : normalize(username),
      followed_by: !!followedBy,
      following: !!following,
      raw: status,
      relation: (followedBy && following) ? 'mutual' : (followedBy ? 'they_follow_you' : (following ? 'you_follow_them' : 'none'))
    };
  }

  function checkRelations(usernames) {
    var list = Array.isArray(usernames) ? usernames : [];
    var res = {};
    for (var i = 0; i < list.length; i++) {
      var uname = normalize(list[i]);
      res[uname] = checkUserFollowsMe(uname);
    }
    return res;
  }

  return {
    getUserByUsername: getUserByUsername,
    checkUserFollowsMe: checkUserFollowsMe,
    checkRelations: checkRelations
  };
})();



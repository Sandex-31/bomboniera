/* Stands in for the three servers of the original project. The pages are the
   student's own; only the network is replaced by static JSON next to them. */
(function (window) {
  var API = "../api/";
  var fold = function (s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };

  function apiPath(url) {
    var path = String(url).replace(/^https?:\/\/localhost:\d+/, "").replace(/^\/api(?=\/)/, "").split("?")[0];
    var m;
    if (path === "/films/top10") return API + "films/top10.json";
    if (path === "/films" || path === "/films/") return API + "films/index.json";
    if ((m = path.match(/^\/films\/genre\/(.+)$/))) return API + "films/genre/" + encodeURIComponent(decodeURIComponent(m[1])) + ".json";
    if ((m = path.match(/^\/films\/(\d+)\/reviews$/))) return API + "films/" + m[1] + "/reviews.json";
    if ((m = path.match(/^\/films\/(\d+)$/))) return API + "films/" + m[1] + ".json";
    return null;
  }

  /** Same rule as the original search: at least 3 characters, title contains the term (accents ignored). */
  function matchFilms(list, q) {
    var t = fold(q).trim();
    if (t.length < 3) return [];
    return list.filter(function (f) { return fold(f.title).indexOf(t) !== -1; });
  }

  function get(url) {
    var p = apiPath(url);
    if (!p) return Promise.reject({ response: { status: 404 }, message: "Not found: " + url });
    return fetch(p).then(function (r) {
      if (!r.ok) throw { response: { status: r.status }, message: "HTTP " + r.status };
      return r.json().then(function (data) { return { data: data, status: 200 }; });
    });
  }
  var axios = {
    get: get,
    create: function (cfg) {
      var base = (cfg && cfg.baseURL) || "";
      return { get: function (u) { return get(base + u); } };
    },
  };

  /* socket.io, single-player: your messages echo back, the room is pre-filled */
  function io() {
    var handlers = {};
    var name = "ospite";
    var fire = function (ev, data) { (handlers[ev] || []).forEach(function (h) { h(data); }); };
    var sock = {
      on: function (ev, h) { (handlers[ev] = handlers[ev] || []).push(h); if (ev === "connect") setTimeout(h, 0); return sock; },
      emit: function (ev, data) {
        if (ev === "join-film-chat") {
          name = (data && data.username) || name;
          fetch(API + "chat/" + data.filmId + ".json").then(function (r) { return r.ok ? r.json() : []; }).then(function (msgs) {
            msgs.forEach(function (m) { fire("chat-message", m); });
            var users = [name];
            msgs.forEach(function (m) { if (users.indexOf(m.username) === -1) users.push(m.username); });
            fire("active-users", users);
          });
        }
        if (ev === "chat-message") fire("chat-message", { username: name, message: data.message, timestamp: new Date().toISOString() });
        return sock;
      },
      disconnect: function () {},
    };
    return sock;
  }

  window.axios = axios;
  window.io = io;
  window.__shim = { apiPath: apiPath, matchFilms: matchFilms };
})(window);

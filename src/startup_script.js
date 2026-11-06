(function () {
  var TAG = "[RNP-TTML]";
  var VERSION = "1.3.0";
  console.log(TAG, "startup_script v" + VERSION + " loaded");

  // ==== ASCII ONLY ====
  // This file is loaded as a file:// script inside the NCM document, which
  // decodes it with the document charset. Literal non-ASCII here becomes "?" on
  // Chinese systems, so all user visible text is written as \uXXXX escapes.
  // Never paste raw Chinese into this file.
  var L = {
    song: "\u6B4C\u66F2 ID",                      // song id
    mode: "\u6A21\u5F0F",                         // mode
    source: "\u6B4C\u8BCD\u6E90",                 // lyric source
    url: "\u5730\u5740",                          // lyric url
    parse: "\u89E3\u6790",                        // parse result
    close: "\u5173\u95ED\u8C03\u8BD5\u9762\u677F"  // close panel
  };

  var AMLL_NAME = "AMLL TTML DB";
  var LOCAL_KEY = "config.betterncm.rnpl-amll-ttml-source";
  var REMOTE_KEY = "cc.rnpl.amll.cfg";
  var STATUS_KEY = "rnpl-amll-ttml-status";
  var DEFAULT_MIRRORS = [
    "https://amlldb.bikonoo.com/ncm-lyrics/{id}.ttml",
    "https://amll.mirror.dimeta.top/api/db/ncm-lyrics/{id}.ttml",
    "https://amll-ttml-db.gbclstudio.cn/ncm-lyrics/{id}.ttml",
    "https://amll-ttml-db.stevexmh.net/ncm/{id}"
  ];

  // ==================== CONFIG ====================
  // Written twice on purpose:
  //  - localStorage (BetterNCM's documented plugin config key)
  //  - native config.json via betterncm.app: survives restart and is shared
  //    with the lyrics window
  // host.cfg is the live object the settings panel mutates, so a change applies
  // to the next song without reloading the plugin.
  var host = (window.__rnplTtml = window.__rnplTtml || {});

  function bApp() {
    try { return (window.betterncm && window.betterncm.app) || null; } catch (e) { return null; }
  }

  function normalize(o) {
    o = o || {};
    if (o.mode !== "priority" && o.mode !== "supplement" && o.mode !== "disabled") o.mode = "priority";
    if (!o.mirrors || !o.mirrors.length) o.mirrors = DEFAULT_MIRRORS.slice();
    o.debug = o.debug === true;
    return o;
  }

  function loadLocal() {
    var o = {};
    try { o = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") || {}; } catch (e) { o = {}; }
    // migrate the 1.1.0 keys once
    try {
      if (!o.mode) o.mode = localStorage.getItem("rnpl-amll-ttml-mode") || null;
      if (!o.mirrors) {
        var raw = localStorage.getItem("rnpl-amll-ttml-mirrors");
        if (raw) o.mirrors = JSON.parse(raw);
      }
      if (o.debug == null) {
        var d = localStorage.getItem("rnpl-amll-ttml-debug");
        if (d !== null) o.debug = d === "true";
      }
    } catch (e) {}
    return normalize(o);
  }

  function saveLocal(o) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(o));
      localStorage.setItem("rnpl-amll-ttml-mode", o.mode);
      localStorage.setItem("rnpl-amll-ttml-mirrors", JSON.stringify(o.mirrors));
      localStorage.setItem("rnpl-amll-ttml-debug", String(o.debug));
    } catch (e) {}
  }

  function saveRemote(o) {
    var a = bApp();
    if (!a || !a.writeConfig) return;
    try { a.writeConfig(REMOTE_KEY, JSON.stringify(o)); } catch (e) {}
  }

  // pull the newer copy (native config.json wins if the settings panel saved
  // from another window)
  function pullRemote() {
    var a = bApp();
    if (!a || !a.readConfig) return;
    try {
      Promise.resolve(a.readConfig(REMOTE_KEY, "")).then(function (raw) {
        if (!raw || String(raw).length < 2) return;
        var o;
        try { o = JSON.parse(raw); } catch (e) { return; }
        var n = normalize(o);
        if ((n.savedAt || 0) > (host.cfg.savedAt || 0)) {
          host.cfg = n;
          saveLocal(n);
        }
      }).catch(function () {});
    } catch (e) {}
  }

  host.cfg = loadLocal();
  function cfg() { return host.cfg; }
  function getMode() { return cfg().mode; }
  function isDebugOn() { return cfg().debug === true; }
  function getMirrors() { return cfg().mirrors; }

  // ==================== CSS ====================
  var CSS = [
    ".rnpl-debug-panel{position:fixed;right:8px;bottom:80px;width:392px;max-height:62vh;background:rgba(0,0,0,.88);color:#ddd;border:1px solid rgba(255,255,255,.15);border-radius:8px;z-index:999999;font-size:11px;font-family:monospace;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 4px 16px rgba(0,0,0,.4)}",
    ".rnpl-debug-header{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0}",
    ".rnpl-debug-header span{font-weight:600;font-size:12px}",
    ".rnpl-debug-header button{background:none;border:none;color:#aaa;cursor:pointer;font-size:13px;padding:0 4px}",
    ".rnpl-debug-header button:hover{color:#fff}",
    ".rnpl-status{padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);flex-shrink:0}",
    ".rnpl-st-row{display:flex;gap:6px;line-height:1.55;font-size:11px}",
    ".rnpl-st-k{color:#888;flex:0 0 58px}",
    ".rnpl-st-v{color:#eee;word-break:break-all;flex:1}",
    ".rnpl-st-v.ok{color:#4caf50}",
    ".rnpl-st-v.warn{color:#ff9800}",
    ".rnpl-debug-body{overflow-y:auto;padding:6px 10px;flex:1;line-height:1.6}",
    ".rnpl-debug-body .line{margin:1px 0}",
    ".rnpl-debug-body .line.ok{color:#4caf50}",
    ".rnpl-debug-body .line.warn{color:#ff9800}",
    ".rnpl-debug-body .line.err{color:#ff4d4f}",
    ".rnpl-debug-body .line.info{color:#2196f3}",
    ".rnpl-debug-body .line.meta{color:#888}"
  ].join("\n");

  function injectCSS() {
    try {
      if (document.getElementById("rnpl-debug-style")) return;
      var el = document.createElement("style");
      el.id = "rnpl-debug-style";
      el.textContent = CSS;
      document.head.appendChild(el);
    } catch (e) {}
  }

  // ==================== STATUS + LOG PANEL ====================
  var STATUS = (host.status = host.status || {});
  var logs = [];
  var panel = null;

  function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function log(msg, cls) {
    logs.push({ t: new Date().toLocaleTimeString(), m: msg, c: cls || "" });
    if (logs.length > 200) logs.shift();
    console.log(TAG, msg);
    renderPanel();
  }

  function setStatus(patch) {
    for (var k in patch) STATUS[k] = patch[k];
    if (!STATUS.mode) STATUS.mode = getMode();
    STATUS.time = Date.now();
    // mirrored so the settings panel can show it from another window
    try { localStorage.setItem(STATUS_KEY, JSON.stringify(STATUS)); } catch (e) {}
    renderPanel();
  }

  function countLines(s) { return s ? String(s).split("\n").length : 0; }

  function statusFrom(sid, data, url) {
    setStatus({
      songId: String(sid || ""),
      mode: getMode(),
      source: AMLL_NAME + (data.yrc ? " / karaoke" : " / line-only"),
      url: url || "",
      detail: "LRC " + countLines(data.lrc && data.lrc.lyric) +
        " / YRC " + (data.yrc ? countLines(data.yrc.lyric) : 0) +
        " / trans " + (data.ytlrc ? countLines(data.ytlrc.lyric) : 0) +
        " / roma " + (data.yromalrc ? countLines(data.yromalrc.lyric) : 0)
    });
  }

  function row(k, v, cls) {
    return '<div class="rnpl-st-row"><span class="rnpl-st-k">' + escHtml(k) +
      '</span><span class="rnpl-st-v ' + (cls || "") + '">' + escHtml(v) + "</span></div>";
  }

  function renderPanel() {
    if (!panel || !panel.parentNode) return;
    var isAmll = STATUS.source && STATUS.source.indexOf(AMLL_NAME) === 0;
    var st = panel.querySelector(".rnpl-status");
    if (st) {
      st.innerHTML =
        row(L.song, STATUS.songId || "-") +
        row(L.mode, STATUS.mode || getMode()) +
        row(L.source, STATUS.source || "-", STATUS.source ? (isAmll ? "ok" : "warn") : "") +
        row(L.url, STATUS.url || "-") +
        row(L.parse, STATUS.detail || "-");
    }
    var body = panel.querySelector(".rnpl-debug-body");
    if (!body) return;
    var out = "", start = Math.max(0, logs.length - 60);
    for (var i = start; i < logs.length; i++) {
      out += '<div class="line ' + logs[i].c + '">' + escHtml(logs[i].t) + " " + escHtml(logs[i].m) + "</div>";
    }
    body.innerHTML = out;
    body.scrollTop = body.scrollHeight;
  }

  function buildPanel() {
    if (panel) return;
    injectCSS();
    panel = document.createElement("div");
    panel.className = "rnpl-debug-panel";
    var hdr = document.createElement("div");
    hdr.className = "rnpl-debug-header";
    var ttl = document.createElement("span");
    ttl.textContent = "RNP-TTML v" + VERSION;
    var btn = document.createElement("button");
    btn.textContent = "\u00D7";
    btn.title = L.close;
    btn.onclick = function () {
      cfg().debug = false;
      saveLocal(cfg());
      saveRemote(cfg());
      syncPanel();
    };
    hdr.appendChild(ttl);
    hdr.appendChild(btn);
    var st = document.createElement("div");
    st.className = "rnpl-status";
    var body = document.createElement("div");
    body.className = "rnpl-debug-body";
    panel.appendChild(hdr);
    panel.appendChild(st);
    panel.appendChild(body);
    if (document.body) document.body.appendChild(panel);
    renderPanel();
  }

  function syncPanel() {
    if (isDebugOn()) {
      if (!panel) buildPanel();
      else if (!panel.parentNode && document.body) document.body.appendChild(panel);
    } else if (panel && panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
  }

  // ==================== TTML PARSER ====================
  function timeToMs(t) {
    if (t == null || t === "") return null;
    var p = String(t).split(":");
    var sec = parseFloat(p[p.length - 1]);
    if (isNaN(sec)) return null;
    if (p.length === 3) return parseInt(p[0], 10) * 3600000 + parseInt(p[1], 10) * 60000 + sec * 1000;
    if (p.length === 2) return parseInt(p[0], 10) * 60000 + sec * 1000;
    return sec * 1000;
  }

  function lrcTime(ms) {
    if (!(ms > 0)) ms = 0;
    var mn = Math.floor(ms / 60000);
    var sc = ((ms % 60000) / 1000).toFixed(3);
    if (sc.length < 6) sc = "0" + sc;
    return "[" + String(mn).padStart(2, "0") + ":" + sc + "]";
  }

  function roleOf(el) {
    var v = el.getAttribute("ttm:role");
    if (v) return v;
    try { return el.getAttributeNS("http://www.w3.org/ns/ttml#metadata", "role") || ""; } catch (e) { return ""; }
  }

  function parseTTML(text) {
    if (!text) return null;
    var doc = null;
    try { doc = new DOMParser().parseFromString(text, "text/xml"); } catch (e) { doc = null; }
    if (!doc || doc.querySelector("parsererror")) {
      try { doc = new DOMParser().parseFromString(text, "text/html"); } catch (e) { return null; }
    }
    // iterate <p> only: also walking <div> emitted every line twice
    var ps = doc.querySelectorAll("p");
    if (!ps.length && doc.getElementsByTagNameNS) {
      ps = doc.getElementsByTagNameNS("*", "p");
    }
    if (!ps.length) return null;

    var lrc = [], yrc = [], trans = [], roma = [];

    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var begin = timeToMs(p.getAttribute("begin"));
      var end = timeToMs(p.getAttribute("end"));
      if (begin == null) continue;

      var nodes = [], tr = "", ro = "", kids = p.children || [];
      for (var c = 0; c < kids.length; c++) {
        var el = kids[c], r = roleOf(el);
        if (r === "x-translation") { tr = (el.textContent || "").trim(); continue; }
        if (r === "x-roman") { ro = (el.textContent || "").trim(); continue; }
        if (r === "x-bg" && el.children && el.children.length) {
          for (var b = 0; b < el.children.length; b++) nodes.push(el.children[b]);
          continue;
        }
        nodes.push(el);
      }
      if (!nodes.length) continue;

      var items = [], chars = 0, needFill = false, k;
      for (k = 0; k < nodes.length; k++) {
        var raw = nodes[k].textContent || "";
        if (!raw) continue;
        // "(" would break RNP's YRC word regex, which stops at the first "("
        var txt = raw.replace(/\(/g, "\uFF08");
        var wb = timeToMs(nodes[k].getAttribute("begin"));
        var we = timeToMs(nodes[k].getAttribute("end"));
        if (wb == null || we == null || we <= wb) needFill = true;
        items.push({ t: txt, b: wb, e: we });
        chars += Math.max(1, txt.length);
      }
      if (!items.length) continue;

      if (end == null || end <= begin) {
        var lastE = items[items.length - 1].e;
        end = (lastE != null && lastE > begin) ? lastE : begin + Math.max(800, items.length * 250);
      }

      // TTML often only gives word starts. Spreading by character count keeps
      // karaoke animating instead of degrading to plain line lyrics.
      if (needFill) {
        var span = Math.max(200, end - begin), cursor = begin;
        for (k = 0; k < items.length; k++) {
          var share = span * Math.max(1, items[k].t.length) / chars;
          if (items[k].b == null || items[k].b < begin) items[k].b = cursor;
          if (items[k].e == null || items[k].e <= items[k].b) items[k].e = items[k].b + share;
          cursor += share;
        }
      }

      var lineText = "", parts = [];
      for (k = 0; k < items.length; k++) {
        var sb = Math.max(begin, items[k].b), se = items[k].e;
        if (!(se > sb)) se = sb + 1;
        parts.push({ s: Math.round(sb - begin), d: Math.max(1, Math.round(se - sb)), t: items[k].t });
        lineText += items[k].t;
      }
      if (!lineText.trim()) continue;

      var lt = lrcTime(begin);
      lrc.push(lt + lineText);
      // LRC and YRC stay 1:1, RNP drops karaoke when the counts diverge
      var y = "[" + Math.round(Math.max(0, begin)) + "," + Math.max(1, Math.round(end - begin)) + "]";
      for (k = 0; k < parts.length; k++) {
        y += "(" + Math.max(0, parts[k].s) + "," + Math.max(1, parts[k].d) + ",0)" + parts[k].t;
      }
      yrc.push(y);
      if (tr) trans.push(lt + tr);
      if (ro) roma.push(lt + ro);
    }

    if (!lrc.length) return null;

    var out = {
      lrc: { lyric: lrc.join("\n") },
      lyricUser: { nickname: AMLL_NAME, userid: 0 },
      source: { name: AMLL_NAME }
    };
    if (yrc.length) out.yrc = { lyric: yrc.join("\n") };
    if (trans.length) out.ytlrc = { lyric: trans.join("\n") };
    if (roma.length) out.yromalrc = { lyric: roma.join("\n") };
    return out;
  }

  host.parseTTML = parseTTML;

  // ==================== FETCHER ====================
  var cache = {}, missing = {}, urlOf = {};
  var TIMEOUT = 6000, TTL = 300000, MISS_TTL = 120000;

  function shorten(u) { return String(u).replace(/^https?:\/\//, ""); }

  // All mirrors are raced: the first valid TTML wins, the rest are aborted.
  // Probing one by one made a dead first mirror cost seconds on every song.
  function fetchTTML(songId) {
    if (!songId) return Promise.resolve(null);
    var now = Date.now();

    if (missing[songId] && now - missing[songId] < MISS_TTL) return Promise.resolve(null);
    if (cache[songId] && now - cache[songId].t < TTL) {
      log("cache hit " + songId, "ok");
      return Promise.resolve(cache[songId].data);
    }

    var urls = getMirrors().map(function (u) { return String(u).replace("{id}", songId); });
    log("fetch " + songId + " x" + urls.length, "info");

    return new Promise(function (resolve) {
      var left = urls.length, done = false, ctrls = [];

      function finish(res, url) {
        if (done) return;
        done = true;
        for (var i = 0; i < ctrls.length; i++) { try { ctrls[i].abort(); } catch (e) {} }
        if (res) {
          cache[songId] = { data: res, t: Date.now() };
          urlOf[songId] = url;
          log("hit " + shorten(url), "ok");
        } else {
          missing[songId] = Date.now();
          log("miss " + songId, "warn");
        }
        resolve(res);
      }

      if (!urls.length) return finish(null);

      urls.forEach(function (url) {
        var ctrl = new AbortController();
        ctrls.push(ctrl);
        var settled = false, t0 = Date.now();
        var timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, TIMEOUT);

        function fail(msg) {
          if (settled || done) return;
          settled = true;
          clearTimeout(timer);
          log(msg, "warn");
          if (--left <= 0) finish(null);
        }

        fetch(url, { signal: ctrl.signal, credentials: "omit" }).then(function (resp) {
          if (done) return null;
          if (!resp.ok) { fail("HTTP " + resp.status + " " + shorten(url)); return null; }
          return resp.text().then(function (text) {
            if (done) return;
            var data = parseTTML(text);
            if (!data) { fail("not TTML " + shorten(url)); return; }
            settled = true;
            clearTimeout(timer);
            log("ok " + (Date.now() - t0) + "ms " + shorten(url), "ok");
            finish(data, url);
          }).catch(function (e) { fail("read failed " + ((e && e.message) || "")); });
        }).catch(function (e) {
          if (e && e.name === "AbortError") return;
          fail("error " + shorten(url) + " " + ((e && (e.message || e.name)) || ""));
        });
      });
    });
  }

  function resetCache() {
    cache = {};
    missing = {};
    urlOf = {};
    applied = {};
    log("cache cleared", "meta");
  }

  // ==================== HOOK ====================
  var _hooked = false;
  var _rnpHook = null;
  var applied = {};   // songId -> { data, t, retries }
  var fetching = {};
  var seenClearAt = cfg().clearAt || 0;

  function isAMLL(d) {
    return !!(d && d.source && d.source.name === AMLL_NAME && d.lrc && d.lrc.lyric);
  }

  function markApplied(songId, data) {
    if (!songId) return;
    applied[songId] = { data: data, t: Date.now(), retries: 0 };
    var ids = Object.keys(applied);
    if (ids.length > 8) {
      ids.sort(function (a, b) { return applied[a].t - applied[b].t; });
      while (ids.length > 8) delete applied[ids.shift()];
    }
  }

  function songIdFromHash(hash) { return hash ? String(hash).split("-")[0] : ""; }

  function guessSongId() {
    try {
      var h = window.currentLyrics && window.currentLyrics.hash;
      if (h) return songIdFromHash(h);
    } catch (e) {}
    return "";
  }

  // The redux action is the only reliable source: RNP's own `we()` resolves the
  // id from playing status, not from window.currentLyrics.
  function extractSongId(action) {
    var seen = [];
    function pick(o, depth) {
      if (!o || typeof o !== "object" || depth > 4 || seen.indexOf(o) !== -1) return null;
      seen.push(o);
      var keys = ["songId", "songid", "trackId", "trackid", "resourceTrackId", "resourceId", "lrcid", "id", "tid"];
      for (var i = 0; i < keys.length; i++) {
        var v = o[keys[i]];
        if (typeof v === "number") v = String(v);
        if (typeof v === "string" && v.length >= 6 && /^\d+$/.test(v)) return v;
      }
      var kids = [];
      if (o.payload) kids.push(o.payload);
      if (o.data) kids.push(o.data);
      if (o.track) kids.push(o.track);
      if (o.curTrack) kids.push(o.curTrack);
      if (o.originFromTrack) kids.push(o.originFromTrack);
      if (o.originFromTrack && o.originFromTrack.track) kids.push(o.originFromTrack.track);
      for (var k = 0; k < kids.length; k++) {
        var r = pick(kids[k], depth + 1);
        if (r) return r;
      }
      return null;
    }
    return pick(action, 0);
  }

  function extractRawLyrics(action) {
    if (!action || !action.payload) return null;
    var p = action.payload;
    if (p.lrc || p.yrc || p.tlyric || p.ytlrc) return p;
    if (p.data && (p.data.lrc || p.data.yrc || p.data.tlyric)) return p.data;
    return null;
  }

  function hasNative(raw) {
    return !!(raw && raw.lrc && raw.lrc.lyric && String(raw.lrc.lyric).trim()) && raw.nolyric !== true;
  }

  // Mutates the redux payload in place so RNP's own render path picks up AMLL.
  function injectLyrics(action, custom) {
    try {
      var p = action && action.payload;
      if (!p || !custom) return false;
      var target = (p.data && (p.data.lrc || p.data.yrc)) ? p.data : p;
      if (!target.lrc) return false;
      if (custom.lrc) target.lrc = custom.lrc;
      if (custom.yrc) target.yrc = custom.yrc;
      if (custom.ytlrc) target.ytlrc = custom.ytlrc;
      if (custom.yromalrc) target.yromalrc = custom.yromalrc;
      if (custom.lyricUser) target.lyricUser = custom.lyricUser;
      if (custom.source) target.source = custom.source;
      return true;
    } catch (e) { return false; }
  }

  function processLyrics(raw, songId, mode) {
    if (mode === "disabled") {
      setStatus({ songId: songId || "", mode: mode, source: "netease (plugin off)", url: "", detail: "" });
      return Promise.resolve(raw);
    }
    if (mode === "supplement" && hasNative(raw)) {
      setStatus({ songId: songId || "", mode: mode, source: "netease (has lyrics)", url: "", detail: "" });
      return Promise.resolve(raw);
    }

    return fetchTTML(songId).then(function (data) {
      if (data) {
        statusFrom(songId, data, urlOf[songId]);
        return data;
      }
      setStatus({ songId: songId || "", mode: mode, source: "netease (no ttml)", url: "", detail: "" });
      return raw;
    }).catch(function (e) {
      log("fetch error: " + ((e && e.message) || e), "err");
      setStatus({ songId: songId || "", mode: mode, source: "netease (error)", url: "", detail: "" });
      return raw;
    });
  }

  function hookRNP(rnpHook) {
    if (_hooked) return;
    _hooked = true;
    _rnpHook = rnpHook;
    log("hook ready mode=" + getMode(), "ok");

    // NCM 2.x path. Returning AMLL lets the core itself store the karaoke data,
    // which is what keeps it alive across close/reopen of the lyrics page.
    // 1.2.0 fix: the old build returned the native data to the core when AMLL was
    // already applied, so reopening the page silently dropped the karaoke track.
    window.onProcessLyrics = function (raw, songId) {
      var sid = songId ? String(songId) : guessSongId();
      setStatus({ songId: sid, mode: getMode() });
      log("onProcessLyrics " + (sid || "?") + " mode=" + getMode(), "info");

      var hit = applied[sid];
      if (hit && Date.now() - hit.t < TTL) {
        statusFrom(sid, hit.data, urlOf[sid]);
        _rnpHook(hit.data, sid);
        return Promise.resolve(hit.data);
      }

      return processLyrics(raw, sid, getMode()).then(function (result) {
        if (isAMLL(result)) {
          markApplied(sid, result);
          statusFrom(sid, result, urlOf[sid]);
          log("onProcessLyrics -> AMLL", "ok");
        }
        _rnpHook(result, sid);
        return result;
      });
    };

    if (typeof window.rnpDispatchHook === "function") {
      var orig = window.rnpDispatchHook;
      // NCM 3.x path: a plain observer, its return value is ignored by the core
      window.rnpDispatchHook = function (action) {
        var mode = getMode();
        if (!action || typeof action !== "object" || mode === "disabled") return orig(action);
        // no id in the payload means we cannot tell which song this is; injecting
        // another song's lyrics is worse than missing karaoke, so leave it alone
        var sid = extractSongId(action);
        if (!sid) return orig(action);

        var hit = applied[sid];
        if (hit && Date.now() - hit.t < TTL) {
          // feed redux with AMLL too, otherwise reopening the lyrics page shows
          // the native (non karaoke) lyrics again
          if (!injectLyrics(action, hit.data)) _rnpHook(hit.data, sid);
          statusFrom(sid, hit.data, urlOf[sid]);
          log("dispatch cached AMLL " + sid, "ok");
          return orig(action);
        }

        var raw = extractRawLyrics(action);
        if (mode === "supplement" && hasNative(raw)) return orig(action);
        if (fetching[sid]) return orig(action);

        setStatus({ songId: sid, mode: mode });
        log("dispatch " + sid + " mode=" + mode, "info");
        fetching[sid] = true;
        processLyrics(raw, sid, mode).then(function (data) {
          fetching[sid] = false;
          if (!isAMLL(data)) return;
          markApplied(sid, data);
          injectLyrics(action, data);
          // orig(action) already ran synchronously, render AMLL explicitly
          _rnpHook(data, sid);
          log("dispatch -> AMLL " + sid, "ok");
        }).catch(function (e) {
          fetching[sid] = false;
          log("dispatch error: " + ((e && e.message) || e), "err");
        });
        return orig(action);
      };
      log("rnpDispatchHook hooked", "info");
    }

    // Last line of defence: RNP re-fetches lyrics by itself when the page is
    // reopened, and that native response replaces AMLL. Re-apply when that
    // happens, but never fight a user-chosen local lyric.
    document.addEventListener("lyrics-updated", function (e) {
      var d = e && e.detail;
      if (!d || !d.hash) return;
      var sid = songIdFromHash(d.hash);
      // only fight for the song that is actually loaded
      if (!sid || sid !== guessSongId()) return;
      var hit = applied[sid];
      if (!hit || getMode() !== "priority") return;

      var src = d.contributors && d.contributors.lyricSource;
      var name = (src && src.name) || "";
      if (name === AMLL_NAME) {
        hit.retries = 0;
        statusFrom(sid, hit.data, urlOf[sid]);
        return;
      }
      if (/local|user|custom/i.test(name)) {
        delete applied[sid];
        log("user lyric source " + name + ", drop AMLL", "meta");
        return;
      }
      hit.retries = (hit.retries || 0) + 1;
      if (hit.retries > 30) return;
      log("overwritten by " + (name || "?") + ", re-apply AMLL #" + hit.retries, "warn");
      setTimeout(function () { _rnpHook(hit.data, sid); }, 40);
    });
  }

  // ==================== BOOT ====================
  var _polls = 0;

  function pollRNP() {
    _polls++;
    if (typeof window.onProcessLyrics === "function") {
      if (!_hooked) hookRNP(window.onProcessLyrics);
      return;
    }
    if (_polls === 1 || _polls % 20 === 0) log("waiting for RNP #" + _polls, "meta");
    if (_polls < 80) setTimeout(pollRNP, 250);
    else log("RNP not found after " + _polls + " polls", "err");
  }

  // one ticker: live settings (no reload), remote config sync, cache clear
  var tick = 0;
  setInterval(function () {
    syncPanel();
    if (++tick % 8 === 0) pullRemote();
    var c = cfg();
    if (c.clearAt && c.clearAt !== seenClearAt) {
      seenClearAt = c.clearAt;
      resetCache();
    }
  }, 700);

  setTimeout(syncPanel, 300);
  setTimeout(pollRNP, 50);
  setTimeout(pullRemote, 900);
  log("startup_script ready v" + VERSION, "meta");
})();

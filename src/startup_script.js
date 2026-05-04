(function () {
  var TAG = "[RNP-TTML]";
  console.log(TAG, "startup_script v1.1.0 loaded");

  // ==================== CSS ====================
  var CSS = [
    ".rnpl-debug-panel{position:fixed;right:8px;bottom:80px;width:380px;max-height:400px;background:rgba(0,0,0,.85);color:#ddd;border:1px solid rgba(255,255,255,.15);border-radius:8px;z-index:999999;font-size:11px;font-family:monospace;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 4px 16px rgba(0,0,0,.4)}",
    ".rnpl-debug-header{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0}",
    ".rnpl-debug-header span{font-weight:600;font-size:12px}",
    ".rnpl-debug-header button{background:none;border:none;color:#aaa;cursor:pointer;font-size:14px;padding:0 4px}",
    ".rnpl-debug-header button:hover{color:#fff}",
    ".rnpl-debug-body{overflow-y:auto;padding:8px 10px;flex:1;line-height:1.6}",
    ".rnpl-debug-body .line{margin:1px 0}",
    ".rnpl-debug-body .line.ok{color:#4caf50}",
    ".rnpl-debug-body .line.warn{color:#ff9800}",
    ".rnpl-debug-body .line.err{color:#ff4d4f}",
    ".rnpl-debug-body .line.info{color:#2196f3}",
    ".rnpl-debug-body .line.meta{color:#888;font-size:10px}",
    ".rnpl-debug-body .sep{border-bottom:1px dashed rgba(255,255,255,.08);margin:4px 0}",
    ".rnpl-debug-body .lyric-toggle{cursor:pointer;color:#2196f3;text-decoration:underline;font-size:10px}",
    ".rnpl-debug-body .lyric-preview{max-height:120px;overflow-y:auto;margin-top:2px;padding:4px 6px;background:rgba(255,255,255,.04);border-radius:4px;font-size:10px;white-space:pre-wrap;word-break:break-all}",
    ".rnpl-debug-body .lyric-preview.hidden{display:none}",
  ].join("\n");

  function injectCSS() {
    try {
      var el = document.createElement("style");
      el.textContent = CSS;
      document.head.appendChild(el);
    } catch (e) {}
  }

  // ==================== DEBUG LOG ====================
  var debugLines = [];
  var debugSongId = "";
  var debugMode = "";
  var debugPanel = null;

  function isDebugEnabled() {
    return localStorage.getItem("rnpl-amll-ttml-debug") === "true";
  }

  function debugLine(msg, cls) {
    var line = { time: new Date().toLocaleTimeString(), msg: msg, cls: cls || "" };
    debugLines.push(line);
    console.log(TAG, msg);
    if (isDebugEnabled()) updateDebugPanel();
  }

  function escHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function buildDebugPanel() {
    if (debugPanel) return debugPanel;
    injectCSS();
    debugPanel = document.createElement("div");
    debugPanel.className = "rnpl-debug-panel";
    var hdr = document.createElement("div");
    hdr.className = "rnpl-debug-header";
    hdr.innerHTML = "<span>RNP-TTML Debug</span>";
    var closeBtn = document.createElement("button");
    closeBtn.textContent = "\u00D7";
    closeBtn.title = "关闭调试面板";
    closeBtn.onclick = function () {
      localStorage.setItem("rnpl-amll-ttml-debug", "false");
      if (debugPanel) { debugPanel.remove(); debugPanel = null; }
    };
    hdr.appendChild(closeBtn);
    var body = document.createElement("div");
    body.className = "rnpl-debug-body";
    debugPanel.appendChild(hdr);
    debugPanel.appendChild(body);
    return debugPanel;
  }

  function updateDebugPanel() {
    if (!debugPanel) return;
    var body = debugPanel.querySelector(".rnpl-debug-body");
    if (!body) return;
    var html = "";
    if (debugMode) html += '<div class="line meta">模式: ' + escHtml(debugMode) + '</div>';
    if (debugSongId) html += '<div class="line meta">歌曲ID: ' + escHtml(debugSongId) + '</div>';
    html += '<div class="sep"></div>';
    var start = Math.max(0, debugLines.length - 20);
    for (var i = start; i < debugLines.length; i++) {
      var ln = debugLines[i];
      html += '<div class="line ' + ln.cls + '">' + escHtml(ln.time) + " " + escHtml(ln.msg) + '</div>';
    }
    body.innerHTML = html;
    body.scrollTop = body.scrollHeight;
  }

  function showDebugPanel() {
    var panel = buildDebugPanel();
    if (!panel.parentNode && document.body) document.body.appendChild(panel);
    updateDebugPanel();
  }

  function refreshDebugPanel() {
    if (isDebugEnabled()) {
      setTimeout(function () {
        if (document.body) showDebugPanel();
      }, 200);
    }
  }

  refreshDebugPanel();

  // ==================== TTML PARSER ====================
  function timeToMs(timeStr) {
    if (!timeStr) return 0;
    var parts = timeStr.split(":");
    if (parts.length === 3) return parseInt(parts[0]) * 3600000 + parseInt(parts[1]) * 60000 + parseFloat(parts[2]) * 1000;
    if (parts.length === 2) return parseInt(parts[0]) * 60000 + parseFloat(parts[1]) * 1000;
    return (parseFloat(timeStr) || 0) * 1000;
  }

  function msToLrcTime(ms) {
    var total = ms / 1000;
    var mn = Math.floor(total / 60);
    var sc = (total % 60).toFixed(2);
    return "[" + String(mn).padStart(2, "0") + ":" + String(sc).padStart(5, "0") + "]";
  }

  function parseTTML(ttmlText) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(ttmlText, "text/html");
    var body = doc.querySelector("body");
    if (!body) {
      doc = parser.parseFromString(ttmlText, "text/xml");
      if (doc.querySelector("parsererror")) return null;
      body = doc.querySelector("body");
      if (!body && doc.getElementsByTagNameNS) {
        var bodies = doc.getElementsByTagNameNS("*", "body");
        if (bodies.length) body = bodies[0];
      }
    }
    if (!body) return null;

    var lrcLines = [], yrcLines = [], translationLines = [], romaLines = [];

    function processDiv(div) {
      var ps = div.querySelectorAll("p");
      for (var i = 0; i < ps.length; i++) processP(ps[i]);
    }

    function processP(p) {
      var begin = timeToMs(p.getAttribute("begin"));
      var end = timeToMs(p.getAttribute("end"));
      var dur = end - begin;
      var words = [], translation = null, roma = null;
      var spans = p.querySelectorAll("span");
      for (var i = 0; i < spans.length; i++) {
        var s = spans[i];
        var role = s.getAttribute("ttm:role") || (s.getAttributeNS ? s.getAttributeNS("http://www.w3.org/ns/ttml#metadata", "role") : null);
        if (role === "x-translation") { translation = (s.textContent || "").trim(); continue; }
        if (role === "x-roman") { roma = (s.textContent || "").trim(); continue; }
        if (role === "x-bg") continue;
        words.push(s);
      }
      if (!words.length && !translation && !roma) return;

      var wps = [], txt = "";
      for (var j = 0; j < words.length; j++) {
        var w = words[j];
        var wb = timeToMs(w.getAttribute("begin"));
        var we = timeToMs(w.getAttribute("end"));
        var wt = w.textContent || "";
        if (!wt.trim() && wt !== " ") continue;
        wps.push({ start: Math.round(wb - begin), duration: Math.max(1, Math.round(we - wb)), text: wt });
        txt += wt;
      }
      if (txt) {
        var lt = msToLrcTime(begin);
        lrcLines.push(lt + txt);
        if (begin > 0 && wps.length) {
          var yp = "";
          for (var k = 0; k < wps.length; k++) yp += "(" + Math.max(0, wps[k].start) + "," + Math.max(1, wps[k].duration) + ",0)" + wps[k].text;
          yrcLines.push("[" + Math.round(begin) + "," + Math.round(Math.max(1, dur)) + "]" + yp);
        }
        if (translation) translationLines.push(lt + translation);
        if (roma) romaLines.push(lt + roma);
      }
    }

    var divs = body.querySelectorAll("div");
    if (divs.length) { for (var d = 0; d < divs.length; d++) processDiv(divs[d]); }
    else processDiv(body);
    if (!lrcLines.length) return null;

    var result = {
      lrc: { lyric: lrcLines.join("\n") },
      lyricUser: { nickname: "AMLL TTML DB", userid: 0 },
      source: { name: "AMLL TTML DB" },
    };
    if (yrcLines.length) result.yrc = { lyric: yrcLines.join("\n") };
    if (translationLines.length) result.ytlrc = { lyric: translationLines.join("\n") };
    if (romaLines.length) result.yromalrc = { lyric: romaLines.join("\n") };
    return result;
  }

  // ==================== FETCHER ====================
  var cache = {}, notFoundCache = {};
  var FETCH_TIMEOUT = 8000, CACHE_TTL = 300000, NOT_FOUND_TTL = 60000;

  function getMirrors() {
    try {
      var raw = localStorage.getItem("rnpl-amll-ttml-mirrors");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      "https://amll-ttml-db.stevexmh.net/ncm/{id}",
      "https://amlldb.bikonoo.com/ncm-lyrics/{id}.ttml",
      "https://amll.mirror.dimeta.top/api/db/ncm-lyrics/{id}.ttml",
      "https://amll-ttml-db.gbclstudio.cn/ncm-lyrics/{id}.ttml",
    ];
  }

  function fetchWithTimeout(url) {
    return new Promise(function (resolve, reject) {
      var ctrl = new AbortController();
      var t = setTimeout(function () { ctrl.abort(); }, FETCH_TIMEOUT);
      fetch(url, { signal: ctrl.signal }).then(function (r) { clearTimeout(t); resolve(r); }).catch(function (e) { clearTimeout(t); reject(e); });
    });
  }

  function fetchFromAMLLDB(songId) {
    if (!songId) return Promise.resolve(null);
    var now = Date.now();
    if (notFoundCache[songId] && now - notFoundCache[songId] < NOT_FOUND_TTL) {
      debugLine("缓存: 404 标记, 跳过", "meta");
      return Promise.resolve(null);
    }
    if (cache[songId] && now - cache[songId].time < CACHE_TTL) {
      var d = cache[songId].data;
      debugLine("缓存命中: LRC " + d.lrc.lyric.length + "字" + (d.yrc ? " YRC有" : " YRC无"), "ok");
      return Promise.resolve(d);
    }

    var mirrors = getMirrors();
    debugLine("获取歌词，共 " + mirrors.length + " 个镜像", "info");

    function tryMirror(idx) {
      if (idx >= mirrors.length) {
        notFoundCache[songId] = now;
        debugLine("全部 " + mirrors.length + " 个镜像未找到歌词", "warn");
        return Promise.resolve(null);
      }
      var url = mirrors[idx].replace("{id}", songId);
      var t0 = Date.now();
      return fetchWithTimeout(url).then(function (resp) {
        var elapsed = Date.now() - t0;
        if (!resp.ok) {
          debugLine("#" + (idx + 1) + " " + url.substring(0, 45) + "... HTTP " + resp.status + " (" + elapsed + "ms)", "warn");
          return tryMirror(idx + 1);
        }
        return resp.text().then(function (text) {
          debugLine("#" + (idx + 1) + " " + url.substring(0, 45) + "... 200 (" + elapsed + "ms) " + text.length + "b", "ok");
          if (!text || text.length < 30) { debugLine("#" + (idx + 1) + " 空响应", "warn"); return tryMirror(idx + 1); }

          var result = null;
          if (text.indexOf("<tt") !== -1 || text.indexOf("xmlns") !== -1) {
            result = parseTTML(text);
            if (result) {
              debugLine("TTML 解析: LRC " + result.lrc.lyric.length + "字, YRC " + (result.yrc ? "有" : "无"), "ok");
            } else {
              debugLine("TTML 解析失败 (body not found)", "err");
            }
          } else {
            debugLine("非 TTML 格式", "warn");
          }
          if (!result) return tryMirror(idx + 1);

          cache[songId] = { data: result, time: now };
          return result;
        });
      }).catch(function (e) {
        debugLine("#" + (idx + 1) + " 请求异常: " + (e.name || e.message || "abort"), "warn");
        return tryMirror(idx + 1);
      });
    }

    return tryMirror(0);
  }

  // ==================== SETTINGS ACCESS ====================
  function getMode() {
    var m = localStorage.getItem("rnpl-amll-ttml-mode");
    return m || "priority";
  }

  // ==================== HOOK LOGIC ====================
  var _hooked = false;
  var _rnpHook = null;
  var _appliedSongs = {};
  var _fetchingSongs = {};

  function addOverwriteGuard(songId, amllData) {
    var reapplyCount = 0;
    function guard(e) {
      if (!e.detail || !e.detail.hash) return;
      if (String(e.detail.hash).indexOf(String(songId)) !== 0) return;
      var src = e.detail.contributors && e.detail.contributors.lyricSource;
      if (src && src.name === "AMLL TTML DB") return;
      reapplyCount++;
      if (reapplyCount > 2) {
        document.removeEventListener("lyrics-updated", guard);
        return;
      }
      debugLine("反覆盖守卫 #" + reapplyCount + ": 重新应用 AMLL", "warn");
      setTimeout(function () { _rnpHook(amllData, songId); }, 30);
    }
    document.addEventListener("lyrics-updated", guard);
    setTimeout(function () { document.removeEventListener("lyrics-updated", guard); }, 5000);
  }

  function hookRNP(rnpHook) {
    if (_hooked) return;
    _hooked = true;
    _rnpHook = rnpHook;
    debugLine("Hook 就绪, mode=" + getMode(), "ok");
    console.log(TAG, "Hooked onProcessLyrics, mode:", getMode());

    window.onProcessLyrics = function (rawLyricsData, songId) {
      debugSongId = songId || "?";
      var mode = getMode();
      debugMode = mode;
      debugLines = [];
      debugLine("onProcessLyrics songId=" + debugSongId + " mode=" + mode, "info");

      // 已应用过 AMLL 或正在获取 → 跳过，避免覆盖
      if (songId && _appliedSongs[songId] && Date.now() - _appliedSongs[songId] < 30000) {
        debugLine("AMLL 已应用, 跳过 onProcessLyrics", "meta");
        return Promise.resolve(rawLyricsData);
      }

      return processLyricsWithAMLL(rawLyricsData, songId, mode).then(function (result) {
        var isAMLL = result && result.source && result.source.name === "AMLL TTML DB";
        if (isAMLL) {
          debugLine("onProcessLyrics: 应用 AMLL", "ok");
          _rnpHook(result, songId);
        } else if (mode !== "priority" || !_fetchingSongs[songId]) {
          debugLine("onProcessLyrics: 回退原生", "warn");
          _rnpHook(result, songId);
        } else {
          debugLine("onProcessLyrics: 等待 AMLL 获取中, 暂不回退", "meta");
        }
        return result;
      });
    };

    if (window.rnpDispatchHook) {
      var _origDispatchHook = window.rnpDispatchHook;
      window.rnpDispatchHook = function (action) {
        var songId = extractSongId(action);
        var mode = getMode();

        // 已应用过 AMLL → 拦截后续调用防止覆盖
        if (songId && _appliedSongs[songId]) {
          if (Date.now() - _appliedSongs[songId] < 30000) return;
          delete _appliedSongs[songId];
        }

        if (songId && mode !== "disabled" && !_fetchingSongs[songId]) {
          var rawLyrics = extractRawLyrics(action);
          debugSongId = songId;
          debugMode = mode;
          debugLines = [];
          debugLine("rnpDispatchHook songId=" + songId + " mode=" + mode, "info");

          // 缓存命中 → 同步注入 AMLL 到 action，避免竞态
          var now = Date.now();
          if (cache[songId] && now - cache[songId].time < CACHE_TTL) {
            debugLine("AMLL 缓存命中, 同步注入 action", "ok");
            injectLyricsIntoAction(action, cache[songId].data);
            _appliedSongs[songId] = now;
            return _origDispatchHook(action);
          }

          // 异步获取
          _fetchingSongs[songId] = true;
          processLyricsWithAMLL(rawLyrics, songId, mode).then(function (custom) {
            _fetchingSongs[songId] = false;
            if (custom && custom.lrc && custom.lrc.lyric) {
              debugLine("-> 使用 AMLL 歌词, 锁定30秒", "ok");
              _appliedSongs[songId] = Date.now();
              _rnpHook(custom, songId);
              addOverwriteGuard(songId, custom);
            } else {
              debugLine("-> 无 AMLL, 回退原生 dispatch", "warn");
              _origDispatchHook(action);
            }
          }).catch(function (e) {
            _fetchingSongs[songId] = false;
            debugLine("异常: " + (e.message || e), "err");
            _origDispatchHook(action);
          });

          if (mode === "priority") return;
        }

        return _origDispatchHook(action);
      };
      debugLine("同时 hook 了 rnpDispatchHook", "info");
    }
  }

  function processLyricsWithAMLL(rawLyricsData, songId, mode) {
    if (mode === "disabled") {
      debugLine("仅网易云, 直通", "meta");
      return Promise.resolve(rawLyricsData);
    }

    if (mode === "priority") {
      debugLine("TTML优先 开始获取...", "info");
      return fetchFromAMLLDB(songId).then(function (custom) {
        if (custom) {
          debugLine("-> 使用 AMLL 歌词", "ok");
          return custom;
        }
        debugLine("-> 回退网易云", "warn");
        return rawLyricsData;
      }).catch(function (e) {
        debugLine("异常回退: " + (e.message || e), "err");
        return rawLyricsData;
      });
    }

    if (mode === "supplement") {
      var hasLyrics = rawLyricsData && rawLyricsData.lrc && rawLyricsData.lrc.lyric && rawLyricsData.lrc.lyric.trim() && !rawLyricsData.nolyric;
      debugLine("网易歌词: " + (hasLyrics ? "有" : "无"), "meta");
      if (!hasLyrics) {
        debugLine("补充模式, 尝试 TTML...", "info");
        return fetchFromAMLLDB(songId).then(function (custom) {
          if (custom) { debugLine("-> 使用 AMLL 歌词", "ok"); return custom; }
          debugLine("-> TTML 无", "warn"); return rawLyricsData;
        }).catch(function (e) {
          debugLine("异常: " + (e.message || e), "err");
          return rawLyricsData;
        });
      }
      debugLine("有歌词, 直通", "meta");
      return Promise.resolve(rawLyricsData);
    }

    return Promise.resolve(rawLyricsData);
  }

  function extractSongId(action) {
    if (!action || !action.payload) return null;
    var p = action.payload;
    var ids = [p.songId, p.id, p.songid, p.trackId, p.trackid, p.resourceTrackId, p.lrcid, p.resourceId];
    for (var i = 0; i < ids.length; i++) {
      if (ids[i] && typeof ids[i] === "number") ids[i] = String(ids[i]);
      if (typeof ids[i] === "string" && ids[i].length >= 6) return ids[i];
    }
    return null;
  }

  function extractRawLyrics(action) {
    if (!action || !action.payload) return null;
    var p = action.payload;
    if (p.lrc || p.yrc || p.tlyric || p.ytlrc) return p;
    if (p.data) {
      var d = p.data;
      if (d.lrc || d.yrc || d.tlyric) return d;
    }
    return null;
  }

  function injectLyricsIntoAction(action, custom) {
    var target = action.payload;
    if (!target) return;
    if (custom.lrc) (target.data || target).lrc = custom.lrc;
    if (custom.yrc) (target.data || target).yrc = custom.yrc;
    if (custom.ytlrc) (target.data || target).ytlrc = custom.ytlrc;
    if (custom.yromalrc) (target.data || target).yromalrc = custom.yromalrc;
    if (custom.lyricUser) (target.data || target).lyricUser = custom.lyricUser;
    if (custom.source) (target.data || target).source = custom.source;
  }

  // ==================== POLLING ====================
  var _pollCount = 0;

  function pollRNP() {
    _pollCount++;
    if (window.onProcessLyrics && typeof window.onProcessLyrics === "function") {
      if (!_hooked) hookRNP(window.onProcessLyrics);
      return;
    }
    if (_pollCount === 1 || _pollCount % 10 === 0) {
      debugLine("轮询 #" + _pollCount + " ...", "meta");
    }
    if (_pollCount < 80) {
      setTimeout(pollRNP, 250);
    } else {
      debugLine("超时: " + _pollCount + " 次轮询未找到 RNP", "err");
    }
  }

  // Start immediately
  setTimeout(pollRNP, 50);
  debugLine("startup_script 初始化完成, 开始轮询 RNP...", "meta");
})();

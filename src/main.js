console.log("[RNP-TTML] settings panel loaded");

(function () {
  // ASCII only: this file is read through a path that can decode non-UTF-8.
  // Chinese UI text is written as \uXXXX escapes so it never turns into "?".
  var VERSION = "1.3.1";
  var AMLL_NAME = "AMLL TTML DB";
  var LOCAL_KEY = "config.betterncm.rnpl-amll-ttml-source";
  var REMOTE_KEY = "cc.rnpl.amll.cfg";
  var STATUS_KEY = "rnpl-amll-ttml-status";
  var DEFAULT_MIRRORS = [
    "https://amlldb.bikonoo.com/ncm-lyrics/{id}.ttml",
    "https://amll.mirror.dimeta.top/api/db/ncm-lyrics/{id}.ttml",
    "https://amll-ttml-db.gbclstudio.cn/ncm-lyrics/{id}.ttml",
    "https://amll-ttml-db.stevexmh.net/ncm/{id}",
  ];

  var host = (window.__rnplTtml = window.__rnplTtml || {});

  function app() {
    try { return (window.betterncm && window.betterncm.app) || null; } catch (e) { return null; }
  }

  // BetterNCM exposes the client's external-navigation channel as
  // betterncm.ncm.openUrl; a plain <a href> would open inside the NCM window.
  // Falls back to window.open for a bare browser context.
  function openUrl(url) {
    try {
      if (window.betterncm && betterncm.ncm && betterncm.ncm.openUrl) {
        betterncm.ncm.openUrl(url);
        return;
      }
    } catch (e) {}
    try { window.open(url, "_blank", "noreferrer"); } catch (e) {}
  }

  function normalize(o) {
    o = o || {};
    if (o.mode !== "priority" && o.mode !== "supplement" && o.mode !== "disabled") o.mode = "priority";
    if (!o.mirrors || !o.mirrors.length) o.mirrors = DEFAULT_MIRRORS.slice();
    o.debug = o.debug === true;
    if (typeof o.savedAt !== "number") o.savedAt = 0;
    return o;
  }

  function loadLocal() {
    var o = {};
    try { o = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") || {}; } catch (e) { o = {}; }
    return normalize(o);
  }

  // localStorage is what BetterNCM's plugin.getConfig/setConfig use and it is
  // shared with the lyrics window only in some NCM builds, so every change is
  // also written to the native config file (survives restart, visible to all
  // windows). `savedAt` decides which copy wins.
  function save(patch) {
    var c = cfg();
    for (var k in patch) c[k] = patch[k];
    c.savedAt = Date.now();
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(c)); } catch (e) {}
    var a = app();
    if (a && a.writeConfig) {
      try { a.writeConfig(REMOTE_KEY, JSON.stringify(c)); } catch (e) {}
    }
  }

  function cfg() {
    if (!host.cfg) host.cfg = loadLocal();
    return host.cfg;
  }

  var CSS = [
    ".rnpl-settings{padding:4px 0;font-size:13px}",
    ".rnpl-settings h4{margin:0 0 12px 0;font-size:15px;font-weight:600}",
    ".rnpl-mode-group{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}",
    ".rnpl-radio-row{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid rgba(128,128,128,.2);cursor:pointer;transition:border-color .2s,background .2s}",
    ".rnpl-radio-row:hover{border-color:rgba(128,128,128,.4)}",
    ".rnpl-radio-row.active{border-color:#ff4d4f;background:rgba(255,77,79,.06)}",
    ".rnpl-radio-row input[type=radio]{margin-top:1px;accent-color:#ff4d4f;flex-shrink:0}",
    ".rnpl-radio-label{font-weight:500;font-size:14px}",
    ".rnpl-radio-desc{color:#999;font-size:12px;margin-top:1px;line-height:1.4}",
    ".rnpl-info{padding:10px 12px;border-radius:8px;background:rgba(128,128,128,.05);font-size:12px;line-height:1.5;color:#999;margin-bottom:10px}",
    ".rnpl-cache-btn{padding:6px 14px;border:1px solid rgba(128,128,128,.25);border-radius:6px;background:transparent;color:#999;cursor:pointer;font-size:12px;transition:all .2s}",
    ".rnpl-cache-btn:hover{border-color:#ff4d4f;color:#ff4d4f}",
    ".rnpl-mirrors-label{display:block;font-size:12px;font-weight:500;margin-bottom:4px;color:#999}",
    ".rnpl-mirrors-input{width:100%;min-height:60px;padding:8px 10px;border-radius:6px;border:1px solid rgba(128,128,128,.2);font-size:11px;font-family:monospace;line-height:1.5;resize:vertical;box-sizing:border-box}",
    ".rnpl-mirrors-input:focus{outline:none;border-color:#ff4d4f}",
    ".rnpl-mirror-hint{font-size:10px;color:#999;margin:2px 0 10px 0}",
    ".rnpl-divider{border:none;border-top:1px solid rgba(128,128,128,.15);margin:14px 0}",
    ".rnpl-check-row{display:flex;align-items:center;gap:8px;margin:10px 0;font-size:13px;cursor:pointer}",
    ".rnpl-check-row input[type=checkbox]{accent-color:#ff4d4f}",
    ".rnpl-status-box{padding:8px 10px;border-radius:6px;border:1px solid rgba(128,128,128,.2);font-size:11px;font-family:monospace;line-height:1.7;margin:8px 0;word-break:break-all}",
    ".rnpl-status-box .k{color:#999;display:inline-block;width:72px}",
    ".rnpl-status-box .ok{color:#52c41a}",
    ".rnpl-status-box .warn{color:#faad14}",
    ".rnpl-about{padding:10px 12px;border-radius:8px;background:rgba(128,128,128,.05);font-size:11px;line-height:1.7;color:#aaa;margin-top:14px}",
    ".rnpl-about a{color:#ff4d4f;text-decoration:none}",
    ".rnpl-about a:hover{text-decoration:underline}",
    ".rnpl-about .rnpl-about-title{font-weight:600;font-size:12px;color:#ccc;margin-bottom:4px}",
  ].join("\n");

  function injectCSS() {
    try {
      var el = document.createElement("style");
      el.textContent = CSS;
      if (document.head) document.head.appendChild(el);
    } catch (e) {}
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Read-only live status. startup_script mirrors it into localStorage so the
  // settings panel shows the same numbers even when it is a separate window.
  function buildStatusBox() {
    var box = el("div", "rnpl-status-box");

    function status() {
      if (host.status && host.status.time) return host.status;
      try { return JSON.parse(localStorage.getItem(STATUS_KEY) || "{}") || {}; } catch (e) { return {}; }
    }

    function row(k, v, cls) {
      var r = el("div");
      r.appendChild(el("span", "k", k));
      r.appendChild(el("span", cls, String(v)));
      return r;
    }

    function paint() {
      var s = status();
      var isAmll = s.source && s.source.indexOf(AMLL_NAME) === 0;
      box.innerHTML = "";
      box.appendChild(row("\u6B4C\u66F2 ID", s.songId || "-", ""));
      box.appendChild(row("\u6A21\u5F0F", s.mode || cfg().mode, ""));
      box.appendChild(row("\u6B4C\u8BCD\u6E90", s.source || "-", s.source ? (isAmll ? "ok" : "warn") : ""));
      box.appendChild(row("\u6B4C\u8BCD URL", s.url || "-", ""));
      box.appendChild(row("\u89E3\u6790", s.detail || "-", ""));
    }

    paint();
    setInterval(paint, 1200);
    return box;
  }

  function buildSettingsPanel() {
    injectCSS();
    var root = el("div", "rnpl-settings");
    var c = cfg();

    root.appendChild(el("h4", null, "\u200BAMLL TTML \u6B4C\u8BCD\u6E90\u8BBE\u7F6E".replace("\u200B", "")));

    var mg = el("div", "rnpl-mode-group");
    var modes = [
      { v: "priority", l: "AMLL \u4F18\u5148 (\u9010\u8BCD)", d: "\u4F18\u5148\u4F7F\u7528 AMLL \u9010\u8BCD\u6B4C\u8BCD\uFF0C\u65E0\u5219\u56DE\u9000\u7F51\u6613\u4E91" },
      { v: "supplement", l: "\u8865\u5145\u6A21\u5F0F", d: "\u4EC5\u7F51\u6613\u4E91\u65E0\u6B4C\u8BCD\u65F6\u4ECE AMLL \u83B7\u53D6" },
      { v: "disabled", l: "\u4EC5\u7F51\u6613\u4E91", d: "\u4E0D\u4F7F\u7528 AMLL TTML DB" },
    ];
    var rows = [];
    modes.forEach(function (m) {
      var wrap = el("label", "rnpl-radio-row" + (c.mode === m.v ? " active" : ""));
      var inp = document.createElement("input");
      inp.type = "radio";
      inp.name = "rnpl-mode";
      inp.value = m.v;
      inp.checked = c.mode === m.v;
      inp.addEventListener("change", function () {
        save({ mode: m.v });
        rows.forEach(function (r) { r.classList.remove("active"); });
        wrap.classList.add("active");
      });
      var bd = el("div");
      bd.appendChild(el("div", "rnpl-radio-label", m.l));
      bd.appendChild(el("div", "rnpl-radio-desc", m.d));
      wrap.appendChild(inp);
      wrap.appendChild(bd);
      rows.push(wrap);
      mg.appendChild(wrap);
    });
    root.appendChild(mg);
    root.appendChild(el("hr", "rnpl-divider"));

    root.appendChild(el("label", "rnpl-mirrors-label", "\u81EA\u5B9A\u4E49\u955C\u50CF\u6E90 (\u6BCF\u884C\u4E00\u4E2A\uFF0C{id}=\u6B4C\u66F2 ID):"));
    var ta = el("textarea", "rnpl-mirrors-input");
    ta.placeholder = "https://example.com/ncm/{id}";
    ta.value = c.mirrors.join("\n");
    ta.addEventListener("change", function () {
      var list = ta.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      save({ mirrors: list.length ? list : DEFAULT_MIRRORS.slice() });
    });
    root.appendChild(ta);
    root.appendChild(el("div", "rnpl-mirror-hint", "\u6240\u6709\u955C\u50CF\u5E76\u884C\u8BF7\u6C42\uFF0C\u6700\u5148\u8FD4\u56DE\u7684\u9010\u8BCD\u6B4C\u8BCD\u751F\u6548\u3002{id} \u66FF\u6362\u4E3A\u6B4C\u66F2 ID\u3002"));

    var ckRow = el("label", "rnpl-check-row");
    var ck = document.createElement("input");
    ck.type = "checkbox";
    ck.checked = c.debug === true;
    ck.addEventListener("change", function () { save({ debug: ck.checked }); });
    ckRow.appendChild(ck);
    ckRow.appendChild(document.createTextNode("\u542F\u7528\u8C03\u8BD5\u9762\u677F (\u7ACB\u5373\u751F\u6548\uFF0C\u65E0\u9700\u91CD\u8F7D)"));
    root.appendChild(ckRow);

    root.appendChild(el("div", "rnpl-info", "\u5B9E\u65F6\u72B6\u6001\uFF1A\u5F53\u524D\u6B4C\u66F2 ID\u3001\u6B4C\u8BCD\u6765\u6E90\u3001\u6B4C\u8BCD URL\u3001\u89E3\u6790\u884C\u6570\u3002"));
    root.appendChild(buildStatusBox());

    var cacheBtn = el("button", "rnpl-cache-btn", "\u6E05\u9664\u6B4C\u8BCD\u7F13\u5B58");
    cacheBtn.addEventListener("click", function () {
      save({ clearAt: Date.now() });
      cacheBtn.textContent = "\u7F13\u5B58\u5DF2\u6E05\u9664 (\u5207\u6B4C\u751F\u6548)";
      setTimeout(function () { cacheBtn.textContent = "\u6E05\u9664\u6B4C\u8BCD\u7F13\u5B58"; }, 2000);
    });
    root.appendChild(cacheBtn);

    root.appendChild(el("hr", "rnpl-divider"));

    var about = el("div", "rnpl-about");
    about.innerHTML =
      '<div class="rnpl-about-title">RNP-AMLL-TTML v' + VERSION + "</div>" +
      "<div>\u4E3A RefinedNowPlayingNext \u63A5\u5165 AMLL TTML DB \u9010\u8BCD\u6B4C\u8BCD\u5E93\uFF0C\u652F\u6301\u7FFB\u8BD1\u3001\u7F57\u9A6C\u97F3\u3001YRC \u9010\u5B57\u52A8\u753B\u3002</div>" +
      "<div>GitHub: </div>";
    // <a href> would navigate inside the NCM window; openUrl hands the link to
    // the system browser through the client's os.navigateExternal channel
    var link = el("a", null, "RNP-AMLL-TTML");
    link.href = "javascript:void(0)";
    link.addEventListener("click", function (e) {
      e.preventDefault();
      openUrl("https://github.com/TheMyceliumOfAntan/RNP-AMLL-TTML");
    });
    about.lastChild.appendChild(link);
    root.appendChild(about);

    return root;
  }

  if (typeof plugin !== "undefined") {
    plugin.onConfig(function () { return buildSettingsPanel(); });
  }
})();

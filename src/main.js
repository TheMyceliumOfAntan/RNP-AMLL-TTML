console.log("[RNP-TTML] settings panel loaded");

(function () {
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
    ".rnpl-about{padding:10px 12px;border-radius:8px;background:rgba(128,128,128,.05);font-size:11px;line-height:1.7;color:#aaa;margin-top:14px}",
    ".rnpl-about a{color:#ff4d4f;text-decoration:none}",
    ".rnpl-about a:hover{text-decoration:underline}",
    ".rnpl-about .rnpl-about-title{font-weight:600;font-size:12px;color:#ccc;margin-bottom:4px}",
    ".rnpl-version{color:#888;font-size:11px;margin-left:6px}",
  ].join("\n");

  try {
    var styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    if (document.head) document.head.appendChild(styleEl);
  } catch (e) {}

  function getMode() { return localStorage.getItem("rnpl-amll-ttml-mode") || "priority"; }
  function setMode(m) { localStorage.setItem("rnpl-amll-ttml-mode", m); }

  var cache = {}; // dummy for clearCache
  function clearCache() {
    localStorage.setItem("rnpl-amll-ttml-clearcache", Date.now());
    cache = {};
  }

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

  function buildSettingsPanel() {
    var root = document.createElement("div");
    root.className = "rnpl-settings";

    var h4 = document.createElement("h4");
    h4.textContent = "AMLL TTML 歌词源设置";
    root.appendChild(h4);

    var mg = document.createElement("div");
    mg.className = "rnpl-mode-group";
    var modes = [
      { v: "priority", l: "AMLL 优先 (逐词)", d: "优先使用 AMLL 逐词歌词，无则回退网易云" },
      { v: "supplement", l: "补充模式", d: "仅网易云无歌词时从 AMLL 获取" },
      { v: "disabled", l: "仅网易云", d: "不使用 AMLL TTML DB" },
    ];
    var cur = getMode();
    modes.forEach(function (m) {
      var wrap = document.createElement("label");
      wrap.className = "rnpl-radio-row" + (cur === m.v ? " active" : "");
      var inp = document.createElement("input");
      inp.type = "radio"; inp.name = "rnpl-mode"; inp.value = m.v;
      inp.checked = cur === m.v;
      inp.addEventListener("change", function () {
        setMode(m.v);
        var all = root.querySelectorAll(".rnpl-radio-row");
        for (var i = 0; i < all.length; i++) all[i].classList.remove("active");
        wrap.classList.add("active");
      });
      var bd = document.createElement("div");
      var la = document.createElement("div"); la.className = "rnpl-radio-label"; la.textContent = m.l;
      var de = document.createElement("div"); de.className = "rnpl-radio-desc"; de.textContent = m.d;
      bd.appendChild(la); bd.appendChild(de);
      wrap.appendChild(inp); wrap.appendChild(bd);
      mg.appendChild(wrap);
    });
    root.appendChild(mg);

    var hr1 = document.createElement("hr"); hr1.className = "rnpl-divider"; root.appendChild(hr1);

    var mlbl = document.createElement("label"); mlbl.className = "rnpl-mirrors-label";
    mlbl.textContent = "自定义镜像源 (每行一个, {id}=歌曲ID):";
    root.appendChild(mlbl);
    var ta = document.createElement("textarea"); ta.className = "rnpl-mirrors-input";
    ta.placeholder = "https://example.com/ncm/{id}"; ta.value = getMirrors().join("\n");
    ta.addEventListener("change", function () {
      var lines = ta.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      localStorage.setItem("rnpl-amll-ttml-mirrors", JSON.stringify(lines));
      clearCache();
    });
    root.appendChild(ta);
    var hint = document.createElement("div"); hint.className = "rnpl-mirror-hint";
    hint.textContent = "修改后自动清除缓存。{id} 替换为歌曲 ID。";
    root.appendChild(hint);

    var ckRow = document.createElement("label"); ckRow.className = "rnpl-check-row";
    var ck = document.createElement("input"); ck.type = "checkbox";
    ck.checked = localStorage.getItem("rnpl-amll-ttml-debug") === "true";
    ck.addEventListener("change", function () {
      localStorage.setItem("rnpl-amll-ttml-debug", String(ck.checked));
    });
    ckRow.appendChild(ck);
    ckRow.appendChild(document.createTextNode("启用调试面板 (须重载生效)"));
    root.appendChild(ckRow);

    var info = document.createElement("div"); info.className = "rnpl-info";
    info.textContent = "调试面板实时显示歌曲ID/镜像请求/解析结果。切换调试开关后会自动重载页面。";
    root.appendChild(info);

    var cacheBtn = document.createElement("button"); cacheBtn.className = "rnpl-cache-btn";
    cacheBtn.textContent = "清除歌词缓存";
    cacheBtn.addEventListener("click", function () {
      clearCache();
      cacheBtn.textContent = "缓存已清除";
      setTimeout(function () { cacheBtn.textContent = "清除歌词缓存"; }, 2000);
    });
    root.appendChild(cacheBtn);

    var hr2 = document.createElement("hr"); hr2.className = "rnpl-divider"; root.appendChild(hr2);

    var about = document.createElement("div"); about.className = "rnpl-about";
    about.innerHTML =
      '<div class="rnpl-about-title">关于 RNP-AMLL-TTML</div>' +
      '<div>版本: 1.0.0 | 为 RefinedNowPlayingNext 接入 AMLL TTML DB 逐词歌词数据库</div>' +
      '<div>支持翻译、罗马音、动态逐词（YRC）。通过 startup_script hook 拦截歌词数据流。</div>' +
      '<div>GitHub: <a href="https://github.com/TheMyceliumOfAntan/RNP-AMLL-TTML" target="_blank">RNP-AMLL-TTML</a></div>' +
      '<div style="margin-top:4px">镜像数据来自 AMLL TTML DB 社区维护。</div>';
    root.appendChild(about);

    return root;
  }

  if (typeof plugin !== "undefined") {
    plugin.onConfig(function () { return buildSettingsPanel(); });
  }
})();

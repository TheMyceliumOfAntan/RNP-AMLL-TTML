# RNP-AMLL-TTML

为 [RefinedNowPlayingNext](https://github.com/SUlTlUS/refined-now-playing-netease-next) (RNP) 接入 [AMLL TTML DB](https://github.com/amll-dev/amll-ttml-db) 逐词歌词数据库的 BetterNCM 插件。

## 功能

- **TTML 优先模式**：优先使用 AMLL TTML 逐词歌词，无则回退网易云原歌词
- **补充模式**：仅当网易云无歌词时从 AMLL 获取
- **仅网易云模式**：不使用 AMLL 歌词
- **逐词 karaoke**：TTML 解析为 YRC 逐词格式，RNP 原生渲染逐字动画
- **翻译/罗马音**：自动提取 TTML 中的翻译和罗马音
- **多镜像源并行**：默认 4 个镜像同时请求，最先返回的 TTML 生效
- **实时状态**：设置页与调试面板都显示当前歌曲 ID / 歌词源 / 歌词 URL / 解析行数

## 安装

1. 确保已安装 [RefinedNowPlayingNext](https://github.com/SUlTlUS/refined-now-playing-netease-next) 插件
2. 下载 `RNP-AMLL-TTML.plugin`
3. 放入 `%LOCALAPPDATA%\NetEase\CloudMusic\betterncm\plugins\`
4. BetterNCM 设置 → 重载插件

## 设置

在 BetterNCM 插件设置页点击「RNP AMLL TTML 歌词源」：

- **模式切换**：TTML 优先 / 补充模式 / 仅网易云
- **自定义镜像源**：每行一个 URL，`{id}` 替换为歌曲 ID
- **调试面板**：勾选后右下角显示实时日志与状态，**切换后立即生效，无需重载**
- **实时状态**：歌曲 ID / 模式 / 歌词源 / 歌词 URL / 解析结果

设置保存在两处：

- `localStorage` 的 `config.betterncm.rnpl-amll-ttml-source`（BetterNCM 标准插件配置键）
- `C:\betterncm\config.json` 的 `cc.rnpl.amll.cfg`（原生配置文件，重启后保留）

## 默认镜像源

| 序号 | URL |
|------|-----|
| 1 | `https://amlldb.bikonoo.com/ncm-lyrics/{id}.ttml` |
| 2 | `https://amll.mirror.dimeta.top/api/db/ncm-lyrics/{id}.ttml` |
| 3 | `https://amll-ttml-db.gbclstudio.cn/ncm-lyrics/{id}.ttml` |
| 4 | `https://amll-ttml-db.stevexmh.net/ncm/{id}` |

## 技术实现

- `startup_script.js` — BetterNCM 直接注入到 NCM 文档，轮询 RNP 的 `onProcessLyrics` / `rnpDispatchHook` 接管歌词流
- `main.js` — BetterNCM `plugin.onConfig` 提供设置面板
- TTML XML 解析 → NetEase API 格式 (`lrc` + `yrc` + `ytlrc` + `yromalrc`)

### 关键约束

1. **源码必须是纯 ASCII**。`startup_script.js` / `main.js` / `manifest.json` 由 NCM 文档以非 UTF-8 解码，直接写中文会变成 `?`。中文一律写成 `\uXXXX` 转义。
2. **`plugins_runtime` 会被覆盖**。BetterNCM「重载插件」会从 `plugins/*.plugin` 重新解压，改 runtime 目录无效，必须重新打包 `.plugin`。
3. **LRC 与 YRC 行数必须一一对应**，行数不一致时 RNP 会丢弃逐词数据。
4. 歌词里的 `(` 会被替换为全角 `（`，否则 RNP 的 YRC 词解析正则会在该字符处截断。

## License

MIT

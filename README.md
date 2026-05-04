# RNP-AMLL-TTML

为 [RefinedNowPlayingNext](https://github.com/SUlTlUS/refined-now-playing-netease-next) (RNP) 接入 [AMLL TTML DB](https://github.com/amll-dev/amll-ttml-db) 逐词歌词数据库的 BetterNCM 插件。

## 功能

- **TTML 优先模式**：优先使用 AMLL TTML 逐词歌词，无则回退网易云原歌词
- **补充模式**：仅当网易云无歌词时从 AMLL 获取
- **仅网易云模式**：不使用 AMLL 歌词
- **逐词 karaoke**：TTML 解析为 YRC 逐词格式，RNP 原生渲染逐字动画
- **翻译/罗马音**：自动提取 TTML 中的翻译和罗马音
- **多镜像源**：默认 4 个镜像源源，支持自定义
- **调试面板**：右下角浮动面板实时显示歌曲 ID / 镜像请求 / 解析结果

## 安装

1. 确保已安装 [RefinedNowPlayingNext](https://github.com/SUlTlUS/refined-now-playing-netease-next) 插件
2. 下载 `RNP-AMLL-TTML.plugin`
3. 放入 `%LOCALAPPDATA%\NetEase\CloudMusic\betterncm\plugins\`
4. BetterNCM 设置 → 重载插件

## 设置

在 BetterNCM 插件设置页点击「RNP AMLL TTML 歌词源」：

- **模式切换**：TTML 优先 / 补充模式 / 仅网易云
- **自定义镜像源**：每行一个 URL，`{id}` 替换为歌曲 ID
- **调试面板**：勾选后在右下角显示实时调试信息

## 默认镜像源

| 序号 | URL |
|------|-----|
| 1 | `https://amll-ttml-db.stevexmh.net/ncm/{id}` |
| 2 | `https://amlldb.bikonoo.com/ncm-lyrics/{id}.ttml` |
| 3 | `https://amll.mirror.dimeta.top/api/db/ncm-lyrics/{id}.ttml` |
| 4 | `https://amll-ttml-db.gbclstudio.cn/ncm-lyrics/{id}.ttml` |

## 技术实现

- `startup_script.js` — 通过 BetterNCM CEF 的 `executeJavaScript` 直接注入，轮询 RNP 的 `onProcessLyrics` / `rnpDispatchHook`，hook 歌词流程
- `main.js` — BetterNCM `plugin.onConfig` API 提供设置面板
- TTML XML 解析 → NetEase API 格式 (`lrc` + `yrc` + `ytlrc` + `yromalrc`)
- `rnpDispatchHook` (NCM 3.x Redux 路径) + `onProcessLyrics` (NCM 2.x) 双路径 hook

## License

MIT

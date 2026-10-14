# 变更记录

本仓库同时包含两套小程序实现，变更时按「核心改动」拆分提交，并在本文档追加记录。

- **原生离线版**：`miniprogram/`，数据全部内置，无需后端，微信开发者工具直接打开。
- **uni-app 版**：`src/` + `dist/build/mp-weixin/`，需部署 HTTPS 后端（见 `docs/wechat.md`）。

`project.config.json` 的 `miniprogramRoot` 决定开发者工具加载哪一套；两套不要同时用同一 AppID 调试。

## 2026-10-15

### 迁移（git: ca00c7d）

开发目录迁移至 `WeChatProjects/live_better`，详见 `docs/migration.md`。迁移后开发者工具指向 uni-app 构建产物 `dist/build/mp-weixin/`，需 HTTPS 后端才有数据。

### 恢复原生离线小程序（本次）

uni-app 版依赖后端 API（未部署时列表为空并提示「请配置 HTTPS 后端地址」），因此将原生离线版恢复到 `miniprogram/`，与 uni-app 源码并存：

- `miniprogram/`：原生小程序完整实现
  - 主包：指南列表（34 章 699 条）、收益口径/章节/证据/性价比/钱/时间/毅力/人群筛选、争议与待核实开关、章节/性价比/证据三种排序（与 `packages/domain/catalog.ts` 的 `filterGuides`/`roiOf` 同口径）、分页加载、收藏
  - 分包 `packageDetail/`：详情页（说人话/成本/完整收益/备注/人群条件/原始来源）、出处与固定版本链接复制、条目分享、行动状态（准备做/进行中/已完成/暂不适用/移出）与备注
  - `utils/store.js`：收藏与行动清单本地存储
  - `scripts/gen_data.py`：从 `data/catalog.json` 生成 `data/guides.js`（349KB）与 `packageDetail/data/details.js`（1.9MB），上游更新后重跑即可
  - `components/navigation-bar`：原模板组件已随迁移删除，重写了兼容同名 API 的实现
- `project.config.json`：`miniprogramRoot` 由 `dist/build/mp-weixin/` 改为 `miniprogram/`，`packOptions` 忽略 `scripts/`
- `project.private.config.json`：`skylineRenderEnable` 改回 `true`（原生版为 Skyline 渲染；uni-app 版为 webview）

内容来源：《高性价比人生指南》(HowToLiveBetter)，作者 eternity4719，CC BY 4.0；来源与固定版本在应用内展示。

### 原生版视觉改版（对齐 uni-app 设计）

对齐 uni-app 版的暖纸色 + 深绿设计语言：

- 全局：页面背景改为暖纸色 `#fffdf6`，主色深绿 `#214d3f`，辅助绿 `#44745b`/`#477347`，卡片白底细边框 `#e3e6db`、24rpx 圆角
- 首页新增 Hero 头部（「把有限的精力，花在值得的地方。」+ 章节数/条数统计）与「给今天的你」浅绿引言卡，位于列表顶部、随内容滚动
- 标签体系与 uni-app 一致：性价比/状态浅绿 `#eef3e8`，证据琥珀 `#faf0d9`/`#956e27`，争议红、待核实橙
- 筛选按钮改为浅绿药丸 `#e7eddf`；口径/开关激活态为深绿实底；搜索框改白底细边框
- 详情页：分区标题辅助绿、正文行高 1.8、行动主按钮深绿；清单勾选框、空态按钮等同步换色

### 首页布局重构：落地页优先

解决首屏信息过载问题（宣言、引言、搜索、筛选、排序混在一起）：

- 首屏为「落地页」：Hero 宣言 + 引言卡 + 「↓ 下滑，开始探索指南」提示，垂直居中、独立成屏
- 搜索框、收益口径、picker 筛选、争议/待核实开关、排序移入滚动流中的「指南库」区块（带结果计数），下滑后自然衔接卡片列表
- 原固定筛选栏删除；任何筛选/搜索/排序生效时，右下角出现「↑ 筛选」悬浮按钮，点击经 `scroll-into-view` 一键回到筛选区（解决筛选区被滚走后的可达性）
- 结果数移至指南库标题行，排序说明文案保留在筛选区底部
- 「开始探索指南」提示改为药丸按钮（箭头浮动动画引导点击），点击后经 `scroll-into-view` + `scroll-with-animation` 平滑滚动到指南库，无需手动慢划

### 真机编译修复：wxss 中文类名选择器

真机调试上传时报 `unexpected` wxss 编译错误：清单状态标签用了中文类名选择器（`.st-准备做` 等），工具端能编译但真机上传的 wxss 编译器不支持类名中的多字节字符。改为 ASCII 类名 `st-ready / st-doing / st-done / st-na`，由 `index.js` 的 `STATUS_CLASS` 映射，`item.stClass` 传给 wxml。已扫描确认全部 wxss 选择器无非 ASCII 字符；约定：wxss 类名一律 ASCII，中文文案放在 JS 数据或 wxml 文本里。

### P0 合规与分享（另一 agent 实施，本次审查）

- **协议页** `pages/agreement/`：单页双标签（用户协议/隐私政策），`?type=privacy|terms` 定位，主包注册，文案如实描述离线属性（数据仅本机、不联网、无账号、无隐私接口、CC BY 4.0 署名、免责、联系邮箱）
- **分享**：首页与详情页均实现 `onShareAppMessage`（好友）与 `onShareTimeline`（朋友圈）+ `wx.showShareMenu`；首页用品牌标语，详情页用条目标题带 `id` 深链；分享图 `/assets/share-cover.png`（1000×800，5:4，45KB），由仓库根 `scripts/render-share-cover.mjs`（Playwright 2x 截图）生成
- **协议入口**：首页署名区与详情页 footnote 各加「用户协议 · 隐私政策」链接
- 待验证：朋友圈单页模式打开分包详情页可能受限（官方单页模式限制），真机确认；公众后台需填写《用户隐私保护指引》（非代码事项）

### 指南库简化：高级筛选折叠 + 搜索防抖

- 口径行（全部指南/换寿命…）、picker 筛选、争议/待核实、排序全部收进**可折叠筛选面板**，指南库默认只有搜索框 + 「筛选 ▾」按钮（激活的筛选数显示为 `筛选 · N`，展开时按钮变深绿）
- 右下角「↑ 筛选」悬浮按钮现在会同时展开面板再滚动定位
- 搜索为输入自动触发（`bindinput`），新增 300ms 防抖，避免逐键重算 699 条列表造成输入卡顿

## 维护约定

1. 每个核心改动单独 `git add` + 提交（conventional commits，与既有历史风格一致）。
2. 核心改动同步追加到本文档，含日期、涉及文件与验证方式。
3. 上游知识库更新：`python3 miniprogram/scripts/gen_data.py` 重新生成数据后提交。

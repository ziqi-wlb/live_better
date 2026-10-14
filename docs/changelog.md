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

## 维护约定

1. 每个核心改动单独 `git add` + 提交（conventional commits，与既有历史风格一致）。
2. 核心改动同步追加到本文档，含日期、涉及文件与验证方式。
3. 上游知识库更新：`python3 miniprogram/scripts/gen_data.py` 重新生成数据后提交。

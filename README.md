# 高性价比人生笔记

基于 [HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter) 的生活指南工具仓库。

本仓库里有两套实现，别弄混：

- `miniprogram/` —— **当前在微信小程序里上线的版本**（原生小程序 + Skyline）。内容全部内置，离线可用；不联网、不登录、不读取任何用户信息；可按章节、证据等级、性价比和「花钱 / 花时间 / 要毅力」三个成本维度筛选，另有今日一条、收藏与行动清单。
- `src/`、`apps/`、`packages/` —— 较早的 uni-app 版（H5 + API，含开发登录与服务端保存），仅作留存。

下面「本地启动」起的内容主要讲 uni-app 版。原生版请用微信开发者工具直接打开 `miniprogram/` 目录。

## 介绍文章

写过一篇短文，讲为什么要把每条建议都标上「值不值」和「可不可信」，以及这套标注在手机上怎么用：

https://zhuanlan.zhihu.com/p/2099820028094836974

![高性价比人生笔记](docs/zhihu-cover.png)

> 封面图由 `npm run render:cover-zhihu` 生成，输出 1920×1080。画布写成 16:9 是因为知乎封面按横图显示，5:4 会被裁掉上下。图上的条数和章节数由脚本从 `miniprogram/data/guides.js` 读，不用手改。

## 项目作者

作者：ziqi-wlb（https://github.com/ziqi-wlb）

联系方式不放进 README，需要请联系上面的 GitHub 主页。知识库内容作者为 eternity4719，来源与许可见下文。

## 本地启动

克隆后在本仓库根目录操作，微信开发者工具直接打开 `miniprogram/`；迁移记录见 [docs/migration.md](docs/migration.md)。

需要 Node.js 22.13+（推荐 24/26，本次使用 26）、npm。

```sh
git submodule update --init --recursive
npm ci
npm run dev
```

打开 http://127.0.0.1:5173 。API 位于 http://127.0.0.1:8787 。两者仅绑定本机；H5 通过 Vite 代理访问 API。`npm run dev` 会自动导入全书 34 章正文。可将 `.env.example` 复制为 `.env` 调整配置，默认本地启用开发登录，生产始终关闭。

`npm run import` 导入内容；`npm test` 检查导入、排序、权限、隔离、合并和注销；`npm run typecheck` 检查类型；`npm run build` 构建 H5；`npm run build:mp` 构建微信产物到 `dist/build/mp-weixin`。

浏览器验收：`npx playwright install chromium` 后，保持开发服务运行，执行 `npx playwright test tests/browser.spec.mjs --workers=1`。

## 重建内容数据

`npm run import` 从上游 HowToLiveBetter 抓取正文，生成 `data/catalog.json`（这个文件不入库）。

原生小程序的数据由它生成，**随版本入库**：

```sh
python3 miniprogram/scripts/gen_data.py          # 读 data/catalog.json
```

产出 `miniprogram/data/guides.js` 与两个分包的 `details.js`。条数、章节数、本次同步的上游提交号（`sourceCommit`）都由脚本写入，不要手改。

## 数据与登录

访客记录存在浏览器/uni storage；开发账号记录位于 `data/life.sqlite`，会话使用 HttpOnly、SameSite cookie。开发登录每次创建独立随机账号，用于验证隔离与合并，不是正式微信身份。会话 7 天后需重新登录；当前没有自动刷新接口。合并保留已有服务端记录，返回冲突 ID，本地原记录保留。正文通过文本节点展示，Markdown 不执行 HTML。

`data/identity.json` 提交到 Git，用于跨导入保留条目身份；`data/catalog.json`、SQLite 和 `.env` 不提交。上游改名/删除条目时导入会中止，需审核身份映射后更新，不自动迁移错条目。

## 微信与上线边界

v0.2 已接入注册 AppID、微信请求地址、code 登录、原生会话、退出注销及条目分享。配置和开发者工具导入方法见 [docs/wechat.md](docs/wechat.md)。真实微信登录及真机运行仍需 HTTPS 后端部署、服务端 AppSecret 和平台合法域名配置；不要把本地开发登录用于上线。

依赖使用 DCloud 官方 `vue3` 发布系列并锁定版本。当前 npm audit 有上游工具链及传递依赖告警，发布前需升级/复核依赖及构建产物；不执行可能破坏 DCloud 版本兼容性的 `audit fix --force`。

产品规划见 [agent.md](agent.md)，接口见 [docs/api.md](docs/api.md)。本项目新增代码采用 MIT 许可，见 [LICENSE](LICENSE)；内容属 eternity4719，CC BY 4.0，署名信息见 [ATTRIBUTION.md](ATTRIBUTION.md)。正文属于 eternity4719 的《高性价比人生指南》，CC BY 4.0：https://creativecommons.org/licenses/by/4.0/ 。来源和固定版本在应用「我的」及详情中展示。

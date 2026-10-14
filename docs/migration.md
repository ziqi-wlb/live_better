# 开发目录迁移（2026-10-15）

主开发目录改为 `/Users/ziqi/WeChatProjects/live_better/`。完整 Git 历史、源代码、固定上游 submodule、依赖、内容目录及本地 SQLite 快照已迁入。数据库通过 VACUUM INTO 创建一致快照；原数据库保留。

目标目录原有原生微信项目完整保存在 `/Users/ziqi/WeChatProjects/live_better-before-migration-20261015-0225/`，含原页面、数据、分包和脚本，可查阅或恢复。没有将两套页面混编。保留原开发者工具私有配置，关闭 Skyline 开关以匹配 uni-app 当前默认渲染器。

微信开发者工具打开当前主目录，`project.config.json` 将小程序根指向 `dist/build/mp-weixin/`。运行 `npm run build:mp` 后编译；`npm run dev` 启动 H5/API。旧源码目录 `/Users/ziqi/project/github/live_better/` 保留作为迁移前副本，后续开发与提交在新目录进行。

克隆保留了指向旧本地仓库的 origin，这是本地来源路径，不是发布远端。未推送。后续若发布 GitHub，再配置实际远端。

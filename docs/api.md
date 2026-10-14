# v0.1 本地接口

基址 `/api/v1`。写请求需要 `Origin: http://127.0.0.1:5173` 与 `X-Life-Client: 1`；浏览器 cookie 自动携带。所有用户数据按服务端会话用户 ID 隔离。未登录返回 401，来源检查失败返回 403，参数错误返回 400。

- `GET /catalog/meta`：真实数量、章节、枚举、导入日期、提交及开发登录是否启用。
- `GET /guides`：q、chapter、outcome、evidenceGrade、roi、money、time、effort、audience、controversy=1、needsVerification=1、sort=chapter|roi|evidence、offset、limit（最多 50）。返回 total、items、nextOffset。roi 排序须指定 outcome。
- `GET /guides/:id`：完整正文、备注、原始 Markdown 与固定版本来源。
- `POST /auth/dev`：开发模式，正文 `{consent:true}`；随机账号及 7 天 cookie 会话。
- `POST /auth/wechat`：预留，当前 501；`DELETE /auth/session` 退出。
- `GET /me`：当前用户；`PATCH /me/preferences`：可选 outcome。
- `GET /me/saved`、`GET /me/actions`：按条目 ID 映射的记录。
- `PUT /me/saved/:id`：`{saved:true}`；`PUT /me/actions/:id`：`{status:"准备做|进行中|已完成|暂不适用",note:"..."}`，备注最多 2000 字。相应 DELETE 删除记录。
- `POST /me/merge-local`：`{saved:{id:{saved:true}},actions:{id:{status,note}}}`；事务内幂等新增，已有不同记录保留并返回 conflicts。
- `GET /me/export`：用户记录 JSON；`DELETE /me`：注销并级联清除用户数据与会话。

人群=单项筛选表示「包含此标签的条目」，详情展示原始 OR/AND 条件，不声称完成个体适用性判断。v0.1 使用 offset 分页；微信 token 会话与刷新、cursor 分页、场景包和对照视图留待后续。

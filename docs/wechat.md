# 微信端 v0.2 配置与验收

已从 `/Users/ziqi/WeChatProjects/live_better/project.config.json` 确认 AppID `wxf6089afd28b90008`，本机基础库版本为 3.17.4。原项目保留；主源码在当前 Git 仓库。原项目使用 Skyline，本产品目前使用 uni-app 默认渲染器，不直接复制渲染配置。

## 配置

将 `.env.example` 复制为 `.env` 并设置：

```dotenv
WECHAT_APP_ID=wxf6089afd28b90008
WECHAT_APP_SECRET=仅在服务端填写
VITE_API_BASE_URL=https://你的后端域名
ENABLE_DEV_AUTH=0
```

小程序必须使用完整 HTTPS API 地址；H5 本地调试时 VITE_API_BASE_URL 留空，继续使用 Vite 代理。正式 H5 需同源部署，以保持 cookie 与 CSRF 来源一致。AppSecret 不能使用 VITE_ 前缀，不能提交 Git。

运行 `npm run import`、`npm run build:mp`，在微信开发者工具导入 `/Users/ziqi/project/github/live_better/dist/build/mp-weixin`，选择对应 AppID。构建后脚本写入 AppID 与 urlCheck。通过微信后台设置 HTTPS 合法请求域名，服务端配置同一 AppID/AppSecret。在工具中使用 3.17.4 或更新的受支持基础库检查。

## 已实现

- `uni.login` 获取 code，服务端请求官方 jscode2session；openid 与 session_key 不返回客户端。
- 同一微信身份恢复同一账号；重复 code 拒绝；会话凭证仅存摘要到数据库，小程序本地保存 7 天凭证。
- 原生请求使用 Bearer token，H5 保留 HttpOnly cookie。原生平台头不是身份凭证，所有个人数据接口仍验证服务端会话。
- 退出撤销当前会话；注销级联删除该用户数据、全部会话和身份映射；过期/401 清除本机会话，恢复访客状态。
- 条目分享通过 guide 参数定位真实条目；朋友圈分享同样保留定位参数。
- 登录前展示隐私说明并调用支持的微信隐私授权接口；拒绝登录不影响访客查阅。

## 仍需真实环境验证

注册账号不等于后端已部署。当前未提供域名/AppSecret，真实登录交换、微信网络、隐私弹窗及真机分享尚未验证。后台隐私声明需填写账号标识、收藏、行动、备注的用途及删除方式，并确保声明与实际行为一致。微信隐私要求以后台当时规则为准。

验收流程：访客浏览 → 收藏 → 同意隐私 → 微信登录 → 合并 → 退出重登确认恢复 → 换账号确认隔离 → 分享并打开条目 → 注销确认记录删除。另测失效 code、弱网、会话过期、拒绝授权、iOS/Android 小屏布局。生产依赖审计、备案、类目及内容审核按上线清单处理。

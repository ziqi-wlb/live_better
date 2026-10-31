# 内容署名

本仓库中的**生活建议内容**不是本项目的原创作品，来自开源书籍《高性价比人生指南》。
按 CC BY 4.0 的要求，署名信息如下。

| 项目 | 内容 |
|---|---|
| 标题 | 《高性价比人生指南》（HowToLiveBetter） |
| 作者 | eternity4719 |
| 来源 | https://github.com/eternity4719/HowToLiveBetter |
| 许可 | CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/ |

## 覆盖范围

- `miniprogram/data/guides.js`
- `miniprogram/packageDetail/data/details.js`
- `miniprogram/packageDetail2/data/details.js`

以上均为 `miniprogram/scripts/gen_data.py` 从 `data/catalog.json` 生成，**不要手改**。
条数、章节数、每段的出处链接与本次同步对应的上游提交号（`sourceCommit` 字段）都由脚本写入。

## 本项目做了哪些改动

按 CC BY 4.0 的要求标明改动：

- 移动端重排：适合手机屏幕的摘要形式
- 新增筛选：性价比、证据等级、花钱 / 花时间 / 要毅力三个成本维度、适用人群、只看争议
- 新增功能：今日一条、收藏、行动清单（准备做 / 进行中 / 已完成 / 暂不适用）与备注、带同义词的离线搜索

## 在什么地方能看到署名

小程序内两处可见，一处在「使用说明」页，一处在每条建议的详情底部：
标题名、作者名、来源仓库链接、许可地址，以及「这是改编版本」的说明。

## 免责

书里的内容可能过时，政策各地执行不一样。真去办事、看病、打官司时，
以当地部门、医生和律师的说法为准。发现内容写错，请到上游仓库提 issue，
上游改正后跑一次 `gen_data.py` 即可同步。

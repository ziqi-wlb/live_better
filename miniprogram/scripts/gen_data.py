#!/usr/bin/env python3
"""从 uni-app 工程的 data/catalog.json 生成小程序数据文件。

生成：
  miniprogram/data/guides.js                 —— 主包列表轻量数据（含筛选/排序所需全部字段）
  miniprogram/packageDetail/data/details.js  —— 分包详情重数据

用法：python3 miniprogram/scripts/gen_data.py [catalog.json 路径]
默认读取仓库根目录 data/catalog.json，其次读取 ~/project/github/live_better/data/catalog.json。
内容来源：HowToLiveBetter（eternity4719），CC BY 4.0，需保留署名。

字段说明（列表）：
  roi 性价比（与 packages/domain/catalog.ts 的 roiOf 同口径计算）
  out 收益口径（死亡率/金钱/时间/自由）；band 收益档（大/中/小）
  money 钱（0/少/多）；time 时间（少/中/多）；effort 毅力（否/些/是）
  ev 证据等级（A/B/C）；cv 有争议；nv 待核实；aud 人群条件
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # miniprogram/
REPO = os.path.dirname(ROOT)

CANDIDATES = [
    os.path.join(REPO, 'data', 'catalog.json'),
    os.path.expanduser('~/project/github/live_better/data/catalog.json'),
]

ATTRIBUTION = '《高性价比人生指南》(HowToLiveBetter)，作者 eternity4719，遵循 CC BY 4.0：creativecommons.org/licenses/by/4.0/'
LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
REPO_URL = 'https://github.com/eternity4719/HowToLiveBetter'

# 与 packages/domain/catalog.ts 保持一致
OUTCOMES = {'死亡率': '换寿命', '金钱': '换钱', '时间': '换时间精力', '自由': '换人身自由'}
WEIGHTS = {
    'money': {'0': 0, '少': 1, '多': 2},
    'time': {'少': 0, '中': 1, '多': 2},
    'effort': {'否': 0, '些': 1, '是': 2},
}


def find_catalog():
    for path in CANDIDATES:
        if os.path.exists(path):
            return path
    raise SystemExit('未找到 catalog.json，请检查 data/ 目录或手动指定路径')


def roi_of(g):
    values = [WEIGHTS[k].get(g.get(k)) for k in ('money', 'time', 'effort')]
    band = g.get('benefitBand')
    if any(v is None for v in values) or band not in ('大', '中', '小'):
        return '未标注'
    total = sum(values)
    if band == '大':
        return '极高' if total == 0 else ('高' if total <= 2 else '一般')
    if band == '中' and total == 0:
        return '高'
    return '一般'


def summarize(text, limit=88):
    text = (text or '').strip().replace('\n', ' ')
    if len(text) <= limit:
        return text
    cut = text[:limit]
    for punct in ('。', '；', '，'):
        p = cut.rfind(punct)
        if p > 30:
            return cut[: p + 1] + '……'
    return cut + '……'


def js_str(value):
    return json.dumps(value, ensure_ascii=False)


def main():
    catalog_path = sys.argv[1] if len(sys.argv) > 1 else find_catalog()
    with open(catalog_path, encoding='utf-8') as f:
        catalog = json.load(f)

    chapters = [
        {'id': int(c['id']), 'title': c['title']}
        for c in catalog['chapters']
    ]

    guides = []
    details = []
    for g in catalog['guides']:
        gid = g['id']
        guides.append(
            '  {' + ', '.join([
                f'id: {js_str(gid)}',
                f'ch: {int(g["chapterId"])}',
                f'no: {int(g.get("itemNumber") or 0)}',
                f'title: {js_str(g["title"])}',
                f'summary: {js_str(summarize(g.get("plainText")))}',
                f'out: {js_str(g.get("outcome") or "")}',
                f'band: {js_str(g.get("benefitBand") or "")}',
                f'roi: {js_str(roi_of(g))}',
                f'money: {js_str(g.get("money") or "")}',
                f'time: {js_str(g.get("time") or "")}',
                f'effort: {js_str(g.get("effort") or "")}',
                f'ev: {js_str(g.get("evidenceGrade") or "C")}',
                'cv: true' if g.get('controversy') else 'cv: false',
                'nv: true' if g.get('needsVerification') else 'nv: false',
                f'aud: {js_str(g.get("audienceGroups") or [])}',
            ]) + '}'
        )
        details.append(
            '  {0}: {{ text: {1}, costText: {2}, benefitText: {3}, notes: {4}, source: {5}, audienceGroups: {6}, links: {7}, sourcePath: {8} }}'.format(
                js_str(gid),
                js_str((g.get('plainText') or '').strip()),
                js_str((g.get('costText') or '').strip()),
                js_str((g.get('benefitText') or '').strip()),
                js_str((g.get('notes') or '').strip()),
                js_str((g.get('sourceText') or '').strip().replace('<', '').replace('>', '')),
                js_str(g.get('audienceGroups') or []),
                js_str(g.get('links') or []),
                js_str(g.get('sourcePath') or ''),
            )
        )

    chapter_lines = ', '.join(
        f'{{ id: {c["id"]}, title: {js_str(c["title"])} }}' for c in chapters
    )
    outcomes_line = ', '.join(
        f'{js_str(k)}: {js_str(v)}' for k, v in OUTCOMES.items()
    )
    audiences = ['怀孕', '婴幼儿', '孩子', '老人', '35岁', '60岁', '女性']
    audiences_line = ', '.join(js_str(a) for a in audiences)

    guides_js = (
        '// 本文件由 scripts/gen_data.py 生成，请勿手改。\n'
        f'// 内容来源：{ATTRIBUTION}\n'
        '// 筛选字段与 packages/domain/catalog.ts 同口径\n'
        'module.exports = {\n'
        f'  attribution: {js_str(ATTRIBUTION)},\n'
        f'  licenseUrl: {js_str(LICENSE_URL)},\n'
        f'  repoUrl: {js_str(REPO_URL)},\n'
        f'  sourceCommit: {js_str(catalog.get("sourceCommit") or "")},\n'
        f'  importedAt: {js_str(catalog.get("importedAt") or "")},\n'
        f'  outcomes: {{ {outcomes_line} }},\n'
        f'  audiences: [{audiences_line}],\n'
        f'  chapters: [{chapter_lines}],\n'
        f'  guides: [\n{", ".join(guides)}\n  ]\n'
        '};\n'
    )

    details_js = (
        '// 本文件由 scripts/gen_data.py 生成，请勿手改。详情数据按需加载。\n'
        f'// 内容来源：{ATTRIBUTION}\n'
        'module.exports = {\n'
        f'  attribution: {js_str(ATTRIBUTION)},\n'
        f'  repoUrl: {js_str(REPO_URL)},\n'
        f'  sourceCommit: {js_str(catalog.get("sourceCommit") or "")},\n'
        f'  items: {{\n{", ".join(details)}\n  }}\n'
        '};\n'
    )

    guides_path = os.path.join(ROOT, 'data', 'guides.js')
    details_path = os.path.join(ROOT, 'packageDetail', 'data', 'details.js')
    os.makedirs(os.path.dirname(guides_path), exist_ok=True)
    os.makedirs(os.path.dirname(details_path), exist_ok=True)
    with open(guides_path, 'w', encoding='utf-8') as f:
        f.write(guides_js)
    with open(details_path, 'w', encoding='utf-8') as f:
        f.write(details_js)

    print(f'catalog: {catalog_path}')
    print(f'chapters: {len(chapters)}, guides: {len(guides)}')
    print(f'guides.js: {os.path.getsize(guides_path) // 1024} KB')
    print(f'details.js: {os.path.getsize(details_path) // 1024} KB')


if __name__ == '__main__':
    main()

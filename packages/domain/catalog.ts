export const outcomes = { '死亡率': '换寿命', '金钱': '换钱', '时间': '换时间精力', '自由': '换人身自由' };
export const weights: Record<string, Record<string, number>> = { money: { '0': 0, '少': 1, '多': 2 }, time: { '少': 0, '中': 1, '多': 2 }, effort: { '否': 0, '些': 1, '是': 2 } };
export const audiences = ['怀孕', '婴幼儿', '孩子', '老人', '35岁', '60岁', '女性'];
export interface Guide { id: string; chapterId: string; chapterTitle: string; itemNumber: number; title: string; plainText: string; costText: string; benefitText: string; evidenceGrade: string; sourceText: string; links: string[]; notes: string; money: string; time: string; effort: string; benefitBand: string; outcome: string; audienceGroups: string[][]; roi: string; controversy: boolean; needsVerification: boolean; sourcePath: string; sourceCommit: string; contentHash: string; rawMarkdown: string }
export interface Catalog { sourceCommit: string; importedAt: string; chapters: { id: string; title: string; count: number }[]; guides: Guide[] }
export function roiOf(g: Pick<Guide, 'money'|'time'|'effort'|'benefitBand'>) {
  const values = ['money', 'time', 'effort'].map(k => weights[k][g[k as 'money'|'time'|'effort']]);
  if (values.some(v => v === undefined) || !['大','中','小'].includes(g.benefitBand)) return '未标注';
  const sum = values.reduce((a,b) => a+b, 0);
  return g.benefitBand === '大' ? (sum === 0 ? '极高' : sum <= 2 ? '高' : '一般') : g.benefitBand === '中' && sum === 0 ? '高' : '一般';
}
export function filterGuides(guides: Guide[], q: Record<string,string>) {
  if (q.sort === 'roi' && !q.outcome) throw new Error('性价比排序需要先选择收益口径');
  const result = guides.filter(g => {
    for (const k of ['outcome','money','time','effort','roi','evidenceGrade']) if(q[k] && g[k as keyof Guide] !== q[k]) return false;
    if(q.chapter && g.chapterId !== q.chapter) return false;
    if(q.audience && !g.audienceGroups.some(group => group.includes(q.audience))) return false;
    if(q.controversy === '1' && !g.controversy) return false;
    if(q.needsVerification === '1' && !g.needsVerification) return false;
    return !q.q || [g.title,g.plainText,g.costText,g.benefitText,g.notes,g.sourceText].join('\n').toLowerCase().includes(q.q.toLowerCase());
  });
  const rank = (v:string) => ['极高','高','一般','未标注'].indexOf(v);
  return result.sort((a,b) => {
    if(q.sort === 'roi') { const diff = rank(a.roi)-rank(b.roi) || ['money','time','effort'].reduce((d,k) => d || (weights[k][a[k as 'money']] ?? 9)-(weights[k][b[k as 'money']] ?? 9),0); if(diff) return diff; }
    if(q.sort === 'evidence') {const diff = a.evidenceGrade.localeCompare(b.evidenceGrade); if(diff) return diff;}
    return Number(a.chapterId)-Number(b.chapterId) || a.itemNumber-b.itemNumber;
  });
}

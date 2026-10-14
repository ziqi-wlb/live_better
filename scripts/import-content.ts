import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { roiOf, weights, outcomes, audiences, type Guide, type Catalog } from '../packages/domain/catalog.ts';

const sourceCommit = execFileSync('git',['-C','HowToLiveBetter','rev-parse','HEAD'],{encoding:'utf8'}).trim();
const old: Catalog | undefined = existsSync('data/catalog.json') ? JSON.parse(readFileSync('data/catalog.json','utf8')) : undefined;
const registry: Record<string,string> = existsSync('data/identity.json') ? JSON.parse(readFileSync('data/identity.json','utf8')) : {};
const guides: Guide[] = []; const chapters: Catalog['chapters'] = [];
for(const file of readdirSync('HowToLiveBetter/book').filter(f=>f.endsWith('.md')).sort()) {
  const sourcePath = `book/${file}`; const md = readFileSync(`HowToLiveBetter/${sourcePath}`,'utf8');
  const chapter = md.match(/^# (\d+)\. (.+)$/m); if(!chapter) throw new Error(`章节解析失败 ${file}`);
  const sections = [...md.matchAll(/^### (\d+)\. (.+)\n([\s\S]*?)(?=^### |$(?![\s\S]))/gm)];
  for(const m of sections) {
    const fields: Record<string,string> = {}; let field = '';
    for(const line of m[3].split('\n')) {const f = line.match(/^- (成本|说人话|收益|证据等级|来源|备注)：\s*(.*)$/); if(f){field=f[1];fields[field]=f[2];} else if(field && line.trim() && !line.startsWith('<!--')) fields[field] += '\n'+line;}
    for(const required of ['成本','说人话','收益','证据等级','来源']) if(!fields[required]) throw new Error(`缺失 ${file}/${m[1]} ${required}`);
    const tags = Object.fromEntries([...(m[3].match(/<!-- 成本标签:\s*(.*?)-->/)?.[1] ?? '').matchAll(/(\S+)=(\S+)/g)].map(t=>[t[1],t[2]]));
    const evidence = fields['证据等级'].match(/^[ABC]/)?.[0] ?? '';
    const identityKey = `${chapter[1]}:${m[2].trim()}`;
    if(guides.some(g=>g.chapterId===chapter[1] && g.title===m[2].trim())) throw new Error('重复标题需人工检查');
const id = registry[identityKey] ?? randomUUID(); registry[identityKey]=id;
const g: Guide = {id,chapterId:chapter[1],chapterTitle:chapter[2],itemNumber:Number(m[1]),title:m[2].trim(),plainText:fields['说人话'],costText:fields['成本'],benefitText:fields['收益'],evidenceGrade:evidence,sourceText:fields['来源'],links:[...new Set([...fields['来源'].matchAll(/https?:\/\/[^\s<>]+/g)].map(x=>x[0].replace(/[)）。，；;]+$/,'')))],notes:fields['备注']??'',money:tags['钱']??'',time:tags['时间']??'',effort:tags['毅力']??'',benefitBand:tags['收益']??'',outcome:tags['口径']??'',audienceGroups:tags['人群']?tags['人群'].split(',').map(x=>x.split('+')):[],roi:'',controversy:/^争议/.test(fields['备注']??''),needsVerification:/待核实|TODO/.test(m[3]),sourcePath,sourceCommit,contentHash:createHash('sha256').update(m[0]).digest('hex'),rawMarkdown:m[0]};
    for(const k of ['money','time','effort']) if(g[k as 'money'] && weights[k][g[k as 'money']]===undefined) throw new Error(`未知成本 ${file}`);
    if(!Object.keys(outcomes).includes(g.outcome) || !['A','B','C'].includes(g.evidenceGrade) || !['大','中','小'].includes(g.benefitBand)) throw new Error(`未知标签 ${file}/${m[1]}`);
    if(g.audienceGroups.flat().some(a=>!audiences.includes(a))) throw new Error('未知人群');
    g.roi=roiOf(g); guides.push(g);
  }
  if(!sections.length) throw new Error(`空章节 ${file}`);
  chapters.push({id:chapter[1],title:chapter[2],count:sections.length});
}
if(old && old.sourceCommit!==sourceCommit) {
  const deleted = old.guides.filter(g=>!guides.some(n=>n.id===g.id));
  if(deleted.length) throw new Error(`上游删除或改名 ${deleted.length} 条；请先审核身份映射，旧目录保留`);
}
mkdirSync('data',{recursive:true});
writeFileSync('data/identity.json',JSON.stringify(registry,null,2)+'\n');
writeFileSync('data/catalog.json',JSON.stringify({sourceCommit,importedAt:new Date().toISOString(),chapters,guides}));
console.log(`已导入 ${chapters.length} 章 / ${guides.length} 条；${sourceCommit.slice(0,7)}`);

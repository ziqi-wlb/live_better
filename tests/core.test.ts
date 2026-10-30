import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterGuides,roiOf,type Catalog} from '../packages/domain/catalog.ts';
import {createApp} from '../apps/api/app.ts';
const catalog:Catalog=JSON.parse(readFileSync('data/catalog.json','utf8'));
test('全量内容、来源、档位与稳定身份',()=>{
 // 条数随内容同步变化，不要写死。历史上从 699 涨到 765 时这里没跟上，
 // 测试就一直红着。改成守住下限 + 自洽校验，数据更新不用动测试。
 const n=catalog.guides.length;
 assert.ok(n>=700,`内容条数不应低于 700，实际 ${n}`);
 assert.equal(catalog.chapters.length,34);
 assert.equal(new Set(catalog.guides.map(g=>g.id)).size,n);
 const top=catalog.guides.filter(g=>g.roi==='极高').length;
 const high=catalog.guides.filter(g=>g.roi==='高').length;
 assert.ok(top>0&&high>0,'性价比档位不应为空');
 assert.ok(top+high<=n);
 for(const g of catalog.guides){assert.ok(g.rawMarkdown&&g.sourceText&&g.contentHash);assert.equal(g.roi,roiOf(g));}
});
test('组合筛选、同口径排序及未知成本边界',()=>{
 assert.throws(()=>filterGuides(catalog.guides,{sort:'roi'}));
 const g=filterGuides(catalog.guides,{outcome:'死亡率',evidenceGrade:'A',money:'0',sort:'roi'});assert.ok(g.length>0);assert.ok(g.every(x=>x.outcome==='死亡率'&&x.evidenceGrade==='A'&&x.money==='0'));
 assert.equal(roiOf({money:'',time:'少',effort:'否',benefitBand:'大'}),'未标注');
});
test('鉴权、CSRF、保存、幂等合并、用户隔离及注销',async()=>{
 const app=await createApp(catalog,{devAuth:true});const headers={origin:'http://127.0.0.1:5173','x-life-client':'1'};const id=catalog.guides[0].id;
 try{
 assert.equal((await app.inject({url:'/api/v1/me'})).statusCode,401);
 assert.equal((await app.inject({method:'POST',url:'/api/v1/auth/dev',payload:{consent:true}})).statusCode,403);
 const login=await app.inject({method:'POST',url:'/api/v1/auth/dev',headers,payload:{consent:true}});assert.equal(login.statusCode,200);const cookie=login.headers['set-cookie']!.toString().split(';')[0];const h={...headers,cookie};
 assert.equal((await app.inject({method:'PUT',url:'/api/v1/me/actions/'+id,headers:h,payload:{status:'进行中',note:'test'}})).statusCode,200);
 const payload={saved:{[id]:{saved:true}},actions:{[id]:{status:'准备做',note:'visitor'}}};
 for(let i=0;i<2;i++){const merge=await app.inject({method:'POST',url:'/api/v1/me/merge-local',headers:h,payload});assert.deepEqual(merge.json().conflicts,[id]);}
 const actions=await app.inject({url:'/api/v1/me/actions',headers:h});assert.equal(actions.json()[id].status,'进行中');
 const second=await app.inject({method:'POST',url:'/api/v1/auth/dev',headers,payload:{consent:true}});const h2={...headers,cookie:second.headers['set-cookie']!.toString().split(';')[0]};assert.deepEqual((await app.inject({url:'/api/v1/me/saved',headers:h2})).json(),{});
 assert.equal((await app.inject({url:'/api/v1/guides?sort=roi'})).statusCode,400);
 assert.equal((await app.inject({method:'DELETE',url:'/api/v1/me',headers:h})).statusCode,200);assert.equal((await app.inject({url:'/api/v1/me',headers:h})).statusCode,401);
 }finally{await app.close();}
});
test('生产环境没有开发登录',async()=>{const app=await createApp(catalog,{devAuth:true,production:true});try{assert.equal((await app.inject({method:'POST',url:'/api/v1/auth/dev',headers:{origin:'http://127.0.0.1:5173','x-life-client':'1'},payload:{consent:true}})).statusCode,404);}finally{await app.close();}});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createApp} from '../apps/api/app.ts';
const catalog=JSON.parse(readFileSync('data/catalog.json','utf8'));
test('微信会话：code 单次使用、身份恢复、数据隔离、退出和注销',async()=>{
 const app=await createApp(catalog,{production:true,wechatAppId:'wx1234567890123456',exchangeCode:async code=>code.startsWith('alice')?'openid-alice':'openid-bob'});
 const headers={'x-life-client':'1','x-life-platform':'weixin'};
 async function login(code:string){return app.inject({method:'POST',url:'/api/v1/auth/wechat',headers,payload:{code,consent:true}});}
 try{
 const first=await login('alice-1');assert.equal(first.statusCode,200);const a=first.json();assert.equal(a.openid,undefined);assert.equal(a.session_key,undefined);
 assert.equal((await login('alice-1')).statusCode,400);
 const h={...headers,authorization:'Bearer '+a.token};const id=catalog.guides[0].id;
 assert.equal((await app.inject({method:'PUT',url:'/api/v1/me/saved/'+id,headers:h,payload:{saved:true}})).statusCode,200);
 const restored=(await login('alice-2')).json();assert.equal(restored.id,a.id);
 const bob=(await login('bob-1')).json();assert.notEqual(bob.id,a.id);
 assert.deepEqual((await app.inject({url:'/api/v1/me/saved',headers:{...headers,authorization:'Bearer '+bob.token}})).json(),{});
 assert.equal((await app.inject({method:'DELETE',url:'/api/v1/auth/session',headers:h})).statusCode,200);
 assert.equal((await app.inject({url:'/api/v1/me',headers:h})).statusCode,401);
 const h2={...headers,authorization:'Bearer '+restored.token};assert.equal((await app.inject({method:'DELETE',url:'/api/v1/me',headers:h2})).statusCode,200);
 assert.equal((await app.inject({url:'/api/v1/me',headers:h2})).statusCode,401);
 assert.notEqual((await login('alice-3')).json().id,a.id);
 }finally{await app.close();}
});
test('微信未配置、交换失败及浏览器伪造平台请求',async()=>{
 const headers={'x-life-client':'1','x-life-platform':'weixin'};
 for(const exchangeCode of [undefined,async()=>{throw new Error('secret must never leak');}]){
 const app=await createApp(catalog,{exchangeCode});try{
 const r=await app.inject({method:'POST',url:'/api/v1/auth/wechat',headers,payload:{code:'test',consent:true}});assert.equal(r.statusCode,exchangeCode?502:503);assert.ok(!r.body.includes('secret'));
 const forged=await app.inject({method:'POST',url:'/api/v1/auth/wechat',headers:{...headers,origin:'http://127.0.0.1:5173'},payload:{code:'another',consent:true}});assert.equal(forged.statusCode,403);
 }finally{await app.close();}}
});

import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { filterGuides, outcomes, audiences, type Catalog } from '../../packages/domain/catalog.ts';

export async function createApp(catalog: Catalog, options: {dbPath?: string; devAuth?: boolean; production?: boolean; origin?:string; wechatAppId?:string; wechatSecret?:string; exchangeCode?:(code:string)=>Promise<string>} = {}) {
 const app = Fastify({logger:false,bodyLimit:128*1024}); const db = new DatabaseSync(options.dbPath ?? ':memory:');
 db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, preferences TEXT NOT NULL DEFAULT "{}"); CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires INTEGER); CREATE TABLE IF NOT EXISTS items(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,guide_id TEXT,kind TEXT,value TEXT,PRIMARY KEY(user_id,guide_id,kind));');
 await app.register(cookie); await app.register(rateLimit,{max:120,timeWindow:'1 minute'});
 db.exec('CREATE TABLE IF NOT EXISTS wechat_users(openid_hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE); CREATE TABLE IF NOT EXISTS used_codes(hash TEXT PRIMARY KEY,expires INTEGER);');
 app.addHook('onClose',async()=>{db.close();});
 const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
 const origin=options.origin??'http://127.0.0.1:5173';
 app.addHook('onRequest',async(req,reply)=>{
  const native = !req.headers.origin && req.headers['x-life-platform']==='weixin';
  if(!['GET','HEAD','OPTIONS'].includes(req.method) && ((!native && req.headers.origin!==origin) || req.headers['x-life-client']!=='1')) return reply.code(403).send({message:'请求来源不允许'});
 });
 const sessionToken=(req:any)=>req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]??req.cookies.life_session??'';
 async function auth(req:any,reply:any) {const row=db.prepare('SELECT user_id FROM sessions WHERE hash=? AND expires>?').get(hash(sessionToken(req)),Date.now()) as any; if(!row) return reply.code(401).send({message:'请先登录，会话可能已过期'}); req.userId=row.user_id;}
 app.get('/api/v1/catalog/meta',async()=>({chapters:catalog.chapters,total:catalog.guides.length,sourceCommit:catalog.sourceCommit,importedAt:catalog.importedAt,outcomes,audiences,devAuth:!!options.devAuth&&!options.production}));
 const queryProperties:Record<string,any>={q:{type:'string',maxLength:100},chapter:{type:'string',enum:catalog.chapters.map(c=>c.id)},outcome:{type:'string',enum:Object.keys(outcomes)},evidenceGrade:{type:'string',enum:['A','B','C']},roi:{type:'string',enum:['极高','高','一般','未标注']},money:{type:'string',enum:['0','少','多']},time:{type:'string',enum:['少','中','多']},effort:{type:'string',enum:['否','些','是']},audience:{type:'string',enum:audiences},controversy:{type:'string',enum:['1']},needsVerification:{type:'string',enum:['1']},sort:{type:'string',enum:['chapter','roi','evidence']},offset:{type:'integer',minimum:0,maximum:100000},limit:{type:'integer',minimum:1,maximum:50}};
 app.get('/api/v1/guides',{schema:{querystring:{type:'object',additionalProperties:false,properties:queryProperties}}},async(req,reply)=>{
  const q=req.query as Record<string,string>; if(q.sort==='roi'&&!q.outcome) return reply.code(400).send({message:'请先选择收益口径'});
  const all=filterGuides(catalog.guides,q); const offset=Number(q.offset??0);const limit=Number(q.limit??20);
  return {total:all.length,items:all.slice(offset,offset+limit),nextOffset:offset+limit<all.length?offset+limit:null};
 });
 app.get('/api/v1/guides/:id',async(req,reply)=>{const g=catalog.guides.find(g=>g.id===(req.params as any).id);return g??reply.code(404).send({message:'条目不存在'});});
 if(options.devAuth&&!options.production) app.post('/api/v1/auth/dev',{schema:{body:{type:'object',required:['consent'],additionalProperties:false,properties:{consent:{const:true}}}},config:{rateLimit:{max:10,timeWindow:'1 minute'}}},async(_req,reply)=>{
  const id=randomBytes(16).toString('hex');db.prepare('INSERT INTO users(id) VALUES(?)').run(id);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),id,Date.now()+7*86400000);
  reply.setCookie('life_session',token,{httpOnly:true,sameSite:'strict',secure:!!options.production,path:'/',maxAge:7*86400});return {id};
 });
 app.post('/api/v1/auth/wechat',{schema:{body:{type:'object',required:['code','consent'],additionalProperties:false,properties:{code:{type:'string',minLength:1,maxLength:256},consent:{const:true}}}},config:{rateLimit:{max:10,timeWindow:'1 minute'}}},async(req,reply)=>{
  if(req.headers.origin || req.headers['x-life-platform']!=='weixin')return reply.code(403).send({message:'请在微信小程序内登录'});
  if(!options.exchangeCode && (!options.wechatAppId||!options.wechatSecret))return reply.code(503).send({message:'服务端尚未配置微信登录'});
  const code=(req.body as any).code;db.prepare('DELETE FROM used_codes WHERE expires<?').run(Date.now());
  try{db.prepare('INSERT INTO used_codes VALUES(?,?)').run(hash(code),Date.now()+10*60000);}catch{return reply.code(400).send({message:'登录凭证已使用，请重新登录'});}
  let openid:string;
  try{
   if(options.exchangeCode)openid=await options.exchangeCode(code);
   else {const url=new URL('https://api.weixin.qq.com/sns/jscode2session');url.search=new URLSearchParams({appid:options.wechatAppId!,secret:options.wechatSecret!,js_code:code,grant_type:'authorization_code'}).toString();const response=await fetch(url,{signal:AbortSignal.timeout(10000)});const result=await response.json() as any;if(!response.ok||result.errcode||typeof result.openid!=='string')throw new Error('exchange failed');openid=result.openid;}
   if(!openid)throw new Error('empty identity');
  }catch{return reply.code(502).send({message:'微信登录失败，请重试获取新的登录凭证'});}
  const key=hash(`${options.wechatAppId??'test'}:${openid}`);let row=db.prepare('SELECT user_id FROM wechat_users WHERE openid_hash=?').get(key) as any;
  db.exec('BEGIN');try{if(!row){row={user_id:randomBytes(16).toString('hex')};db.prepare('INSERT INTO users(id) VALUES(?)').run(row.user_id);db.prepare('INSERT INTO wechat_users VALUES(?,?)').run(key,row.user_id);}const token=randomBytes(32).toString('hex');const expiresAt=Date.now()+7*86400000;db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),row.user_id,expiresAt);db.exec('COMMIT');return {id:row.user_id,token,expiresAt};}catch(e){db.exec('ROLLBACK');throw e;}
 });
 app.delete('/api/v1/auth/session',async(req,reply)=>{db.prepare('DELETE FROM sessions WHERE hash=?').run(hash(sessionToken(req)));reply.clearCookie('life_session',{path:'/'});return {ok:true};});
 app.get('/api/v1/me',{preHandler:auth},async(req:any)=>({id:req.userId,preferences:JSON.parse((db.prepare('SELECT preferences FROM users WHERE id=?').get(req.userId) as any).preferences)}));
 const valueSchema={type:'object',additionalProperties:false,properties:{saved:{type:'boolean'},status:{type:'string',enum:['准备做','进行中','已完成','暂不适用']},note:{type:'string',maxLength:2000}}};
 for(const kind of ['saved','actions']) {
  app.get(`/api/v1/me/${kind}`,{preHandler:auth},async(req:any)=>Object.fromEntries((db.prepare('SELECT guide_id,value FROM items WHERE user_id=? AND kind=?').all(req.userId,kind) as any[]).map(r=>[r.guide_id,JSON.parse(r.value)])));
  app.put(`/api/v1/me/${kind}/:id`,{preHandler:auth,schema:{body:valueSchema}},async(req:any,reply)=>{if(!catalog.guides.some(g=>g.id===req.params.id))return reply.code(404).send({message:'条目不存在'});db.prepare('INSERT INTO items VALUES(?,?,?,?) ON CONFLICT(user_id,guide_id,kind) DO UPDATE SET value=excluded.value').run(req.userId,req.params.id,kind,JSON.stringify(req.body));return {ok:true};});
  app.delete(`/api/v1/me/${kind}/:id`,{preHandler:auth},async(req:any)=>{db.prepare('DELETE FROM items WHERE user_id=? AND guide_id=? AND kind=?').run(req.userId,req.params.id,kind);return {ok:true};});
 }
 app.post('/api/v1/me/merge-local',{preHandler:auth,schema:{body:{type:'object',additionalProperties:false,properties:{saved:{type:'object',maxProperties:1000,additionalProperties:valueSchema},actions:{type:'object',maxProperties:1000,additionalProperties:valueSchema}}}}},async(req:any)=>{
  const conflicts:string[]=[];db.exec('BEGIN');try{for(const kind of ['saved','actions'])for(const [id,value] of Object.entries(req.body[kind]??{})){if(!catalog.guides.some(g=>g.id===id))continue;const current=db.prepare('SELECT value FROM items WHERE user_id=? AND guide_id=? AND kind=?').get(req.userId,id,kind) as any;if(current){if(current.value!==JSON.stringify(value))conflicts.push(id);continue;}db.prepare('INSERT INTO items VALUES(?,?,?,?)').run(req.userId,id,kind,JSON.stringify(value));}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return {ok:true,conflicts};
 });
 app.patch('/api/v1/me/preferences',{preHandler:auth,schema:{body:{type:'object',additionalProperties:false,properties:{outcome:{type:'string',enum:Object.keys(outcomes)}}}}},async(req:any)=>{db.prepare('UPDATE users SET preferences=? WHERE id=?').run(JSON.stringify(req.body),req.userId);return {ok:true};});
 app.get('/api/v1/me/export',{preHandler:auth},async(req:any)=>({userId:req.userId,items:(db.prepare('SELECT guide_id,kind,value FROM items WHERE user_id=?').all(req.userId) as any[]).map(r=>({...r,value:JSON.parse(r.value)}))}));
 app.delete('/api/v1/me',{preHandler:auth},async(req:any,reply)=>{db.prepare('DELETE FROM users WHERE id=?').run(req.userId);reply.clearCookie('life_session',{path:'/'});return {ok:true};});
 return app;
}

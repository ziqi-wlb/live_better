import { readFileSync, mkdirSync } from 'node:fs';
import { createApp } from './app.ts';
mkdirSync('data',{recursive:true});
const app=await createApp(JSON.parse(readFileSync('data/catalog.json','utf8')),{dbPath:'data/life.sqlite',devAuth:process.env.ENABLE_DEV_AUTH ? process.env.ENABLE_DEV_AUTH==='1' : process.env.NODE_ENV!=='production',production:process.env.NODE_ENV==='production',origin:process.env.APP_ORIGIN});
await app.listen({host:process.env.HOST??'127.0.0.1',port:Number(process.env.PORT??8787)});
console.log('API ready: http://127.0.0.1:8787');

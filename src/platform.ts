export let isWeixin=false;
// #ifdef MP-WEIXIN
isWeixin=true;
// #endif
const baseUrl=import.meta.env.VITE_API_BASE_URL??'';
export function clearSession(){uni.removeStorageSync('wechat-session');uni.$emit('session-expired');}
export async function api(path:string,method='GET',data?:any):Promise<any>{
 if(isWeixin&&!/^https:\/\//.test(baseUrl))throw new Error('请配置 HTTPS 后端地址 VITE_API_BASE_URL 后重新构建小程序');
 const session=readLocal('wechat-session',null);
 if(isWeixin&&session&&session.expiresAt<=Date.now())clearSession();
 const header:Record<string,string>={'x-life-client':'1'};
 if(isWeixin){header['x-life-platform']='weixin';if(session?.expiresAt>Date.now())header.authorization='Bearer '+session.token;}
 return new Promise((resolve,reject)=>uni.request({url:baseUrl+'/api/v1'+path,method:method as any,data,header,timeout:15000,success:r=>{if(r.statusCode===401)clearSession();r.statusCode>=200&&r.statusCode<300?resolve(r.data):reject(new Error((r.data as any)?.message??'请求失败'));},fail:()=>reject(new Error('无法连接服务，请检查网络并重试'))}));
}
export async function loginWeixin(){
 // #ifdef MP-WEIXIN
 const wxApi=(globalThis as any).wx;
 if(wxApi?.requirePrivacyAuthorize)await new Promise<void>((resolve,reject)=>wxApi.requirePrivacyAuthorize({success:()=>resolve(),fail:()=>reject(new Error('需要同意微信隐私授权才能登录，仍可继续浏览'))}));
 // #endif
 const result=await new Promise<UniApp.LoginRes>((resolve,reject)=>uni.login({provider:'weixin',success:resolve,fail:()=>reject(new Error('微信登录取消或失败，请重试'))}));
 if(!result.code)throw new Error('没有取得微信登录凭证');
 const session=await api('/auth/wechat','POST',{code:result.code,consent:true});writeLocal('wechat-session',session);return {id:session.id};
}
export function readLocal(key:string,fallback:any){try{return uni.getStorageSync(key)||fallback;}catch{return fallback;}}
export function writeLocal(key:string,value:any){uni.setStorageSync(key,value);}

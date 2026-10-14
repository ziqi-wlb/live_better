export async function api(path:string,method='GET',data?:any):Promise<any>{
 return new Promise((resolve,reject)=>uni.request({url:'/api/v1'+path,method:method as any,data,header:{'x-life-client':'1'},success:r=>r.statusCode>=200&&r.statusCode<300?resolve(r.data):reject(new Error((r.data as any)?.message??'请求失败')),fail:()=>reject(new Error('无法连接服务，请检查网络并重试'))}));
}
export function readLocal(key:string,fallback:any){try{return uni.getStorageSync(key)||fallback;}catch{return fallback;}}
export function writeLocal(key:string,value:any){uni.setStorageSync(key,value);}

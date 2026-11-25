/* GitHub hosts only the calculator. Password entry stays on Google. */
(() => {
 const nativeFetch=window.fetch.bind(window);let configPromise;
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 const config=()=>configPromise||(configPromise=nativeFetch(new URL('cloud-config.json',document.baseURI),{cache:'no-store'}).then(r=>r.json()).then(c=>{
  if(!c.backendUrl)throw Error('Google Таблица ещё не подключена');const u=new URL(c.backendUrl);
  if(u.protocol!=='https:'||u.hostname!=='script.google.com'||!u.pathname.endsWith('/exec'))throw Error('Некорректный адрес Google');return c;
 }));
 async function jsonp(action,params={}){
  const c=await config();return new Promise((resolve,reject)=>{
   const id='dizel_'+crypto.randomUUID().replaceAll('-',''),script=document.createElement('script');
   const url=new URL(c.backendUrl);url.search=new URLSearchParams({action,...params,callback:id});
   const done=()=>{clearTimeout(timer);delete window[id];script.remove();};
   const timer=setTimeout(()=>{done();reject(Error('Google Таблица не ответила'));},25000);
   window[id]=data=>{done();resolve(data);};script.onerror=()=>{done();reject(Error('Нет связи с Google'));};
   script.src=url.href;document.head.append(script);
  });
 }
 window.fetch=async(input,init={})=>{
  const raw=typeof input==='string'?input:input.url;
  const path=new URL(raw,location.href);
  if(path.origin!==location.origin||!['/app-settings.json','/api/history','/api/norms'].includes(path.pathname))return nativeFetch(input,init);
  try{
   if(path.pathname==='/app-settings.json')return response((await jsonp('config')).config);
   if(path.pathname==='/api/norms')return response(await jsonp('norms'));
   if((init.method||'GET').toUpperCase()==='GET')return response(await jsonp('mine',{dev:path.searchParams.get('dev')||''}));
   const entry=JSON.parse(init.body),receipt=crypto.randomUUID().replaceAll('-','');const c=await config();
   await nativeFetch(c.backendUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'save',entry,receipt})});
   const answer=await jsonp('receipt',{receipt});return response(answer,answer.ok?200:503);
  }catch(e){return response({ok:false,error:e.message},503);}
 };
})();

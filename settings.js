(() => {
 'use strict';
 const CACHE='dizel_settings_v1';let config={version:1,mode:'manual',sheetUrl:'',manual:clone(BUILT),googleConnected:false};
 let pendingNorms=null,lastRead=0,lastAuto=0,request=0,reading=null,syncing=false;
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function validate(value){const norm=normalizeNorms(value);if(!norm||norm.rows.length!==BUILT.rows.length)throw Error('Нужны все направления норм');const names=new Set();for(const [name,values] of norm.rows){if(names.has(name)||!BUILT.rows.some(r=>r[0]===name)||values.some(v=>!Number.isFinite(v)||v<=0))throw Error('Некорректные коэффициенты');names.add(name);}return norm;}
 function apply(norm){
  if(flowStage!=='start'&&!same(N,norm)){pendingNorms=clone(norm);return false;}
  pendingNorms=null;setNorms(clone(norm));try{localStorage.setItem(NC,JSON.stringify(norm));}catch{}return true;
 }
 async function ownHistory(){
  if(!ME||syncing||!navigator.onLine||location.protocol==='file:')return;syncing=true;
  try{const r=await fetch('/api/history?dev='+encodeURIComponent(ME.dev),{cache:'no-store',signal:AbortSignal.timeout(25000)}),j=await r.json();if(!j.ok||!Array.isArray(j.items))return;
   const all=new Map(S.hist.map(e=>[e.id,e]));for(const e of j.items){if(!e||!Array.isArray(e.trains)||!e.trains.length)continue;const old=all.get(e.id);if(!old||(e.tu||e.t)>(old.tu||old.t)){const {dev,name,...entry}=e;all.set(e.id,entry);}}
   S.hist=[...all.values()].sort((a,b)=>b.t-a.t).slice(0,300);persist();renderHist();
  }catch{}finally{syncing=false;}
 }
 async function refresh(force=false){
  const id=++request;
  if(config.mode==='manual'){const applied=apply(validate(config.manual));srcNote(applied?'':'Новые коэффициенты применятся со следующей поездки.');return;}
  if(!force&&Date.now()-lastAuto<5*60000)return;lastAuto=Date.now();
  if(!config.sheetUrl&&!config.googleConnected){srcNote('Автоматические нормы ещё не подключены. Используются сохранённые коэффициенты.');return;}
  try{
   const acc={date:'',rows:[]};
   if(config.sheetUrl&&!config.googleConnected){const url=sheetCsvUrl(config.sheetUrl),r=await fetch(url+(url.includes('?')?'&':'?')+'_='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Нет доступа');const text=await r.text();if(/^\s*<!doctype html|^\s*<html/i.test(text))throw Error('Таблица недоступна');rowsFromAoa(parseCsv(text),acc);}
   else{const r=await fetch('/api/norms',{cache:'no-store',signal:AbortSignal.timeout(25000)}),j=await r.json();if(!j.ok||!Array.isArray(j.rows))throw Error('Нет таблицы');rowsFromAoa(j.rows,acc);}
   const norms=validate(acc);if(!norms.date)throw Error('Нет даты норм');if(id!==request||config.mode!=='auto')return;
   const applied=apply(norms);srcNote(applied?'Коэффициенты: Google Таблица · обновлено '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'Новые коэффициенты из таблицы применятся со следующей поездки.');
  }catch{if(id===request)srcNote('Нет связи с таблицей норм. Используются последние сохранённые коэффициенты.');}
 }
 async function readSettings(force=false){
  if(reading)return reading;if(!force&&Date.now()-lastRead<3000)return;lastRead=Date.now();
  reading=(async()=>{
   let changed=false;
   try{const r=await fetch('/app-settings.json?_='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Нет настроек');const c=await r.json();c.manual=validate(c.manual);changed=!same(c,config);config=c;try{localStorage.setItem(CACHE,JSON.stringify(c));}catch{}}
   catch{try{const c=JSON.parse(localStorage.getItem(CACHE)||'null');if(c){c.manual=validate(c.manual);config=c;}}catch{}}
   HISTORY_URL=location.protocol==='file:'?'':'/api/history';sendOut();await refresh(force||changed);ownHistory();
  })().finally(()=>{reading=null;});return reading;
 }
 window.dizelSettings={refresh,applyPending(){if(pendingNorms){const norm=pendingNorms;pendingNorms=null;apply(norm);}}};
 window.addEventListener('storage',event=>{if(event.key==='dizel_config_updated')readSettings(true);});
 window.addEventListener('online',()=>{readSettings(true);ownHistory();});
 window.addEventListener('focus',()=>{if(flowStage==='start')readSettings();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')readSettings();});
 setInterval(()=>{if(document.visibilityState==='visible'&&flowStage==='start')readSettings();},30000);
 readSettings(true).catch(()=>srcNote('Не удалось загрузить настройки. Используются сохранённые нормы.'));
})();


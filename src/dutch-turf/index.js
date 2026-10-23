'use strict';
const $ = id => document.getElementById(id);
const rooms = [['nappali','Nappali','50% 0'],['halo','Hálószoba','100% 0'],['gyerek','Gyerekszoba','0 100%'],['furdo','Fürdőszoba','50% 100%'],['wc','WC','100% 100%']];
let state = {}, selected = null, draft = 24, connected = false, received = 0;
const pending = new Map();
const finite = x => x !== null && x !== '' && x !== undefined && Number.isFinite(Number(x));
const temp = x => finite(x) ? Number(x).toFixed(1).replace('.', ',') + '°' : '—';
const text = (id,value) => { $(id).textContent = value; };
const norm = x => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function toast(message) { text('toast',message); $('toast').classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4500); }
function sensor(key) { const s=state.sensors?.th?.[key] || {},at=state._updated?.th?.[key]; return {...s,valid:s.online === true && finite(s.temp) && Number(at)>Date.now()-120000}; }
function lights(key) { return (state._control?.lights || []).filter(l=>l.room===key); }
function lightState(light) { return state.sensors?.switches?.[light.stateRoom]?.[light.stateLabel]; }
function relay(hint) { const entry=Object.entries(state.sensors?.switches?.futes || {}).find(([label])=>norm(label).includes(hint)); return entry && Number(state._updated?.switches?.futes?.[entry[0]])>Date.now()-90000 ? entry[1] : null; }
function heating(key) { return relay({nappali:'nappali',halo:'halo',gyerek:'gyerekszoba',furdo:'furdo',wc:'wc'}[key]); }
function fresh() { return connected && received > Date.now()-60000 && Number(state._ts)>Date.now()-120000; }
function enabled() { return fresh() && state._control?.enabled === true; }
function acLines() {
 const a=state.ac || {};
 if(a.offline)return ['Klíma · offline'];
 if(typeof a.power!=='boolean')return ['Klíma · nincs adat'];
 if(!a.power)return ['Klíma · kikapcsolva'];
 const mode=norm(a.modeName || a.mode || ''),code=finite(a.modeCode)?Number(a.modeCode):Number(a.mode);
 const label=mode.includes('heat')||code===1?'Fűtés':mode.includes('cool')||code===3?'Hűtés':mode.includes('dry')||code===2?'Párátlanítás':mode.includes('fan')||code===7?'Ventilátor':mode.includes('auto')?'Automata':'Bekapcsolva';
 const fan=finite(a.fanSpeed)&&Number(a.fanSpeed)>=0&&Number.isInteger(Number(a.fanSpeed))?(Number(a.fanSpeed)===0?'automata':`${Number(a.fanSpeed)}. fokozat`):norm(a.fanSpeed)==='auto'?'automata':'—';
 return [`Klíma · ${label}`,`Cél: ${temp(a.setTemp)} · Mért: ${temp(a.roomTemp)}`,`Ventilátor: ${fan}`];
}
function acText() { return acLines().join(' · '); }
function ventText() {
 const a=state.ventilation;
 if(a){
  if(!fresh() || Date.now()-Number(a.at)>90000 || !a.relayOK)return 'Szellőzés · nincs friss visszajelzés';
  const speed=['KI','I fokozat','II fokozat','III fokozat'][a.actualSpeed] || '—';
  return `Szellőzés · ${a.enabled?'AUTO':'ELŐNÉZET'} · ${speed}${a.pending?' · váltás…':a.blocked||!a.sensorOK?' · hiba':a.warning?' · figyelem':''}`;
 }
 const v=state.sensors?.switches?.furdo || {}; if(typeof v['On/Off']!=='boolean')return 'Szellőzés · nincs adat'; if(!v['On/Off'])return 'Szellőzés · KI';
 const speed=(v.I?1:0)+(v.II?2:0);return `Szellőzés · ${speed?['','I','II','III'][speed]+' fokozat':'készenlét'}`;
}
for(const [key,label] of rooms) {
 const card=document.createElement('button'); card.className='room'+(key==='nappali'?' living':''); card.dataset.room=key;
 card.innerHTML='<div class="top-edge"></div><h2></h2><strong class="temperature">—</strong><span class="meta">Adatokra vár</span><span class="sub"></span><span class="badge"></span><div class="bottom-edge"></div>';
 card.querySelector('h2').textContent=label; card.addEventListener('click',()=>openRoom(key)); $('rooms').append(card);
}
function render() {
 const live=fresh(); text('connection',live?'Élő kapcsolat':connected?'Adatokra vár':'Nincs kapcsolat'); $('connectionDot').classList.toggle('live',live);
 text('automation',state._control?.enabled?'AUTO AKTÍV':'AUTO SZÜNETEL');
 for(const [id,hint] of [['boilerLed','kazan'],['pumpLed','szivattyu']]) { const value=relay(hint); $(id).className=value===true?'active':value===null?'unknown':''; }
 for(const [key] of rooms) {
  const card=document.querySelector(`[data-room="${key}"]`),s=sensor(key),ov=state._control?.overrides?.[key] || {};
  card.classList.toggle('offline',!s.valid); card.classList.toggle('heating',heating(key)===true); card.classList.remove('cooling');
  card.querySelector('.temperature').textContent=s.valid?temp(s.temp):'—';
  card.querySelector('.meta').textContent=!s.valid?(s.online===false?'Szenzor offline':'Nincs friss szenzoradat'):`${finite(s.hum)?Math.round(s.hum)+'% pára':'Pára: —'}${finite(s.battery)?' · '+Math.round(s.battery)+'% elem':''}`;
  card.querySelector('.sub').textContent=key==='nappali'?acLines().join('\n'):key==='furdo'?ventText():heating(key)===null?'Fűtési kör · nincs adat':heating(key)?'Fűtési kör · BE':'Fűtési kör · KI';
  if(key==='nappali')card.classList.toggle('ac-active',state.ac?.power===true&&!state.ac?.offline);
  card.querySelector('.badge').textContent=Date.parse(ov.forceOnUntil)>Date.now()?'KÉZI BE':Date.parse(ov.forceOffUntil)>Date.now()?'KÉZI KI':Date.parse(ov.until)>Date.now()?'KÉZI CÉL':'';
  const edge=card.querySelector('.top-edge'); edge.replaceChildren(); for(const l of lights(key)) { const bar=document.createElement('span'); bar.className=lightState(l)===true?'on':''; bar.title=l.label; edge.append(bar); }
 }
 const w=state.weather || {}; text('outTemp',temp(w.temp)); text('outMeta',finite(w.wind)?`Szél · ${Math.round(w.wind)} km/h`:'Open-Meteo');
 const forecast=(w.forecast || []).filter(f=>new Date(f.time).getTime()>Date.now()-1800000).slice(0,6); $('forecast').replaceChildren();
 if(!forecast.length){const notice=document.createElement('p');notice.className='forecast-empty';notice.textContent='Az órás előrejelzés jelenleg nem érhető el';$('forecast').append(notice);}
 for(const f of forecast) { const d=document.createElement('div'),h=document.createElement('small'),i=document.createElement('span'),t=document.createElement('b'); h.textContent=new Date(f.time).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}); i.className='icon'; i.textContent=Number(f.code)>=51?'☂':Number(f.code)>=2?'☁':'☀';t.textContent=temp(f.temp);d.append(h,i,t);$('forecast').append(d); }
 text('summary',!live?'Az állapotadatok nem frissek':!state._control?.enabled?'Fűtésautomatika szünetel · világítás kezelhető':relay('szivattyu')&&!relay('kazan')?'Szivattyú · utókeringetés':'Otthon · automatikus vezérlés');
 text('updated',state._ts?'Frissítve '+new Date(state._ts).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}):'—');
 for(const [id,p] of pending) { const l=(state._control?.lights||[]).find(x=>x.id===id); const at=state._updated?.switches?.[l?.stateRoom]?.[l?.stateLabel]; if(l && lightState(l)===p.on && Number(at)>=p.at)pending.delete(id); else if(Date.now()-p.at>15000){pending.delete(id);toast('Nem érkezett visszaigazolás. Ellenőrizd a lámpa állapotát.');} }
 if(selected)renderDialog();
}
function openRoom(key) { selected=key; const ov=state._control?.overrides?.[key]; draft=Date.parse(ov?.until)>Date.now()?ov.target:state._control?.targets?.[key] || 24; const r=rooms.find(x=>x[0]===key);text('dialogTitle',r[1]);$('dialogHero').style.setProperty('--tile',r[2]);renderDialog();$('roomDialog').showModal(); }
function renderDialog() {
 const s=sensor(selected); text('dialogTemp',s.valid?temp(s.temp):'—'); text('dialogHumidity',s.valid&&finite(s.hum)?`${Math.round(s.hum)}% páratartalom`:'Szenzor offline'); text('targetValue',temp(draft));
 const allowed=enabled()&&s.valid;
 for(const id of ['minus','plus','saveTarget'])$(id).disabled=!allowed;
 const ov=state._control?.overrides?.[selected] || {},mode=Date.parse(ov.forceOnUntil)>Date.now()?'on':Date.parse(ov.forceOffUntil)>Date.now()?'off':'auto';
 document.querySelectorAll('[data-mode]').forEach(b=>{b.disabled=!enabled() || (b.dataset.mode==='on'&&!s.valid);b.classList.toggle('selected',b.dataset.mode===mode);});
 const policy=state._control?.policy;
 const autoText=policy?.sleep&&['halo','gyerek'].includes(selected)?'Esti célérték: 22 °C · 20:00–05:00.':policy?.source==='floor'?'Reggeli padlófűtés igény szerint · 05:00–08:00.':policy?'Klímás temperálás · a nappali hőszenzora szabályoz.':'Automatikus szabályozás, időjárási és napszaki korrekcióval.';
 text('controlStatus',!state._control?.enabled?'A fűtésautomatika le van tiltva.':!fresh()?'A kapcsolat ellenőrzéséig a vezérlés szünetel.':!s.valid?'Offline szenzorral a kézi fűtés sem indítható.':mode==='auto'?autoText:`Időzített felülbírálás · ${Math.max(1,Math.ceil((Date.parse(ov.forceOnUntil || ov.forceOffUntil)-Date.now())/60000))} perc`);
 const wrap=$('lightControls'),list=lights(selected),signature=list.map(l=>l.id).join(',');
 if(wrap.dataset.lights!==signature){wrap.replaceChildren();wrap.dataset.lights=signature;for(const light of list){const b=document.createElement('button'),label=document.createElement('span'),toggle=document.createElement('span');b.dataset.light=light.id;label.textContent=light.label;toggle.className='toggle';b.append(label,toggle);wrap.append(b);}}
 for(const light of list) { const b=wrap.querySelector(`[data-light="${light.id}"]`),value=lightState(light);b.className='light-control'+(value===true?' on':'')+(pending.has(light.id)?' pending':'');b.disabled=!fresh()||typeof value!=='boolean'||Number(state._updated?.switches?.[light.stateRoom]?.[light.stateLabel])<Date.now()-90000||pending.has(light.id);b.setAttribute('aria-pressed',String(value===true));b.onclick=()=>{pending.set(light.id,{on:!value,at:Date.now()});send({action:'light',light:light.id,on:!value});renderDialog();}; }
 const v=state.ventilation;
 text('acDetail',selected==='nappali'?acText()+' · a klímát a központi automatika kezeli':selected==='furdo'?ventText()+(v?' · '+(v.blocked || v.warning || v.reason)+(v.postUntil?' · '+Math.max(0,Math.ceil((v.postUntil-Date.now())/60000))+' perc van hátra':''):''):'');
 text('dialogFoot','A fűtési kérés a központi szabályzón keresztül jut a relékhez; a minimum kapcsolási idők és a klímaprioritás továbbra is érvényesek.');
}
function send(payload) { if(!fresh())return toast('Nincs friss kapcsolat.'); payload.id=globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2);uibuilder.send({topic:'dutch-turf/command',payload}); }
function request() { if(globalThis.uibuilder)uibuilder.send({topic:'ui/state/request'}); }
$('refresh').onclick=request;$('closeDialog').onclick=()=>$('roomDialog').close();$('roomDialog').addEventListener('close',()=>{selected=null;});$('roomDialog').addEventListener('click',e=>{if(e.target===$('roomDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('minus').onclick=()=>{draft=Math.max(16,draft-.5);renderDialog();};$('plus').onclick=()=>{draft=Math.min(26,draft+.5);renderDialog();};$('saveTarget').onclick=()=>send({action:'floor',room:selected,mode:'target',target:draft});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>send({action:'floor',room:selected,mode:b.dataset.mode}));
function clock() { const now=new Date();text('clock',now.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'}));text('date',now.toLocaleDateString('hu-HU',{month:'short',day:'numeric',weekday:'short',timeZone:'Europe/Budapest'}).toUpperCase()); }
clock();setInterval(()=>{clock();render();},1000);setInterval(request,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)request();});
if(globalThis.uibuilder){uibuilder.onChange('ioConnected',value=>{connected=!!value;if(value)request();render();});uibuilder.onChange('msg',msg=>{if(msg.topic==='dutch-turf/result'){toast(msg.payload?.message || 'Parancs feldolgozva');if(msg.payload?.ok===false)pending.clear();return;}if(msg.payload?.sensors || msg.payload?._control){state=msg.payload;received=Date.now();connected=true;render();}});request();setTimeout(request,1000);}else toast('A kijelző kapcsolati modulja nem töltődött be.');

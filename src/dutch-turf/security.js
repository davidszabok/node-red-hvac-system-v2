'use strict';
(() => {
 const byId=id=>document.getElementById(id),dialog=byId('securityDialog');
 let chosen=null,request=null,timer=null,version=0,objectUrl=null,media=null;
 const api='/dutch-security/cameras';
 function stopCapture(){version++;clearTimeout(timer);timer=null;if(request)request.abort();request=null;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;const video=byId('cameraVideo');video.pause();video.removeAttribute('src');video.load();video.hidden=true;media=null;}
 function message(text){byId('cameraMessage').textContent=text;byId('cameraMessage').hidden=false;}
 function showList(){stopCapture();chosen=null;byId('cameraBack').hidden=true;byId('cameraView').hidden=true;byId('cameraListView').hidden=false;byId('securityTitle').textContent='Biztonság';byId('securitySubtitle').textContent='Válassz kamerát';loadList();}
 function cameraRow(camera){
  const button=document.createElement('button');button.className='camera-row';button.disabled=camera.online===false;
  const icon=document.createElement('span');icon.className='camera-row-icon';icon.textContent='◉';
  const label=document.createElement('span');label.textContent=camera.name;
  const state=document.createElement('small');state.textContent=camera.online===false?'Offline':'Megnyitás ›';
  button.append(icon,label,state);button.onclick=()=>openCamera(camera);return button;
 }
 async function loadList(){
  const current=version,list=byId('cameraList');list.replaceChildren();byId('cameraListStatus').textContent='Kamerák betöltése…';
  try{
   const accessResponse=await fetch('/dutch-security/access',{cache:'no-store',credentials:'same-origin'});
   if(!accessResponse.ok)throw Error('access');const access=await accessResponse.json();if(current!==version||!dialog.open||chosen)return;
   byId('cameraPairing').hidden=access.authorized===true;
   if(!access.authorized){byId('cameraPairCode').textContent=access.pairCode||'—';byId('cameraListStatus').textContent='A kamera csak ennek a böngészőnek az engedélyezése után jelenik meg.';timer=setTimeout(loadList,3000);return;}
  }catch(e){if(current!==version||!dialog.open)return;byId('cameraPairing').hidden=true;byId('cameraListStatus').textContent='A védett kamerakiszolgáló még nem érhető el.';timer=setTimeout(loadList,5000);return;}
  try{const r=await fetch(api,{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error('list');const data=await r.json();if(chosen||!dialog.open)return;for(const camera of data.cameras||[])list.append(cameraRow(camera));byId('cameraListStatus').textContent=data.cameras?.length?'Egyszerre csak a kiválasztott kamera képét töltjük be.':'Még nincs hozzáadott RTSP kamera az iHostban.';}
  catch(e){if(chosen||!dialog.open)return;byId('cameraListStatus').textContent='A kameralista még nem érkezett meg. Újra lekérjük…';timer=setTimeout(loadList,5000);}
 }
 function openCamera(camera){
  stopCapture();chosen=camera;byId('cameraListView').hidden=true;byId('cameraView').hidden=false;byId('cameraBack').hidden=false;byId('securityTitle').textContent=camera.name;byId('securitySubtitle').textContent='Élő kamerakép';byId('cameraStamp').textContent='Kapcsolódás…';message('Kamerakép betöltése…');capture();
 }
 async function capture(){
  if(!chosen||!dialog.open||document.hidden)return;
  const current=version,video=byId('cameraVideo');
  request=new AbortController();const abort=request;
  let timeout=null;
  function currentView(){return current===version&&!abort.signal.aborted;}
  function guard(){clearTimeout(timeout);timeout=setTimeout(()=>abort.abort(),18000);}
  try{
   if(!window.MediaSource)throw Error('A kijelző böngészője nem támogatja az élő videót.');
   guard();
   const r=await fetch(api+'/'+encodeURIComponent(chosen.id)+'/live',{cache:'no-store',credentials:'same-origin',signal:abort.signal});
   if(!r.ok){let error='Az élőkép most nem érhető el.';try{error=(await r.json()).error||error;}catch(e){}throw Error(error);}
   const reader=r.body.getReader();let initial=new Uint8Array(0),source=null;
   // Read the real H.264 profile from the MP4 initialization data.
   while(!source){
    const part=await reader.read();if(part.done)throw Error('Nem érkezett videó a kamerától.');guard();
    const joined=new Uint8Array(initial.length+part.value.length);joined.set(initial);joined.set(part.value,initial.length);initial=joined;
    if(initial.length>2*1024*1024)throw Error('A kamera videóformátuma nem támogatott. Állítsd H.264-re.');
    let codec=null;
    for(let i=4;i+8<initial.length;i++)if(initial[i]===97&&initial[i+1]===118&&initial[i+2]===99&&initial[i+3]===67){codec='avc1.'+Array.from(initial.slice(i+5,i+8),b=>b.toString(16).padStart(2,'0')).join('');break;}
    if(!codec)continue;
    const mime='video/mp4; codecs="'+codec+'"';
    if(!MediaSource.isTypeSupported(mime))throw Error('A kijelző nem támogatja a kamera H.264 profilját.');
    media=new MediaSource();const thisMedia=media;objectUrl=URL.createObjectURL(media);video.src=objectUrl;video.hidden=false;
    await new Promise((resolve,reject)=>{thisMedia.addEventListener('sourceopen',resolve,{once:true});abort.signal.addEventListener('abort',()=>reject(Error('Megszakítva')),{once:true});});
    if(!currentView())return;
    source=media.addSourceBuffer(mime);
   }
   async function append(data){
    if(!currentView())return;
    await new Promise((resolve,reject)=>{
     const finish=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(Error('A videó lejátszása megszakadt.'));};
     function cleanup(){source.removeEventListener('updateend',finish);source.removeEventListener('error',fail);abort.signal.removeEventListener('abort',fail);}
     source.addEventListener('updateend',finish,{once:true});source.addEventListener('error',fail,{once:true});abort.signal.addEventListener('abort',fail,{once:true});
     try{source.appendBuffer(data);}catch(e){cleanup();reject(e);}
    });
   }
   await append(initial);
   let lastTrim=0;
   while(currentView()){
    const part=await reader.read();if(part.done)throw Error('A videókapcsolat megszakadt.');guard();await append(part.value);
    if(source.buffered.length){
     const end=source.buffered.end(source.buffered.length-1),start=source.buffered.start(0);
     if(video.currentTime<start||end-video.currentTime>2.5)video.currentTime=Math.max(start,end-0.6);
     if(video.paused)video.play().catch(()=>{});
     if(video.readyState>=2){byId('cameraMessage').hidden=true;byId('cameraStamp').textContent='● Élő';}
     if(video.currentTime-lastTrim>20&&video.currentTime>15){lastTrim=video.currentTime;await new Promise(resolve=>{source.addEventListener('updateend',resolve,{once:true});source.remove(0,video.currentTime-10);});}
    }
   }
  }catch(e){
   if(current!==version)return;
   abort.abort();video.pause();video.removeAttribute('src');video.load();video.hidden=true;
   if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;
   message(e.name==='AbortError'?'A kamera nem válaszolt időben. Újracsatlakozás…':e.message);
   byId('cameraStamp').textContent='Kapcsolódás újra…';
   timer=setTimeout(()=>{if(current===version)capture();},5000);
  }finally{clearTimeout(timeout);}
 }
 byId('security').onclick=()=>{dialog.showModal();showList();};byId('closeSecurity').onclick=()=>dialog.close();byId('cameraBack').onclick=showList;
 byId('retryCamera').onclick=()=>{if(chosen){stopCapture();message('Kamerakép betöltése…');capture();}else loadList();};
 dialog.addEventListener('close',()=>{stopCapture();chosen=null;});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCapture();if(chosen)message('A kamerakép frissítése szünetel.');}else if(chosen&&dialog.open)capture();});
})();

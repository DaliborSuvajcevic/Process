'use strict';
/* PROCESS: svaki dan je poseban zapis, localStorage ključ "process:day:YYYY-MM-DD".
   Snimanje dira samo ključ dana koji se menja, a stari dani se nikad ne brišu automatski. */
const $=s=>document.querySelector(s),P='process:';
const key=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const TODAY=key(new Date());
const add=(k,n)=>{const d=new Date(k+'T12:00');d.setDate(d.getDate()+n);return key(d)};
const win=n=>Array.from({length:n},(_,i)=>add(TODAY,i-n+1));
const win7=k=>Array.from({length:7},(_,i)=>add(k,-i));
const validKey=k=>/^\d{4}-\d\d-\d\d$/.test(k||'')&&!isNaN(new Date(k+'T12:00'))&&key(new Date(k+'T12:00'))===k;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const fm=(x,d=0)=>x==null?'-':x.toFixed(d);
const fp=x=>x==null?'-':x.toFixed(0)+'%';
const fd=(k,o={weekday:'long',day:'numeric',month:'long'})=>new Date(k+'T12:00').toLocaleDateString('sr-Latn-RS',o);
const L={none:'Bez zapisa',new:'Nije započeto',prog:'U toku',done:'Završen',skip:'Preskočen'};
const DN=['nedeljom','ponedeljkom','utorkom','sredom','četvrtkom','petkom','subotom'];
const NAV=[['dash','Pregled'],['day','Danas'],['hist','Istorija'],['stats','Analitika'],['data','Podaci']];
const Q=[['good','Šta sam danas uradio dobro?'],['better','Šta sam mogao bolje?'],['learned','Šta sam danas naučio?'],['distract','Šta mi je odvlačilo pažnju?'],['next','Koji je jedan konkretan korak za sutra?']];
const SL=[['mood','Raspoloženje'],['energy','Energija'],['discipline','Disciplina'],['focus','Fokus']];
const EMPTY_REVIEW={good:'',better:'',learned:'',distract:'',next:''};
const DEF_SET={minDay:70,template:[{name:'Trading analiza',cat:'Trading'},{name:'Journal',cat:'Trading'},{name:'Backtesting',cat:'Trading'},{name:'Trening',cat:'Zdravlje'},{name:'Rad na projektu',cat:'Rad'},{name:'Čitanje / edukacija',cat:'Učenje'}]};

let S={settings:structuredClone(DEF_SET),days:{}};
let V={v:'dash',k:TODAY,unlock:false},tmp=null;

/* ---------- storage ---------- */
try{
 const s=JSON.parse(localStorage.getItem(P+'settings')||'null');
 if(s&&Array.isArray(s.template))S.settings={minDay:Math.min(100,Math.max(1,+s.minDay||70)),template:s.template.filter(t=>t&&typeof t.name==='string')}
}catch(e){console.error(e)}
for(let i=0;i<localStorage.length;i++){
 const k=localStorage.key(i);
 if(k&&k.startsWith(P+'day:'))try{
  const d=JSON.parse(localStorage.getItem(k));
  if(d&&Array.isArray(d.tasks)){d.review={...EMPTY_REVIEW,...d.review};S.days[k.slice(P.length+4)]=d}
 }catch(e){console.error('Oštećen zapis',k)}
}
const saveSet=()=>localStorage.setItem(P+'settings',JSON.stringify(S.settings));
const saveDay=k=>{const d=S.days[k];d.updatedAt=new Date().toISOString();d.score=score(d,k);localStorage.setItem(P+'day:'+k,JSON.stringify(d))};
const sv=()=>{try{saveDay(V.k)}catch(e){toast('Čuvanje nije uspelo (prostor pun?)')}};
const mk=k=>({tasks:S.settings.template.map((t,i)=>({id:k+i,name:t.name,cat:t.cat||'',prio:2,status:'todo',dur:'',note:''})),review:{...EMPTY_REVIEW},mood:0,energy:0,discipline:0,focus:0,skipped:false,score:0,createdAt:new Date().toISOString(),updatedAt:''});
const cur=()=>S.days[V.k]||tmp;

/* ---------- računanje ---------- */
const done=d=>d.tasks.filter(t=>t.status==='done').length;
const pct=d=>d.tasks.length?done(d)/d.tasks.length*100:0;
const rv=d=>Object.values(d.review).filter(v=>v.trim()).length;
const st=k=>{const d=S.days[k];if(!d)return'none';if(d.skipped)return'skip';if(pct(d)>=S.settings.minDay)return'done';return done(d)||rv(d)?'prog':'new'};
const ok=k=>st(k)==='done';
const act=k=>st(k)==='prog'||st(k)==='done';
const score=(d,k)=>Math.round(pct(d)*.5+d.discipline*2+d.focus+rv(d)*2+win7(k).filter(ok).length/7*10);
/* ocena se uvek računa uživo, jer deo formule zavisi od poslednjih 7 dana */
const scr=k=>score(S.days[k],k);
const streak=()=>{let k=ok(TODAY)?TODAY:add(TODAY,-1),n=0;while(ok(k)){n++;k=add(k,-1)}return n};
const lastExport=()=>{try{return localStorage.getItem(P+'lastExport')}catch{return null}};

/* ---------- UI helperi ---------- */
const L2=(p,v,l,t='text')=>`<label>${l}<input data-f="${p}" type=${t} step=any value="${esc(v)}"></label>`;
const TA=(p,v,l)=>`<label>${l}<textarea data-f="${p}" rows=2>${esc(v)}</textarea></label>`;
const bars=(ks,f)=>`<div class=bars>${ks.map(k=>{const v=f(k);return `<i data-a=open data-k=${k} class=${st(k)} title="${k}: ${v==null?'-':v}" style="height:${Math.max(v||0,4)}%"></i>`}).join('')}</div>`;
const heat=()=>{const dow=(new Date(TODAY+'T12:00').getDay()+6)%7,s=add(TODAY,-(140+dow));let h='';for(let i=0;i<147;i++){const k=add(s,i);if(k>TODAY)break;const x=st(k),d=S.days[k],p=d?pct(d):0;h+=`<i data-a=open data-k=${k} title="${k}" data-l="${x==='skip'?'s':x==='none'||x==='new'?0:p<40?1:p<70?2:p<100?3:4}"></i>`}return `<div class=heat>${h}</div>`};
const toast=m=>{const t=$('#toast');t.textContent=m;t.className='on';setTimeout(()=>t.className='',2600)};
function ask(msg,fn,yes='Obriši'){const d=$('#dlg');d.returnValue='';d.innerHTML=`<form method=dialog><p>${msg}</p><div class=row><button value=no>Otkaži</button><button class=danger value=yes>${yes}</button></div></form>`;d.onclose=()=>d.returnValue==='yes'&&fn();d.showModal()}

/* ---------- pregledi ---------- */
function backupNote(n){
 const le=lastExport(),days=le?Math.floor((Date.now()-new Date(le))/864e5):null;
 if(n<3||(le&&days<7))return'';
 return `<a class="card warn" href="#data"><small>Podaci su samo u ovom browseru</small><span>${le?`Poslednja rezervna kopija je pre ${days} dana.`:'Rezervna kopija još nije napravljena.'} Otvori Podaci i preuzmi izvoz.</span></a>`}

function dash(){
 const all=Object.keys(S.days).sort(),a=all.filter(act),t=S.days[TODAY],c=(l,v)=>`<div class=card><small>${l}</small><b>${v}</b></div>`;
 return `<h1>${fd(TODAY)}</h1>
 ${backupNote(all.length)}
 <div class=grid>${c('Niz dana',streak()+' d')}${c('Uspešnih dana',all.filter(ok).length)}${c('Završenost',fp(avg(a.map(k=>pct(S.days[k])))))}${c('Prosečna ocena',fm(avg(a.map(scr))))}${c('Završeno zadataka',all.reduce((n,k)=>n+done(S.days[k]),0))}</div>
 <a class="card today" href="#day"><div><small>Danas: ${L[st(TODAY)]}</small><b>${Math.round(pct(t))}%</b></div><div class=bar><i style="width:${pct(t)}%"></i></div></a>
 <section class=card><h2>Poslednjih 7 dana</h2>${bars(win(7),k=>S.days[k]&&Math.round(pct(S.days[k])))}</section>
 <section class=card><h2>Poslednjih 30 dana</h2>${bars(win(30),k=>S.days[k]&&Math.round(pct(S.days[k])))}</section>
 <section class=card><h2>Kontinuitet</h2>${heat()}<small>Dan je uspešan za niz kada je završeno najmanje ${S.settings.minDay}% zadataka.</small></section>`}

const taskRow=(t,i)=>`<div class="task ${t.status}"><button class=chk data-a=tog data-i=${i} aria-label="Završi zadatak">${t.status==='done'?'✓':''}</button><details><summary>${esc(t.name)}<em>${esc(t.cat)}${t.dur?' · '+esc(t.dur)+' min':''}${t.prio==1?' · visok prioritet':''}</em></summary><div class=fields>${L2(`tasks.${i}.name`,t.name,'Naziv')}${L2(`tasks.${i}.cat`,t.cat,'Kategorija')}${L2(`tasks.${i}.dur`,t.dur,'Trajanje (min)','number')}<label>Prioritet<select data-f="tasks.${i}.prio">${[[1,'Visok'],[2,'Srednji'],[3,'Nizak']].map(([v,n])=>`<option value=${v} ${+t.prio===v?'selected':''}>${n}</option>`).join('')}</select></label>${TA(`tasks.${i}.note`,t.note,'Beleška')}</div><div class=row><button data-a=skip data-i=${i}>${t.status==='skip'?'Vrati':'Preskoči'}</button><button class="ghost danger" data-a=del data-i=${i}>Obriši</button></div></details></div>`;

function day(){
 tmp=S.days[V.k]?null:mk(V.k);
 const d=cur(),past=V.k<TODAY,lock=past&&!V.unlock,s=S.days[V.k]?L[st(V.k)]:L.new;
 return `<div class=row><a class=ghost href="#hist" aria-label="Nazad na istoriju">←</a><h1>${fd(V.k,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h1></div>
 <div class=row style="justify-content:flex-start"><span class=tag>${s}</span>${d.reviewDone?'<span class="tag done-tag">Dan završen</span>':''}${past?(lock?'<span class=tag>Zaključan istorijski zapis</span><button data-a=unlock>Uredi</button>':'<span class=tag>Uređivanje</span>'):''}</div>
 <fieldset ${lock?'disabled':''}>
 <section class=card><div class=row><h2>Zadaci</h2><span>${done(d)}/${d.tasks.length} · ${Math.round(pct(d))}%</span></div><div class=bar><i style="width:${pct(d)}%"></i></div>
  <div>${d.tasks.map(taskRow).join('')}</div>
  <div class=row style="flex-wrap:nowrap"><input id=nt placeholder="Novi zadatak" style="flex:2"><input id=nc placeholder=Kategorija style="flex:1"><button data-a=addtask>Dodaj</button></div>
  <button class=ghost data-a=skipday>${d.skipped?'Ukloni oznaku „preskočen“':'Označi dan kao preskočen'}</button></section>
 <section class=card><h2>Dnevni review</h2>${Q.map(([k,q])=>TA('review.'+k,d.review[k],q)).join('')}
  <div class=fields>${SL.map(([k,l])=>`<label>${l}<output>${d[k]||'-'}</output><input type=range min=0 max=10 data-f=${k} value=${d[k]||0}></label>`).join('')}</div>
  <div class=sum><div><small>Ocena procesa</small><b id=sc>${score(d,V.k)}</b></div></div>
  <button class="${d.reviewDone?'ghost':'primary'}" data-a=closeday style="width:100%;margin-top:12px">${d.reviewDone?'Otvori dan ponovo':'Završi dan'}</button>
  <p class=mut>Ocena procesa nije mera moje vrednosti niti uspeha. To je samo pokazatelj kvaliteta izvršenja procesa. Raspoloženje, energija, disciplina i fokus (od 1 do 10, nula znači bez unosa) služe samo za praćenje obrazaca, ne za osuđivanje. Formula: zadaci 50%, disciplina 20%, fokus 10%, review 10%, doslednost u poslednjih 7 dana 10%.</p></section>
 </fieldset>`}

function hist(){
 const ks=Object.keys(S.days).sort().reverse();
 return `<h1>Istorija</h1><label class=card>Otvori datum<input type=date max=${TODAY} id=gd></label><div class=list>${ks.map(k=>{const d=S.days[k];return `<a class="card item" href="#day/${k}"><b>${fd(k,{day:'numeric',month:'short',year:'numeric'})}</b><span class=tag>${L[st(k)]}</span><span>${done(d)}/${d.tasks.length} zadataka, ocena ${scr(k)}</span><span>Raspoloženje ${d.mood||'-'} · Energija ${d.energy||'-'} · Disciplina ${d.discipline||'-'}</span></a>`}).join('')||'<p class=mut>Još nema zapisa.</p>'}</div>`}

function pat(){
 const ks=win(30).filter(act),o=[],D=k=>S.days[k];
 if(ks.length>=14){
  const hi=ks.filter(k=>D(k).energy>=7).map(scr),lo=ks.filter(k=>D(k).energy&&D(k).energy<7).map(scr);
  if(hi.length>=4&&lo.length>=4){const a=avg(hi),b=avg(lo);if(Math.abs(a-b)>=8)o.push(`U poslednjih 30 dana, tvoja ocena procesa je ${a>b?'viša':'niža'} kada je energija 7 ili više (${fm(a)} naspram ${fm(b)}).`)}
  const m={};ks.filter(k=>k<TODAY).forEach(k=>{const w=new Date(k+'T12:00').getDay();D(k).tasks.forEach(t=>{const e=m[t.name+'\t'+w]||=[0,0];e[0]++;if(t.status!=='done')e[1]++})});
  const top=Object.entries(m).filter(([,e])=>e[0]>=3&&e[1]/e[0]>=.67).sort((a,b)=>b[1][1]-a[1][1])[0];
  if(top){const [n,w]=top[0].split('\t');o.push(`Najčešće ne završavaš „${esc(n)}“ ${DN[w]} (${top[1][1]} od ${top[1][0]} puta).`)}}
 return o.length?o.map(x=>`<p>${x}</p>`).join(''):'<p class=mut>Nema dovoljno podataka za pouzdan obrazac.</p>'}

function review(n){
 const ks=win(n).filter(act);
 if(ks.length<3)return'<p class=mut>Nema dovoljno podataka za pouzdan obrazac.</p>';
 const D=k=>S.days[k],b=ks.reduce((a,k)=>scr(k)>scr(a)?k:a),w=ks.reduce((a,k)=>scr(k)<scr(a)?k:a),miss={};
 ks.filter(k=>k<TODAY).forEach(k=>D(k).tasks.forEach(t=>{if(t.status!=='done')miss[t.name]=(miss[t.name]||0)+1}));
 const rep=Object.entries(miss).filter(e=>e[1]>=3).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([a,c])=>`${a} (${c}×)`),
  les=ks.map(k=>D(k).review.learned).filter(x=>x&&x.trim()).slice(-4),
  nx=ks.map(k=>D(k).review.next).filter(x=>x&&x.trim()).slice(-3),h=Math.floor(ks.length/2),
  li=a=>a.length?'<ul>'+a.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'<p class=mut>-</p>',f=k=>fd(k,{day:'numeric',month:'short'});
 return `<p>Najbolji dan: <b>${f(b)}</b> (ocena ${scr(b)}). Najlošiji: <b>${f(w)}</b> (ocena ${scr(w)}).</p>
 <p>Prosečna ocena <b>${fm(avg(ks.map(scr)))}</b>, završenost <b>${fp(avg(ks.map(k=>pct(D(k)))))}</b>, niz <b>${streak()}</b>${n>=30&&ks.length>=6?`, trend ocene od ${fm(avg(ks.slice(0,h).map(scr)))} do ${fm(avg(ks.slice(h).map(scr)))}`:''}.</p>
 <h3>Lekcije koje si uneo</h3>${li(les)}<h3>Šta se ponavlja (nedovršeno 3 ili više puta)</h3>${li(rep)}<h3>Za sledeći period (tvoji sopstveni sledeći koraci)</h3>${li(nx)}`}

function stats(){
 const A=n=>win(n).filter(k=>S.days[k]),a=Object.keys(S.days).filter(act),nz=f=>a.map(k=>S.days[k][f]).filter(Boolean),
  past=Object.keys(S.days).filter(k=>k<TODAY&&st(k)!=='skip'),c=(l,v)=>`<div class=card><small>${l}</small><b>${v}</b></div>`;
 return `<h1>Analitika</h1><div class=grid>${c('Završenost 7 dana',fp(avg(A(7).map(k=>pct(S.days[k])))))}${c('Završenost 30 dana',fp(avg(A(30).map(k=>pct(S.days[k])))))}${c('Niz dana',streak())}${c('Prosečna ocena procesa',fm(avg(a.map(scr))))}${c('Prosečna disciplina',fm(avg(nz('discipline')),1))}${c('Prosečna energija',fm(avg(nz('energy')),1))}${c('Prosečno raspoloženje',fm(avg(nz('mood')),1))}${c('Dana po procesu',past.filter(ok).length)}${c('Dana ispod minimuma',past.filter(k=>!ok(k)).length)}</div>
 <section class=card><h2>Ocena procesa, 30 dana</h2>${bars(win(30),k=>S.days[k]?scr(k):null)}</section>
 <section class=card><h2>Obrasci</h2>${pat()}</section>
 <section class=card><h2>Nedeljni pregled (7 dana)</h2>${review(7)}</section>
 <section class=card><h2>Mesečni pregled (30 dana)</h2>${review(30)}</section>`}

function data(){
 const le=lastExport();
 return `<h1>Podaci</h1>
 <section class=card><h2>Minimum dana za niz</h2><label>Dan je uspešan ako je završeno najmanje (%)<input type=number min=1 max=100 data-s=minDay value=${S.settings.minDay}></label></section>
 <section class=card><h2>Standardni dnevni zadaci</h2><p class=mut>Jedan po redu: naziv | kategorija. Važe za nove dane, stari dani se ne menjaju.</p><textarea data-s=template rows=7>${esc(S.settings.template.map(t=>t.name+' | '+(t.cat||'')).join('\n'))}</textarea></section>
 <section class=card><h2>Rezervna kopija</h2><p class=mut>Sačuvano lokalno u ovom browseru: ${Object.keys(S.days).length} dana. Brisanje browser podataka briše i ove zapise, a neki browseri (Safari) ih brišu i posle dužeg nekorišćenja, zato povremeno preuzmi izvoz. Poslednji izvoz: ${le?fd(key(new Date(le)),{day:'numeric',month:'long',year:'numeric'}):'još nije rađen'}.</p><div class=row style="justify-content:flex-start"><button data-a=exp>Izvezi podatke (JSON)</button><button data-a=imp>Uvezi podatke (JSON)</button><button class=danger data-a=reset>Obriši sve podatke</button></div><p class=mut>Uvoz spaja podatke: postojeći dan se zamenjuje samo ako je uvezena verzija novija.</p></section>`}

/* ---------- render i događaji ---------- */
const VIEWS={dash,day,hist,stats,data};
function render(){
 $('#nav').innerHTML=NAV.map(([id,l])=>`<a href="#${id}" class="${V.v===id?'on':''}">${l}</a>`).join('');
 $('#m').innerHTML=VIEWS[V.v]();
}
/* keep=true čuva otvorene zadatke pri ponovnom iscrtavanju */
const re=keep=>{const y=scrollY,o=keep?[...document.querySelectorAll('.task details')].map(d=>d.open):[];render();document.querySelectorAll('.task details').forEach((d,i)=>{d.open=!!o[i]});scrollTo(0,y)};
function route(){
 let [v,k]=(location.hash.slice(1)||'dash').split('/');
 if(!VIEWS[v])v='dash';
 if(v==='day'&&k&&(!validKey(k)||k>TODAY))k=TODAY;
 V={v,k:k||TODAY,unlock:false};render();scrollTo(0,0)}
addEventListener('hashchange',route);

const upd=el=>{const d=cur();if($('#sc'))$('#sc').textContent=score(d,V.k);if(el.type==='range')el.previousElementSibling.textContent=el.value==0?'-':el.value};
const onIn=e=>{
 const el=e.target,f=el.dataset.f,s=el.dataset.s;
 if(el.id==='gd'&&el.value)return void(location.hash='day/'+el.value);
 if(s){if(s==='minDay')S.settings.minDay=Math.min(100,Math.max(1,+el.value||70));else S.settings.template=el.value.split('\n').map(l=>l.split('|').map(x=>x.trim())).filter(a=>a[0]).map(([name,cat])=>({name,cat:cat||''}));try{saveSet()}catch{toast('Čuvanje nije uspelo')}return}
 if(!f)return;
 if(!S.days[V.k])S.days[V.k]=tmp;
 const p=f.split('.');let o=S.days[V.k];while(p.length>1)o=o[p.shift()];
 o[p[0]]=el.type==='range'?+el.value:el.value;sv();upd(el)};
document.addEventListener('input',onIn);document.addEventListener('change',onIn);

function exportData(){
 const b=new Blob([JSON.stringify({app:'PROCESS',version:1,exportedAt:new Date().toISOString(),settings:S.settings,days:S.days},null,1)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(b);a.download=`process-${TODAY}.json`;a.click();
 try{localStorage.setItem(P+'lastExport',new Date().toISOString())}catch{}
 if(V.v==='data')re()}
$('#imp').onchange=async e=>{try{
 const j=JSON.parse(await e.target.files[0].text());if(!j.days||typeof j.days!=='object')throw 0;let n=0;
 for(const[k,d]of Object.entries(j.days)){
  if(!validKey(k)||!d||!Array.isArray(d.tasks))continue;
  const o=S.days[k];
  if(!o||(d.updatedAt||'')>(o.updatedAt||'')){S.days[k]={...mk(k),...d,review:{...EMPTY_REVIEW,...d.review}};localStorage.setItem(P+'day:'+k,JSON.stringify(S.days[k]));n++}}
 const t=j.settings&&Array.isArray(j.settings.template)?j.settings.template.filter(x=>x&&typeof x.name==='string'&&x.name.trim()).map(x=>({name:x.name.trim(),cat:String(x.cat||'')})):[];
 if(t.length){S.settings={minDay:Math.min(100,Math.max(1,+j.settings.minDay||S.settings.minDay)),template:t};saveSet()}
 toast(`Uvezeno dana: ${n}`);re()}catch{toast('Neispravan fajl')}e.target.value=''};

document.addEventListener('click',e=>{
 const a=e.target.closest('[data-a]');if(!a)return;
 const x=a.dataset.a,i=+a.dataset.i,mut=(f,keep)=>{if(!S.days[V.k])S.days[V.k]=tmp;f(S.days[V.k]);sv();re(keep)};
 ({open:()=>location.hash='day/'+a.dataset.k,
  tog:()=>mut(d=>d.tasks[i].status=d.tasks[i].status==='done'?'todo':'done',true),
  skip:()=>mut(d=>d.tasks[i].status=d.tasks[i].status==='skip'?'todo':'skip',true),
  del:()=>ask('Obrisati ovaj zadatak iz tog dana?',()=>mut(d=>d.tasks.splice(i,1))),
  addtask:()=>{const n=$('#nt').value.trim();n&&mut(d=>d.tasks.push({id:Date.now(),name:n,cat:$('#nc').value.trim(),prio:2,status:'todo',dur:'',note:''}),true)},
  skipday:()=>mut(d=>d.skipped=!d.skipped,true),
  closeday:()=>{mut(d=>d.reviewDone=!d.reviewDone,true);toast(S.days[V.k].reviewDone?'Dan je završen':'Dan je ponovo otvoren')},
  unlock:()=>{V.unlock=true;re()},
  exp:exportData,
  imp:()=>$('#imp').click(),
  reset:()=>ask('Ovo trajno briše SVE dane i podešavanja iz ovog browsera. Preporuka: prvo preuzmi izvoz. Nastaviti?',()=>{Object.keys(localStorage).filter(k=>k.startsWith(P)).forEach(k=>localStorage.removeItem(k));location.hash='';location.reload()},'Da, obriši sve')
 })[x]?.()});

/* ---------- start: automatsko kreiranje današnjeg zapisa ---------- */
if(!S.days[TODAY]){S.days[TODAY]=mk(TODAY);try{saveDay(TODAY)}catch(e){console.error(e)}}
navigator.storage?.persist?.();
route();

import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import * as A from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import * as F from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import fbcfg from "./firebase-config.js";
export const app=initializeApp(fbcfg),auth=A.getAuth(app),db=F.getFirestore(app);export{A,F,fbcfg};
export const J=s=>{try{return JSON.parse(s||"{}")}catch{return{}}};
export const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const online=s=>!!(s.seen&&Date.now()/1000-s.seen<90);
const ago=t=>{const x=Math.floor(Date.now()/1000-t);return x<90?"just now":x<3600?Math.floor(x/60)+" min ago":x<86400?Math.floor(x/3600)+" h ago":Math.floor(x/86400)+" d ago"};
const ago2=t=>{const x=Math.floor(Date.now()/1000-t);return x<90?"just now":x<3600?Math.floor(x/60)+" min":x<86400?Math.floor(x/3600)+" h":Math.floor(x/86400)+" d"};
const devInfo=s=>{const d=s.device||{};if(!d.computerName&&!d.os)return"<small>Waiting for the agent's first full report…</small>";const r=(k,v)=>v?`<small><b style="display:inline;margin:0">${k}:</b> ${esc(v)}</small>`:"";
 return [r("Computer",d.computerName),r("Signed-in Windows user",d.windowsUser||"nobody signed in"),r("Windows",[d.os,d.build&&"build "+d.build].filter(Boolean).join(" ")),r("Hardware",[d.manufacturer,d.model].filter(Boolean).join(" ")),r("Local IP",(d.localIp||[]).join(", "))].join("")};
const alerts=(s,on,lim)=>{const a=[];const now=Date.now()/1000;
 if(!s.seen)a.push("Agent has never reported. Finish installing it on the child's PC.");
 else if(!on)a.push("Device offline for "+ago2(s.seen)+(now-s.seen>600?" — check the PC is on and connected.":"."));
 if(on&&s.msg)a.push("Restriction active: "+s.msg);
 if(lim&&s.used>=lim*0.9&&s.used<lim)a.push("Screen-time limit almost reached ("+s.used+" of "+lim+" min).");
 const v=(s.events||[]).filter(e=>/^(Blocked application|Blocked website)/.test(e.message||"")&&now-(e.at||0)<86400).length;if(v)a.push(v+" blocked attempt(s) in the last 24 hours.");
 return a.length?`<div class=alerts><b>Alerts</b><ul>${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""};
const BR=["chrome.exe","msedge.exe","firefox.exe","brave.exe","opera.exe","vivaldi.exe"];
// Dashboard + controls for one child device. role 'admin' can lock sections from the parent.
// save(cfg, adminCfg|undefined). Returned element has .refresh(newDoc) to update live stats without losing form edits.
export function panel(id,d,role,save){
 const adm=role==="admin";const a=J(d.adminCfg);let c=J(d.cfg);if(adm){for(const k of ["apps","allowedApps","blockedGames","allowedGames","blockGames","sites","allowedSites","safeSearch","locationEnabled"]){if(Object.prototype.hasOwnProperty.call(a,k))c[k]=a[k]}}const L=a.locked||[];
 const dis=k=>!adm&&L.includes(k)?"disabled":"";
 const lk=k=>adm?`<label class=lk><input type=checkbox data-l=${k} ${L.includes(k)?"checked":""}> lock from parent</label>`:L.includes(k)?` <span class=off>🔒 locked by admin</span>`:"";
 const el=document.createElement("div");el.className="c dev";
 const stat=()=>{const s=J(d.status),on=online(s),b=c.bonus&&c.bonus.day===s.day?+c.bonus.min:0,lim=c.limit!=null?+c.limit+b:null,
  h=s.hist||{},ks=Object.keys(h).sort().slice(-7),mx=Math.max(lim||0,...ks.map(k=>h[k]),1),
  ap=Object.entries(s.apps||{}).sort((x,y)=>y[1]-x[1]).slice(0,6),am=ap.length?ap[0][1]||1:1,
  override=Number(s.unlockedUntil||0)>Date.now()/1000,state=!on?"Offline":s.msg?"⛔ "+s.msg:override?"Temporary unlock active":s.active?"Child is active":"Idle";
  return `<h3>${esc(d.name)} <span class="${on?"on":"off"}">${on?"● online":"○ offline"}</span></h3>
  <div class=tiles><div class=t><small>Used today</small><b>${s.used??"-"}${lim?` / ${lim}`:""} min</b></div><div class=t><small>Status</small><b>${esc(state)}</b></div><div class=t><small>Last seen</small><b>${s.seen?ago(s.seen):"never"}</b></div></div>
  ${alerts(s,on,lim)}
  <b>Device</b><div class=loc>${devInfo(s)}</div>
  <b>Screen time, last days</b><div class=chart>${ks.map(k=>`<div class=col title="${k}: ${h[k]} min"><i style="height:${Math.round(h[k]/mx*100)}%"></i><small>${k.slice(5)}</small></div>`).join("")||"<small>No data yet</small>"}</div>
  <b>Top apps today</b>${ap.map(([n,m])=>`<div class=ar><span>${esc(n)}</span><span class=bar><i style="width:${Math.max(4,m/am*100)}%"></i></span><small>${Math.round(m)}m</small></div>`).join("")||"<br><small>None yet</small>"}
  <br><b>Device location</b><div class=loc>${s.locationEnabled?(s.location?`<span class=on>Location permission available</span><br><a target=_blank rel=noopener href="https://maps.google.com/?q=${Number(s.location.latitude)},${Number(s.location.longitude)}">View latest reported location on map</a><small>Accuracy: ${Math.round(Number(s.location.accuracy)||0)} m · ${esc(s.location.capturedAt||"")}</small>`:`<span class=off>Precise Windows location not available</span>`):"Location sharing is disabled"}${s.locationEnabled&&s.ipLocation?`<small>Approximate (IP-based, city level): ${esc([s.ipLocation.city,s.ipLocation.region,s.ipLocation.country].filter(Boolean).join(", ")||"unknown")} · public IP ${esc(s.ipLocation.publicIp||"-")}</small>`:""}</div>
  <br><b>Agent / policy status</b><small>Agent v${esc(s.version||"-")} · policy acknowledged ${s.policyAppliedAt?ago(s.policyAppliedAt):"not yet"}</small>
  <br><b>Recent activity</b><ul class=ev>${(s.events||s.ev||[]).slice(0,20).map(e=>`<li><small>${new Date((e.at||e.t)*1000).toLocaleString()}</small> ${esc(e.message||e.m)}</li>`).join("")||"<li><small>Nothing yet</small></li>"}</ul>`};
 el.innerHTML=`<div class=stat></div>
 <div class=qa><b>Immediate device controls</b> ${lk("control")}<div class="action-row"><button data-q=lock class="dg" ${dis("control")}>🔒 Lock device now</button><button data-q=unlock ${dis("control")}>🔓 Unlock for 30 minutes</button><select data-q=extend-min ${dis("control")} aria-label="Extension length"><option value="15">15 minutes</option><option value="30" selected>30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option></select><button data-q=extend class="gr" ${dis("control")}>Extend screen time</button></div><small class="muted">Unlock temporarily overrides the schedule and daily limit. Extensions add minutes to today's limit.</small><span class=q role=status></span></div>
 <b>Blocked apps</b>${lk("apps")}<textarea data-f=ap ${dis("apps")} placeholder="app.exe (one per line)">${esc((c.apps||[]).join("\n"))}</textarea>
 <label>Allowed app exceptions (one .exe per line)<textarea data-f=aa ${dis("apps")} placeholder="approved-app.exe">${esc((c.allowedApps||[]).join("\n"))}</textarea></label>
 <b>Games</b>${lk("games")}<label><input type=checkbox data-f=bg ${c.blockGames?"checked":""} ${dis("games")}> Block common games and launchers</label>
 <label>Additional blocked game processes<textarea data-f=games ${dis("games")} placeholder="game.exe">${esc((c.blockedGames||[]).join("\n"))}</textarea></label>
 <label>Games explicitly allowed by administrator<textarea data-f=ag ${dis("games")} placeholder="approved-game.exe">${esc((c.allowedGames||[]).join("\n"))}</textarea></label>
 <b>Blocked browsers</b>${lk("browsers")}<div>${BR.map(b=>`<label style="display:inline-block;margin-right:10px"><input type=checkbox name=br value=${b} ${(c.browsers||[]).includes(b)?"checked":""} ${dis("browsers")}> ${b}</label>`).join("")}</div>
 <b>Blocked websites</b>${lk("sites")}<textarea data-f=si ${dis("sites")} placeholder="example.com (one per line)">${esc((c.sites||[]).join("\n"))}</textarea>
 <label>Allowed website exceptions<textarea data-f=as ${dis("sites")} placeholder="school.edu (one per line)">${esc((c.allowedSites||[]).join("\n"))}</textarea></label>
 <b>Age-appropriate browser settings</b>${lk("browsers")}<label><input type=checkbox data-f=safe ${c.safeSearch!==false?"checked":""} ${dis("browsers")}> Enforce Google/Bing SafeSearch and YouTube restricted mode (Chrome/Edge)</label>
 <b>Adult filter</b>${lk("adult")}<label><input type=checkbox data-f=ad ${c.adult?"checked":""} ${dis("adult")}> Block adult content using DNS family filter</label>
 <b>Location</b>${lk("location")}<label><input type=checkbox data-f=loc ${c.locationEnabled?"checked":""} ${dis("location")}> Enable device location reporting (requires Windows Location Services and permission)</label>
 <b>Screen time</b>${lk("time")}<label>Child's Windows username<input data-f=ch value="${esc(c.child||"")}" ${dis("time")}></label>
 <label>Daily limit, school days (min)<input data-f=li type=number min=0 value="${c.limit??120}" ${dis("time")}></label>
 <label>Daily limit, weekends (min)<input data-f=lw type=number min=0 value="${c.limitWk??c.limit??120}" ${dis("time")}></label>
 <label>Allowed from<input data-f=st type=time value="${c.start||"07:00"}" ${dis("time")}> until <input data-f=en type=time value="${c.end||"21:00"}" ${dis("time")}></label>
 <button data-q=save>Save settings</button> <span class=m></span>`;
 const $=s=>el.querySelector(s),draw=()=>{$(".stat").innerHTML=stat()};draw();
 el.refresh=nd=>{if(nd)d=nd;draw()};
 const t=setInterval(()=>el.isConnected?draw():clearInterval(t),30000);
 const commit=async nc=>{try{c=nc;await save(nc,adm?{...a,paused:nc.paused,bonus:nc.bonus,unlockedUntil:nc.unlockedUntil,locked:L}:undefined);$(".q").textContent="Policy saved — waiting for device acknowledgement…"}catch(e){$(".q").textContent="Failed: "+(e.code||e.message)}};
 $(`[data-q=lock]`).onclick=()=>commit({...c,paused:true,unlockedUntil:0});
 $(`[data-q=unlock]`).onclick=()=>commit({...c,paused:false,unlockedUntil:Math.floor(Date.now()/1000)+1800});
 $(`[data-q=extend]`).onclick=()=>{const minutes=Number($(`[data-q=extend-min]`).value)||30,day=J(d.status).day||new Date().toLocaleDateString("sv"),p=c.bonus&&c.bonus.day===day?+c.bonus.min:0;commit({...c,bonus:{day,min:p+minutes}})};
 const ln=t=>t.value.split("\n").map(x=>x.trim().toLowerCase().replace(/^https?:\/\/|^www\.|\/.*$/g,"")).filter(Boolean);
 $("[data-q=save]").onclick=async()=>{
  const n={...c,apps:ln($("[data-f=ap]")).map(x=>x.replace(/^.*\//,"")),allowedApps:ln($("[data-f=aa]")).map(x=>x.replace(/^.*\//,"")),
   blockedGames:ln($("[data-f=games]")).map(x=>x.replace(/^.*\//,"")),allowedGames:ln($("[data-f=ag]")).map(x=>x.replace(/^.*\//,"")),blockGames:$("[data-f=bg]").checked,
   browsers:[...el.querySelectorAll("[name=br]:checked")].map(x=>x.value),safeSearch:$("[data-f=safe]").checked,sites:ln($("[data-f=si]")),allowedSites:ln($("[data-f=as]")),locationEnabled:$("[data-f=loc]").checked,
   adult:$("[data-f=ad]").checked,child:$("[data-f=ch]").value.trim(),limit:+$("[data-f=li]").value,limitWk:+$("[data-f=lw]").value,start:$("[data-f=st]").value,end:$("[data-f=en]").value};
  let ac;if(adm)ac={...a,...n,locked:[...el.querySelectorAll("[data-l]:checked")].map(x=>x.dataset.l)};
  try{await save(n,ac);c=n;$(".m").textContent="Saved ✓"}catch(e){$(".m").textContent="Failed: "+e.code}};
 return el;}

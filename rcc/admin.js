(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const D={students:{},passages:{},sessions:{}};let root=null;
if(window.FIREBASE_READY&&window.firebase){try{firebase.initializeApp(window.FIREBASE_CONFIG);root=firebase.database().ref('readingComprehension');}catch(e){console.error(e);}}
const toast=m=>{const t=$('adminToast');t.textContent=m;t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3800);};
const uid=()=>'id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
const qs=p=>Array.isArray(p.questions)?p.questions.filter(Boolean):Object.values(p.questions||{});
const words=s=>(String(s||'').match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g)||[]).length;
const date=ms=>ms?new Date(ms).toLocaleString():'—';
if(root)['students','passages','sessions'].forEach(k=>root.child(k).on('value',s=>{D[k]=s.val()||{};render();},()=>toast('Firebase read failed. Check your database rules for readingComprehension.')));else toast('Firebase not configured. Update firebase-config.js.');
function render(){
 const S=Object.entries(D.students),P=Object.entries(D.passages),R=Object.entries(D.sessions);
 $('mStudents').textContent=S.length;$('mPassages').textContent=P.length;$('mSessions').textContent=R.length;$('mAvg').textContent=R.length?Math.round(R.reduce((a,[,s])=>a+(s.score||0),0)/R.length)+'%':'—';
 const sq=$('sSearch').value.toLowerCase(),fs=S.filter(([,s])=>`${s.name} ${s.className||''} ${s.passcode}`.toLowerCase().includes(sq));
 $('sTable').innerHTML=fs.map(([k,s])=>`<tr><td><b>${esc(s.name)}</b><br><small>${s.active===false?'Inactive':'Active'}</small></td><td>${esc(s.passcode)}</td><td>${esc(s.className||'—')}</td><td><div class="table-actions"><button class="btn ghost" data-a="editS" data-id="${k}">Edit</button><button class="btn ghost" data-a="togS" data-id="${k}">${s.active===false?'Activate':'Deactivate'}</button><button class="btn danger" data-a="delS" data-id="${k}">Delete</button></div></td></tr>`).join('')||'<tr><td colspan="4">No students match.</td></tr>';
 const pq=$('pSearch').value.toLowerCase();
 $('pTable').innerHTML=P.filter(([,p])=>`${p.title} ${p.level||''}`.toLowerCase().includes(pq)).map(([k,p])=>`<tr><td><b>${esc(p.title)}</b></td><td>${esc(p.level||'—')}</td><td>${words(p.text)}</td><td>${qs(p).length}</td><td>${esc(p.status||'published')}</td><td><div class="table-actions"><button class="btn ghost" data-a="editP" data-id="${k}">Edit</button><button class="btn danger" data-a="delP" data-id="${k}">Delete</button></div></td></tr>`).join('')||'<tr><td colspan="6">No passages yet.</td></tr>';
 const fr=R.filter(([,s])=>RFHistory.match(s,$('rQ').value,$('rDay').value)).sort((a,b)=>(b[1].completedAt||0)-(a[1].completedAt||0)).slice(0,300);
 $('rTable').innerHTML=fr.map(([k,s])=>`<tr><td>${esc(date(s.completedAt))}</td><td>${esc(s.studentName)}</td><td>${esc(s.passageTitle)}</td><td>${s.correct}/${s.total}</td><td><b>${s.score}%</b></td><td>${s.replays||0}</td><td><button class="btn ghost" data-a="view" data-id="${k}">View</button></td></tr>`).join('')||'<tr><td colspan="7">No results match.</td></tr>';}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;const k=b.dataset.id,a=b.dataset.a;
 try{if(a==='editS'){const s=D.students[k];$('studentId').value=k;$('sName').value=s.name||'';$('sPass').value=s.passcode||'';$('sClass').value=s.className||'';window.scrollTo({top:0,behavior:'smooth'});}
 else if(a==='togS')await root.child('students/'+k+'/active').set(D.students[k].active===false);
 else if(a==='delS'){if(confirm('Delete this student? Past results remain.'))await root.child('students/'+k).remove();}
 else if(a==='editP')editPassage(k);
 else if(a==='delP'){if(confirm('Delete this passage? Past results remain.'))await root.child('passages/'+k).remove();}
 else if(a==='view')viewResult(D.sessions[k]);}catch(err){console.error(err);toast('Action failed. Check database rules.');}});
$('studentForm').onsubmit=async e=>{e.preventDefault();if(!root)return toast('Configure Firebase first.');const k=$('studentId').value||uid(),pass=$('sPass').value.trim();
 if(Object.entries(D.students).some(([i,s])=>i!==k&&String(s.passcode).toLowerCase()===pass.toLowerCase()))return toast('That passcode is already assigned. Choose another.');
 const old=D.students[k]||{};try{await root.child('students/'+k).set({name:$('sName').value.trim(),passcode:pass,className:$('sClass').value.trim(),active:old.active!==false,createdAt:old.createdAt||Date.now(),updatedAt:Date.now()});$('studentForm').reset();$('studentId').value='';toast('Student saved.');}catch(err){toast('Could not save student.');}};
$('sClear').onclick=()=>{$('studentId').value='';};
// Question builder
const num=()=>document.querySelectorAll('#qList .qb').forEach((d,i)=>d.querySelector('.qb-n').textContent='Question '+(i+1));
function qBlock(q={}){const o=q.options||{},d=document.createElement('div');d.className='qb';
 d.innerHTML=`<div class="qb-head"><b class="qb-n"></b><button type="button" class="btn danger" data-rm>Remove</button></div><label>Question</label><textarea class="q-q" rows="2" placeholder="What did Amina do first?">${esc(q.q||'')}</textarea><div class="qb-opts">${['A','B','C','D'].map(k=>`<div><label>Option ${k}${k>'B'?' (optional)':''}</label><input class="q-o" data-k="${k}" value="${esc(o[k]||'')}"></div>`).join('')}</div><div class="form-grid"><div><label>Correct answer (key)</label><select class="q-a">${['A','B','C','D'].map(k=>`<option ${q.answer===k?'selected':''}>${k}</option>`).join('')}</select></div><div class="span-two"><label>Explanation shown to the student</label><textarea class="q-e" rows="2" placeholder="Explain why this answer is correct, using the passage.">${esc(q.explanation||'')}</textarea></div></div>`;
 d.querySelector('[data-rm]').onclick=()=>{d.remove();num();};$('qList').appendChild(d);num();}
const collect=()=>[...document.querySelectorAll('#qList .qb')].map(d=>{const options={};d.querySelectorAll('.q-o').forEach(i=>{if(i.value.trim())options[i.dataset.k]=i.value.trim();});return {q:d.querySelector('.q-q').value.trim(),options,answer:d.querySelector('.q-a').value,explanation:d.querySelector('.q-e').value.trim()};});
$('addQ').onclick=()=>qBlock();$('pText').oninput=()=>{const n=words($('pText').value);$('pInfo').textContent=n+' words · about '+Math.max(1,Math.round(n/130))+' min of listening';};
function editPassage(k){const p=D.passages[k];$('pId').value=k;$('pTitle').value=p.title||'';$('pLevel').value=p.level||'';$('pText').value=p.text||'';$('pStatus').value=p.status||'published';$('qList').innerHTML='';qs(p).forEach(qBlock);$('pText').oninput();window.scrollTo({top:0,behavior:'smooth'});}
$('passageForm').onsubmit=async e=>{e.preventDefault();if(!root)return toast('Configure Firebase first.');const qa=collect();
 for(let i=0;i<qa.length;i++){const q=qa[i];if(!q.q)return toast(`Question ${i+1}: write the question.`);if(Object.keys(q.options).length<2)return toast(`Question ${i+1}: add at least two options.`);if(!q.options[q.answer])return toast(`Question ${i+1}: the correct answer must be one of the options you filled in.`);}
 if($('pStatus').value==='published'&&!qa.length)return toast('Add at least one question, or save as Draft.');
 const k=$('pId').value||uid(),old=D.passages[k]||{};try{await root.child('passages/'+k).set({title:$('pTitle').value.trim(),level:$('pLevel').value.trim(),text:$('pText').value.trim(),status:$('pStatus').value,questions:qa,createdAt:old.createdAt||Date.now(),updatedAt:Date.now()});$('passageForm').reset();$('pId').value='';$('qList').innerHTML='';qBlock();toast('Passage saved.');}catch(err){console.error(err);toast('Could not save passage.');}};
$('pClear').onclick=()=>{$('pId').value='';$('qList').innerHTML='';qBlock();};
// Coach read-aloud for the teacher (sentence by sentence, highlights the question being read)
const sayState={t:0};
function stopSay(){sayState.t++;if('speechSynthesis' in window)speechSynthesis.cancel();document.querySelectorAll('.review.speaking').forEach(e=>e.classList.remove('speaking'));const b=$('coachPlay');if(b)b.textContent='🔊 Coach reads this report';}
function sayItems(items){if(!('speechSynthesis' in window))return toast('Read-aloud is not supported in this browser.');stopSay();const my=sayState.t,q=[];
 items.forEach(it=>RFCoach.sentences(it.text).forEach(t=>q.push({key:it.key,text:t})));let i=0;const b=$('coachPlay');if(b)b.textContent='⏸ Reading… (press Stop)';
 const next=()=>{if(my!==sayState.t)return;if(i>=q.length){stopSay();return;}const it=q[i++],u=new SpeechSynthesisUtterance(it.text);u.lang='en-GB';u.rate=.95;
  u.onstart=()=>{document.querySelectorAll('.review.speaking').forEach(e=>e.classList.remove('speaking'));const c=it.key>=0&&document.querySelector(`.review[data-ci="${it.key}"]`);if(c){c.classList.add('speaking');c.scrollIntoView({block:'nearest',behavior:'smooth'});}};
  u.onend=()=>setTimeout(next,160);u.onerror=ev=>{if(ev.error!=='interrupted'&&ev.error!=='canceled')stopSay();};speechSynthesis.speak(u);};next();}
function viewResult(s){if(!s)return;stopSay();const name=(s.studentName||'The student').split(' ')[0],sc=RFCoach.script(s,{name,teacher:true});
 $('modalBody').innerHTML=`<div class="result-head"><div><h2>${esc(s.studentName)}</h2><p class="muted">${esc(s.passageTitle)} · ${esc(date(s.completedAt))}</p></div><div class="result-score">${s.score}%</div></div>
 <div class="voice-coach"><div class="voice-coach-heading"><div><h3>Coach report</h3><p>${esc(sc.headline)}</p></div><div class="voice-orb" aria-hidden="true">🎙️</div></div><div class="voice-toolbar"><button class="btn primary" id="coachPlay">🔊 Coach reads this report</button><button class="btn ghost" id="coachStop">■ Stop</button></div></div>
 ${(s.answers||[]).map((x,i)=>`<div class="review ${x.ok?'good':'bad'}" data-ci="${i}"><b>${i+1}. ${esc(x.q)}</b><p>Chose ${esc(x.chosen)}. ${esc(x.chosenText)}${x.ok?'':`<br>Correct: ${esc(x.answer)}. ${esc(x.answerText)}`}</p>${x.evidence&&!x.ok?`<blockquote class="evidence"><b>In the passage:</b> “${esc(x.evidence)}”</blockquote>`:''}${x.explanation?`<small>${esc(x.explanation)}</small>`:''}</div>`).join('')}<button class="btn primary" id="closeModal">Close</button>`;
 $('modal').classList.remove('hidden');$('closeModal').onclick=()=>{stopSay();$('modal').classList.add('hidden');};$('coachPlay').onclick=()=>sayItems(sc.items);$('coachStop').onclick=stopSay;}
$('modal').onclick=e=>{if(e.target.id==='modal'){stopSay();$('modal').classList.add('hidden');}};
$('exportCsv').onclick=()=>{const rows=Object.values(D.sessions).map(s=>[date(s.completedAt),s.studentName,s.passageTitle,s.correct,s.total,s.score,s.replays||0]);const csv=[['date','student','passage','correct','total','score','replays'],...rows].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download='comprehension-results.csv';a.click();URL.revokeObjectURL(a.href);};
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));['students','passages','results'].forEach(t=>$('tab-'+t).classList.toggle('hidden',t!==b.dataset.tab));});
['sSearch','pSearch','rQ'].forEach(i=>$(i).oninput=render);$('rDay').onchange=render;$('rClear').onclick=()=>{$('rQ').value='';$('rDay').value='';render();};
// ---------- Excel: sample template, export, bulk upload with preview ----------
const needX=()=>{if(window.XLSX&&window.RFExcel)return true;toast('The Excel library did not load. Check your internet connection and refresh.');return false;};
$('dlSample').onclick=()=>{if(!needX())return;XLSX.writeFile(RFExcel.workbook(RFExcel.SAMPLE),'passages-sample.xlsx');toast('Sample downloaded. Edit it, then upload it here.');};
$('dlExisting').onclick=()=>{if(!needX())return;const rows=RFExcel.fromPassages(D.passages);if(!rows.length)return toast('There are no passages to export yet.');XLSX.writeFile(RFExcel.workbook(rows),'my-passages.xlsx');toast('Exported. Edit and upload it again to update passages.');};
$('upXlsx').onclick=()=>{if(!root)return toast('Configure Firebase first.');$('xlsxIn').click();};
let pending=[];
$('xlsxIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!needX())return;
 try{const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}),res=RFExcel.parse(wb);previewImport(res,f.name);}catch(err){console.error(err);toast('Could not read that file. Use the sample Excel format (.xlsx).');}};
const exists=t=>Object.values(D.passages).some(p=>String(p.title||'').trim().toLowerCase()===t.toLowerCase());
function previewImport(res,fname){pending=res.groups.filter(g=>!g.errors.length);const bad=res.groups.filter(g=>g.errors.length);
 $('modalBody').innerHTML=`<h2>Import preview</h2><p class="muted">${esc(fname)} · ${res.rowCount} row${res.rowCount===1?'':'s'} read · ${res.groups.length} passage${res.groups.length===1?'':'s'} found</p>
 ${res.problems.map(p=>`<div class="import-err">${esc(p)}</div>`).join('')}
 ${res.groups.length?`<div class="table-wrap"><table class="import-table"><thead><tr><th>Passage</th><th>Level</th><th>Words</th><th>Questions</th><th>Status</th><th>Result</th></tr></thead><tbody>${res.groups.map(g=>`<tr><td><b>${esc(g.title)}</b></td><td>${esc(g.level||'—')}</td><td>${words(g.text)}</td><td>${g.questions.length}</td><td>${esc(g.status)}</td><td>${g.errors.length?'<span class="badge bad">Fix needed</span>':exists(g.title)?'<span class="badge warn">Will update</span>':'<span class="badge good">New</span>'}</td></tr>`).join('')}</tbody></table></div>`:''}
 ${bad.map(g=>`<div class="import-err"><b>${esc(g.title)}</b><ul>${g.errors.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
 <div class="form-actions" style="margin-top:18px"><button class="btn primary" id="doImport" ${pending.length?'':'disabled'}>Import ${pending.length} passage${pending.length===1?'':'s'}${bad.length?' (skip '+bad.length+' with errors)':''}</button><button class="btn ghost" id="cancelImport">Cancel</button></div>`;
 $('modal').classList.remove('hidden');$('cancelImport').onclick=()=>$('modal').classList.add('hidden');
 $('doImport').onclick=async()=>{const b=$('doImport');b.disabled=true;b.textContent='Importing…';const up={};
  pending.forEach(g=>{const ex=Object.entries(D.passages).find(([,p])=>String(p.title||'').trim().toLowerCase()===g.title.toLowerCase()),k=ex?ex[0]:uid(),old=ex?ex[1]:{};
   up[k]={title:g.title,level:g.level,text:g.text,status:g.status,questions:g.questions,createdAt:old.createdAt||Date.now(),updatedAt:Date.now()};});
  try{await root.child('passages').update(up);$('modal').classList.add('hidden');toast(`${pending.length} passage${pending.length===1?'':'s'} imported.`);}catch(err){console.error(err);b.disabled=false;b.textContent='Try again';toast('Import failed. Check your database rules.');}};}

qBlock();
})();

(()=>{
'use strict';
const $=id=>document.getElementById(id);
const normalise=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[^a-z0-9']/g,'');
const tokens=s=>String(s||'').match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g)||[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={student:null,passages:[],sessions:[],active:null,wordSpans:[],transcript:'',isListening:false,qi:0,answers:[],replays:0,tryRec:null,demo:false};
const sayStatus=s=>{$('listenStatus').textContent=s;};
let root=null;
if(window.FIREBASE_READY&&window.firebase){try{firebase.initializeApp(window.FIREBASE_CONFIG);root=firebase.database().ref('readingComprehension');}catch(e){console.error(e);}}

const vs={token:0,voice:null,rate:parseFloat(localStorage.getItem('rfRate'))||0.9};
if('speechSynthesis' in window)speechSynthesis.onvoiceschanged=()=>{vs.voice=null;};
function pickVoice(){if(vs.voice)return vs.voice;const sc=v=>(/natural|neural|online/i.test(v.name)?100:0)+(/google/i.test(v.name)?60:0)+(/en-NG/i.test(v.lang)?50:/en-GB/i.test(v.lang)?30:/en-US/i.test(v.lang)?20:0);
 return vs.voice=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang)).sort((a,b)=>sc(b)-sc(a))[0]||null;}
function lockUI(on){let avatar=$('speakingAvatar');if(!avatar){avatar=document.createElement('div');avatar.id='speakingAvatar';avatar.className='speaking-avatar';avatar.innerHTML='<span class="avatar-face">🧑🏽‍🏫</span><span class="avatar-caption"><b>Reading coach</b><small>Speaking now…</small></span>';document.body.appendChild(avatar);}avatar.classList.toggle('visible',on);let d=$('voiceDock');if(!d){d=document.createElement('div');d.id='voiceDock';d.innerHTML='<span class="vwave"><i></i><i></i><i></i><i></i></span><b>Voice is reading. The page is paused until it finishes.</b><button class="btn danger" id="dockStop">■ Stop voice</button>';document.body.appendChild(d);$('dockStop').onclick=()=>{stopVoice();stopTry();sayStatus('Voice stopped. You can continue.');};}
 d.classList.toggle('on',on);document.body.classList.toggle('voice-locked',on);document.querySelectorAll('.topbar,main').forEach(e=>{e.inert=on;});}
function clearHL(){document.querySelectorAll('.word.current,.guide-step.active,.correction-card.speaking').forEach(e=>e.classList.remove('current','active','speaking'));}
function chunks(text){const w=String(text||'').trim().split(/\s+/).filter(Boolean),out=[];let cur=[],len=0,start=0;
 w.forEach((x,i)=>{cur.push(x);len+=x.length+1;if(/[.!?]["”’)]?$/.test(x)||len>150){out.push({text:cur.join(' '),first:start,words:cur});cur=[];len=0;start=i+1;}});
 if(cur.length)out.push({text:cur.join(' '),first:start,words:cur});return out;}
// Highlight position: words already read stay tinted, the word being spoken is strong, nothing is ever hidden
function setPos(sp,idx){sp.forEach((x,i)=>{x.classList.toggle('read',i<idx);x.classList.toggle('current',i===idx);});if(sp[idx])follow(sp[idx]);
 const pb=$('readProgress');if(pb)pb.style.width=Math.round(Math.min(idx,sp.length)/Math.max(1,sp.length)*100)+'%';
 const wc=$('wordCounter');if(wc)wc.textContent=Math.min(idx+1,sp.length)+' / '+sp.length+' words';}
// speak(text | [{text,onstart,rate}], {spans,onend}): sentence-by-sentence for natural, uninterrupted speech; locks the page while talking
function speak(input,o={}){
 if(!('speechSynthesis' in window)){sayStatus('Read-aloud voice is not supported here. Use an updated Chrome, Edge or Safari.');return;}
 const synth=speechSynthesis;synth.cancel();const my=++vs.token,list=Array.isArray(input)?input:[{text:input}],queue=[];
 list.forEach(it=>chunks(it.text).forEach((c,i)=>queue.push({...c,rate:it.rate,onstart:i?null:it.onstart})));
 if(!queue.length)return;const voice=pickVoice();lockUI(true);if(o.spans)setPos(o.spans,0);
 let est=null;const stopEst=()=>{clearTimeout(est);est=null;};
 const done=ok=>{stopEst();if(my!==vs.token)return;lockUI(false);clearHL();if(o.spans&&ok)setPos(o.spans,o.spans.length);if(ok&&o.onend)o.onend();};let i=0;
 // Fallback for voices that never report word boundaries (common on phones): estimate the pace so every word still lights up
 const startEst=(c,hit)=>{let k=0;const step=()=>{if(hit()||my!==vs.token)return;setPos(o.spans,c.first+k);const w=c.words[k]||'';k++;if(k>=c.words.length)return;est=setTimeout(step,Math.max(110,(w.length+1)*68/(c.rate||vs.rate))+(/[,;:]$/.test(w)?170:/[.!?]["”’)]?$/.test(w)?300:0));};step();};
 const next=()=>{if(my!==vs.token)return;if(i>=queue.length)return done(true);const c=queue[i++],u=new SpeechSynthesisUtterance(c.text);let hit=false;
  if(voice){u.voice=voice;u.lang=voice.lang;}else u.lang='en-GB';u.rate=c.rate||vs.rate;u.pitch=1.03;
  u.onstart=()=>{if(c.onstart)c.onstart();if(o.spans)startEst(c,()=>hit);};
  u.onboundary=e=>{if(!o.spans||e.name==='sentence')return;hit=true;stopEst();let p=0,k=0;for(;k<c.words.length-1;k++){if(e.charIndex<p+c.words[k].length+1)break;p+=c.words[k].length+1;}setPos(o.spans,c.first+k);};
  u.onend=()=>{stopEst();if(o.spans&&my===vs.token)setPos(o.spans,c.first+c.words.length);setTimeout(next,/[.!?]["”’)]?$/.test(c.text)?240:90);};
  u.onerror=ev=>{stopEst();if(my===vs.token&&ev.error!=='interrupted'&&ev.error!=='canceled')done(false);};
  synth.speak(u);};
 setTimeout(next,80);}
function lev(a,b){const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length];}
const close=(a,b)=>a===b||(a.length>3&&b.length>3&&lev(a,b)<=1);
// Keep the current word centred inside the passage window (never scrolls the page)
function follow(el){const w=$('passageText');if(!el||!w)return;if(w.classList.contains('grow')){el.scrollIntoView({block:'center',behavior:'smooth'});return;}w.scrollTo({top:Math.max(0,el.offsetTop-w.clientHeight/2+el.offsetHeight/2),behavior:'smooth'});}
// Fit the whole passage inside its window: the font grows or shrinks so every word is visible at once on any screen
function fitText(){const w=$('passageText');if(!w||!w.offsetParent)return;const small=window.innerWidth<560,max=small?22:30,min=small?14:16;let lo=min,hi=max,best=0;
 w.classList.remove('grow');
 while(lo<=hi){const m=(lo+hi)>>1;w.style.fontSize=m+'px';if(w.scrollHeight<=w.clientHeight+1){best=m;lo=m+1;}else hi=m-1;}
 if(best)w.style.fontSize=best+'px';else{w.style.fontSize=min+'px';w.classList.add('grow');}} // very long passage: the window grows so every word is still visible
let fitT=0;const refit=()=>{clearTimeout(fitT);fitT=setTimeout(fitText,120);};window.addEventListener('resize',refit);window.addEventListener('orientationchange',refit);
// Coach practice (not saved)
let trySession=0;
function stopTry(){trySession++;if(state.tryRec){try{state.tryRec.onend=null;state.tryRec.abort();}catch(e){}state.tryRec=null;}document.querySelectorAll('.correction-card.trying').forEach(e=>e.classList.remove('trying'));}
function gradeWord(target,alts){const t=normalise(target);let best=0,heard='';alts.forEach(a=>tokens(a).forEach(w=>{const n=normalise(w),sim=n===t?1:Math.max(0,1-lev(n,t)/Math.max(n.length,t.length));if(sim>best){best=sim;heard=w;}}));return {score:Math.round(best*100),heard,pass:best>=1||(t.length>=5&&best>=.85)};}
function listenOnce(){return new Promise(res=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return res({error:'unsupported'});const r=new SR();r.lang='en-NG';r.continuous=false;r.interimResults=false;r.maxAlternatives=5;state.tryRec=r;let got=null;const t=setTimeout(()=>{try{r.stop();}catch(e){}},7000);
 r.onresult=e=>{got=[...e.results[0]].map(a=>a.transcript);};r.onerror=e=>{clearTimeout(t);res({error:e.error});};r.onend=()=>{clearTimeout(t);res({alts:got||[]});};
 try{r.start();}catch(e){clearTimeout(t);res({error:'start'});}});}
function stopVoice(){vs.token++;if('speechSynthesis' in window)speechSynthesis.cancel();lockUI(false);clearHL();}
window.addEventListener('pagehide',stopVoice);

const qs=p=>Array.isArray(p.questions)?p.questions.filter(Boolean):Object.values(p.questions||{});
const read=p=>root.child(p).once('value').then(s=>s.val()||{});
const dateLabel=ms=>new Date(ms).toLocaleString([],{dateStyle:'medium',timeStyle:'short'});
function show(v){['loginView','dashboardView','listenView'].forEach(id=>$(id).classList.toggle('hidden',id!==v));$('guide').classList.toggle('hidden',v==='listenView');window.scrollTo(0,0);}
async function login(code){
 if(!root){$('loginError').textContent='Firebase is not configured. Edit firebase-config.js.';return;}
 const st=await read('students'),f=Object.entries(st).find(([,s])=>s&&String(s.passcode||'').trim().toLowerCase()===code.trim().toLowerCase()&&s.active!==false);
 if(!f){$('loginError').textContent='That passcode was not found. Check it with your teacher.';return;}
 state.student={id:f[0],...f[1]};sessionStorage.setItem('rcId',f[0]);sessionStorage.setItem('rcCode',code.trim());await loadDashboard();}
function demoPassages(){return [
 {id:'demo-market',title:'A Visit to the Market',level:'Primary 5 · Demo',text:'On Saturday morning, Ada accompanied her grandmother to the neighbourhood market. They arrived early because the grandmother wanted to buy fresh vegetables before the crowd became large. Ada helped compare the prices of tomatoes at two stalls. At the second stall, the tomatoes were cheaper, but some were bruised. Her grandmother chose the first stall because its vegetables were fresher. Before leaving, they bought beans and oranges. On their way home, Ada explained that the lowest price is not always the best value.',questions:[{q:'Why did Ada and her grandmother arrive early?',options:{A:'To meet a friend',B:'To buy vegetables before the crowd grew',C:'To sell oranges',D:'To attend a class'},answer:'B',explanation:'The passage says they arrived early to buy fresh vegetables before the crowd became large.'},{q:'Why did the grandmother choose the first stall?',options:{A:'It was closer to home',B:'The seller was her friend',C:'Its vegetables were fresher',D:'It sold only oranges'},answer:'C',explanation:'Although the second stall was cheaper, some tomatoes were bruised. She chose freshness.'},{q:'What lesson did Ada explain on the way home?',options:{A:'Markets open only on Saturdays',B:'Oranges are cheaper than beans',C:'The lowest price is not always the best value',D:'Buy everything from one stall'},answer:'C',explanation:'Ada concluded that the lowest price does not always mean the best value.'}]},
 {id:'demo-garden',title:'Why School Gardens Matter',level:'Junior Secondary · Demo',text:'A school garden can be more than a place to grow vegetables. When learners prepare the soil, plant seeds and water young plants, they practise responsibility and patience. The garden also gives teachers a practical way to explain science. Learners can observe how sunlight and water affect growth and record their findings over several weeks. However, a successful garden needs a plan. The school must choose suitable crops, share duties fairly and protect plants during holidays. With regular care, the garden can provide fresh produce and valuable lessons.',questions:[{q:'Which two qualities can learners practise in a garden?',options:{A:'Speed and competition',B:'Responsibility and patience',C:'Silence and secrecy',D:'Strength and pride'},answer:'B',explanation:'The passage directly identifies responsibility and patience.'},{q:'Why is a garden useful for science lessons?',options:{A:'It removes the need for teachers',B:'Learners can observe plant growth',C:'It guarantees every crop will grow',D:'It makes holidays longer'},answer:'B',explanation:'Learners observe how sunlight and water affect growth.'},{q:'What does the passage suggest is needed for a successful garden?',options:{A:'A plan and regular care',B:'Only expensive tools',C:'No shared duties',D:'Watering only once'},answer:'A',explanation:'The school must plan, share duties and protect plants.'}]},
 {id:'demo-river',title:'Keeping the River Clean',level:'Senior Secondary · Demo',text:'For many communities, a river provides water for farming, fishing and household use. Yet these benefits can be threatened when rubbish and untreated waste enter the water. Pollution may harm fish, spread disease and make water unsafe to use. Cleaning a river after pollution has occurred can be costly, so prevention is important. Community groups can organise clean-up days, while local authorities can improve waste collection and enforce environmental rules. Lasting improvement depends on both public participation and effective planning.',questions:[{q:'What is the main idea of the passage?',options:{A:'Rivers are useful but must be protected from pollution',B:'Fishing should stop in every community',C:'Clean-up days are always expensive',D:'Farming causes all river pollution'},answer:'A',explanation:'The passage explains river benefits, pollution risks and ways to protect rivers.'},{q:'Why is prevention important?',options:{A:'Pollution makes rivers deeper',B:'Cleaning polluted rivers can be costly',C:'Fish do not need clean water',D:'Authorities cannot help'},answer:'B',explanation:'The passage states that cleaning a polluted river can be costly.'},{q:'What is needed for lasting improvement?',options:{A:'Only individual effort',B:'Only new fishing boats',C:'Public participation and effective planning',D:'Avoiding all river use'},answer:'C',explanation:'The final sentence says both public participation and effective planning are needed.'}]}
 ];}
 async function restore(){if(sessionStorage.getItem('rcDemo')==='1'){state.demo=true;state.student={id:'public-demo',name:'Demo Learner',className:'Demo mode'};state.sessions=[];state.passages=demoPassages();await loadDashboard();return;}const id=sessionStorage.getItem('rcId'),c=sessionStorage.getItem('rcCode');if(!id||!root)return;const s=await root.child('students/'+id).once('value');if(s.exists()&&String(s.val().passcode).toLowerCase()===String(c).toLowerCase()){state.student={id,...s.val()};await loadDashboard();}}
async function loadDashboard(){
 show('dashboardView');$('studentName').textContent=state.student.name||'Reader';
 const [p,s]=await Promise.all([read('passages'),read('sessions')]);
 state.passages=Object.entries(p).map(([id,v])=>({id,...v})).filter(x=>x.status!=='draft'&&qs(x).length);
 state.sessions=Object.values(s).filter(x=>x.studentId===state.student.id).sort((a,b)=>(b.completedAt||0)-(a.completedAt||0));
 renderDashboard();}
function renderDashboard(){
 const ss=state.sessions,avg=ss.length?Math.round(ss.reduce((a,s)=>a+(s.score||0),0)/ss.length):null,best=ss.length?Math.max(...ss.map(s=>s.score||0)):null;
 $('sessionsCount').textContent=ss.length;$('avgScore').textContent=avg===null?'—':avg+'%';$('bestScore').textContent=best===null?'—':best+'%';$('doneCount').textContent=new Set(ss.map(s=>s.passageId)).size;
 $('passageCount').textContent=state.passages.length+' passages';
 $('passageGrid').innerHTML=state.passages.length?state.passages.map(p=>`<article class="passage-card"><span class="tag">${esc(p.level||'All levels')}</span><h3>${esc(p.title)}</h3><p>${tokens(p.text).length} words · ${qs(p).length} questions · about ${Math.max(1,Math.round(tokens(p.text).length/130))} min of listening</p><button class="btn primary" data-open="${esc(p.id)}">Listen and answer</button></article>`).join(''):'<div class="panel"><b>No passages yet</b><p class="muted">Your teacher has not published a passage yet.</p></div>';
 document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openPassage(b.dataset.open));
 RFHistory.render($('historyList'),ss,x=>`<div class="history-row"><div><b>${esc(x.passageTitle)}</b><small>${dateLabel(x.completedAt)} · ${x.correct}/${x.total} correct</small></div><div class="row-end"><span class="score-chip">${x.score}%</span><button class="btn ghost" data-rep="${esc(x.id)}">🎙️ Coach report</button></div></div>`,b=>b.querySelectorAll('[data-rep]').forEach(k=>k.onclick=()=>openReport(k.dataset.rep)));}
function openPassage(id){
 const p=state.passages.find(x=>x.id===id);if(!p)return;stopVoice();state.active=p;state.replays=0;
 $('listenTitle').textContent=p.title;$('listenLevel').textContent=p.level||'Passage';
 $('passageText').innerHTML=(p.text||'').split(/(\s+)/).map(x=>/^\s+$/.test(x)?esc(x):x?`<span class="word">${esc(x)}</span>`:'').join('');
 state.wordSpans=[...$('passageText').querySelectorAll('.word')];$('passageText').scrollTop=0;$('readProgress').style.width='0%';$('wordCounter').textContent=state.wordSpans.length+' words';
 $('passagePanel').classList.remove('hidden');$('quizPanel').classList.add('hidden');$('toQuestions').disabled=true;$('listenBtn').textContent='▶ Listen to the passage';
 sayStatus('Press Listen. The passage is read aloud; follow the highlighted words, then answer the questions.');show('listenView');requestAnimationFrame(()=>{fitText();$('passagePanel').scrollIntoView({block:'start'});});}
$('listenBtn').onclick=()=>{sayStatus('The voice is reading. Follow the highlighted word.');speak(state.wordSpans.map(x=>x.textContent).join(' '),{spans:state.wordSpans,onend:()=>{$('toQuestions').disabled=false;$('listenBtn').textContent='↻ Listen again';sayStatus('Finished. Press "Start the questions" when you are ready, or listen again.');}});};
$('toQuestions').onclick=()=>{stopVoice();state.qi=0;state.answers=[];$('passagePanel').classList.add('hidden');$('quizPanel').classList.remove('hidden');renderQ();};
function renderQ(){
 const q=qs(state.active),cur=q[state.qi],keys=['A','B','C','D'].filter(k=>cur.options&&cur.options[k]);
 $('quizPanel').innerHTML=`<div class="panel quiz-card"><div class="quiz-top"><b>Question ${state.qi+1} of ${q.length}</b><div class="progress-track"><span style="width:${state.qi/q.length*100}%"></span></div></div><h2 class="quiz-q">${esc(cur.q)}</h2><div class="opts">${keys.map(k=>`<button class="opt" data-k="${k}"><b>${k}</b><span>${esc(cur.options[k])}</span></button>`).join('')}</div><div class="quiz-tools"><button class="btn ghost" id="readQ">🔊 Read the question</button><button class="btn ghost" id="again" ${state.replays>=2?'disabled':''}>🎧 Hear the passage again (${Math.max(0,2-state.replays)} left)</button></div><div id="fb"></div></div>`;
 $('readQ').onclick=()=>speak(`Question ${state.qi+1}. ${cur.q}. `+keys.map(k=>`Option ${k}. ${cur.options[k]}.`).join(' '));
 $('again').onclick=()=>{state.replays++;speak(state.active.text,{onend:()=>{const b=$('again');if(b){b.disabled=state.replays>=2;b.textContent=`🎧 Hear the passage again (${Math.max(0,2-state.replays)} left)`;}}});};
 document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>choose(b.dataset.k,cur));}
function choose(k,cur){
 if(state.answers[state.qi])return;const ok=k===cur.answer,last=state.qi===qs(state.active).length-1;
 state.answers[state.qi]={q:cur.q,chosen:k,chosenText:cur.options[k],answer:cur.answer,answerText:cur.options[cur.answer]||'',ok,explanation:cur.explanation||'',evidence:RFCoach.evidence(state.active.text,cur.q,cur.options[cur.answer])};
 document.querySelectorAll('.opt').forEach(b=>{b.disabled=true;b.classList.toggle('right',b.dataset.k===cur.answer);b.classList.toggle('wrong',b.dataset.k===k&&!ok);});
 $('fb').innerHTML=`<div class="fb ${ok?'good':'bad'}"><b>${ok?'✅ Correct!':'❌ Not quite. The correct answer is '+esc(cur.answer)+'.'}</b><p>${esc(cur.explanation||'')}</p><div class="quiz-tools"><button class="btn ghost" id="hearFb">🔊 Hear the explanation</button><button class="btn primary" id="nextQ">${last?'See my results':'Next question'}</button></div></div>`;
 $('hearFb').onclick=()=>speak(`${ok?'Correct.':'The correct answer is '+cur.answer+'. '+(cur.options[cur.answer]||'')+'.'} ${cur.explanation||''}`);
 $('nextQ').onclick=()=>{stopVoice();if(last)finish();else{state.qi++;renderQ();}};}
async function finish(){
 const a=state.answers,correct=a.filter(x=>x.ok).length,total=a.length,score=Math.round(correct/total*100);
 const r={id:'id_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),studentId:state.student.id,studentName:state.student.name||'Reader',passageId:state.active.id,passageTitle:state.active.title,completedAt:Date.now(),correct,total,score,replays:state.replays,answers:a};
 let saved=true;if(state.demo){r.demo=true;state.sessions.unshift(r);}else{try{await root.child('sessions/'+r.id).set(r);state.sessions.unshift(r);}catch(e){saved=false;console.error(e);}}
 renderReport(r,{saved,auto:true});}
// Coach report: written, highlighted card by card, and read aloud like a personal coach
function renderReport(r,o={}){
 const name=(r.studentName||'reader').split(' ')[0],sc=RFCoach.script(r,{name}),a=r.answers||[],missed=a.filter(x=>!x.ok).length,can=state.passages.some(p=>p.id===r.passageId);
 $('quizPanel').innerHTML=`<div class="panel quiz-card results-shell"><div class="result-head"><div><h2>${r.score>=70?'Great listening':'Good effort'}, ${esc(name)}!</h2><p class="muted">${esc(r.passageTitle)} · ${esc(dateLabel(r.completedAt))}${o.saved===false?' · Your result could not be saved. Check your connection.':''}</p></div><div class="result-score">${r.score}%</div></div>
 <div class="result-grid"><div class="result-metric"><small>Correct</small><strong>${r.correct}<small> / ${r.total}</small></strong></div><div class="result-metric"><small>To review</small><strong>${missed}</strong></div><div class="result-metric"><small>Replays used</small><strong>${r.replays||0}<small> / 2</small></strong></div><div class="result-metric"><small>Coach says</small><strong>${esc(RFCoach.grade(r.score))}</strong></div></div>
 <div class="voice-coach" id="coachBox"><div class="voice-coach-heading"><div><h3>Your coach's report</h3><p>${esc(sc.headline)}</p></div><div class="voice-orb" aria-hidden="true">🎙️</div></div>
 <div class="voice-toolbar"><button class="btn primary" id="coachAll">▶ Coach reads my full report</button><button class="btn ghost" id="coachSum">🔊 Summary only</button></div>
 <div class="practice-progress"><div><span id="coachNow">Press play and your coach will talk you through every question.</span></div><div class="progress-track"><span id="coachBar" style="width:0"></span></div></div></div>
 <h3 class="correction-section-title">Question by question</h3><div class="correction-list">${a.map((x,i)=>`<div class="correction-card" data-ci="${i}"><div class="correction-number">${i+1}</div><div class="correction-body"><span class="correction-type">${x.ok?'✅ Correct':'🔎 Needs another look'}</span><h4>${esc(x.q)}</h4><p>Your answer: <b>${esc(x.chosen)}</b>. ${esc(x.chosenText)}${x.ok?'':`<br>Correct answer: <b>${esc(x.answer)}</b>. ${esc(x.answerText)}`}</p>${x.evidence&&!x.ok?`<blockquote class="evidence"><b>In the passage:</b> “${esc(x.evidence)}”</blockquote>`:''}${x.explanation?`<p>${esc(x.explanation)}</p>`:''}<div class="correction-actions"><button class="btn ghost" data-say="${i}">🔊 Coach explains this</button></div></div></div>`).join('')}</div>
 <div class="report-bottom"><div class="session-controls"><button class="btn primary" id="resDash">Back to dashboard</button>${can?'<button class="btn ghost" id="resAgain">Listen and answer again</button>':''}</div></div></div>`;
 const play=items=>speak(items.map((it,n)=>({text:it.text,onstart:()=>{document.querySelectorAll('.correction-card.speaking').forEach(e=>e.classList.remove('speaking'));
  const c=it.key>=0?document.querySelector(`.correction-card[data-ci="${it.key}"]`):null;if(c){c.classList.add('speaking');c.scrollIntoView({behavior:'smooth',block:'center'});}else if(it.key===-1&&n===0){const b=$('coachBox');if(b)b.scrollIntoView({behavior:'smooth',block:'center'});}
  const now=$('coachNow'),bar=$('coachBar');if(now)now.textContent='Coach: '+it.label;if(bar)bar.style.width=Math.round((n+1)/items.length*100)+'%';}})),{onend:()=>{const now=$('coachNow');if(now)now.textContent='Report finished. Press play to hear it again.';}});
 $('coachAll').onclick=()=>play(sc.items);$('coachSum').onclick=()=>play([sc.items[0]]);
 document.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>play([sc.items[+b.dataset.say+1]]));
 $('resDash').onclick=()=>{stopVoice();loadDashboard();};if(can)$('resAgain').onclick=()=>openPassage(r.passageId);
 window.scrollTo({top:0,behavior:'smooth'});
 if(o.auto)setTimeout(()=>play([sc.items[0]]),400);}
function openReport(id){const r=state.sessions.find(x=>x.id===id);if(!r)return;stopVoice();$('listenTitle').textContent='Coach report';$('listenLevel').textContent=r.passageTitle||'Passage';
 $('passagePanel').classList.add('hidden');$('quizPanel').classList.remove('hidden');show('listenView');renderReport(r,{});}

$('passcodeForm').addEventListener('submit',e=>{e.preventDefault();$('loginError').textContent='';login($('passcode').value).catch(err=>{$('loginError').textContent='Unable to connect. Check your internet and Firebase configuration.';console.error(err);});});
$('logoutBtn').onclick=()=>{sessionStorage.removeItem('rcId');sessionStorage.removeItem('rcCode');sessionStorage.removeItem('rcDemo');state.student=null;state.demo=false;show('loginView');};
 $('demoBtn').onclick=()=>{$('passcode').value='123123';$('passcodeForm').requestSubmit();};
$('backBtn').onclick=()=>{stopVoice();loadDashboard();};
const guideText=['Welcome to MathCloud Reading Comprehension. Here is how it works.','Step one. Type the passcode from your teacher, then press Open my dashboard.','Step two. Choose a passage and press Listen. It is read aloud while the words light up.','Step three. Answer each question by choosing A, B, C or D. You can hear the passage again twice.','Step four. After each answer, read or hear the explanation to learn why it is right.','One important rule. While the voice is reading, the page is paused. Press Stop voice whenever you want to continue.'];
$('hearGuide').onclick=()=>speak(guideText.map((t,i)=>({text:t,onstart:()=>{document.querySelectorAll('.guide-step').forEach((e,k)=>e.classList.toggle('active',k===i-1));}})));
$('voiceRate').value=String(vs.rate);$('voiceRate').onchange=e=>{vs.rate=parseFloat(e.target.value);localStorage.setItem('rfRate',vs.rate);speak('This is how fast I will read.');};
if(!root)$('loginError').textContent='Firebase is not configured. Demo access is still available with 123123.';
restore().catch(console.error);
})();

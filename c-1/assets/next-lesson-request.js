// CURRENT-LESSON → NEXT-LESSON REQUEST PANEL
(function(){
  const root=document.getElementById('nextLessonRequestRoot');
  if(!root)return;

  const hrefWeek=(document.body.dataset.weekHref||'').match(/week(\d+)/);
  const currentWeek=Number(hrefWeek?hrefWeek[1]:(document.body.dataset.week||window.LESSON_META?.week||1));
  const nextWeek=currentWeek+1;
  if(nextWeek>12){
    root.innerHTML='<div class="callout callout-info next-lesson-request"><div><h4>Course complete</h4><p>You have reached the end of the 12-week Practical PC Skills course. Speak with your teacher about your next practical project.</p></div></div>';
    return;
  }

  const phase=Math.ceil(nextWeek/4);
  const nextHref=`phase${phase}/week${nextWeek}.html`;
  const nextKey=nextHref.replace(/[.\/]/g,'_');
  const currentKey=(document.body.dataset.weekHref||`phase${Math.ceil(currentWeek/4)}/week${currentWeek}.html`).replace(/[.\/]/g,'_');
  const nextTitle={
    2:'Your Operating System, Properly',3:'The Internet & Browsers',4:'Word Processing Essentials',
    5:'Spreadsheets Basics',6:'Presentations That Land',7:'Email & Cloud Storage',8:'Digital Safety & Security',
    9:'Advanced System Management',10:'Intro to the Command Line',11:'Troubleshooting & Maintenance',12:'Capstone Project & Final Exam'
  }[nextWeek]||`Week ${nextWeek}`;
  const WHATSAPP='2349129225442';
  const wa=`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello Teacher, I have completed Week ${currentWeek} and would like to request access to Week ${nextWeek}: ${nextTitle}. Please review my understanding and let me know if I should complete an assessment or project first.`)}`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function render(type,request){
    if(type==='granted'){
      root.innerHTML=`<div class="callout callout-info next-lesson-request"><div><div class="eyebrow-row"><span class="status-pill status-live"><span class="dot"></span>Access granted</span></div><h3 style="margin:8px 0 6px;">Week ${nextWeek} is ready for you</h3><p>Your teacher/administrator has granted access to <strong>Week ${nextWeek}: ${esc(nextTitle)}</strong>.</p><a href="../${nextHref}" class="btn btn-primary">Open Week ${nextWeek}</a></div></div>`;
      return;
    }
    if(type==='pending'){
      root.innerHTML=`<div class="callout callout-rule next-lesson-request"><div><div class="eyebrow-row"><span class="status-pill status-pending"><span class="dot"></span>Request pending</span></div><h3 style="margin:8px 0 6px;">Your Week ${nextWeek} request has been sent</h3><p>Your teacher will review your understanding of Week ${currentWeek} before granting access. The next lesson is <strong>not automatically released</strong>.</p><p style="margin-top:10px;"><strong>Want to fast-track the review?</strong> Chat the teacher on WhatsApp <a href="${wa}" target="_blank" rel="noopener">+234 912 922 5442</a>. The teacher may check your skills, ask questions, or give you a practical project.</p></div></div>`;
      return;
    }
    root.innerHTML=`<div class="callout callout-info next-lesson-request"><div><div class="eyebrow-row"><span class="phase-tag">NEXT STEP</span></div><h3 style="margin:8px 0 6px;">Ready for the next lesson?</h3><p>You must request each new lesson individually. Finish and understand <strong>Week ${currentWeek}</strong> first. Your teacher will review your progress before granting access to <strong>Week ${nextWeek}: ${esc(nextTitle)}</strong>.</p><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:14px;"><button type="button" id="requestNextLessonBtn" class="btn btn-primary">Request Next Lesson — Week ${nextWeek}</button><a href="${wa}" target="_blank" rel="noopener" class="btn btn-ghost">Fast-track via WhatsApp</a></div><p class="small" style="margin:12px 0 0;">The teacher may assess your skills or give you a project before approving the next lesson.</p></div></div>`;
    document.getElementById('requestNextLessonBtn')?.addEventListener('click',sendRequest);
  }


  const SLEEP=ms=>new Promise(r=>setTimeout(r,ms));
  // Resolves {api,student} without ever depending on a single fragile timing window.
  async function resolveSession(){
    const ready=()=>window.AuthAPI&&window.currentStudent?{api:window.AuthAPI,student:window.currentStudent}:null;
    let r=ready(); if(r) return r;
    // Wait for auth-guard.js (an ES module that loads Firebase from the CDN) - up to 20s on slow networks.
    const t0=Date.now();
    while(Date.now()-t0<20000){ r=ready(); if(r) return r; await SLEEP(250); }
    // Fallback: the student already logged in, so use the saved session and connect to Firebase directly.
    let local=null;
    try{local=JSON.parse(sessionStorage.getItem('computerSkillsStudent')||'null');}catch(e){}
    if(!local||!local.id) return null;
    const V='10.12.2', B='https://www.gstatic.com/firebasejs/'+V+'/';
    const [A,D]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-database.js')]);
    const app=A.getApps().length?A.getApps()[0]:A.initializeApp(window.FIREBASE_CONFIG);
    const db=D.getDatabase(app);
    return {api:{db,ref:D.ref,get:D.get,set:D.set,update:D.update,onValue:D.onValue,studentId:local.id},student:local};
  }
  const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('Connection timed out')),ms))]);

  let sending=false;
  async function sendRequest(){
    if(sending) return;
    sending=true;
    const btn=document.getElementById('requestNextLessonBtn');
    if(btn){btn.disabled=true;btn.textContent='Sending request…';}
    const resetBtn=()=>{sending=false;if(btn){btn.disabled=false;btn.textContent=`Request Next Lesson — Week ${nextWeek}`;}};
    try{
      const session=await resolveSession();
      if(!session){
        resetBtn();
        alert('Please log in again with your student ID and passcode, then send the request.');
        location.href=(document.body.dataset.base||'../')+'index.html';
        return;
      }
      const {api,student}=session;
      const id=`req_${student.id}_${nextKey}`;
      const now=Date.now();
      await withTimeout(Promise.all([
        api.set(api.ref(api.db,'accessRequests/'+id),{
          studentId:student.id,studentName:student.name||'Student',classId:student.classId||'',
          weekHref:nextHref,weekTitle:nextTitle,week:nextWeek,
          previousWeek:currentWeek,previousWeekHref:document.body.dataset.weekHref||'',
          previousProgress:student.progress?.[currentKey]||null,
          requestedAt:now,status:'pending'
        }),
        api.update(api.ref(api.db,`students/${student.id}/requests`),{[nextKey]:id})
      ]),25000);
      sending=false;
      render('pending',{requestedAt:now});
    }catch(e){
      console.error('Next lesson request failed:', e);
      resetBtn();
      alert('The request could not be sent. Please check your connection and try again.'+(e?.message?`\n\nDetails: ${e.message}`:''));
    }
  }

  function refresh(){
    const student=window.currentStudent;
    if(!student){
      render('idle');
      return;
    }
    if(student.unlocked?.[nextKey]){render('granted');return;}
    const api=window.AuthAPI;
    if(!api){render('idle');return;}
    api.get(api.ref(api.db,`students/${student.id}/requests/${nextKey}`)).then(s=>{
      if(!s.exists()){render('idle');return;}
      return api.get(api.ref(api.db,'accessRequests/'+s.val())).then(q=>{
        const r=q.val();
        if(r?.status==='pending')render('pending',r);
        else render('idle');
      });
    }).catch(()=>render('idle'));
  }

  document.addEventListener('student-ready',refresh);
  document.addEventListener('unlocks-changed',refresh);
  setTimeout(refresh,350);
  setTimeout(refresh,3000);
})();

// STUDENT NEXT-LESSON REQUEST WIDGET
(function(){
 const root=document.getElementById("requestAccessRoot");if(!root)return;
 const weekHref=document.body.getAttribute("data-week-href")||"";
 const weekTitle=document.body.getAttribute("data-week-title")||document.title;
 const weekNumber=Number(window.LESSON_META?.week||document.body.getAttribute("data-week")||0);
 const base=document.body.getAttribute("data-base")||"";
 const weekKey=weekHref.replace(/[.\/]/g,"_");
 const WHATSAPP="2349129225442";
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function previousWeek(){
   if(weekNumber<=1)return null;
   const prev=weekNumber-1,phase=Math.ceil(prev/4);
   return {week:prev,href:`phase${phase}/week${prev}.html`,key:`phase${phase}_week${prev}_html`};
 }
 const prev=previousWeek();
 function whatsappText(){
   return encodeURIComponent(`Hello Teacher, I am requesting access to Week ${weekNumber}: ${weekTitle}. I would like to fast-track my request and am ready for an assessment or project if required.`);
 }
 function render(state,extra){
  const wa=`https://wa.me/${WHATSAPP}?text=${whatsappText()}`;
  if(state==="granted"){
   root.innerHTML=`<div class="callout callout-info"><div><h4 style="margin-bottom:4px;">Access granted</h4><p style="margin:0;">Your administrator has unlocked <strong>Week ${weekNumber}: ${esc(weekTitle)}</strong> for your account.</p><p style="margin:8px 0 0;">Work through this lesson carefully. You will need to understand it before requesting the next lesson.</p></div></div>`;
   return;
  }
  if(state==="pending"){
   root.innerHTML=`<div class="callout callout-rule next-lesson-request"><div><h4 style="margin-bottom:6px;">Next lesson request sent</h4><p>Your request for <strong>Week ${weekNumber}: ${esc(weekTitle)}</strong> is waiting for the teacher/administrator to review your previous lesson.</p>${extra?`<p class="small" style="margin:8px 0 0;">Requested: ${esc(extra)}</p>`:""}<p style="margin:10px 0 0;"><strong>Need it reviewed faster?</strong> Chat the teacher on WhatsApp: <a href="${wa}" target="_blank" rel="noopener">+234 912 922 5442</a>. The teacher may check your skills, ask questions, or give you a project before granting access.</p></div></div>`;
   return;
  }
  if(state==="blocked"){
   root.innerHTML=`<div class="callout callout-warn next-lesson-request"><div><h4 style="margin-bottom:6px;">Complete the previous lesson first</h4><p>You can request only the <strong>next lesson</strong>. Your previous lesson (Week ${prev?.week||""}) must first be completed and understood.</p><p style="margin:8px 0 0;">If you believe you are ready, complete the previous lesson tasks and then return here.</p><p style="margin:10px 0 0;"><strong>Fast-track help:</strong> chat the teacher on WhatsApp <a href="${wa}" target="_blank" rel="noopener">+234 912 922 5442</a>. You may be asked to demonstrate your skills or complete a project.</p></div></div>`;
   return;
  }
  root.innerHTML=`<div class="callout callout-warn next-lesson-request"><div><h4 style="margin-bottom:6px;">Request your next lesson</h4><p><strong>Week ${weekNumber}: ${esc(weekTitle)}</strong> is not automatically opened for everyone.</p><p>Finish and understand the previous lesson first. When you are ready, request this next lesson. Your teacher/administrator will review your progress before granting access.</p><button type="button" id="requestAccessBtn" class="btn btn-primary btn-sm">Request Week ${weekNumber}</button><a href="${wa}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="margin-left:8px;">Fast-track on WhatsApp</a><p class="small" style="margin:10px 0 0;">The teacher may check your skills, ask questions, or give you a project before granting the next lesson.</p></div></div>`;
  document.getElementById("requestAccessBtn")?.addEventListener("click",sendRequest);
 }
 async function sendRequest(){
  const api=window.AuthAPI,student=window.currentStudent;
  if(!api||!student){alert("Please sign in as a student first.");return;}
  if(weekNumber<=1){render("open");return;}
  if(prev && prev.week>1 && !student.unlocked?.[prev.key]){
    render("blocked");return;
  }
  const now=Date.now(),id="req_"+student.id+"_"+weekKey;
  try{
   await Promise.all([
    api.set(api.ref(api.db,"accessRequests/"+id),{
      studentId:student.id,studentName:student.name||"Student",classId:student.classId||"",
      weekHref,weekTitle,week:weekNumber,
      previousWeek:prev?.week||null,previousWeekHref:prev?.href||"",
      previousProgress:prev?(student.progress?.[prev.key]||null):null,
      requestedAt:now,status:"pending"
    }),
    api.update(api.ref(api.db,`students/${student.id}/requests`),{[weekKey]:id})
   ]);
   render("pending",new Date(now).toLocaleString());
  }catch(e){alert("Couldn't send the request — check your connection and try again.");}
 }
 function refresh(){
  const student=window.currentStudent;if(!student)return;
  if(weekNumber===1){render("open");return;}
  if(student.unlocked?.[weekKey]){render("granted");return;}
  const api=window.AuthAPI;if(!api)return;
  api.get(api.ref(api.db,`students/${student.id}/requests/${weekKey}`)).then(r=>{
   if(!r.exists()){
    if(prev && prev.week>1 && !student.unlocked?.[prev.key]) render("blocked");
    else render("idle");
    return;
   }
   return api.get(api.ref(api.db,"accessRequests/"+r.val())).then(q=>{
    const x=q.val();
    if(x?.status==="pending")render("pending",x.requestedAt?new Date(x.requestedAt).toLocaleString():"");
    else if(prev && !student.unlocked?.[prev.key])render("blocked");
    else render("idle");
   });
  }).catch(()=>render(prev && prev.week>1 && !student.unlocked?.[prev.key]?"blocked":"idle"));
 }
 document.addEventListener("student-ready",refresh);
 document.addEventListener("unlocks-changed",refresh);
 setTimeout(()=>{if(window.currentStudent)refresh();},250);
})();

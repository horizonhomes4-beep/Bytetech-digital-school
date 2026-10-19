(()=>{'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let regs={};const A=()=>window.RFAdmin;
function wa(g){const url=location.href.replace(/admin\.html.*$/,'index.html');return 'https://wa.me/'+g.whatsapp+'?text='+encodeURIComponent(`Hello ${g.name}, welcome to MathCloud Reading Fluency!\nYour passcode is: ${g.passcode}\nSign in here: ${url}`);}
function render(){const rows=Object.entries(regs).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));const pend=rows.filter(([,g])=>g.status==='pending').length;$('regBadge').textContent=pend||'';
$('regTable').innerHTML=rows.length?rows.map(([k,g])=>`<tr><td><b>${esc(g.name)}</b><br><small>${esc(g.school||'—')} · ${esc(g.className||'—')}</small></td><td>${esc(g.whatsapp)}<br><small>${esc(g.email||'')}</small></td><td>${new Date(g.createdAt||0).toLocaleDateString()}</td><td>${g.status==='approved'?'Approved · <b>'+esc(g.passcode)+'</b>':'Pending'}</td><td><div class="table-actions">${g.status==='approved'?`<a class="btn primary" target="_blank" rel="noopener" href="${wa(g)}">Send on WhatsApp</a>`:`<button class="btn primary" data-ok="${esc(k)}">Approve &amp; create passcode</button>`}<button class="btn danger" data-no="${esc(k)}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="5">No registrations yet.</td></tr>';
document.querySelectorAll('[data-ok]').forEach(b=>b.onclick=()=>approve(b.dataset.ok));document.querySelectorAll('[data-no]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this registration?'))return;await A().ref('registrations/'+b.dataset.no).remove();A().load();});}
async function approve(k){const g=regs[k],S=A().students();let p;do{p='READ'+(1000+Math.floor(Math.random()*9000));}while(Object.values(S).some(s=>String(s.passcode).toLowerCase()===p.toLowerCase()));
 const sid='id_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 try{await A().ref('students/'+sid).set({name:g.name,passcode:p,className:g.className||'',school:g.school||'',whatsapp:g.whatsapp,email:g.email||'',active:true,createdAt:Date.now(),updatedAt:Date.now()});
 await A().ref('registrations/'+k).update({status:'approved',passcode:p,studentId:sid,approvedAt:Date.now()});A().toast('Approved. Press “Send on WhatsApp” to share the passcode.');A().load();}catch(e){console.error(e);A().toast('Could not approve. Check database rules.');}}
window.RFAdminAfterLoad=async()=>{try{const r=A().ref;[regs,st]=await Promise.all([r('registrations').once('value').then(s=>s.val()||{}),r('stats').once('value').then(s=>s.val()||{})]);
 $('schoolsInput').value=st.schools??'';const n=Object.values(A().students()).filter(s=>s.active!==false).length;if(st.students!==n)r('stats/students').set(n).catch(()=>{});render();}catch(e){console.error(e);}};
let st={};
$('saveSchools').onclick=async()=>{try{await A().ref('stats/schools').set(Math.max(0,Number($('schoolsInput').value)||0));A().toast('Landing page number saved.');}catch(e){A().toast('Could not save. Check database rules.');}};
})();

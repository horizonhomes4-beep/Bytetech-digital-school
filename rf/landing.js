(()=>{'use strict';
const $=id=>document.getElementById(id),WA='2349129225442';
// REPLACE these sample testimonials with real feedback from your schools before launch.
const TESTIMONIALS=[
{q:'My pupils now ask to read aloud. The coach lets them repeat a word until it is right, and I can see every session in the report.',n:'Class teacher',r:'Primary school, Abuja'},
{q:'Reading scores are no longer guesswork. I print a learner report in seconds and share it with parents at meetings.',n:'Head teacher',r:'Private school, FCT'},
{q:'I practise the words the coach flags and my reading is smoother. I like seeing my score go up each week.',n:'Primary 5 pupil',r:'MathCloud learner'}];
$('testiRow').innerHTML=TESTIMONIALS.map(t=>`<figure class="testi"><blockquote>“${t.q}”</blockquote><figcaption><span class="ava">${t.n[0]}</span><b>${t.n}</b><small>${t.r}</small></figcaption></figure>`).join('');
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();window.RFShow&&RFShow(b.dataset.go);if(b.dataset.scroll)setTimeout(()=>$(b.dataset.scroll)&&$(b.dataset.scroll).scrollIntoView({behavior:'smooth'}),40);}));
// 3D tilt on the hero scene
const sc=$('scene'),st=sc&&sc.firstElementChild;
if(sc&&!matchMedia('(prefers-reduced-motion:reduce)').matches){sc.addEventListener('pointermove',e=>{const r=sc.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;st.style.setProperty('--ry',(-16+x*26)+'deg');st.style.setProperty('--rx',(10-y*20)+'deg');});sc.addEventListener('pointerleave',()=>{st.style.setProperty('--ry','-16deg');st.style.setProperty('--rx','10deg');});}
// Live numbers (admin controls schools; students counted automatically)
function count(el,to){const t0=performance.now();(function f(t){const p=Math.min(1,(t-t0)/1200);el.textContent=Math.round(to*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)requestAnimationFrame(f);})(t0);}
let db=null;try{db=firebase.database();}catch(e){}
if(db)db.ref('readingFluency/stats').once('value').then(s=>{const v=s.val()||{};count($('statSchools'),Number(v.schools)||0);count($('statStudents'),Number(v.students)||0);}).catch(e=>console.warn('Stats not loaded:',e&&e.code||e));
// Registration
const f=$('regForm'),err=t=>$('regErr').textContent=t;
f.onsubmit=async e=>{e.preventDefault();err('');const v=n=>f.elements[n].value.trim();let wa=v('whatsapp').replace(/\D/g,'');if(wa.startsWith('0'))wa='234'+wa.slice(1);
 if(wa.length<11||wa.length>15)return err('Enter a valid WhatsApp number, for example 08012345678 or 2348012345678.');
 if(!db)return err('The service is not connected. Please try again later.');
 const rec={name:v('name'),school:v('school'),className:v('className'),whatsapp:wa,email:v('email').toLowerCase(),status:'pending',createdAt:Date.now()};
 const b=f.querySelector('button[type=submit]');b.disabled=true;
 try{await db.ref('readingFluency/registrations/id_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)).set(rec);f.classList.add('hidden');$('regDone').classList.remove('hidden');
  $('regWa').href=`https://wa.me/${WA}?text=`+encodeURIComponent(`Hello MathCloud, I have registered ${rec.name} (${rec.school||'school'}) for Reading Fluency. Please send my passcode.`);}
 catch(x){console.error(x);err('Could not send your registration'+(x&&x.code?' ('+x.code+')':'')+'. Check your connection and try again.');b.disabled=false;}};
})();

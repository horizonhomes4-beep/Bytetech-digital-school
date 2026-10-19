// Coach-style spoken report (shared by the student app and the admin page)
(function(root){
const end=s=>{s=String(s||'').trim();return s&&!/[.!?]["”’)]?$/.test(s)?s+'.':s;};
const STOP=new Set('a an the and or but of to in on at for with by from is are was were be been it its this that these those he she they them his her their you your i we our as so do did does what which who whom why how when where after before into than then there'.split(' '));
const words=s=>(String(s||'').toLowerCase().match(/[a-z0-9']+/g)||[]).filter(w=>w.length>2&&!STOP.has(w));
function sentences(t){return String(t||'').replace(/\s+/g,' ').trim().match(/[^.!?]+[.!?]+["”’)]?|[^.!?]+$/g)||[];}
// The passage sentence that best matches the question and the correct answer
function evidence(passage,q,ans){const qw=new Set([...words(q),...words(ans)]);if(!qw.size)return '';let best='',sc=0;
 sentences(passage).forEach(s=>{const n=words(s).filter(w=>qw.has(w)).length;if(n>sc){sc=n;best=s.trim();}});
 return sc>=2?(best.length>240?best.slice(0,237).trimEnd()+'…':best):'';}
const TIPS=['Coach tip: before you choose, find the sentence that answers the question, then test each option against it.','Coach tip: some options are only partly true. Pick the one that answers the exact question asked.','Coach tip: listen for signal words such as first, then, because and but. They show how the ideas connect.','Coach tip: if two options sound right, use a replay and listen for the exact detail.'];
function headline(s,name,teacher){const c=s.correct,t=s.total,p=s.score;
 if(teacher)return `${name} answered ${c} of ${t} questions correctly, which is ${p} percent.`;
 if(p===100)return `Outstanding, ${name}! You answered all ${t} questions correctly. That is a perfect score.`;
 if(p>=80)return `Excellent listening, ${name}! You got ${c} out of ${t} correct, which is ${p} percent.`;
 if(p>=60)return `Good work, ${name}. You got ${c} out of ${t} correct, which is ${p} percent. You are on the right track, and a few details are still slipping past you.`;
 if(p>=40)return `Thank you for trying, ${name}. You got ${c} out of ${t}, which is ${p} percent. Let us go through each question together and turn this into a win.`;
 return `Keep going, ${name}. You got ${c} out of ${t}, which is ${p} percent. Every great listener starts here. Let us look at each question slowly.`;}
function item(a,i,o={}){const who=o.teacher?(o.name||'The student'):'You',n=i+1;
 const pick=`${who} chose option ${a.chosen}: ${end(a.chosenText)}`;
 if(a.ok)return `Question ${n}. ${end(a.q)} ${pick} That is correct. ${end(a.explanation)}`;
 const ev=a.evidence?` Here is the proof from the passage. It says: ${end(a.evidence)}`:'';
 return `Question ${n}. ${end(a.q)} ${pick} The correct answer is option ${a.answer}: ${end(a.answerText)} ${end(a.explanation)}${ev}${o.teacher?'':' '+TIPS[i%TIPS.length]}`;}
function script(s,o={}){const name=o.name||'reader',teacher=!!o.teacher,a=s.answers||[],right=a.map((x,i)=>x.ok?i+1:0).filter(Boolean),wrong=a.map((x,i)=>x.ok?0:i+1).filter(Boolean);
 const list=l=>l.length<2?String(l[0]):l.slice(0,-1).join(', ')+' and '+l[l.length-1];
 let intro=headline(s,name,teacher);
 if(right.length&&wrong.length)intro+=` ${teacher?'Correct':'You got'} question${right.length>1?'s':''} ${list(right)} right. Question${wrong.length>1?'s':''} ${list(wrong)} need${wrong.length>1?'':'s'} another look.`;
 else if(!wrong.length)intro+=teacher?' Every answer was correct.':' Every single answer was right. Well done.';
 else intro+=` Question${wrong.length>1?'s':''} ${list(wrong)} need${wrong.length>1?'':'s'} another look.`;
 const items=[{key:-1,label:'Overview',text:intro},...a.map((x,i)=>({key:i,label:'Question '+(i+1),text:item(x,i,{name,teacher})}))];
 let close;
 if(teacher)close=wrong.length?`Suggested focus: question${wrong.length>1?'s':''} ${list(wrong)}. Replays used: ${s.replays||0}. Review the explanations with ${name}.`:`No corrections needed. Replays used: ${s.replays||0}. ${name} is ready for a harder passage.`;
 else{close=wrong.length?`Here is your plan, ${name}. Listen to the passage once more, then focus on question${wrong.length>1?'s':''} ${list(wrong)}. Try to beat ${s.score} percent next time. `:`You are ready for a new challenge, ${name}. Try another passage and keep your streak going. `;
  if((s.replays||0)>=2)close+='You used both replays, so next time try to catch the details on the first listen. ';
  close+='Well done for finishing. I am proud of your effort.';}
 items.push({key:-1,label:'Your next step',text:close});
 return {headline:headline(s,name,teacher),items};}
const grade=p=>p===100?'Perfect':p>=80?'Excellent':p>=60?'Good':p>=40?'Improving':'Keep practising';
root.RFCoach={script,item,headline,evidence,sentences,grade};
})(typeof window!=='undefined'?window:globalThis);

const $=s=>document.querySelector(s);
const mt=s=>s.replace(/(\d[\d.,]*)(\*10\^(-?\d+))?/g,(m,a,b,e)=>`<span class="m">${a}${b?` × 10<sup>${e.replace('-','−')}</sup>`:''}</span>`);
const T=['Definition','Coefficient','Exponent laws','Powers of 10','Large numbers','Small numbers','Back to ordinary','Comparing','Adding','Multiplying and dividing'];
// [topic, question, options, correct]
const Q=[
[0,'Which is written correctly in scientific notation?',['45*10^5','4.5*10^6','0.45*10^7','45.0*10^5'],1],
[0,'In a × 10^n, the number n must be:',['any decimal','an integer','less than 1','positive only'],1],
[0,'Write 0.00032 in scientific notation.',['3.2*10^4','3.2*10^-4','32*10^-5','3.2*10^-3'],1],
[1,'Which is a valid coefficient?',['0.8','12','9.99','10'],2],
[1,'Rewrite 12*10^5 correctly.',['1.2*10^6','1.2*10^4','12*10^5','0.12*10^7'],0],
[1,'Which coefficient is NOT allowed?',['1','5.55','25.6','1.001'],2],
[2,'10^4*10^5 =',['10^20','10^9','10^1','100^9'],1],
[2,'10^7 ÷ 10^3 =',['10^10','10^4','10^21','10^2'],1],
[2,'(10^3)^2 =',['10^5','10^6','10^9','10^1'],1],
[3,'10^-3 equals:',['-1000','0.001','0.003','0.0001'],1],
[3,'10^0 equals:',['0','10','1','undefined'],2],
[3,'10^6 equals:',['100,000','1,000,000','10,000,000','600'],1],
[4,'Write 45,000 in scientific notation.',['4.5*10^4','4.5*10^3','45*10^3','0.45*10^5'],0],
[4,'Write 7,250,000 in scientific notation.',['7.25*10^5','72.5*10^5','7.25*10^6','7.25*10^7'],2],
[4,'For a large number the decimal moves left, so the exponent is:',['negative','positive','zero','unknown'],1],
[5,'Write 0.00045 in scientific notation.',['4.5*10^-4','4.5*10^4','4.5*10^-3','45*10^-5'],0],
[5,'Write 0.0000072 in scientific notation.',['7.2*10^-5','7.2*10^6','7.2*10^-6','72*10^-7'],2],
[5,'For a small number the decimal moves right, so the exponent is:',['positive','negative','zero','1'],1],
[6,'Write 3.6*10^5 in ordinary form.',['36,000','360,000','3,600,000','0.000036'],1],
[6,'Write 4.8*10^-4 in ordinary form.',['48,000','0.0048','0.00048','0.000048'],2],
[6,'Write 9.3*10^-3 in ordinary form.',['9300','0.093','0.0093','0.00093'],2],
[7,'Which is larger?',['3.2*10^5','7.1*10^4','They are equal','Cannot compare'],0],
[7,'Compare 4.7*10^6 and 8.2*10^6.',['4.7*10^6 is larger','8.2*10^6 is larger','They are equal','Cannot tell'],1],
[7,'Which is the smallest?',['2*10^-3','2*10^-5','5*10^-4','9*10^-4'],1],
[8,'3.2*10^5 + 4.5*10^5 =',['7.7*10^5','7.7*10^10','7.7*10^25','1.3*10^5'],0],
[8,'3.5*10^6 + 2.4*10^5 =',['5.9*10^11','5.9*10^6','3.74*10^6','3.74*10^5'],2],
[8,'Write 2.4*10^5 as a number times 10^6.',['0.24*10^6','24*10^6','2.4*10^6','0.024*10^6'],0],
[9,'(3*10^4) × (2*10^5) =',['6*10^9','6*10^20','5*10^9','6*10^1'],0],
[9,'(4.2*10^6) × (3*10^4) =',['12.6*10^10','1.26*10^11','1.26*10^10','1.26*10^24'],1],
[9,'(6.4*10^8) ÷ (8*10^2) =',['8*10^5','0.8*10^6','8*10^6','8*10^10'],0]];
// [topic, prompt, key points for marker]
const E=[
[0,'Explain what scientific notation is and why scientists use it. Give one large and one small example.','a × 10^n; 1 ≤ a < 10; n integer; short, easy to compare and calculate; valid examples.'],
[1,'Explain why 25 × 10^4 is not correct scientific notation and show how to fix it.','Coefficient must be 1 to <10; 25 = 2.5 × 10; answer 2.5 × 10^5.'],
[2,'State and explain the laws of exponents for multiplying, dividing, powers of powers and negative exponents. Give an example for each.','Add exponents to multiply; subtract to divide; multiply for power of power; 10^-n = 1/10^n; 10^0 = 1.'],
[3,'Explain what 10^-3 means and why it equals 0.001.','Reciprocal: 1/10^3 = 1/1000 = 0.001; each step down divides by 10.'],
[4,'Show step by step how to write 7,250,000 in scientific notation and check your answer.','Move decimal 6 places left to 7.25; exponent +6; 7.25 × 10^6; check by multiplying.'],
[5,'Show step by step how to write 0.0000072 in scientific notation. Explain why the exponent is negative.','Move 6 places right to 7.2; number below 1 so exponent negative; 7.2 × 10^-6.'],
[6,'Explain how to convert 4.8 × 10^-4 to ordinary form and how you decide which way the decimal moves.','Negative exponent: move 4 places left; 0.00048; positive moves right; size = places.'],
[7,'Compare 3.2 × 10^5 and 7.1 × 10^4. Explain why the smaller coefficient is not the deciding factor.','Compare exponents first; 10^5 > 10^4; so 3.2 × 10^5 is larger; coefficients only if exponents equal.'],
[8,'Show how to calculate 3.5 × 10^6 + 2.4 × 10^5.','Make exponents equal: 0.24 × 10^6; add 3.5 + 0.24 = 3.74; 3.74 × 10^6.'],
[9,'Calculate (4.2 × 10^6) × (3 × 10^4). Explain why the answer must be rewritten.','4.2 × 3 = 12.6; add exponents = 10; 12.6 not <10 so 1.26 × 10^11.']];

const L=['Definition','Coefficient','Exp. laws','Powers of 10','Large no.','Small no.','To ordinary','Comparing','Adding','× and ÷'];
const H=['Scientific notation is a × 10ⁿ with 1 ≤ a < 10 and n an integer.','The coefficient must be at least 1 and less than 10. Move the decimal point to fix it.','Multiply: add exponents. Divide: subtract. Power of a power: multiply. 10⁰ = 1.','10⁻ⁿ = 1 ÷ 10ⁿ. Each step down divides by 10.','Large number: the decimal moves left and the exponent is positive.','Small number: the decimal moves right and the exponent is negative.','Positive exponent: decimal moves right. Negative: moves left. The size is the number of places.','Compare the exponents first. If they are equal, compare the coefficients.','Make the exponents equal, add the coefficients, then rewrite so the coefficient is between 1 and 10.','Multiply or divide the coefficients, add or subtract the exponents, then rewrite correctly.'];
const LS=['s1','s3','s4','s5','s6','s7','s8',null,null,'s4'];
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const rate=p=>p>=75?['Strong','ok']:p>=50?['Developing','mid']:['Needs work','low'];
// list of {tp, marks?}; returns per-topic cumulative stats
function cum(list){return T.map((t,i)=>{let x=0,n=0,e=0,en=0;list.forEach(r=>{x+=r.tp[i][0];n+=r.tp[i][1];const m=r.marks&&r.marks[i];if(m>=0){e+=m;en++}});const d=n+en*5;return{i,t,x,n,e,en,pct:d?Math.round((x+e)/d*100):0}})}
function total(r){const m=(r.marks||[]).filter(v=>v>=0),got=r.score+m.reduce((a,b)=>a+b,0),max=30+m.length*5;return{got,max,pct:Math.round(got/max*100),done:m.length===10,mk:m.length}}
function ring(p,label){return`<div class="ring" style="--p:${p}" role="img" aria-label="${label||'Score'} ${p} percent"><b>${p}%</b></div>`}
function radar(st){const N=st.length,cx=180,cy=165,R=104,pt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/N;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]};
let s=`<svg viewBox="0 0 360 330" class="radar" role="img" aria-label="Topic performance chart">`;
[25,50,75,100].forEach(g=>s+=`<polygon points="${st.map((_,i)=>pt(i,R*g/100).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="1"/>`);
st.forEach((_,i)=>{const[x,y]=pt(i,R);s+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`;const[lx,ly]=pt(i,R+20),c=Math.cos(-Math.PI/2+i*2*Math.PI/N);s+=`<text x="${lx}" y="${ly+4}" font-size="11" fill="var(--ink)" text-anchor="${c>.3?'start':c<-.3?'end':'middle'}">${L[i]}</text>`});
s+=`<polygon points="${st.map((v,i)=>pt(i,R*v.pct/100).join(',')).join(' ')}" fill="var(--acc)" fill-opacity=".22" stroke="var(--acc)" stroke-width="2.5"/>`;
st.forEach((v,i)=>{const[x,y]=pt(i,R*v.pct/100);s+=`<circle cx="${x}" cy="${y}" r="4.5" fill="var(--${rate(v.pct)[1]})" stroke="var(--card)" stroke-width="1.5"/>`});
return s+'</svg>'}
// strongest / weakest callouts + ranked bars
function topics(st){const s=[...st].sort((a,b)=>b.pct-a.pct),strong=s.filter(v=>v.pct>=75).slice(0,2),weak=[...s].reverse().filter(v=>v.pct<75).slice(0,3);
return`<div class="calls"><div class="call ok"><b>Strongest</b>${strong.length?strong.map(v=>`<span>${v.t} · ${v.pct}%</span>`).join(''):'<span>None at 75% yet. Keep practising.</span>'}</div><div class="call low"><b>Focus on</b>${weak.length?weak.map(v=>`<span>${v.t} · ${v.pct}%</span>`).join(''):'<span>Nothing below 75%. Excellent.</span>'}</div></div>`+
s.map(v=>{const r=rate(v.pct);return`<div class="tp"><span>${v.t}</span><div class="bar"><i class="${r[1]}" style="width:${v.pct}%"></i></div><b>${v.pct}%</b><em class="chip ${r[1]}">${r[0]}</em></div>`}).join('')}
function advice(st){const w=[...st].sort((a,b)=>a.pct-b.pct).filter(v=>v.pct<75);
if(!w.length)return'<div class="card adv"><h3>Keep it up</h3><p>Every topic is at 75% or above. Retake the assessment to confirm your results.</p></div>';
return`<div class="card adv"><h3>Before you try again, go back to the lesson</h3><p>Revise these topics first, then retake the assessment:</p><ul>${w.map(v=>`<li><b>${v.t}</b> (${v.pct}%) ${LS[v.i]?`<a href="${LESSON_URL}#${LS[v.i]}" target="_blank" rel="noopener">Open lesson section</a>`:'<span class="mute">Ask your teacher for notes on this topic.</span>'}</li>`).join('')}</ul></div>`}

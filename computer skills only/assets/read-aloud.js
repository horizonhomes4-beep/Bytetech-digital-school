// MathCloud Practical PC Skills — Read Aloud
(function(){
  "use strict";
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

  let voices=[];
  let gender="female";
  let chunks=[];
  let index=0;
  let reading=false;
  let current=null;
  const $=id=>document.getElementById(id);

  function loadVoices(){
    voices=speechSynthesis.getVoices().filter(v=>/^en(?:-|$)/i.test(v.lang||""));
    if(!voices.length) voices=speechSynthesis.getVoices();
  }
  function score(v,wanted){
    const n=(v.name||"").toLowerCase(), l=(v.lang||"").toLowerCase(); let s=0;
    if(/neural|natural|online|premium|enhanced/.test(n)) s+=100;
    if(/microsoft|google|apple/.test(n)) s+=30;
    if(wanted==="female" && /zira|samantha|susan|karen|victoria|aria|jenny|sonia|hazel|libby|ava|serena|female/.test(n)) s+=90;
    if(wanted==="male" && /david|daniel|alex|fred|george|mark|guy|ryan|liam|aaron|male/.test(n)) s+=90;
    if(/en-ng/.test(l)) s+=50; else if(/en-gb|en-us|en-za|en-au/.test(l)) s+=15;
    return s;
  }
  function bestVoice(){ return [...voices].sort((a,b)=>score(b,gender)-score(a,gender))[0]||null; }

  function getText(){
    const root=document.querySelector("[data-readable]")||document.querySelector("main")||document.body;
    const nodes=root.querySelectorAll("h1,h2,h3,h4,h5,p,li,dt,dd,td,th");
    const out=[];
    nodes.forEach(n=>{
      if(n.closest("nav,footer,#readAloudBar,.course-map,#lessonAccessBox,#lessonOverrideHost")) return;
      if(n.hidden || getComputedStyle(n).display==="none") return;
      const t=(n.innerText||n.textContent||"").replace(/\s+/g," ").trim();
      if(t && !out.includes(t)) out.push(t);
    });
    return out.join(". ");
  }
  function splitText(t){
    const sentences=t.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[t];
    const result=[]; let part="";
    sentences.forEach(s=>{
      s=s.trim(); if(!s)return;
      if((part+" "+s).length>180){ if(part)result.push(part); part=s; }
      else part=part?part+" "+s:s;
    });
    if(part)result.push(part); return result;
  }
  function update(){
    const b=$("raPlay"); if(b)b.textContent=reading?"Ⅱ":"▶";
    const st=$("raStatus"); if(st)st.textContent=reading?"Reading aloud…":"Read aloud";
  }
  function finish(){ reading=false; current=null; update(); }
  function speakNext(){
    if(!reading || index>=chunks.length){finish();return;}
    const v=bestVoice(); current=new SpeechSynthesisUtterance(chunks[index++]);
    current.rate=1; current.pitch=1; current.volume=1;
    if(v){current.voice=v;current.lang=v.lang;}else current.lang="en-NG";
    current.onend=()=>setTimeout(speakNext,30);
    current.onerror=()=>setTimeout(speakNext,30);
    speechSynthesis.speak(current);
  }
  function start(){
    const text=getText(); if(!text)return;
    speechSynthesis.cancel(); chunks=splitText(text); index=0; reading=true; update();
    setTimeout(speakNext,80);
  }
  function stop(){speechSynthesis.cancel();reading=false;index=0;current=null;update();}
  function render(){
    if($("readAloudBar"))return;
    const bar=document.createElement("div"); bar.id="readAloudBar"; bar.setAttribute("role","region"); bar.setAttribute("aria-label","Read aloud controls");
    bar.innerHTML='<span id="raStatus">Read aloud</span><button id="raPlay" type="button" aria-label="Start or pause reading">▶</button><select id="raGender" aria-label="Voice"><option value="female">Female voice</option><option value="male">Male voice</option></select><button id="raStop" type="button" aria-label="Stop reading">■</button>';
    document.body.appendChild(bar);
    $("raGender").value=gender;
    $("raGender").addEventListener("change",e=>{gender=e.target.value;if(reading){stop();start();}});
    $("raPlay").addEventListener("click",()=>reading?stop():start());
    $("raStop").addEventListener("click",stop);
  }
  speechSynthesis.onvoiceschanged=loadVoices; loadVoices();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
  window.addEventListener("beforeunload",()=>speechSynthesis.cancel());
})();

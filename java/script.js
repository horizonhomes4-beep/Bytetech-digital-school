function copyCode(id){
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text).then(()=>showToast("Code copied!"));
}
function showToast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg;t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1800);
}
function greetLive(){
  const name=document.getElementById("practiceName").value.trim();
  document.getElementById("liveGreeting").innerHTML =
    name ? "Hello, " + name + "! Welcome to JavaScript." : "Please enter your name.";
}
function calculateLive(){
  const a=Number(document.getElementById("calcA").value);
  const b=Number(document.getElementById("calcB").value);
  const op=document.getElementById("calcOp").value;
  let result;
  if(op==="+") result=a+b;
  if(op==="-") result=a-b;
  if(op==="*") result=a*b;
  if(op==="/") result=b===0 ? "Cannot divide by zero." : a/b;
  document.getElementById("calcResult").innerHTML="Answer: "+result;
}
function changeStyleLive(){
  const box=document.getElementById("styleBox");
  box.style.backgroundColor="gold";
  box.style.color="#111";
  box.style.fontSize="24px";
  box.style.fontWeight="800";
  box.innerHTML="JavaScript changed my style!";
}
function resetStyleLive(){
  const box=document.getElementById("styleBox");
  box.removeAttribute("style");
  box.className="style-demo";
  box.innerHTML="I can change my appearance.";
}
function runLab(){
  const name=document.getElementById("labName").value.trim();
  const subject=document.getElementById("labSubject").value.trim();
  if(!name || !subject){
    document.getElementById("labOutput").innerHTML="Please enter both your name and favourite subject.";
    return;
  }
  document.getElementById("labOutput").innerHTML=
    "<b>Student:</b> "+escapeHtml(name)+"<br><b>Favourite Subject:</b> "+escapeHtml(subject)+
    "<br><br>You have successfully created your first interactive output!";
}
function runChallenge(){
  const name=document.getElementById("chName").value.trim();
  const school=document.getElementById("chSchool").value.trim();
  const subject=document.getElementById("chSubject").value.trim();
  const out=document.getElementById("challengeResult");
  if(!name || !school || !subject){
    out.innerHTML="Please complete all three fields.";
    return;
  }
  out.innerHTML="<h3>Welcome, "+escapeHtml(name)+"!</h3>"+
    "<p>School: "+escapeHtml(school)+"</p>"+
    "<p>Favourite subject: "+escapeHtml(subject)+"</p>"+
    "<strong>Keep learning JavaScript!</strong>";
}
function escapeHtml(value){
  return value.replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
function markQuiz(){
  const answers={q1:"b",q2:"b",q3:"c",q4:"a",q5:"a"};
  let score=0;
  Object.keys(answers).forEach(q=>{
    const selected=document.querySelector('input[name="'+q+'"]:checked');
    if(selected && selected.value===answers[q]) score++;
  });
  const percent=score*20;
  let message=percent===100 ? "Excellent! You mastered Lesson 1." :
    percent>=60 ? "Good work. Review the examples you missed and try again." :
    "Keep practicing. Revisit the examples before moving on.";
  document.getElementById("score").innerHTML="Score: "+score+"/5 ("+percent+"%) — "+message;
}

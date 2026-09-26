// Shared student session bridge for every student-facing page.
// The main index performs the credential check. Other pages consume the same session.
(function(){
  const SESSION_KEY = "lessonDeskStudent";
  const ROOT_LOGIN = "../../index.html";
  const COURSE_COMPUTER = "computer-skills";
  function read(){ try { const x=sessionStorage.getItem(SESSION_KEY); return x?JSON.parse(x):null; } catch { return null; } }
  function write(s){ try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {} }
  function isComputerSkills(s){
    const c=String(s?.course||s?.courseId||s?.program||"").toLowerCase().trim();
    return c===COURSE_COMPUTER || c==="computer skills" || c==="practical computer skills" || c.includes("computer-skills");
  }
  window.StudentSession={key:SESSION_KEY,read,write,isComputerSkills,clear(){try{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem("lessonDeskReturnTo")}catch{}}};
})();

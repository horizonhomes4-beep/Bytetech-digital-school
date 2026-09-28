// Add this one script to the existing student login page.
// It watches for the login script's existing sessionStorage write and returns
// the student to the lesson that originally required authentication.
(function(){
  const key="lessonDeskReturnTo";
  let timer=setInterval(()=>{
    try{
      const student=sessionStorage.getItem("lessonDeskStudent");
      const target=sessionStorage.getItem(key);
      if(student && target){
        clearInterval(timer);
        sessionStorage.removeItem(key);
        location.replace(target);
      }
    }catch{}
  },300);
  setTimeout(()=>clearInterval(timer),120000);
})();

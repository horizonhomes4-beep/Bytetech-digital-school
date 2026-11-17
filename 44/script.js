(function(){var m=document.querySelector('.menu'),n=document.querySelector('.nav');
function set(o){n.classList.toggle('open',o);m.setAttribute('aria-expanded',o);m.setAttribute('aria-label',o?'Close menu':'Open menu')}
if(m&&n){m.addEventListener('click',function(){set(!n.classList.contains('open'))});n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){set(false)})});document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false)});matchMedia('(min-width:901px)').addEventListener('change',function(){set(false)})}
document.querySelectorAll('[data-demo-form]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();var o=f.querySelector('.ok');if(o)o.hidden=false;f.reset()})});
document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var t=b.dataset.copy,d=function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy number'},1800)};if(navigator.clipboard)navigator.clipboard.writeText(t).then(d,d);else d()})});
})();

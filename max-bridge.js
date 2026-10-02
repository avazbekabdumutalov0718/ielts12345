(()=>{
  const script=document.currentScript;
  const home=script?.src ? new URL('../index.html',script.src).href : '../index.html';
  const text=(document.title+' '+location.pathname).toLowerCase();
  const kind=text.includes('listening')?'listening':text.includes('reading')||text.includes('passage')?'reading':'home';
  const target=home+(kind==='reading'?'#readingtests':kind==='listening'?'#listeningtests':'#all');
  addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.max-return-pill,.max-unified-chip').forEach(x=>x.remove());
    const a=document.createElement('a');a.className='vivid-test-back';a.href=target;a.title='VIVID IELTS ga qaytish';a.setAttribute('aria-label','Orqaga');a.textContent='←';document.body.appendChild(a);
    document.addEventListener('click',ev=>{
      const link=ev.target.closest('a'); if(!link||link===a) return;
      const href=(link.getAttribute('href')||'').toLowerCase();
      if(/(^|\/)(reading|listening|dashboard|auth|tests-exams)\.html/.test(href)){
        ev.preventDefault(); location.href=target;
      }
    },true);
  });
})();
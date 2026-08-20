// Sao Vang employee page: outside-shift revenue history is intentionally not shown.
// Revenue entry, daily totals, active-shift activity and manager reporting remain handled by the Sao Vang branch scripts.
(function(){
  function removeOutsideHistory(){
    const list=document.getElementById('outsideRevenueList');
    const box=list?.closest('.section-gap');
    if(box)box.remove();
  }
  function loadInstantDelete(){
    if(document.querySelector('script[data-sv-no-confirm]'))return;
    const s=document.createElement('script');
    s.src='./saovang-delete-no-confirm.js?v=23';
    s.dataset.svNoConfirm='1';
    document.head.appendChild(s);
  }
  function loadDebtEdit(){
    if(document.querySelector('script[data-sv-debt-edit]'))return;
    const s=document.createElement('script');
    s.src='./saovang-debt-edit.js?v=27';
    s.dataset.svDebtEdit='1';
    document.head.appendChild(s);
  }
  function loadActiveCollapse(){
    if(document.querySelector('script[data-sv-active-collapse]'))return;
    const s=document.createElement('script');
    s.src='./saovang-active-collapse.js?v=28';
    s.dataset.svActiveCollapse='1';
    document.head.appendChild(s);
  }
  function boot(){removeOutsideHistory();loadInstantDelete();loadDebtEdit();loadActiveCollapse()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();

// Sao Vang employee page: outside-shift revenue history is intentionally not shown.
// Load small branch-specific enhancements once after the base app is ready.
(function(){
  function removeOutsideHistory(){
    const list=document.getElementById('outsideRevenueList');
    const box=list?.closest('.section-gap');
    if(box)box.remove();
  }
  function loadScript(src,marker){
    if(document.querySelector(`script[${marker}]`))return;
    const s=document.createElement('script');
    s.src=src;
    s.setAttribute(marker,'1');
    document.head.appendChild(s);
  }
  function boot(){
    removeOutsideHistory();
    loadScript('./saovang-delete-no-confirm.js?v=23','data-sv-no-confirm');
    loadScript('./saovang-debt-edit.js?v=27','data-sv-debt-edit');
    loadScript('./saovang-active-collapse.js?v=29','data-sv-active-collapse');
    // Load after the main shift/history/bank renderers are installed.
    setTimeout(()=>{
      loadScript('./saovang-history-reopen.js?v=33','data-sv-history-reopen');
      loadScript('./saovang-history-edit-actions.js?v=33','data-sv-history-edit-actions');
      loadScript('./saovang-manager-edit-save.js?v=33','data-sv-manager-edit-save');
      loadScript('./saovang-daily-summary.js?v=34','data-sv-daily-summary');
    },0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

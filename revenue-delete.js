// Sao Vang employee page: outside-shift revenue history is intentionally not shown.
// Revenue entry, daily totals, active-shift activity and manager reporting remain handled by the Sao Vang branch scripts.
(function(){
  function removeOutsideHistory(){
    const list=document.getElementById('outsideRevenueList');
    const box=list?.closest('.section-gap');
    if(box)box.remove();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeOutsideHistory);
  else removeOutsideHistory();
})();

// Sao Vang: add Thu gọn / Mở rộng control for active-shift activity.
(function(){
  const byId=id=>document.getElementById(id);
  let collapsed=false;

  function addStyles(){
    if(byId('svActiveCollapseStyle'))return;
    const style=document.createElement('style');
    style.id='svActiveCollapseStyle';
    style.textContent=`
      .sv-active-activity-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
      .sv-active-activity-head .kicker{margin:0}
      #svActiveCollapseBtn{white-space:nowrap}
    `;
    document.head.appendChild(style);
  }

  function applyState(){
    const list=byId('activeEntries');
    const empty=byId('activeEntriesEmpty');
    const btn=byId('svActiveCollapseBtn');
    if(list)list.style.display=collapsed?'none':'';
    if(empty)empty.style.display=collapsed?'none':'';
    if(btn){
      btn.textContent=collapsed?'Mở rộng':'Thu gọn';
      btn.setAttribute('aria-expanded',collapsed?'false':'true');
    }
  }

  function mount(){
    const list=byId('activeEntries');
    if(!list)return;
    const section=list.closest('.section-gap');
    const kicker=section?.querySelector('.kicker');
    if(!section||!kicker)return;
    addStyles();

    if(!byId('svActiveCollapseBtn')){
      const head=document.createElement('div');
      head.className='sv-active-activity-head';
      kicker.parentNode.insertBefore(head,kicker);
      head.appendChild(kicker);
      const btn=document.createElement('button');
      btn.id='svActiveCollapseBtn';
      btn.className='btn ghost mini';
      btn.type='button';
      btn.onclick=()=>{collapsed=!collapsed;applyState()};
      head.appendChild(btn);
    }
    applyState();
  }

  const observer=new MutationObserver(()=>mount());
  function boot(){
    mount();
    const card=byId('activeCard');
    if(card)observer.observe(card,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

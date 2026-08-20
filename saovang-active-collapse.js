// Sao Vang: lightweight Thu gọn / Mở rộng control for active-shift activity.
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
    if(!section)return;
    addStyles();

    let btn=byId('svActiveCollapseBtn');
    if(!btn){
      const kicker=section.querySelector(':scope > .kicker')||section.querySelector('.kicker');
      if(!kicker)return;
      const head=document.createElement('div');
      head.className='sv-active-activity-head';
      kicker.before(head);
      head.appendChild(kicker);
      btn=document.createElement('button');
      btn.id='svActiveCollapseBtn';
      btn.className='btn ghost mini';
      btn.type='button';
      btn.addEventListener('click',()=>{
        collapsed=!collapsed;
        applyState();
      });
      head.appendChild(btn);
    }
    applyState();
  }

  function boot(){mount()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

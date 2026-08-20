// Attendance is hidden from the Sao Vang employee-facing page.
// The legacy app still keeps its internal attendance hooks so other features remain stable.
(function(){
  const style=document.createElement('style');
  style.textContent=`
    #attendanceSection{display:none!important}
    .quick-nav a[href="#attendanceSection"]{display:none!important}
    .manager-section:has(#managerAttendanceList){display:none!important}
    #exportAttendanceBtn{display:none!important}
  `;
  document.head.appendChild(style);

  function hideAttendanceUi(){
    const section=document.getElementById('attendanceSection');
    if(section){section.style.display='none';section.setAttribute('aria-hidden','true')}
    const nav=document.querySelector('.quick-nav a[href="#attendanceSection"]');
    if(nav){nav.style.display='none';nav.setAttribute('aria-hidden','true')}
    const managerList=document.getElementById('managerAttendanceList');
    const managerSection=managerList?.closest('.manager-section');
    if(managerSection)managerSection.style.display='none';
    const exportBtn=document.getElementById('exportAttendanceBtn');
    if(exportBtn)exportBtn.style.display='none';
  }

  function movePriorityCards(){
    const main=document.querySelector('main.grid');
    const revenue=document.getElementById('quickRevenueCard');
    const debt=document.getElementById('debtSection');
    if(main&&revenue&&debt){
      const firstVisible=Array.from(main.children).find(el=>el.id!=='attendanceSection');
      if(firstVisible){
        main.insertBefore(debt,firstVisible);
        main.insertBefore(revenue,debt);
      }
    }

    const navWrap=document.querySelector('.quick-nav-in');
    if(navWrap){
      const revenueLink=navWrap.querySelector('a[href="#quickRevenueCard"]');
      let debtLink=navWrap.querySelector('a[href="#debtSection"]');
      const shiftLink=navWrap.querySelector('a[href="#shiftSection"]');
      const managerLink=navWrap.querySelector('a[href="#managerSection"]');
      if(!debtLink){
        debtLink=document.createElement('a');
        debtLink.href='#debtSection';
        debtLink.textContent='Khách nợ';
      }
      if(revenueLink)navWrap.appendChild(revenueLink);
      navWrap.appendChild(debtLink);
      if(shiftLink)navWrap.appendChild(shiftLink);
      if(managerLink)navWrap.appendChild(managerLink);
    }
  }

  function loadNoConfirmDelete(){
    if(document.querySelector('script[data-sv-delete-no-confirm]'))return;
    const s=document.createElement('script');
    s.src='./saovang-delete-no-confirm.js?v=23';
    s.dataset.svDeleteNoConfirm='1';
    document.head.appendChild(s);
  }

  function applyLayout(){hideAttendanceUi();movePriorityCards();loadNoConfirmDelete()}

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      applyLayout();
      setTimeout(applyLayout,0);
      setTimeout(applyLayout,300);
    });
  }else{
    applyLayout();
    setTimeout(applyLayout,300);
  }
})();

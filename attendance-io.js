// Attendance is hidden from the Sao Vang employee-facing page.
// Keep legacy attendance DOM available for app compatibility, but avoid repeated DOM work.
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
    const managerList=document.getElementById('managerAttendanceList');
    const managerSection=managerList?.closest('.manager-section');
    if(managerSection)managerSection.style.display='none';
  }

  function movePriorityCards(){
    const main=document.querySelector('main.grid');
    const revenue=document.getElementById('quickRevenueCard');
    const debt=document.getElementById('debtSection');
    if(main&&revenue&&debt){
      const firstVisible=Array.from(main.children).find(el=>el.id!=='attendanceSection');
      if(firstVisible&&firstVisible!==revenue){
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
      [revenueLink,debtLink,shiftLink,managerLink].forEach(link=>{if(link)navWrap.appendChild(link)});
    }
  }

  function boot(){hideAttendanceUi();movePriorityCards()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

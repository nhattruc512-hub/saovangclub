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

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      hideAttendanceUi();
      setTimeout(hideAttendanceUi,0);
      setTimeout(hideAttendanceUi,300);
    });
  }else{
    hideAttendanceUi();
    setTimeout(hideAttendanceUi,300);
  }
})();

(function(){
  document.title='Quản lý sao vàng';
  const eyebrow=document.querySelector('.top .eyebrow');
  if(eyebrow)eyebrow.textContent='SAO VÀNG';
  const heading=document.querySelector('.top h1');
  if(heading)heading.textContent='Quản lý sao vàng';
  const loginHeading=document.querySelector('#loginView h2');
  if(loginHeading)loginHeading.textContent='Mở quản lý sao vàng';

  const MANAGER_API='https://dinqlgaveujdeyisgpty.supabase.co/functions/v1/saovang-manager-api';
  const TABLES={
    staff_active_shift:'sv_staff_active_shift',
    staff_shift_history:'sv_staff_shift_history',
    staff_revenue_entries:'sv_staff_revenue_entries',
    staff_attendance_records:'sv_staff_attendance_records',
    customer_debts:'sv_customer_debts'
  };
  function mapPath(path){
    const s=String(path||'');
    for(const [from,to] of Object.entries(TABLES)){
      if(s===from||s.startsWith(from+'?'))return to+s.slice(from.length);
    }
    return s;
  }

  CFG.manager=MANAGER_API;
  CFG.close=MANAGER_API;

  rest=async function(path){
    const r=await fetch(`${CFG.url}/rest/v1/${mapPath(path)}`,{headers:H});
    const t=await r.text();
    if(!r.ok)throw new Error(t||`Lỗi ${r.status}`);
    return t?JSON.parse(t):null;
  };

  closeActive=async function(){
    const id=$('closeActiveBtn').dataset.id;
    if(!id)return;
    if(!confirm('Đóng ca đang hoạt động?'))return;
    try{
      const r=await fetch(MANAGER_API,{method:'POST',headers:{'Content-Type':'application/json','x-manager-pin':pin},body:JSON.stringify({action:'close_active',id})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Không đóng được ca');
      toast('Đã đóng ca');
      await refreshAll();
    }catch(e){toast(e.message||'Không đóng được ca')}
  };
  $('closeActiveBtn').onclick=closeActive;
})();

(function(){
  const s=document.createElement('script');
  s.src='./saovang-manager-banks.js?v=19';
  s.async=true;
  document.head.appendChild(s);
})();

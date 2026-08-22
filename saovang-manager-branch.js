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
    try{
      const rows=await rest(`staff_active_shift?select=id,edit_mode&singleton_id=eq.1&id=eq.${encodeURIComponent(id)}&limit=1`);
      const editing=!!rows?.[0]?.edit_mode;
      const message=editing
        ?'Lưu toàn bộ chỉnh sửa của ca này và đóng chế độ chỉnh sửa?\n\nGiờ kết thúc cũ sẽ được giữ nguyên.'
        :'Đóng ca đang hoạt động?';
      if(!confirm(message))return;
      const r=await fetch(MANAGER_API,{method:'POST',headers:{'Content-Type':'application/json','x-manager-pin':pin},body:JSON.stringify({action:'close_active',id})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Không đóng được ca');
      toast(d.saved_edit?'Đã lưu chỉnh sửa và đóng ca':'Đã đóng ca');
      await refreshAll();
    }catch(e){toast(e.message||'Không đóng được ca')}
  };
  $('closeActiveBtn').onclick=closeActive;

  deleteAudit=async function(id){
    if(!id)return;
    if(!confirm('Xóa nhật ký hoạt động này?'))return;
    try{
      await manager('delete_audit',id);
      toast('Đã xóa nhật ký hoạt động');
      await refreshAll();
    }catch(e){toast(e.message||'Không xóa được nhật ký')}
  };

  renderAudit=function(rows){
    $('auditEmpty').classList.toggle('hidden',rows.length>0);
    $('auditList').innerHTML=rows.map(r=>`<div class="row"><div class="row-main"><b>${esc(r.description||r.action_type||'Hoạt động')}</b><span>${esc(r.employee||'')} ${r.shift_name?'· '+esc(r.shift_name):''}</span><small>${vnDate(r.created_at)} ${vnTime(r.created_at)}</small></div><div class="actions"><button class="btn danger" type="button" onclick="deleteAudit('${esc(r.id)}')">Xóa</button></div></div>`).join('');
  };
  window.deleteAudit=deleteAudit;
})();

(function(){
  const s=document.createElement('script');
  s.src='./saovang-manager-banks.js?v=36';
  s.async=true;
  document.head.appendChild(s);
})();

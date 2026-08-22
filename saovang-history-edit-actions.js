// Sao Vang: keep history-edit controls visible and recoverable even if device-owner state is stale.
(function(){
  const MANAGER_API='https://dinqlgaveujdeyisgpty.supabase.co/functions/v1/saovang-manager-api';
  const byId=id=>document.getElementById(id);

  function isEditing(){
    try{return typeof active!=='undefined'&&!!active?.editMode}catch{return false}
  }

  async function cancelDirect(){
    if(!isEditing())return toast('Không có ca lịch sử đang chỉnh sửa');
    if(!confirm('Hủy toàn bộ thay đổi và khôi phục ca như trước khi chỉnh sửa?'))return;
    const pin=prompt('Nhập PIN quản lý để hủy chỉnh sửa');
    if(pin===null)return;
    if(!pin.trim())return toast('Chưa nhập PIN quản lý');
    const btn=byId('cancelHistoryEditBtn');
    if(btn)btn.disabled=true;
    try{
      const r=await fetch(MANAGER_API,{method:'POST',headers:{'Content-Type':'application/json','x-manager-pin':pin.trim()},body:JSON.stringify({action:'cancel_reopened_shift',id:String(active.id)})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||`Lỗi ${r.status}`);
      try{localStorage.removeItem('saovang_shared_shift_owner_v1');localStorage.removeItem('r971_shared_shift_owner_v1')}catch{}
      active=null;
      if(typeof renderActive==='function')renderActive();
      if(typeof refreshAll==='function')await refreshAll();
      toast('Đã hủy chỉnh sửa và phục hồi dữ liệu cũ');
      byId('historySection')?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){toast(e.message||'Không hủy được chỉnh sửa')}
    finally{if(btn)btn.disabled=false}
  }

  function ensureCancelButton(){
    const card=byId('activeCard');
    if(!card)return null;
    let btn=byId('cancelHistoryEditBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.id='cancelHistoryEditBtn';
      btn.type='button';
      btn.className='btn secondary block';
      btn.textContent='HỦY CHỈNH SỬA';
      const finish=byId('finishShiftBtn');
      if(finish)finish.after(btn);else card.appendChild(btn);
      btn.addEventListener('click',cancelDirect);
      btn.dataset.svDirectCancel='1';
    }
    return btn;
  }

  function sync(){
    const editing=isEditing();
    const btn=ensureCancelButton();
    if(!btn)return;
    btn.textContent='HỦY CHỈNH SỬA';
    btn.classList.toggle('hidden',!editing);
    btn.style.display=editing?'block':'';
    btn.style.marginTop=editing?'10px':'';
    if(editing&&!btn.dataset.svDirectCancel){
      // Existing button is wired by shift-controls; only force visibility here.
      btn.setAttribute('aria-hidden','false');
    }
  }

  const previous=typeof renderActive==='function'?renderActive:null;
  if(previous){renderActive=function(){previous();sync()}}
  function boot(){sync()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

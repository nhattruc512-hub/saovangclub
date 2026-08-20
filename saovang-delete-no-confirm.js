// Delete revenue entries from active-shift activity immediately, without a confirmation dialog.
(function(){
  const MANAGER_API='https://dinqlgaveujdeyisgpty.supabase.co/functions/v1/saovang-manager-api';

  async function deleteImmediately(id){
    const entry=(active?.entries||[]).find(x=>String(x.id)===String(id));
    if(!entry)return toast('Không tìm thấy khoản doanh thu');
    try{
      let data;
      if(typeof isOwner==='function'&&isOwner()){
        const o=typeof owner==='function'?owner():null;
        if(!o?.token)return toast('Không xác định được quyền của nhân viên trong ca');
        data=await activeApi({action:'public_delete_entry',entryId:String(id),token:o.token});
      }else{
        const pin=prompt('Nhập PIN quản lý để xóa khoản trong ca');
        if(pin===null)return;
        if(!pin.trim())return toast('Chưa nhập PIN quản lý');
        const r=await fetch(MANAGER_API,{method:'POST',headers:{'Content-Type':'application/json','x-manager-pin':pin.trim()},body:JSON.stringify({action:'delete_active_revenue',entryId:String(id)})});
        data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.error||`Lỗi ${r.status}`);
      }
      active=rowToActive(data.active);
      renderActive();
      await refreshSummary();
      toast('Đã xóa lần nhập và cập nhật tổng');
    }catch(err){
      toast(err.message||'Không xóa được doanh thu');
    }
  }

  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('[data-sv-group-delete]');
    if(!btn)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    deleteImmediately(btn.dataset.svGroupDelete);
  },true);
})();

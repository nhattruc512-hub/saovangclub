// Sao Vang: allow a manager to save/close a reopened history shift with manager PIN.
(function(){
  const MANAGER_API='https://dinqlgaveujdeyisgpty.supabase.co/functions/v1/saovang-manager-api';
  const byId=id=>document.getElementById(id);

  function editing(){
    try{return typeof active!=='undefined'&&!!active?.editMode}catch{return false}
  }
  function own(){
    try{return typeof isOwner==='function'&&isOwner()}catch{return false}
  }

  function sync(){
    const btn=byId('managerPinCloseBtn');
    if(!btn)return;
    const isEdit=editing();
    if(isEdit&&!own()){
      btn.textContent='LƯU CHỈNH SỬA BẰNG PIN QUẢN LÝ';
      btn.classList.remove('hidden');
      btn.style.display='block';
    }else if(!isEdit){
      btn.textContent='ĐÓNG CA BẰNG PIN QUẢN LÝ';
      btn.style.display='';
    }
  }

  async function managerSaveEdit(){
    if(!editing())return;
    const pin=prompt('Nhập PIN quản lý để lưu chỉnh sửa và đóng ca');
    if(pin===null)return;
    if(!pin.trim())return toast('Chưa nhập PIN quản lý');
    if(!confirm(`Lưu chỉnh sửa ${active.shiftName} của ${active.employee} và đóng chế độ chỉnh sửa?`))return;
    const btn=byId('managerPinCloseBtn');
    if(btn)btn.disabled=true;
    try{
      const r=await fetch(MANAGER_API,{method:'POST',headers:{'Content-Type':'application/json','x-manager-pin':pin.trim()},body:JSON.stringify({action:'save_reopened_shift',id:String(active.id)})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||`Lỗi ${r.status}`);
      try{localStorage.removeItem('saovang_shared_shift_owner_v1');localStorage.removeItem('r971_shared_shift_owner_v1')}catch{}
      active=null;
      if(typeof renderActive==='function')renderActive();
      if(typeof refreshAll==='function')await refreshAll();
      toast('Quản lý đã lưu chỉnh sửa và đóng ca');
      byId('historySection')?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){toast(e.message||'Không lưu được chỉnh sửa')}
    finally{if(btn)btn.disabled=false}
  }

  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('#managerPinCloseBtn');
    if(!btn||!editing()||own())return;
    event.preventDefault();
    event.stopImmediatePropagation();
    managerSaveEdit();
  },true);

  const previous=typeof renderActive==='function'?renderActive:null;
  if(previous){renderActive=function(){previous();sync()}}
  function boot(){sync()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
(function(){
  const SV_OWNER_KEY='saovang_shared_shift_owner_v1';
  const SV_EMP_KEY='saovang_staff_employee_v1';
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

  CFG.activeFn='https://dinqlgaveujdeyisgpty.supabase.co/functions/v1/saovang-staff-active-shift';
  CFG.managerFn=MANAGER_API;

  rest=async function(path,opt={}){
    const r=await fetch(`${CFG.url}/rest/v1/${mapPath(path)}`,{...opt,headers:{...H,...(opt.headers||{})}});
    const t=await r.text();
    if(!r.ok)throw new Error(t||`Lỗi ${r.status}`);
    return t?JSON.parse(t):null;
  };

  currentEmployee=function(){return $('attendanceEmployee')?.value.trim()||$('employeeName')?.value.trim()||localStorage.getItem(SV_EMP_KEY)||'Chưa ghi tên NV'};
  rememberEmployee=function(v){if(v){localStorage.setItem(SV_EMP_KEY,v);if($('attendanceEmployee'))$('attendanceEmployee').value=v;if($('employeeName'))$('employeeName').value=v}};
  owner=function(){try{return JSON.parse(localStorage.getItem(SV_OWNER_KEY)||'null')}catch{return null}};
  isOwner=function(){const o=owner();return !!(active&&o&&String(o.id)===String(active.id)&&o.token)};

  const originalBind=bind;
  bind=function(){
    const legacy=localStorage.getItem('r971_staff_employee_v1');
    if(legacy!==null)localStorage.removeItem('r971_staff_employee_v1');
    try{originalBind()}finally{if(legacy!==null)localStorage.setItem('r971_staff_employee_v1',legacy)}
    const emp=localStorage.getItem(SV_EMP_KEY)||'';
    if($('attendanceEmployee'))$('attendanceEmployee').value=emp;
    if($('employeeName'))$('employeeName').value=emp;
  };

  refreshActive=async function(){
    if(pollBusy)return;
    pollBusy=true;
    try{
      const rows=await rest('staff_active_shift?select=id,date_key,shift_key,shift_name,scheduled_time,employee,start_at,totals,entries,participants,updated_at&singleton_id=eq.1');
      const next=rowToActive(rows?.[0]||null);
      const changed=JSON.stringify(next)!==JSON.stringify(active);
      active=next;
      if(!active&&owner())localStorage.removeItem(SV_OWNER_KEY);
      if(changed)renderActive();
      updateRevenueMode();
      updateStartButton();
    }catch(e){console.error(e)}finally{pollBusy=false}
  };

  updateStartButton=function(){
    const name=$('employeeName')?.value.trim();
    if(!active){$('startShiftBtn').disabled=!selectedShift||!name;return}
    const count=(active.participants||[]).length||1;
    $('startShiftBtn').disabled=!name||!selectedShift||selectedShift!==active.shiftKey||count>=2;
  };

  startShift=async function(){
    await refreshActive();
    const employee=$('employeeName').value.trim();
    if(!employee||!selectedShift)return toast('Nhập tên và chọn ca');
    const s=SHIFTS[selectedShift];
    if(active){
      const count=(active.participants||[]).length||1;
      if(selectedShift!==active.shiftKey)return toast(`Chỉ có thể thêm người vào ${active.shiftName}`);
      if(count>=2)return toast(`${active.shiftName} đã đủ 2 người`);
      if((active.participants||[]).some(x=>String(x).trim().toLowerCase()===employee.toLowerCase()))return toast('Nhân viên này đã có trong ca');
    }
    try{
      const d=await activeApi({action:'start',employee,shiftKey:selectedShift,shiftName:s.name,scheduledTime:s.time,dateKey:localDateKey()});
      active=rowToActive(d.active);
      localStorage.setItem(SV_OWNER_KEY,JSON.stringify({id:active.id,token:d.token}));
      rememberEmployee(employee);
      selectedShift='';
      document.querySelectorAll('.shift').forEach(b=>b.classList.remove('selected'));
      renderActive();
      updateStartButton();
      toast(d.joined?`Đã thêm ${employee} vào ${active.shiftName}`:`Đã bắt đầu ${active.shiftName}`);
    }catch(e){
      if(e.status===409&&e.data?.active){active=rowToActive(e.data.active);renderActive();updateStartButton()}
      toast(e.message);
    }
  };

  finishShift=async function(){
    if(!active||!isOwner())return toast('Chỉ máy bắt đầu ca mới được kết thúc');
    if(!confirm(`Kết thúc ${active.shiftName} của ${active.employee}?`))return;
    try{
      const current={...active};
      const o=owner();
      const d=await activeApi({action:'finish',id:active.id,token:o.token,note:''});
      const r=d.completed||{};
      const transfer=Number(r.transfer||0),cash=Number(r.cash||0),court=Number(r.court_revenue||0),water=Number(r.water_revenue||0);
      const collected=Number.isFinite(Number(r.collected_total))?Number(r.collected_total):transfer+cash;
      const revenue=Number.isFinite(Number(r.revenue_total))?Number(r.revenue_total):court+water;
      const diff=Number.isFinite(Number(r.difference))?Number(r.difference):collected-revenue;
      localStorage.removeItem(SV_OWNER_KEY);
      active=null;
      renderActive();
      await refreshAll();
      alert(`ĐÃ CHỐT ${r.shift_name||current.shiftName}\n\nChuyển khoản: ${money(transfer)}\nTiền mặt: ${money(cash)}\nDoanh thu sân: ${money(court)}\nDoanh thu nước: ${money(water)}\n\nTổng tiền thu: ${money(collected)}\nTổng doanh thu: ${money(revenue)}\nChênh lệch: ${money(diff)}`);
    }catch(e){toast(e.message||'Không kết thúc được ca')}
  };

  async function managerCall(action,pin,extra={}){
    const r=await fetch(MANAGER_API,{method:'POST',headers:{'Content-Type':'application/json','x-manager-pin':pin},body:JSON.stringify({action,...extra})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||`Lỗi ${r.status}`);
    return d;
  }

  async function closeWithManagerPin(){
    if(!active)return toast('Không có ca đang hoạt động');
    if(isOwner())return finishShift();
    const current={...active};
    const pin=prompt(`Máy khác muốn đóng ${current.shiftName} của ${current.employee}.\nNhập PIN quản lý:`);
    if(pin===null)return;
    if(!pin.trim())return toast('Chưa nhập PIN quản lý');
    if(!confirm(`Xác nhận đóng ${current.shiftName} của ${current.employee} bằng quyền quản lý?\n\nDoanh thu hiện tại vẫn được lưu vào lịch sử ca.`))return;
    try{
      await managerCall('close_active',pin.trim(),{id:current.id});
      localStorage.removeItem(SV_OWNER_KEY);
      active=null;
      if(typeof renderActive==='function')renderActive();
      if(typeof refreshAll==='function')await refreshAll();
      if(typeof refreshManager==='function'&&managerPin)await refreshManager();
      toast(`Đã đóng ${current.shiftName} bằng PIN quản lý`);
    }catch(e){toast(e.message||'Không đóng được ca')}
  }

  async function deleteActiveRevenueSafe(id){
    const e=(active?.entries||[]).find(x=>String(x.id)===String(id));
    if(!e)return toast('Không tìm thấy khoản doanh thu');
    const parts=[];
    if(e.transfer)parts.push(`CK ${money(e.transfer)}`);
    if(e.cash)parts.push(`TM ${money(e.cash)}`);
    if(e.courtRevenue)parts.push(`Sân ${money(e.courtRevenue)}`);
    if(e.waterRevenue)parts.push(`Nước ${money(e.waterRevenue)}`);
    if(!confirm(`Xóa khoản đã cộng nhầm?\n${parts.join(' · ')}\n\nTổng doanh thu của ca sẽ tự trừ lại.`))return;
    try{
      let d;
      if(isOwner()){
        const o=owner();
        d=await activeApi({action:'public_delete_entry',entryId:String(id),token:o?.token||''});
      }else{
        const pin=prompt('Nhập PIN quản lý để xóa khoản trong ca');
        if(pin===null)return;
        if(!pin.trim())return toast('Chưa nhập PIN quản lý');
        d=await managerCall('delete_active_revenue',pin.trim(),{entryId:String(id)});
      }
      active=rowToActive(d.active);
      renderActive();
      await refreshSummary();
      if(managerPin)refreshManager();
      toast('Đã xóa khoản doanh thu và trừ lại tổng');
    }catch(err){toast(err.message||'Không xóa được doanh thu')}
  }

  function replaceClickButton(id,handler){
    const old=$(id);
    if(!old||old.dataset.svBound==='1')return;
    const clone=old.cloneNode(true);
    clone.dataset.svBound='1';
    old.replaceWith(clone);
    clone.addEventListener('click',handler);
  }

  function bindSaovangControls(){
    document.querySelectorAll('[data-active-revenue-delete]').forEach(b=>{b.onclick=()=>deleteActiveRevenueSafe(b.dataset.activeRevenueDelete)});
    replaceClickButton('managerRemoteCloseBtn',closeWithManagerPin);
    replaceClickButton('managerPinCloseBtn',closeWithManagerPin);
  }

  const renderActiveBeforeSaovang=renderActive;
  renderActive=function(){renderActiveBeforeSaovang();bindSaovangControls()};

  function bootSaovang(){bindSaovangControls()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootSaovang);else bootSaovang();
})();

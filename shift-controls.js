// Up to two staff may join the same active shift. Other shifts stay locked.
// The device that started/joined the active shift can also correct the shift without losing revenue.
(function(){
  const ENDPOINT='https://dinqlgaveujdeyisgpty.supabase.co/functions/v1/manager-close-active-shift';
  const el=id=>document.getElementById(id);

  function peopleFrom(r){
    const list=Array.isArray(r?.participants)?r.participants.map(x=>String(x||'').trim()).filter(Boolean):[];
    return list.length?list:String(r?.employee||'').split('+').map(x=>x.trim()).filter(Boolean);
  }

  rowToActive=function(r){
    if(!r)return null;
    const participants=peopleFrom(r);
    return{id:r.id,dateKey:r.date_key,shiftKey:r.shift_key,shiftName:r.shift_name,scheduledTime:r.scheduled_time,employee:participants.join(' + ')||r.employee,startAt:r.start_at,totals:r.totals||{},entries:Array.isArray(r.entries)?r.entries:[],participants};
  };

  refreshActive=async function(){
    if(pollBusy)return;
    pollBusy=true;
    try{
      const rows=await rest('staff_active_shift?select=id,date_key,shift_key,shift_name,scheduled_time,employee,start_at,totals,entries,participants,updated_at&singleton_id=eq.1');
      const next=rowToActive(rows?.[0]||null);
      const changed=JSON.stringify(next)!==JSON.stringify(active);
      active=next;
      if(!active&&owner())localStorage.removeItem(OWNER_KEY);
      if(changed)renderActive();
      updateRevenueMode();
      updateStartButton();
    }catch(e){console.error(e)}finally{pollBusy=false}
  };

  updateStartButton=function(){
    const name=el('employeeName')?.value.trim();
    if(!active){el('startShiftBtn').disabled=!selectedShift||!name;return}
    const count=(active.participants||[]).length||1;
    el('startShiftBtn').disabled=!name||!selectedShift||selectedShift!==active.shiftKey||count>=2;
  };

  startShift=async function(){
    await refreshActive();
    const employee=el('employeeName').value.trim();
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
      localStorage.setItem(OWNER_KEY,JSON.stringify({id:active.id,token:d.token}));
      rememberEmployee(employee);
      selectedShift='';
      document.querySelectorAll('.shift').forEach(b=>b.classList.remove('selected'));
      renderActive();
      updateStartButton();
      toast(d.joined?`Đã thêm ${employee} vào ${active.shiftName}`:`Đã bắt đầu ${active.shiftName}`);
    }catch(e){
      if(e.status===409&&e.data?.active){active=rowToActive(e.data.active);renderActive();updateStartButton()}
      toast(e.message)
    }
  };

  function ensureUI(){
    const start=el('startCard');
    if(start&&!el('shiftBusyNotice')){
      const n=document.createElement('div');n.id='shiftBusyNotice';n.className='notice hidden';
      const grid=start.querySelector('.shift-grid');if(grid)start.insertBefore(n,grid);
    }
    const card=el('activeCard');
    if(card&&!el('editActiveShiftBtn')){
      const b=document.createElement('button');
      b.id='editActiveShiftBtn';b.type='button';b.className='btn secondary block hidden';b.textContent='CHỈNH SỬA CA';
      const finish=el('finishShiftBtn');if(finish)finish.before(b);else card.appendChild(b);
      b.addEventListener('click',editActiveShift);
    }
    if(card&&!el('managerPinCloseBtn')){
      const b=document.createElement('button');b.id='managerPinCloseBtn';b.type='button';b.className='btn danger block hidden';b.textContent='ĐÓNG CA BẰNG PIN QUẢN LÝ';
      const finish=el('finishShiftBtn');if(finish)finish.after(b);else card.appendChild(b);b.addEventListener('click',closeWithPin);
    }
  }

  function participantCount(){if(typeof active==='undefined'||!active)return 0;const p=Array.isArray(active.participants)?active.participants:[];return p.length||1}

  function apply(){
    ensureUI();
    const start=el('startCard'),notice=el('shiftBusyNotice'),pinBtn=el('managerPinCloseBtn'),editBtn=el('editActiveShiftBtn'),finish=el('finishShiftBtn');
    if(start)start.classList.remove('hidden');
    const running=typeof active!=='undefined'&&!!active,count=participantCount();
    document.querySelectorAll('.shift').forEach(b=>{b.disabled=running&&(count>=2||b.dataset.shift!==active.shiftKey)});
    if(notice){notice.classList.add('hidden');notice.textContent=''}
    if(typeof updateStartButton==='function')updateStartButton();
    const own=running&&typeof isOwner==='function'&&isOwner();
    if(finish)finish.classList.toggle('hidden',!own);
    if(editBtn)editBtn.classList.toggle('hidden',!own);
    if(pinBtn)pinBtn.classList.toggle('hidden',!running||own);
  }

  async function editActiveShift(){
    if(typeof active==='undefined'||!active)return toast('Không có ca đang hoạt động');
    if(typeof isOwner!=='function'||!isOwner())return toast('Chỉ máy đã bắt đầu ca mới được chỉnh sửa');
    const currentNo=String(active.shiftKey||'').replace('ca','')||'1';
    const raw=prompt(`Ca hiện tại: ${active.shiftName}\nNhập ca muốn đổi sang: 1, 2 hoặc 3`,currentNo);
    if(raw===null)return;
    const n=String(raw).trim();
    const key=`ca${n}`;
    if(!SHIFTS[key])return toast('Chỉ chọn Ca 1, Ca 2 hoặc Ca 3');
    if(key===active.shiftKey)return toast('Ca không thay đổi');
    const o=owner();
    if(!o?.token)return toast('Không xác định được quyền chỉnh sửa ca');
    const btn=el('editActiveShiftBtn');if(btn)btn.disabled=true;
    try{
      const d=await activeApi({action:'update',id:active.id,token:o.token,shiftKey:key});
      active=rowToActive(d.active);
      renderActive();
      updateRevenueMode();
      toast(`Đã đổi sang ${active.shiftName}. Doanh thu được giữ nguyên.`);
    }catch(e){toast(e.message||'Không chỉnh sửa được ca')}
    finally{if(btn)btn.disabled=false}
  }

  async function closeWithPin(){
    if(typeof active==='undefined'||!active)return toast('Không có ca đang hoạt động');
    const pin=prompt('Nhập PIN quản lý để đóng ca trên máy khác');if(pin===null)return;if(!pin.trim())return toast('Chưa nhập PIN quản lý');
    const current={...active};
    if(!confirm(`Đóng ${current.shiftName} của ${current.employee} bằng PIN quản lý?\n\nDoanh thu hiện tại vẫn được lưu vào lịch sử.`))return;
    const btn=el('managerPinCloseBtn');btn.disabled=true;
    try{
      const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-manager-pin':pin.trim()},body:JSON.stringify({id:current.id})});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Lỗi ${r.status}`);
      if(typeof OWNER_KEY!=='undefined')localStorage.removeItem(OWNER_KEY);active=null;
      if(typeof refreshAll==='function')await refreshAll();if(typeof renderActive==='function')renderActive();apply();toast(`Đã đóng ${current.shiftName} bằng PIN quản lý`);
    }catch(e){toast(e.message||'Không đóng được ca')}finally{btn.disabled=false}
  }

  const oldRender=typeof renderActive==='function'?renderActive:null;
  if(oldRender){renderActive=function(){oldRender();apply()}}
  function boot(){ensureUI();apply()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

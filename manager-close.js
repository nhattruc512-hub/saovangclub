(function(){
  const ENDPOINT='https://dinqlgaveujdeyisgpty.supabase.co/functions/v1/manager-close-active-shift';
  const $id=id=>document.getElementById(id);

  function mount(){
    const card=$id('activeCard');
    if(card&&!$id('managerRemoteCloseBtn')){
      const btn=document.createElement('button');
      btn.id='managerRemoteCloseBtn';
      btn.className='btn ghost block hidden';
      btn.type='button';
      btn.textContent='ĐÓNG CA BẰNG PIN QUẢN LÝ';
      const finish=$id('finishShiftBtn');
      if(finish)finish.after(btn);else card.appendChild(btn);
      btn.addEventListener('click',remoteClose);
    }
    const panel=$id('managerPanel');
    if(panel&&!$id('managerActiveShiftSection')){
      const section=document.createElement('div');
      section.id='managerActiveShiftSection';
      section.className='manager-section';
      section.innerHTML=`<div class="kicker">CA ĐANG HOẠT ĐỘNG</div><p class="muted">Máy đã bắt đầu ca tự kết thúc ca. Máy khác chỉ được đóng khi nhập đúng PIN quản lý.</p><div id="managerActiveShiftBox" class="row" style="margin-top:10px"></div>`;
      const firstSection=panel.querySelector('.manager-section');
      panel.insertBefore(section,firstSection||null);
    }
    renderControls();
    setInterval(renderControls,1000);
  }

  function renderControls(){
    const remoteBtn=$id('managerRemoteCloseBtn');
    if(remoteBtn){
      const show=!!active&&!isOwner();
      remoteBtn.classList.toggle('hidden',!show);
    }
    const finish=$id('finishShiftBtn');
    if(finish)finish.classList.toggle('hidden',!(active&&isOwner()));

    const box=$id('managerActiveShiftBox');
    if(box){
      if(!active){box.innerHTML='<div class="row-main"><b>Không có ca đang hoạt động</b></div>';return}
      const t=active.totals||{};
      const revenue=Number(t.courtRevenue||0)+Number(t.waterRevenue||0);
      box.innerHTML=`<div class="row-main"><b>${esc(active.shiftName)} · ${esc(active.employee)}</b><span>Bắt đầu ${vnTime(active.startAt)} · ${esc(active.scheduledTime||'')}</span><small>Doanh thu hiện tại ${money(revenue)} · ${isOwner()?'Máy này đã mở ca':'Máy khác đang quản lý ca'}</small></div>`;
    }
  }

  async function remoteClose(){
    if(!active)return toast('Không có ca đang hoạt động');
    if(isOwner())return finishShift();
    const current={...active};
    const pin=prompt(`Máy khác muốn đóng ${current.shiftName} của ${current.employee}.\nNhập PIN quản lý:`);
    if(pin===null)return;
    if(pin!=='270523')return toast('PIN quản lý không đúng');
    if(!confirm(`Xác nhận đóng ${current.shiftName} của ${current.employee} bằng quyền quản lý?\n\nDoanh thu hiện tại vẫn được lưu vào lịch sử ca.`))return;
    const btn=$id('managerRemoteCloseBtn');if(btn)btn.disabled=true;
    try{
      const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-manager-pin':pin},body:JSON.stringify({id:current.id})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||`Lỗi ${r.status}`);
      active=null;
      if(typeof renderActive==='function')renderActive();
      if(typeof refreshAll==='function')await refreshAll();
      if(typeof refreshManager==='function'&&typeof managerPin!=='undefined'&&managerPin)await refreshManager();
      renderControls();
      toast(`Đã đóng ${current.shiftName} bằng PIN quản lý`);
    }catch(e){toast(e.message||'Không đóng được ca')}
    finally{if(btn)btn.disabled=false}
  }

  const oldRenderActive=renderActive;
  renderActive=function(){oldRenderActive();renderControls()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

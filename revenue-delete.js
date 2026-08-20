// Allow staff to remove mistakenly entered revenue. Active-shift deletion requires shift staff ownership or manager PIN.
(function(){
  let outsideRows=[];
  const DELETE_ACTIVE_ENDPOINT='https://dinqlgaveujdeyisgpty.supabase.co/functions/v1/delete-active-revenue-entry';
  const oldRenderActive=renderActive;
  renderActive=function(){
    oldRenderActive();
    if(!active||!$('activeEntries'))return;
    const entries=active.entries||[];
    $('activeEntries').innerHTML=entries.map(e=>{
      const p=[];
      if(e.transfer)p.push(`CK ${money(e.transfer)}`);
      if(e.cash)p.push(`TM ${money(e.cash)}`);
      if(e.courtRevenue)p.push(`Sân ${money(e.courtRevenue)}`);
      if(e.waterRevenue)p.push(`Nước ${money(e.waterRevenue)}`);
      return `<div class="row"><div class="row-main"><b>${esc(vnTime(e.at))} · ${esc(e.employee||active.employee)}</b><span>${p.join(' · ')}</span></div><div class="row-actions"><button class="btn danger mini" type="button" data-active-revenue-delete="${esc(e.id)}">Xóa</button></div></div>`;
    }).join('');
    document.querySelectorAll('[data-active-revenue-delete]').forEach(b=>b.onclick=()=>deleteActiveRevenue(b.dataset.activeRevenueDelete));
  };

  async function callDeleteActive(entryId,payload={}){
    const r=await fetch(DELETE_ACTIVE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entryId:String(entryId),...payload})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||`Lỗi ${r.status}`);
    return d;
  }

  async function deleteActiveRevenue(id){
    const e=(active?.entries||[]).find(x=>String(x.id)===String(id));
    if(!e)return toast('Không tìm thấy khoản doanh thu');
    const parts=[];if(e.transfer)parts.push(`CK ${money(e.transfer)}`);if(e.cash)parts.push(`TM ${money(e.cash)}`);if(e.courtRevenue)parts.push(`Sân ${money(e.courtRevenue)}`);if(e.waterRevenue)parts.push(`Nước ${money(e.waterRevenue)}`);
    let auth={};
    if(typeof isOwner==='function'&&isOwner()){
      const o=typeof owner==='function'?owner():null;
      if(!o?.token)return toast('Không xác định được quyền của nhân viên trong ca');
      auth={token:o.token};
    }else{
      const pin=prompt('Nhập PIN quản lý để xóa khoản trong ca');
      if(pin===null)return;
      if(!pin.trim())return toast('Chưa nhập PIN quản lý');
      auth={pin:pin.trim()};
    }
    if(!confirm(`Xóa khoản đã cộng nhầm?\n${parts.join(' · ')}\n\nTổng doanh thu của ca sẽ tự trừ lại.`))return;
    try{
      const d=await callDeleteActive(id,auth);
      active=rowToActive(d.active);renderActive();await refreshSummary();if(managerPin)refreshManager();toast('Đã xóa khoản doanh thu và trừ lại tổng');
    }catch(err){toast(err.message||'Không xóa được doanh thu')}
  }

  function mountOutsideHistory(){
    const card=$('quickRevenueCard');if(!card||$('outsideRevenueList'))return;
    const box=document.createElement('div');box.className='section-gap';box.innerHTML=`<div class="head compact"><div><div class="kicker">LỊCH SỬ DOANH THU NGOÀI CA</div><p class="muted">Nếu nhập nhầm có thể xóa tại đây.</p></div><button id="outsideRevenueRefresh" class="btn ghost mini" type="button">Làm mới</button></div><div id="outsideRevenueList" class="list"></div><div id="outsideRevenueEmpty" class="empty hidden">Chưa có khoản doanh thu ngoài ca trong ngày.</div>`;
    card.appendChild(box);$('outsideRevenueRefresh').onclick=refreshOutsideRevenue;
  }

  async function refreshOutsideRevenue(){
    if(!$('outsideRevenueList'))return;
    const date=$('summaryDate')?.value||localDateKey();
    try{
      outsideRows=await rest(`staff_revenue_entries?select=id,created_at,employee,transfer,cash,court_revenue,water_revenue,shift_name&date_key=eq.${encodeURIComponent(date)}&order=created_at.desc`)||[];
      $('outsideRevenueEmpty').classList.toggle('hidden',outsideRows.length>0);
      $('outsideRevenueList').innerHTML=outsideRows.map(r=>{
        const p=[];if(r.transfer)p.push(`CK ${money(r.transfer)}`);if(r.cash)p.push(`TM ${money(r.cash)}`);if(r.court_revenue)p.push(`Sân ${money(r.court_revenue)}`);if(r.water_revenue)p.push(`Nước ${money(r.water_revenue)}`);
        return `<div class="row"><div class="row-main"><b>${esc(vnTime(r.created_at))} · ${esc(r.employee||'Nhân viên')}</b><span>${p.join(' · ')}</span></div><div class="row-actions"><button class="btn danger mini" type="button" data-outside-revenue-delete="${esc(r.id)}">Xóa</button></div></div>`;
      }).join('');
      document.querySelectorAll('[data-outside-revenue-delete]').forEach(b=>b.onclick=()=>deleteOutsideRevenue(b.dataset.outsideRevenueDelete));
    }catch(err){console.error(err)}
  }

  async function deleteOutsideRevenue(id){
    const r=outsideRows.find(x=>String(x.id)===String(id));if(!r)return;
    const p=[];if(r.transfer)p.push(`CK ${money(r.transfer)}`);if(r.cash)p.push(`TM ${money(r.cash)}`);if(r.court_revenue)p.push(`Sân ${money(r.court_revenue)}`);if(r.water_revenue)p.push(`Nước ${money(r.water_revenue)}`);
    if(!confirm(`Xóa khoản doanh thu ngoài ca đã nhập nhầm?\n${p.join(' · ')}`))return;
    try{await activeApi({action:'delete_outside_entry',id:String(id)});await Promise.all([refreshOutsideRevenue(),refreshSummary()]);if(managerPin)refreshManager();toast('Đã xóa khoản doanh thu ngoài ca')}catch(err){toast(err.message||'Không xóa được doanh thu')}
  }

  const oldAddRevenue=addRevenue;
  addRevenue=async function(){await oldAddRevenue();setTimeout(refreshOutsideRevenue,150)};
  const oldRefreshSummary=refreshSummary;
  refreshSummary=async function(){await oldRefreshSummary();if($('outsideRevenueList'))refreshOutsideRevenue()};

  function bootDelete(){mountOutsideHistory();refreshOutsideRevenue();if(active)renderActive()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootDelete);else bootDelete();
})();

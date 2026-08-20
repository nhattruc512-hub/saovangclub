// Sao Vang: keep the legacy transfer field as OCB and track BIDV separately.
(function(){
  const byId=id=>document.getElementById(id);
  const MANAGER_API='https://dinqlgaveujdeyisgpty.supabase.co/functions/v1/saovang-manager-api';

  function setLabel(inputId,text){
    const input=byId(inputId);const label=input?.closest('label');const span=label?.querySelector('span');if(span)span.textContent=text;
  }
  function mountBanks(){
    setLabel('qTransfer','OCB');
    const qTransfer=byId('qTransfer');
    if(qTransfer&&!byId('qBidv')){
      const label=document.createElement('label');
      label.innerHTML='<span>BIDV</span><input id="qBidv" class="input money" inputmode="numeric" placeholder="0">';
      qTransfer.closest('label')?.insertAdjacentElement('afterend',label);
      const input=byId('qBidv');if(input&&typeof fmtInput==='function')input.addEventListener('input',()=>fmtInput(input));
    }

    const sumTransfer=byId('sumTransfer');
    if(sumTransfer){const span=sumTransfer.parentElement?.querySelector('span');if(span)span.textContent='OCB'}
    if(sumTransfer&&!byId('sumBidv')){
      const div=document.createElement('div');div.innerHTML='<span>BIDV</span><b id="sumBidv">0 ₫</b>';sumTransfer.parentElement?.insertAdjacentElement('afterend',div);
    }

    const liveTransfer=byId('liveTransfer');
    if(liveTransfer){const span=liveTransfer.parentElement?.querySelector('span');if(span)span.textContent='OCB'}
    if(liveTransfer&&!byId('liveBidv')){
      const div=document.createElement('div');div.innerHTML='<span>BIDV</span><b id="liveBidv">0 ₫</b>';liveTransfer.parentElement?.insertAdjacentElement('afterend',div);
    }
  }

  function revenueParts(e){
    const p=[];
    if(Number(e?.transfer||0))p.push(`OCB ${money(e.transfer)}`);
    if(Number(e?.bidv||0))p.push(`BIDV ${money(e.bidv)}`);
    if(Number(e?.cash||0))p.push(`TM ${money(e.cash)}`);
    if(Number(e?.courtRevenue||0))p.push(`Sân ${money(e.courtRevenue)}`);
    if(Number(e?.waterRevenue||0))p.push(`Nước ${money(e.waterRevenue)}`);
    return p.join(' · ');
  }

  async function managerDeleteActive(entryId,pin){
    const r=await fetch(MANAGER_API,{method:'POST',headers:{'Content-Type':'application/json','x-manager-pin':pin},body:JSON.stringify({action:'delete_active_revenue',entryId:String(entryId)})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Lỗi ${r.status}`);return d;
  }

  async function deleteActiveBank(id){
    const e=(active?.entries||[]).find(x=>String(x.id)===String(id));if(!e)return toast('Không tìm thấy khoản doanh thu');
    const detail=revenueParts(e);
    if(!confirm(`Xóa khoản đã cộng nhầm?\n${detail}\n\nTổng doanh thu của ca sẽ tự trừ lại.`))return;
    try{
      let d;
      if(typeof isOwner==='function'&&isOwner()){
        const o=typeof owner==='function'?owner():null;
        if(!o?.token)return toast('Không xác định được quyền của nhân viên trong ca');
        d=await activeApi({action:'public_delete_entry',entryId:String(id),token:o.token});
      }else{
        const pin=prompt('Nhập PIN quản lý để xóa khoản trong ca');if(pin===null)return;if(!pin.trim())return toast('Chưa nhập PIN quản lý');
        d=await managerDeleteActive(id,pin.trim());
      }
      active=rowToActive(d.active);renderActive();await refreshSummary();toast('Đã xóa khoản doanh thu và trừ lại tổng');
    }catch(err){toast(err.message||'Không xóa được doanh thu')}
  }

  const previousRenderActive=typeof renderActive==='function'?renderActive:null;
  if(previousRenderActive){
    renderActive=function(){
      mountBanks();previousRenderActive();
      if(!active)return;
      const t=active.totals||{};
      const ocb=Number(t.transfer||0),bidv=Number(t.bidv||0),cash=Number(t.cash||0),court=Number(t.courtRevenue||0),water=Number(t.waterRevenue||0);
      if(byId('liveTransfer'))byId('liveTransfer').textContent=money(ocb);
      if(byId('liveBidv'))byId('liveBidv').textContent=money(bidv);
      if(byId('liveCash'))byId('liveCash').textContent=money(cash);
      if(byId('liveCollected'))byId('liveCollected').textContent=money(ocb+bidv+cash);
      if(byId('liveDiff'))byId('liveDiff').textContent=money(ocb+bidv+cash-court-water);
      const rows=byId('activeEntries')?.querySelectorAll('.row')||[];
      (active.entries||[]).forEach((e,i)=>{const span=rows[i]?.querySelector('.row-main span');if(span)span.textContent=revenueParts(e)});
      document.querySelectorAll('[data-active-revenue-delete]').forEach(b=>b.onclick=()=>deleteActiveBank(b.dataset.activeRevenueDelete));
    };
  }

  addRevenue=async function(){
    mountBanks();
    const transfer=parseMoney(byId('qTransfer')?.value),bidv=parseMoney(byId('qBidv')?.value),cash=parseMoney(byId('qCash')?.value),courtRevenue=parseMoney(byId('qCourt')?.value),waterRevenue=parseMoney(byId('qWater')?.value);
    if(!(transfer||bidv||cash||courtRevenue||waterRevenue))return toast('Hãy nhập ít nhất một khoản tiền');
    const employee=currentEmployee();rememberEmployee(employee);byId('addRevenueBtn').disabled=true;
    try{
      const d=await activeApi({action:'public_add_entry',entry:{id:crypto.randomUUID(),employee,transfer,bidv,cash,courtRevenue,waterRevenue}});
      if(d.active){active=rowToActive(d.active);renderActive();toast(`Đã cộng vào ${active.shiftName}`)}
      else{
        const now=new Date();
        await rest('staff_revenue_entries',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({date_key:localDateKey(now),employee,transfer,bidv,cash,court_revenue:courtRevenue,water_revenue:waterRevenue,shift_name:'Ngoài ca',source:'manual'})});
        toast('Đã lưu doanh thu ngoài ca');
      }
      ['qTransfer','qBidv','qCash','qCourt','qWater'].forEach(id=>{if(byId(id))byId(id).value=''});
      await refreshSummary();setTimeout(()=>byId('outsideRevenueRefresh')?.click(),150);
    }catch(e){console.error(e);toast('Không lưu được doanh thu')}
    finally{byId('addRevenueBtn').disabled=false}
  };

  const previousRefreshSummary=typeof refreshSummary==='function'?refreshSummary:null;
  refreshSummary=async function(){
    mountBanks();
    if(previousRefreshSummary){try{await previousRefreshSummary()}catch(e){console.error(e)}}
    const date=byId('summaryDate')?.value||localDateKey();
    try{
      const [hist,outside,act]=await Promise.all([
        rest(`staff_shift_history?select=transfer,bidv,cash,court_revenue,water_revenue&date_key=eq.${encodeURIComponent(date)}`),
        rest(`staff_revenue_entries?select=transfer,bidv,cash,court_revenue,water_revenue&date_key=eq.${encodeURIComponent(date)}`),
        rest('staff_active_shift?select=date_key,totals&singleton_id=eq.1')
      ]);
      const sum={ocb:0,bidv:0,cash:0,court:0,water:0};
      (hist||[]).forEach(r=>{sum.ocb+=+r.transfer||0;sum.bidv+=+r.bidv||0;sum.cash+=+r.cash||0;sum.court+=+r.court_revenue||0;sum.water+=+r.water_revenue||0});
      (outside||[]).forEach(r=>{sum.ocb+=+r.transfer||0;sum.bidv+=+r.bidv||0;sum.cash+=+r.cash||0;sum.court+=+r.court_revenue||0;sum.water+=+r.water_revenue||0});
      const ar=act?.[0];if(ar&&String(ar.date_key)===String(date)){const t=ar.totals||{};sum.ocb+=+t.transfer||0;sum.bidv+=+t.bidv||0;sum.cash+=+t.cash||0;sum.court+=+t.courtRevenue||0;sum.water+=+t.waterRevenue||0}
      if(byId('sumTransfer'))byId('sumTransfer').textContent=money(sum.ocb);
      if(byId('sumBidv'))byId('sumBidv').textContent=money(sum.bidv);
      if(byId('sumCash'))byId('sumCash').textContent=money(sum.cash);
      if(byId('sumCourt'))byId('sumCourt').textContent=money(sum.court);
      if(byId('sumWater'))byId('sumWater').textContent=money(sum.water);
      if(byId('sumRevenue'))byId('sumRevenue').textContent=money(sum.court+sum.water);
    }catch(e){console.error(e)}
  };

  renderHistory=function(){
    const shift=byId('historyShift')?.value||'all';const list=(historyRows||[]).filter(r=>shift==='all'||r.shift_key===shift);
    byId('historyEmpty')?.classList.toggle('hidden',list.length>0);
    if(!byId('historyList'))return;
    byId('historyList').innerHTML=list.map(r=>{
      const ocb=Number(r.transfer||0),bidv=Number(r.bidv||0),cash=Number(r.cash||0),court=Number(r.court_revenue||0),water=Number(r.water_revenue||0);
      const collected=Number.isFinite(Number(r.collected_total))?Number(r.collected_total):ocb+bidv+cash;
      const revenue=Number.isFinite(Number(r.revenue_total))?Number(r.revenue_total):court+water;
      const diff=Number.isFinite(Number(r.difference))?Number(r.difference):collected-revenue;
      return `<div class="row"><div class="row-main"><b>${esc(r.shift_name)} · ${esc(r.employee)}</b><span>${vnTime(r.start_at)} → ${vnTime(r.end_at)}</span><small>OCB ${money(ocb)} · BIDV ${money(bidv)} · TM ${money(cash)}</small><small>Sân ${money(court)} · Nước ${money(water)}</small><small><b>Tổng thu ${money(collected)} · Tổng doanh thu ${money(revenue)} · Chênh lệch ${money(diff)}</b></small></div></div>`;
    }).join('');
  };

  finishShift=async function(){
    if(!active||!isOwner())return toast('Chỉ máy bắt đầu ca mới được kết thúc');
    if(!confirm(`Kết thúc ${active.shiftName} của ${active.employee}?`))return;
    try{
      const current={...active},o=owner();const d=await activeApi({action:'finish',id:active.id,token:o.token,note:''});const r=d.completed||{};
      const ocb=Number(r.transfer||0),bidv=Number(r.bidv||0),cash=Number(r.cash||0),court=Number(r.court_revenue||0),water=Number(r.water_revenue||0);
      const collected=Number.isFinite(Number(r.collected_total))?Number(r.collected_total):ocb+bidv+cash;
      const revenue=Number.isFinite(Number(r.revenue_total))?Number(r.revenue_total):court+water;
      const diff=Number.isFinite(Number(r.difference))?Number(r.difference):collected-revenue;
      try{localStorage.removeItem('saovang_shared_shift_owner_v1')}catch{}
      active=null;renderActive();await refreshAll();
      alert(`ĐÃ CHỐT ${r.shift_name||current.shiftName}\n\nOCB: ${money(ocb)}\nBIDV: ${money(bidv)}\nTiền mặt: ${money(cash)}\nDoanh thu sân: ${money(court)}\nDoanh thu nước: ${money(water)}\n\nTổng tiền thu: ${money(collected)}\nTổng doanh thu: ${money(revenue)}\nChênh lệch: ${money(diff)}`);
    }catch(e){toast(e.message||'Không kết thúc được ca')}
  };

  async function patchOutside(){
    if(!byId('outsideRevenueList'))return;const date=byId('summaryDate')?.value||localDateKey();
    try{
      const rows=await rest(`staff_revenue_entries?select=id,transfer,bidv,cash,court_revenue,water_revenue&date_key=eq.${encodeURIComponent(date)}&order=created_at.desc`)||[];
      const dom=byId('outsideRevenueList').querySelectorAll('.row');
      rows.forEach((r,i)=>{const span=dom[i]?.querySelector('.row-main span');if(!span)return;const p=[];if(r.transfer)p.push(`OCB ${money(r.transfer)}`);if(r.bidv)p.push(`BIDV ${money(r.bidv)}`);if(r.cash)p.push(`TM ${money(r.cash)}`);if(r.court_revenue)p.push(`Sân ${money(r.court_revenue)}`);if(r.water_revenue)p.push(`Nước ${money(r.water_revenue)}`);span.textContent=p.join(' · ')})
    }catch(e){console.error(e)}
  }

  function bindBanks(){
    mountBanks();
    if(byId('addRevenueBtn'))byId('addRevenueBtn').onclick=addRevenue;
    if(byId('finishShiftBtn'))byId('finishShiftBtn').onclick=finishShift;
    const refresh=byId('outsideRevenueRefresh');if(refresh&&!refresh.dataset.bankBound){refresh.dataset.bankBound='1';refresh.addEventListener('click',()=>setTimeout(patchOutside,120))}
    if(active)renderActive();refreshSummary();setTimeout(patchOutside,250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindBanks);else bindBanks();
})();

// Divide active-shift activity into separate revenue categories for easier checking.
(function(){
  const MANAGER_API='https://dinqlgaveujdeyisgpty.supabase.co/functions/v1/saovang-manager-api';
  const byId=id=>document.getElementById(id);
  const categories=[
    {key:'transfer',totalKey:'transfer',label:'OCB'},
    {key:'bidv',totalKey:'bidv',label:'BIDV'},
    {key:'cash',totalKey:'cash',label:'Tiền mặt'},
    {key:'courtRevenue',totalKey:'courtRevenue',label:'Doanh thu sân'},
    {key:'waterRevenue',totalKey:'waterRevenue',label:'Doanh thu nước'}
  ];

  function addStyles(){
    if(document.getElementById('svRevenueGroupStyle'))return;
    const style=document.createElement('style');style.id='svRevenueGroupStyle';
    style.textContent=`
      .sv-revenue-groups{display:grid;gap:12px;margin-top:8px}
      .sv-revenue-group{border:1px solid rgba(15,118,110,.18);border-radius:14px;overflow:hidden;background:rgba(255,255,255,.72)}
      .sv-revenue-group-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;background:rgba(15,118,110,.07)}
      .sv-revenue-group-head span{font-weight:800}
      .sv-revenue-group-head strong{font-size:17px}
      .sv-revenue-group-body{display:grid}
      .sv-revenue-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 13px;border-top:1px solid rgba(15,118,110,.10)}
      .sv-revenue-item:first-child{border-top:0}
      .sv-revenue-item-main{min-width:0;display:grid;gap:2px}
      .sv-revenue-item-main b{font-size:14px}
      .sv-revenue-item-main small{opacity:.72}
      .sv-revenue-empty{padding:10px 13px;opacity:.62;font-size:13px}
      .sv-revenue-delete{white-space:nowrap}
      .sv-revenue-note{font-size:12px;opacity:.66;padding:2px 2px 0}
    `;
    document.head.appendChild(style);
  }

  function entryDetail(e){
    const p=[];
    if(Number(e?.transfer||0))p.push(`OCB ${money(e.transfer)}`);
    if(Number(e?.bidv||0))p.push(`BIDV ${money(e.bidv)}`);
    if(Number(e?.cash||0))p.push(`Tiền mặt ${money(e.cash)}`);
    if(Number(e?.courtRevenue||0))p.push(`Sân ${money(e.courtRevenue)}`);
    if(Number(e?.waterRevenue||0))p.push(`Nước ${money(e.waterRevenue)}`);
    return p.join(' · ');
  }

  async function deleteEntry(id){
    const e=(active?.entries||[]).find(x=>String(x.id)===String(id));
    if(!e)return toast('Không tìm thấy khoản doanh thu');
    if(!confirm(`Xóa lần nhập này?\n${entryDetail(e)}\n\nNếu lần nhập có nhiều mục, tất cả mục của lần nhập đó sẽ được xóa.`))return;
    try{
      let d;
      if(typeof isOwner==='function'&&isOwner()){
        const o=typeof owner==='function'?owner():null;
        if(!o?.token)return toast('Không xác định được quyền của nhân viên trong ca');
        d=await activeApi({action:'public_delete_entry',entryId:String(id),token:o.token});
      }else{
        const pin=prompt('Nhập PIN quản lý để xóa khoản trong ca');
        if(pin===null)return;
        if(!pin.trim())return toast('Chưa nhập PIN quản lý');
        const r=await fetch(MANAGER_API,{method:'POST',headers:{'Content-Type':'application/json','x-manager-pin':pin.trim()},body:JSON.stringify({action:'delete_active_revenue',entryId:String(id)})});
        d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.error||`Lỗi ${r.status}`);
      }
      active=rowToActive(d.active);renderActive();await refreshSummary();toast('Đã xóa lần nhập và cập nhật tổng');
    }catch(err){toast(err.message||'Không xóa được doanh thu')}
  }

  function renderGroups(){
    if(!active)return;
    const list=byId('activeEntries'),empty=byId('activeEntriesEmpty');
    if(!list)return;
    addStyles();
    const entries=Array.isArray(active.entries)?active.entries:[];
    if(!entries.length){list.innerHTML='';if(empty)empty.classList.remove('hidden');return}
    if(empty)empty.classList.add('hidden');
    const totals=active.totals||{};
    list.innerHTML=`<div class="sv-revenue-groups">${categories.map(c=>{
      const items=entries.filter(e=>Number(e?.[c.key]||0)>0);
      const total=Number(totals?.[c.totalKey]||items.reduce((s,e)=>s+Number(e?.[c.key]||0),0));
      return `<section class="sv-revenue-group">
        <div class="sv-revenue-group-head"><span>${c.label}</span><strong>${money(total)}</strong></div>
        <div class="sv-revenue-group-body">${items.length?items.map(e=>`<div class="sv-revenue-item">
          <div class="sv-revenue-item-main"><b>${money(e[c.key])}</b><small>${esc(vnTime(e.at))} · ${esc(e.employee||active.employee)}</small></div>
          <button class="btn danger mini sv-revenue-delete" type="button" data-sv-group-delete="${esc(e.id)}">Xóa lần nhập</button>
        </div>`).join(''):`<div class="sv-revenue-empty">Chưa có khoản nào.</div>`}</div>
      </section>`;
    }).join('')}</div><div class="sv-revenue-note">Mỗi lần nhập được xếp vào đúng từng mục doanh thu. Nếu một lần nhập có nhiều mục, nút “Xóa lần nhập” sẽ xóa toàn bộ lần nhập đó.</div>`;
    list.querySelectorAll('[data-sv-group-delete]').forEach(b=>b.onclick=()=>deleteEntry(b.dataset.svGroupDelete));
  }

  const previous=typeof renderActive==='function'?renderActive:null;
  if(previous){
    renderActive=function(){previous();renderGroups()};
  }
  if(active)renderActive();
})();
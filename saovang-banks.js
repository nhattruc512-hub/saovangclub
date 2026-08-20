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
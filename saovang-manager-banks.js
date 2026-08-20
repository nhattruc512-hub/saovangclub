// Keep Sao Vang manager totals consistent with the employee app bank split.
(function(){
  const byId=id=>document.getElementById(id);
  function mount(){
    const a=byId('aTransfer');if(a){const span=a.parentElement?.querySelector('span');if(span)span.textContent='OCB'}
    if(a&&!byId('aBidv')){const d=document.createElement('div');d.className='stat';d.innerHTML='<span>BIDV</span><b id="aBidv">0 ₫</b>';a.parentElement?.insertAdjacentElement('afterend',d)}
    const s=byId('sTransfer');if(s){const span=s.parentElement?.querySelector('span');if(span)span.textContent='OCB'}
    if(s&&!byId('sBidv')){const d=document.createElement('div');d.className='stat';d.innerHTML='<span>BIDV</span><b id="sBidv">0 ₫</b>';s.parentElement?.insertAdjacentElement('afterend',d)}
  }
  entryParts=function(e){const p=[];if(e?.transfer)p.push(`OCB ${money(e.transfer)}`);if(e?.bidv)p.push(`BIDV ${money(e.bidv)}`);if(e?.cash)p.push(`TM ${money(e.cash)}`);if(e?.courtRevenue)p.push(`Sân ${money(e.courtRevenue)}`);if(e?.waterRevenue)p.push(`Nước ${money(e.waterRevenue)}`);return p.join(' · ')};
  const oldActive=renderActive;
  renderActive=function(a){mount();oldActive(a);if(!a)return;const t=a.totals||{};if(byId('aTransfer'))byId('aTransfer').textContent=money(t.transfer||0);if(byId('aBidv'))byId('aBidv').textContent=money(t.bidv||0)};
  renderRevenue=function(date,hist,outside,a){
    mount();let ocb=0,bidv=0,cash=0,court=0,water=0;
    for(const r of hist){ocb+=+r.transfer||0;bidv+=+r.bidv||0;cash+=+r.cash||0;court+=+r.court_revenue||0;water+=+r.water_revenue||0}
    for(const r of outside){ocb+=+r.transfer||0;bidv+=+r.bidv||0;cash+=+r.cash||0;court+=+r.court_revenue||0;water+=+r.water_revenue||0}
    if(a&&String(a.date_key)===String(date)){const t=a.totals||{};ocb+=+t.transfer||0;bidv+=+t.bidv||0;cash+=+t.cash||0;court+=+t.courtRevenue||0;water+=+t.waterRevenue||0}
    if(byId('sTransfer'))byId('sTransfer').textContent=money(ocb);if(byId('sBidv'))byId('sBidv').textContent=money(bidv);if(byId('sCash'))byId('sCash').textContent=money(cash);if(byId('sCourt'))byId('sCourt').textContent=money(court);if(byId('sWater'))byId('sWater').textContent=money(water);if(byId('sCollected'))byId('sCollected').textContent=money(ocb+bidv+cash);if(byId('sRevenue'))byId('sRevenue').textContent=money(court+water);if(byId('sDiff'))byId('sDiff').textContent=money(ocb+bidv+cash-court-water);
  };
  const oldHistory=renderHistory;
  renderHistory=function(rows){oldHistory(rows);const dom=byId('historyList')?.querySelectorAll('.row')||[];(rows||[]).forEach((r,i)=>{const small=dom[i]?.querySelector('.row-main small');if(small)small.textContent=`OCB ${money(r.transfer||0)} · BIDV ${money(r.bidv||0)} · TM ${money(r.cash||0)} · Thu ${money(r.collected_total)} · Chênh lệch ${money(r.difference)}`})};
  mount();
})();
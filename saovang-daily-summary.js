// Sao Vang: daily summary counts ONLY revenue recorded inside shifts.
// Sources: completed shift history + the single active/reopened shift for the selected date.
// Outside-shift revenue entries are intentionally excluded.
(function(){
  const byId=id=>document.getElementById(id);
  let requestSeq=0;

  function amount(v){
    const n=Number(v);
    return Number.isFinite(n)?Math.trunc(n):0;
  }

  function show(id,value){
    const node=byId(id);
    if(node)node.textContent=money(value);
  }

  function clarifyLabel(){
    const card=byId('summarySection');
    const title=card?.querySelector('.head h2');
    if(title)title.textContent='Doanh thu trong ca theo ngày';
    const grandLabel=card?.querySelector('.grand span');
    if(grandLabel)grandLabel.textContent='Tổng doanh thu sân + nước';
    if(card&&!byId('svShiftOnlySummaryNote')){
      const note=document.createElement('div');
      note.id='svShiftOnlySummaryNote';
      note.className='muted';
      note.style.marginTop='8px';
      note.textContent='Chỉ tính các khoản thuộc ca; không cộng doanh thu ngoài ca.';
      card.querySelector('.head')?.insertAdjacentElement('afterend',note);
    }
    if(card&&!byId('svDailyReconcile')){
      const box=document.createElement('div');
      box.id='svDailyReconcile';
      box.className='totals';
      box.style.marginTop='10px';
      box.innerHTML='<div><span>Tổng tiền thu</span><b id="sumCollectedDay">0 ₫</b></div><div><span>Chênh lệch</span><b id="sumDiffDay">0 ₫</b></div>';
      card.appendChild(box);
    }
  }

  async function refreshShiftOnlySummary(){
    clarifyLabel();
    const seq=++requestSeq;
    const date=byId('summaryDate')?.value||localDateKey();
    try{
      const [history,activeRows]=await Promise.all([
        rest(`staff_shift_history?select=id,transfer,bidv,cash,court_revenue,water_revenue&date_key=eq.${encodeURIComponent(date)}`),
        rest('staff_active_shift?select=id,date_key,totals,edit_mode&singleton_id=eq.1')
      ]);
      if(seq!==requestSeq)return;

      const sum={ocb:0,bidv:0,cash:0,court:0,water:0};
      const historyIds=new Set();
      (history||[]).forEach(row=>{
        historyIds.add(String(row.id||''));
        sum.ocb+=amount(row.transfer);
        sum.bidv+=amount(row.bidv);
        sum.cash+=amount(row.cash);
        sum.court+=amount(row.court_revenue);
        sum.water+=amount(row.water_revenue);
      });

      // A reopened historical shift is moved out of history while editing.
      // Include the active row only for this date, and guard by id against accidental double-counting.
      const activeRow=activeRows?.[0];
      if(activeRow&&String(activeRow.date_key)===String(date)&&!historyIds.has(String(activeRow.id||''))){
        const totals=activeRow.totals||{};
        sum.ocb+=amount(totals.transfer);
        sum.bidv+=amount(totals.bidv);
        sum.cash+=amount(totals.cash);
        sum.court+=amount(totals.courtRevenue);
        sum.water+=amount(totals.waterRevenue);
      }

      const collected=sum.ocb+sum.bidv+sum.cash;
      const revenue=sum.court+sum.water;
      const difference=collected-revenue;

      show('sumTransfer',sum.ocb);
      show('sumBidv',sum.bidv);
      show('sumCash',sum.cash);
      show('sumCourt',sum.court);
      show('sumWater',sum.water);
      show('sumRevenue',revenue);
      show('sumCollectedDay',collected);
      show('sumDiffDay',difference);
    }catch(err){
      console.error('Không tính được tổng doanh thu trong ca',err);
    }
  }

  // Replace all later refreshes with the shift-only formula.
  try{refreshSummary=refreshShiftOnlySummary}catch{}
  window.refreshSummary=refreshShiftOnlySummary;

  const dateInput=byId('summaryDate');
  if(dateInput&&!dateInput.dataset.svShiftOnlySummary){
    dateInput.dataset.svShiftOnlySummary='1';
    dateInput.addEventListener('change',event=>{
      event.stopImmediatePropagation();
      refreshShiftOnlySummary();
    },true);
  }

  // Recalculate after startup to win over any legacy request already in flight.
  refreshShiftOnlySummary();
  setTimeout(refreshShiftOnlySummary,300);
  setTimeout(refreshShiftOnlySummary,1200);
})();

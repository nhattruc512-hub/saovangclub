// Manager view: show complete totals for every completed shift.
(function(){
  if(typeof renderHistory!=='function')return;
  renderHistory=function(rows){
    $('historyEmpty').classList.toggle('hidden',rows.length>0);
    $('historyList').innerHTML=rows.map(r=>{
      const transfer=Number(r.transfer||0),cash=Number(r.cash||0),court=Number(r.court_revenue||0),water=Number(r.water_revenue||0);
      const collected=Number(r.collected_total||transfer+cash),revenue=Number(r.revenue_total||court+water),diff=Number(r.difference||collected-revenue);
      return `<div class="row"><div class="row-main"><b>${esc(r.shift_name)} · ${esc(r.employee)}</b><span>${vnTime(r.start_at)} → ${vnTime(r.end_at)}</span><small>Chuyển khoản ${money(transfer)} · Tiền mặt ${money(cash)}</small><small>Doanh thu sân ${money(court)} · Doanh thu nước ${money(water)}</small><small><b>Tổng thu ${money(collected)} · Tổng doanh thu ${money(revenue)} · Chênh lệch ${money(diff)}</b></small></div><div class="actions"><button class="btn danger" onclick="deleteShift('${esc(r.id)}')">Xóa</button></div></div>`;
    }).join('');
  };
})();

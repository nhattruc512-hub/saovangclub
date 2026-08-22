// Sao Vang: add a manager-authorized "Chỉnh sửa" action to completed shifts.
(function(){
  const byId=id=>document.getElementById(id);
  const previous=typeof renderHistory==='function'?renderHistory:null;
  if(!previous)return;

  renderHistory=function(){
    previous();
    const shift=byId('historyShift')?.value||'all';
    const list=(historyRows||[]).filter(r=>shift==='all'||r.shift_key===shift);
    const rows=byId('historyList')?.querySelectorAll(':scope > .row')||[];
    rows.forEach((row,i)=>{
      const item=list[i];
      if(!item||row.querySelector('[data-history-reopen]'))return;
      const actions=document.createElement('div');
      actions.className='row-actions';
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='btn secondary mini';
      btn.textContent='Chỉnh sửa';
      btn.dataset.historyReopen=String(item.id);
      btn.addEventListener('click',()=>{
        if(typeof window.reopenHistoryShift==='function')window.reopenHistoryShift(item.id);
        else toast('Chức năng chỉnh sửa ca chưa sẵn sàng');
      });
      actions.appendChild(btn);
      row.appendChild(actions);
    });
  };

  if(Array.isArray(historyRows))renderHistory();
})();

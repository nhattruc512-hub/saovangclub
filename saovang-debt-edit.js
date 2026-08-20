// Sao Vang debt editing: allow staff to edit debt details and add more debt.
(function(){
  const byId=id=>document.getElementById(id);

  async function editDebt(id){
    const current=(debtRows||[]).find(x=>String(x.id)===String(id));
    if(!current)return toast('Không tìm thấy khách nợ');

    const reasonRaw=prompt(`Chỉnh nội dung nợ của ${current.customer}:`,current.reason||'');
    if(reasonRaw===null)return;
    const reason=reasonRaw.trim();
    if(!reason)return toast('Nội dung nợ không được để trống');

    const raw=prompt(`${current.customer} đang nợ ${money(current.amount)}.\nNhập số tiền nợ thêm (để trống hoặc 0 nếu chỉ sửa nội dung):`,'');
    if(raw===null)return;
    const extra=parseMoney(raw);

    if(reason===String(current.reason||'').trim()&&!extra)return toast('Không có thay đổi nào');

    try{
      const rows=await rest(`customer_debts?select=id,customer,amount,reason&id=eq.${encodeURIComponent(id)}&limit=1`);
      const latest=rows?.[0];
      if(!latest)return toast('Khoản nợ này không còn tồn tại');
      const nextAmount=Number(latest.amount||0)+extra;
      await rest(`customer_debts?id=eq.${encodeURIComponent(id)}`,{
        method:'PATCH',
        headers:{Prefer:'return=minimal'},
        body:JSON.stringify({amount:nextAmount,reason})
      });
      await refreshDebts();
      if(extra)toast(`Đã sửa nội dung và cộng thêm ${money(extra)} · Tổng nợ ${money(nextAmount)}`);
      else toast('Đã cập nhật nội dung khách nợ');
    }catch(e){
      console.error(e);
      toast('Không cập nhật được khách nợ');
    }
  }

  renderDebts=function(){
    const total=(debtRows||[]).reduce((a,x)=>a+Number(x.amount||0),0);
    if(byId('debtTotal'))byId('debtTotal').textContent=money(total);
    byId('debtEmpty')?.classList.toggle('hidden',(debtRows||[]).length>0);
    if(!byId('debtList'))return;

    byId('debtList').innerHTML=(debtRows||[]).map(d=>`<div class="row">
      <div class="row-main">
        <b>${esc(d.customer)} · ${money(d.amount)}</b>
        <span>${esc(d.reason)} · ${esc(d.employee||'')} · ${esc(d.shift_name||'Ngoài ca')}</span>
        <small>${vnDate(d.created_at)} ${vnTime(d.created_at)}</small>
      </div>
      <div class="row-actions">
        <button class="btn secondary mini" type="button" data-debt-edit="${esc(d.id)}">Chỉnh sửa</button>
        <button class="btn danger mini" type="button" data-debt-delete="${esc(d.id)}">Xóa</button>
      </div>
    </div>`).join('');

    document.querySelectorAll('[data-debt-edit]').forEach(b=>b.onclick=()=>editDebt(b.dataset.debtEdit));
    document.querySelectorAll('[data-debt-delete]').forEach(b=>b.onclick=()=>deleteDebt(b.dataset.debtDelete));
  };

  if(Array.isArray(debtRows))renderDebts();
})();

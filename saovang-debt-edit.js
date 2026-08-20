// Sao Vang debt editing: allow staff to add more debt to an existing customer.
(function(){
  const byId=id=>document.getElementById(id);

  async function addMoreDebt(id){
    const current=(debtRows||[]).find(x=>String(x.id)===String(id));
    if(!current)return toast('Không tìm thấy khách nợ');

    const raw=prompt(`${current.customer} đang nợ ${money(current.amount)}.\nNhập số tiền nợ thêm:`,'');
    if(raw===null)return;
    const extra=parseMoney(raw);
    if(!extra)return toast('Nhập số tiền nợ thêm lớn hơn 0');

    try{
      // Re-read the latest amount before updating so two devices do not overwrite each other.
      const rows=await rest(`customer_debts?select=id,customer,amount&id=eq.${encodeURIComponent(id)}&limit=1`);
      const latest=rows?.[0];
      if(!latest)return toast('Khoản nợ này không còn tồn tại');
      const nextAmount=Number(latest.amount||0)+extra;
      await rest(`customer_debts?id=eq.${encodeURIComponent(id)}`,{
        method:'PATCH',
        headers:{Prefer:'return=minimal'},
        body:JSON.stringify({amount:nextAmount})
      });
      await refreshDebts();
      toast(`Đã cộng thêm ${money(extra)} · Tổng nợ ${money(nextAmount)}`);
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

    document.querySelectorAll('[data-debt-edit]').forEach(b=>b.onclick=()=>addMoreDebt(b.dataset.debtEdit));
    document.querySelectorAll('[data-debt-delete]').forEach(b=>b.onclick=()=>deleteDebt(b.dataset.debtDelete));
  };

  if(Array.isArray(debtRows))renderDebts();
})();

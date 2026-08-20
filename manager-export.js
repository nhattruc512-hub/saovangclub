// Manager-only export tools for attendance and revenue history.
(function(){
  const $id=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');

  function mount(){
    const panel=$id('managerPanel');
    if(!panel||$id('managerExportSection'))return;
    const section=document.createElement('div');
    section.id='managerExportSection';
    section.className='manager-section';
    section.innerHTML=`
      <div class="kicker">XUẤT BÁO CÁO</div>
      <p class="muted">Chọn phạm vi theo ngày, tháng hoặc năm rồi xuất file CSV để mở bằng Excel.</p>
      <div class="filters" style="margin-top:10px">
        <select id="exportPeriodType" class="input">
          <option value="day">Theo ngày</option>
          <option value="month">Theo tháng</option>
          <option value="year">Theo năm</option>
        </select>
        <input id="exportPeriodValue" type="date" class="input">
      </div>
      <div class="filters" style="margin-top:10px">
        <button id="exportAttendanceBtn" type="button" class="btn primary">XUẤT LỊCH SỬ CHẤM CÔNG</button>
        <button id="exportRevenueBtn" type="button" class="btn primary">XUẤT LỊCH SỬ DOANH THU</button>
      </div>
      <div id="exportHint" class="muted" style="margin-top:8px"></div>`;
    panel.appendChild(section);
    $id('exportPeriodType').addEventListener('change',syncInput);
    $id('exportAttendanceBtn').addEventListener('click',exportAttendance);
    $id('exportRevenueBtn').addEventListener('click',exportRevenue);
    syncInput();
  }

  function syncInput(){
    const type=$id('exportPeriodType')?.value||'day';
    const input=$id('exportPeriodValue');if(!input)return;
    const now=new Date();
    if(type==='day'){
      input.type='date';
      input.value=localDateKey(now);
    }else if(type==='month'){
      input.type='month';
      input.value=`${now.getFullYear()}-${pad(now.getMonth()+1)}`;
    }else{
      input.type='number';
      input.min='2024';input.max='2100';input.step='1';
      input.value=String(now.getFullYear());
    }
    updateHint();
  }

  function periodRange(){
    const type=$id('exportPeriodType')?.value||'day';
    const raw=String($id('exportPeriodValue')?.value||'').trim();
    if(type==='day'){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw new Error('Chọn ngày cần xuất');
      return {start:raw,end:raw,label:raw};
    }
    if(type==='month'){
      if(!/^\d{4}-\d{2}$/.test(raw))throw new Error('Chọn tháng cần xuất');
      const [y,m]=raw.split('-').map(Number);const last=new Date(y,m,0).getDate();
      return {start:`${y}-${pad(m)}-01`,end:`${y}-${pad(m)}-${pad(last)}`,label:raw};
    }
    const y=Number(raw);
    if(!Number.isInteger(y)||y<2024||y>2100)throw new Error('Nhập năm hợp lệ');
    return {start:`${y}-01-01`,end:`${y}-12-31`,label:String(y)};
  }

  function updateHint(){
    const el=$id('exportHint');if(!el)return;
    try{const p=periodRange();el.textContent=`Phạm vi xuất: ${p.start}${p.start===p.end?'':` đến ${p.end}`}.`}
    catch{el.textContent='Chọn thời gian cần xuất.'}
  }

  function csvCell(v){
    if(v===null||v===undefined)return '""';
    const s=String(v).replace(/"/g,'""');return `"${s}"`;
  }
  function downloadCsv(filename,headers,rows){
    const lines=[headers,...rows].map(r=>r.map(csvCell).join(','));
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function viStatus(r){return (r.punch_type||'in')==='out'?'Chấm công ra':(r.status==='late'?`Trễ ${Number(r.late_minutes||0)} phút`:'Đúng giờ')}
  function inRange(dateKey,p){return String(dateKey)>=p.start&&String(dateKey)<=p.end}

  async function exportAttendance(){
    if(typeof managerPin==='undefined'||!managerPin)return toast('Hãy mở Quản Lý trước');
    let p;try{p=periodRange()}catch(e){return toast(e.message)}
    const btn=$id('exportAttendanceBtn');btn.disabled=true;
    try{
      const rows=await rest(`staff_attendance_records?select=*&date_key=gte.${encodeURIComponent(p.start)}&date_key=lte.${encodeURIComponent(p.end)}&order=punched_at.asc`)||[];
      if(!rows.length)return toast('Không có dữ liệu chấm công trong thời gian đã chọn');
      const out=rows.map(r=>[
        r.date_key,
        vnTime(r.punched_at),
        (r.punch_type||'in')==='out'?'Chấm công ra':'Chấm công vào',
        r.employee||'',
        r.shift_name||'',
        `${r.scheduled_start||''} - ${r.scheduled_end||''}`,
        viStatus(r),
        Number(r.late_minutes||0),
        r.latitude??'',
        r.longitude??'',
        r.accuracy_m??''
      ]);
      downloadCsv(`971-cham-cong-${p.label}.csv`,['Ngày','Giờ','Loại chấm công','Nhân viên','Ca','Giờ ca','Trạng thái','Phút trễ','Vĩ độ','Kinh độ','Độ chính xác GPS (m)'],out);
      toast(`Đã xuất ${rows.length} dòng chấm công`);
    }catch(e){console.error(e);toast('Không xuất được lịch sử chấm công')}
    finally{btn.disabled=false}
  }

  function revenueLine(date,time,employee,shift,source,transfer,cash,court,water,note=''){
    transfer=Number(transfer||0);cash=Number(cash||0);court=Number(court||0);water=Number(water||0);
    return [date,time,employee||'',shift||'',source,transfer,cash,court,water,transfer+cash,court+water,(transfer+cash)-(court+water),note||''];
  }

  async function exportRevenue(){
    if(typeof managerPin==='undefined'||!managerPin)return toast('Hãy mở Quản Lý trước');
    let p;try{p=periodRange()}catch(e){return toast(e.message)}
    const btn=$id('exportRevenueBtn');btn.disabled=true;
    try{
      const [hist,outside,act]=await Promise.all([
        rest(`staff_shift_history?select=*&date_key=gte.${encodeURIComponent(p.start)}&date_key=lte.${encodeURIComponent(p.end)}&order=start_at.asc`),
        rest(`staff_revenue_entries?select=*&date_key=gte.${encodeURIComponent(p.start)}&date_key=lte.${encodeURIComponent(p.end)}&order=created_at.asc`),
        rest('staff_active_shift?select=*&singleton_id=eq.1')
      ]);
      const out=[];
      (hist||[]).forEach(r=>{
        const entries=Array.isArray(r.entries)?r.entries:[];
        if(entries.length){
          entries.slice().reverse().forEach(e=>out.push(revenueLine(r.date_key,vnTime(e.at||r.start_at),e.employee||r.employee,r.shift_name,'Trong ca',e.transfer,e.cash,e.courtRevenue,e.waterRevenue,'')));
        }else{
          out.push(revenueLine(r.date_key,vnTime(r.end_at||r.start_at),r.employee,r.shift_name,'Tổng ca',r.transfer,r.cash,r.court_revenue,r.water_revenue,r.note||''));
        }
      });
      (outside||[]).forEach(r=>out.push(revenueLine(r.date_key,vnTime(r.created_at),r.employee,r.shift_name||'Ngoài ca','Ngoài ca',r.transfer,r.cash,r.court_revenue,r.water_revenue,'')));
      const current=act?.[0];
      if(current&&inRange(current.date_key,p)){
        const entries=Array.isArray(current.entries)?current.entries:[];
        entries.slice().reverse().forEach(e=>out.push(revenueLine(current.date_key,vnTime(e.at||current.start_at),e.employee||current.employee,current.shift_name,'Ca đang hoạt động',e.transfer,e.cash,e.courtRevenue,e.waterRevenue,'')));
      }
      out.sort((a,b)=>`${a[0]} ${a[1]}`.localeCompare(`${b[0]} ${b[1]}`));
      if(!out.length)return toast('Không có dữ liệu doanh thu trong thời gian đã chọn');
      downloadCsv(`971-doanh-thu-${p.label}.csv`,['Ngày','Giờ','Nhân viên','Ca','Nguồn','Chuyển khoản','Tiền mặt','Doanh thu sân','Doanh thu nước','Tổng tiền thu','Tổng doanh thu','Chênh lệch','Ghi chú'],out);
      toast(`Đã xuất ${out.length} dòng doanh thu`);
    }catch(e){console.error(e);toast('Không xuất được lịch sử doanh thu')}
    finally{btn.disabled=false}
  }

  function boot(){mount();const input=$id('exportPeriodValue');if(input)input.addEventListener('change',updateHint)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
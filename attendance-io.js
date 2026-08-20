(function(){
  const el=id=>document.getElementById(id);
  const sameName=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();

  function checkInShift(){
    const p=vnClockParts(),mins=p.h*60+p.m;
    let key='';
    if(mins>=SHIFTS.ca1.start&&mins<=SHIFTS.ca1.end)key='ca1';
    else if(mins>SHIFTS.ca1.end&&mins<17*60)key='ca2';
    else if(mins>=17*60&&mins<=SHIFTS.ca3.end)key='ca3';
    if(!key)return null;
    const s=SHIFTS[key];
    const late=mins>s.start+1;
    return{key,...s,late,lateMinutes:late?mins-s.start:0,early:mins<s.start};
  }

  attendanceShift=function(){return checkInShift()};

  function getPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('Thiết bị không hỗ trợ vị trí'));
      navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0});
    });
  }

  async function dayRows(date){
    return await rest(`staff_attendance_records?select=*&date_key=eq.${encodeURIComponent(date)}&order=punched_at.desc`)||[];
  }

  async function punch(type){
    const employee=el('attendanceEmployee')?.value.trim();
    if(!employee)return toast('Nhập tên nhân viên');
    rememberEmployee(employee);
    const date=localDateKey();
    let shift=null;
    let late=false;
    let lateMinutes=0;

    try{
      const rows=await dayRows(date);
      if(type==='in'){
        shift=checkInShift();
        if(!shift)return toast('Ngoài giờ chấm công vào');
        if(rows.some(r=>sameName(r.employee,employee)&&r.shift_key===shift.key&&(r.punch_type||'in')==='in'))return toast(`Đã chấm công vào ${shift.name} hôm nay`);
        late=!!shift.late;
        lateMinutes=Number(shift.lateMinutes||0);
      }else{
        const mine=rows.filter(r=>sameName(r.employee,employee));
        const openIn=mine.find(r=>{
          if((r.punch_type||'in')!=='in')return false;
          return !mine.some(o=>o.shift_key===r.shift_key&&o.punch_type==='out');
        });
        if(!openIn)return toast('Chưa có chấm công vào để chấm công ra');
        shift={key:openIn.shift_key,name:openIn.shift_name,time:`${String(openIn.scheduled_start||'').slice(0,5)} - ${String(openIn.scheduled_end||'').slice(0,5)}`};
      }

      const btn=type==='in'?el('attendanceInBtn'):el('attendanceOutBtn');
      if(btn)btn.disabled=true;
      const pos=await getPosition();
      const now=new Date();
      const row={
        employee,
        punched_at:now.toISOString(),
        date_key:date,
        shift_key:shift.key,
        shift_name:shift.name,
        scheduled_start:shift.time.split(' - ')[0],
        scheduled_end:shift.time.split(' - ')[1],
        status:type==='in'&&late?'late':'on_time',
        late_minutes:type==='in'?lateMinutes:0,
        latitude:pos.coords.latitude,
        longitude:pos.coords.longitude,
        accuracy_m:pos.coords.accuracy,
        punch_type:type
      };
      await rest('staff_attendance_records',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(row)});
      toast(type==='in'?`Đã chấm công vào ${shift.name}`:`Đã chấm công ra ${shift.name}`);
      await refreshAttendance();
    }catch(e){
      const m=String(e?.message||'');
      if(m.includes('duplicate'))toast(type==='in'?'Đã chấm công vào ca này hôm nay':'Đã chấm công ra ca này hôm nay');
      else if(e?.code===1)toast('Bạn chưa cấp quyền vị trí');
      else toast(m||'Không lưu được chấm công');
    }finally{
      const btn=type==='in'?el('attendanceInBtn'):el('attendanceOutBtn');
      if(btn)btn.disabled=false;
    }
  }

  renderAttendance=function(){
    const list=attendanceRows||[];
    el('attendanceEmpty')?.classList.toggle('hidden',list.length>0);
    if(!el('attendanceList'))return;
    el('attendanceList').innerHTML=list.map(r=>{
      const type=(r.punch_type||'in')==='out'?'CHẤM CÔNG RA':'CHẤM CÔNG VÀO';
      const status=(r.punch_type||'in')==='out'?'Đã ra':(r.status==='late'?`Trễ ${r.late_minutes||0} phút`:'Đúng giờ');
      let loc='Địa điểm GPS không có dữ liệu';
      if(r.latitude!=null&&r.longitude!=null){
        const lat=Number(r.latitude).toFixed(6),lng=Number(r.longitude).toFixed(6);
        loc=`Địa điểm: ${lat}, ${lng} · <a href="https://www.google.com/maps?q=${encodeURIComponent(lat+','+lng)}" target="_blank" rel="noopener">Xem bản đồ</a>`;
      }
      return `<div class="row"><div class="row-main"><b>${esc(r.employee)} · ${esc(r.shift_name)} · ${type}</b><span>${vnDate(r.punched_at)} · ${vnTime(r.punched_at)} · ${esc(status)}</span><small>${loc}</small></div></div>`;
    }).join('');
  };

  function boot(){
    const inBtn=el('attendanceInBtn'),outBtn=el('attendanceOutBtn');
    if(inBtn)inBtn.onclick=()=>punch('in');
    if(outBtn)outBtn.onclick=()=>punch('out');
    if(typeof refreshAttendance==='function')refreshAttendance();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
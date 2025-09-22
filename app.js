 // ====== تخزين بسيط ======
    const DB_KEY = 'qb-ledg-db-v1';
    const db = {
      load(){ 
        try{ 
          return JSON.parse(localStorage.getItem(DB_KEY)) || {advances:[], expenses:[]}; 
        } catch{ 
          return {advances:[], expenses:[]}; 
        } 
      },
      save(data){ 
        localStorage.setItem(DB_KEY, JSON.stringify(data)); 
      },
      uid(){ 
        return 'id-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); 
      }
    };
    const state = db.load();

    // ====== رقم تتبّع تلقائي بصيغة CH-YYYY-### ======
// ====== رقم تتبّع تلقائي بصيغة CH-YYYY-### ======
function genNextTrack(){
  const dateStr = (document.querySelector('#adv-date')?.value || new Date().toISOString().slice(0,10));
  const year = dateStr.slice(0,4);
  const prefix = 'CH';
  const re = new RegExp('^' + prefix + '-' + year + '-(\\d{3,})$'); // ✅ إغلاق صحيح
  let max = 0;
  state.advances.forEach(a=>{
    const m=(a.track||'').match(re);
    if(m){ const n=parseInt(m[1],10); if(n>max) max=n; }
  });
  const next = String(max+1).padStart(3,'0');
  return `${prefix}-${year}-${next}`;
}


    // ====== أدوات ======
    const $ = sel => document.querySelector(sel);
    const fmt = n => Number(n).toLocaleString('ar-SA',{minimumFractionDigits:2,maximumFractionDigits:2});

    function sumExpensesForAdvance(advId){
      return state.expenses.filter(x=>x.advanceId===advId).reduce((a,b)=>a+Number(b.amount||0),0);
    }
    
    function advanceRemaining(adv){
      return Number(adv.amount) - sumExpensesForAdvance(adv.id);
    }
    
    function refreshSummary(){
      const total = state.advances.reduce((a,b)=>a+Number(b.amount||0),0);
      const spent = state.expenses.reduce((a,b)=>a+Number(b.amount||0),0);
      const remain = total - spent;
      
      $('#totalAdvances').textContent = fmt(total);
      $('#totalSpent').textContent = fmt(spent);
      $('#totalRemaining').textContent = fmt(remain);
      
      // Update color based on remaining amount
      const remainingEl = $('#totalRemaining');
      remainingEl.className = 'summary-remaining';
      if(remain < 0) remainingEl.classList.add('text-danger');
      else if(remain === 0) remainingEl.classList.add('text-warning');
      else remainingEl.classList.add('text-success');
    }

    // ====== تبويبات ======
    document.querySelectorAll('.nav-tab').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p=>p.hidden=true);
        btn.classList.add('active');
        const id = '#tab-'+btn.dataset.tab; 
        $(id).hidden=false;
        renderAll();
      });
    });

    function fillAdvanceSelects(){
      const opts = state.advances.map(a=>({
        id: a.id,
        label: `${a.track} — ${a.title} (المتبقي ${fmt(advanceRemaining(a))})`
      }));
      
      ['#exp-advance','#filterAdvance','#reportAdvance'].forEach(sel=>{
        const s=$(sel); 
        if(!s) return; 
        s.innerHTML='';
        
        if(sel==='#filterAdvance') {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = '— كل العُهد —';
          s.appendChild(option);
        }
        
        opts.forEach(o => {
          const option = document.createElement('option');
          option.value = o.id;
          option.textContent = o.label;
          s.appendChild(option);
        });
      });
    }

    // ====== إضافة عُهدة ======
    $('#advanceForm').addEventListener('submit',(e)=>{
      e.preventDefault();
      
      let track=$('#adv-track').value.trim()||genNextTrack();
      const title=$('#adv-title').value.trim();
      const amount=Number($('#adv-amount').value);
      const date=$('#adv-date').value||new Date().toISOString().slice(0,10);
      const notes=$('#adv-notes').value.trim();
      
      if(!title || !(amount>=0)) {
        alert('تحقق من المدخلات');
        return;
      }
      
// Check for duplicate track numbers
const year = date.slice(0,4);
const re = new RegExp('^CH-' + year + '-(\\d{3,})$'); // ✅ إغلاق صحيح
while(state.advances.some(a=>a.track===track)){
  const m = track.match(re); 
  const n = m ? parseInt(m[1],10)+1 : 1; 
  track = `CH-${year}-${String(n).padStart(3,'0')}`;
}

      
      state.advances.push({
        id: db.uid(), 
        track, 
        title, 
        amount, 
        date, 
        notes
      });
      
      db.save(state);
      e.target.reset();
      $('#adv-date').value = date;
      $('#adv-track').value = genNextTrack();
      
      fillAdvanceSelects(); 
      renderAdvTable(); 
      refreshSummary();
      alert('تم حفظ العُهدة');
    });

    // ====== إضافة مصروف ======
    $('#expenseForm').addEventListener('submit',(e)=>{
      e.preventDefault();
      
      const advanceId=$('#exp-advance').value; 
      if(!advanceId) {
        alert('اختر العُهدة');
        return;
      }
      
      const amount=Number($('#exp-amount').value); 
      if(!(amount>0)) {
        alert('أدخل مبلغًا صحيحًا');
        return;
      }
      
      const kind=$('#exp-kind').value; 
      const name=$('#exp-name').value.trim();
      const notes=$('#exp-notes').value.trim(); 
      const date=$('#exp-date').value||new Date().toISOString().slice(0,10);
      
      const adv = state.advances.find(a=>a.id===advanceId); 
      if(!adv) {
        alert('عُهدة غير موجودة');
        return;
      }
      
      const remaining = advanceRemaining(adv);
      if(amount>remaining+1e-9) {
        alert('المبلغ يتجاوز المتبقي في العُهدة');
        return;
      }
      
      const invoiceNo = kind==='invoice' ? ($('#exp-invoice').value||'').trim() : '';
      if(kind==='invoice' && !invoiceNo) {
        alert('أدخل رقم الفاتورة.');
        return;
      }
      
      state.expenses.push({
        id: db.uid(), 
        advanceId, 
        amount, 
        kind, 
        invoiceNo, 
        name, 
        notes, 
        date
      });
      
      db.save(state);
      e.target.reset();
      document.getElementById('invoiceRow').style.display='none';
      
      renderExpTable(); 
      renderAdvTable(); 
      fillAdvanceSelects(); 
      refreshSummary();
      alert('تم تسجيل المصروف');
    });

    // ====== جداول العرض ======
    function renderAdvTable(){
      const q = ($('#searchAdv')?.value||'').trim().toLowerCase();
      const list = state.advances.filter(a=> !q || [a.track,a.title,a.notes].join(' ').toLowerCase().includes(q));
      
      const container = $('#advTableWrap');
      
      if(!list.length){ 
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <h3>لا توجد عُهد مسجلة</h3>
            <p>ابدأ بإضافة عُهدة جديدة من لوحة التحكم</p>
          </div>
        `; 
        return; 
      }
      
      // Desktop table
      const rows = list.map(a=>{
        const spent = sumExpensesForAdvance(a.id); 
        const remaining = a.amount - spent;
        const remClass = remaining>0? 'text-success' : (remaining<0? 'text-danger' : 'text-warning');
        
        return `<tr>
          <td>
            <div style="font-weight: 600;">${a.track}</div>
            <div class="text-muted" style="font-size: 12px;">${a.title}</div>
          </td>
          <td>${fmt(a.amount)}</td>
          <td>${fmt(spent)}</td>
          <td class="${remClass}">${fmt(remaining)}</td>
          <td class="text-muted">${a.date}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" data-act="edit" data-id="${a.id}">تعديل</button>
              <button class="btn btn-danger btn-sm" data-act="del" data-id="${a.id}">حذف</button>
            </div>
          </td>
        </tr>`;
      }).join('');

      // Mobile cards
      const mobileCards = list.map(a=>{
        const spent = sumExpensesForAdvance(a.id); 
        const remaining = a.amount - spent;
        const remClass = remaining>0? 'text-success' : (remaining<0? 'text-danger' : 'text-warning');
        
        return `
          <div class="mobile-card">
            <div class="mobile-card-header">
              <div class="mobile-card-title">${a.title}</div>
              <div class="mobile-card-badge">${a.track}</div>
            </div>
            <div class="mobile-card-grid">
              <div class="mobile-card-item">
                <div class="mobile-card-label">المبلغ</div>
                <div class="mobile-card-value">${fmt(a.amount)}</div>
              </div>
              <div class="mobile-card-item">
                <div class="mobile-card-label">المصروف</div>
                <div class="mobile-card-value">${fmt(spent)}</div>
              </div>
              <div class="mobile-card-item">
                <div class="mobile-card-label">المتبقي</div>
                <div class="mobile-card-value ${remClass}">${fmt(remaining)}</div>
              </div>
              <div class="mobile-card-item">
                <div class="mobile-card-label">التاريخ</div>
                <div class="mobile-card-value">${a.date}</div>
              </div>
            </div>
            <div class="mobile-card-actions">
              <button class="btn btn-secondary btn-sm" data-act="edit" data-id="${a.id}">تعديل</button>
              <button class="btn btn-danger btn-sm" data-act="del" data-id="${a.id}">حذف</button>
            </div>
          </div>
        `;
      }).join('');
      
      container.innerHTML = `
        <div class="table-responsive">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>العُهدة</th>
                  <th>المبلغ</th>
                  <th>المصروف</th>
                  <th>المتبقي</th>
                  <th>التاريخ</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
        <div class="mobile-cards">
          ${mobileCards}
        </div>
      `;

      // Add event listeners
      container.querySelectorAll('button[data-act]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const id = btn.getAttribute('data-id');
          const act= btn.getAttribute('data-act');
          if(act==='del') delAdvance(id);
          if(act==='edit') editAdvance(id);
        });
      });
    }

    function renderExpTable(){
      const q = ($('#searchExp')?.value||'').trim().toLowerCase();
      const filterId = $('#filterAdvance')?.value || '';
      
      let list = state.expenses.slice().sort((a,b)=> (a.date>b.date?-1:1));
      if(filterId) list = list.filter(x=>x.advanceId===filterId);
      if(q) list = list.filter(x=> [x.name,x.notes,x.amount, x.date, x.invoiceNo].join(' ').toLowerCase().includes(q));
      
      const container = $('#expTableWrap');
      
      if(!list.length){ 
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">💳</div>
            <h3>لا توجد مصروفات مسجلة</h3>
            <p>ابدأ بإضافة مصروف جديد من لوحة التحكم</p>
          </div>
        `; 
        return; 
      }
      
      // Desktop table
      const rows = list.map(x=>{
        const adv = state.advances.find(a=>a.id===x.advanceId);
        return `<tr>
          <td>
            <div style="font-weight: 600;">${adv?adv.track:'—'}</div>
            <div class="text-muted" style="font-size: 12px;">${adv?adv.title:'—'}</div>
          </td>
          <td>${x.kind==='invoice'?'فاتورة':'بدون فاتورة'}</td>
          <td>${x.invoiceNo?x.invoiceNo:'—'}</td>
          <td>${x.date}</td>
          <td>${x.name}</td>
          <td style="font-weight: 600;">${fmt(x.amount)}</td>
          <td class="text-muted">${x.notes||''}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" data-act="edit" data-id="${x.id}">تعديل</button>
              <button class="btn btn-danger btn-sm" data-act="del" data-id="${x.id}">حذف</button>
            </div>
          </td>
        </tr>`;
      }).join('');

      // Mobile cards
      const mobileCards = list.map(x=>{
        const adv = state.advances.find(a=>a.id===x.advanceId);
        return `
          <div class="mobile-card">
            <div class="mobile-card-header">
              <div class="mobile-card-title">${x.name}</div>
              <div class="mobile-card-badge">${adv?adv.track:'—'}</div>
            </div>
            <div class="mobile-card-grid">
              <div class="mobile-card-item">
                <div class="mobile-card-label">النوع</div>
                <div class="mobile-card-value">${x.kind==='invoice'?'فاتورة':'بدون فاتورة'}</div>
              </div>
              <div class="mobile-card-item">
                <div class="mobile-card-label">المبلغ</div>
                <div class="mobile-card-value" style="font-weight: 600;">${fmt(x.amount)}</div>
              </div>
              <div class="mobile-card-item">
                <div class="mobile-card-label">التاريخ</div>
                <div class="mobile-card-value">${x.date}</div>
              </div>
              <div class="mobile-card-item">
                <div class="mobile-card-label">رقم الفاتورة</div>
                <div class="mobile-card-value">${x.invoiceNo||'—'}</div>
              </div>
            </div>
            ${x.notes ? `<div style="margin: 12px 0 8px; font-size: 12px; color: var(--text-muted);">${x.notes}</div>` : ''}
            <div class="mobile-card-actions">
              <button class="btn btn-secondary btn-sm" data-act="edit" data-id="${x.id}">تعديل</button>
              <button class="btn btn-danger btn-sm" data-act="del" data-id="${x.id}">حذف</button>
            </div>
          </div>
        `;
      }).join('');
      
      container.innerHTML = `
        <div class="table-responsive">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>العُهدة</th>
                  <th>النوع</th>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>الاسم</th>
                  <th>المبلغ</th>
                  <th>ملاحظات</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
        <div class="mobile-cards">
          ${mobileCards}
        </div>
      `;

      // Add event listeners
      container.querySelectorAll('button[data-act]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const id = btn.getAttribute('data-id');
          const act= btn.getAttribute('data-act');
          if(act==='del') delExpense(id);
          if(act==='edit') editExpense(id);
        });
      });
    }

    // ====== CRUD عُهد ======
    function delAdvance(id){
      const has = state.expenses.some(x=>x.advanceId===id);
      if(has) {
        alert('لا يمكن حذف العُهدة لوجود مصروفات مرتبطة بها');
        return;
      }
      
      if(!confirm('تأكيد حذف العُهدة؟')) return;
      
      const i = state.advances.findIndex(a=>a.id===id); 
      if(i>-1){
        state.advances.splice(i,1); 
        db.save(state);
        renderAdvTable(); 
        fillAdvanceSelects(); 
        refreshSummary();
      }
    }

    function editAdvance(id){
      const a = state.advances.find(x=>x.id===id); 
      if(!a) return;
      
      const track = prompt('رقم التتبع', a.track); 
      if(track===null) return;
      
      const title = prompt('اسم/وصف العُهدة', a.title); 
      if(title===null) return;
      
      const amount = Number(prompt('المبلغ', a.amount)); 
      if(!(amount>=0)) {
        alert('قيمة غير صالحة');
        return;
      }
      
      const date = prompt('التاريخ (YYYY-MM-DD)', a.date) || a.date;
      const notes = prompt('ملاحظات', a.notes||'')||'';
      
      const spent = sumExpensesForAdvance(a.id);
      if(amount < spent) {
        alert('المبلغ الجديد أقل من إجمالي المصروفات المسجلة');
        return;
      }
      
      Object.assign(a,{track,title,amount,date,notes}); 
      db.save(state);
      renderAdvTable(); 
      fillAdvanceSelects(); 
      refreshSummary();
    }

    // ====== CRUD مصروفات ======
    function delExpense(id){
      if(!confirm('تأكيد حذف المصروف؟')) return;
      
      const i = state.expenses.findIndex(x=>x.id===id); 
      if(i>-1){
        state.expenses.splice(i,1); 
        db.save(state);
        renderExpTable(); 
        renderAdvTable(); 
        fillAdvanceSelects(); 
        refreshSummary();
      }
    }

    function editExpense(id){
      const x = state.expenses.find(e=>e.id===id); 
      if(!x) return;
      
      const name = prompt('اسم المصروف', x.name); 
      if(name===null) return;
      
      const amount = Number(prompt('المبلغ', x.amount)); 
      if(!(amount>0)) {
        alert('قيمة غير صالحة');
        return;
      }
      
      const kind = prompt('النوع (invoice/no-invoice)', x.kind) || x.kind;
      const date = prompt('التاريخ (YYYY-MM-DD)', x.date) || x.date;
      const notes = prompt('ملاحظات', x.notes||'')||'';
      const invoiceNo = (kind==='invoice') ? (prompt('رقم الفاتورة', x.invoiceNo||'')||'').trim() : '';
      
      const adv = state.advances.find(a=>a.id===x.advanceId);
      const otherSpent = sumExpensesForAdvance(x.advanceId) - Number(x.amount);
      
      if(amount > (adv.amount - otherSpent)) {
        alert('المبلغ يتجاوز المتبقي في العُهدة');
        return;
      }
      
      Object.assign(x,{name,amount,kind,invoiceNo,date,notes}); 
      db.save(state);
      renderExpTable(); 
      renderAdvTable(); 
      refreshSummary();
    }

    // ====== بحث وتصفية ======
    $('#searchAdv').addEventListener('input', renderAdvTable);
    $('#searchExp').addEventListener('input', renderExpTable);
    $('#filterAdvance').addEventListener('change', renderExpTable);
    $('#btnClearFilter').addEventListener('click', ()=>{ 
      $('#filterAdvance').value=''; 
      renderExpTable(); 
    });

    // ====== تقارير ======
    function renderReportSummary(){
      const totalAdv = state.advances.reduce((a,b)=>a+Number(b.amount||0),0);
      const totalExp = state.expenses.reduce((a,b)=>a+Number(b.amount||0),0);
      const remain = totalAdv - totalExp;
      const over = remain<0? ` <span class="text-danger">(تجاوز ${fmt(-remain)})</span>`:'';
      
      $('#reportSummary').innerHTML = `
        <div style="display: grid; gap: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-lg);">
            <span>إجمالي العُهد:</span>
            <span style="font-weight: 600; color: var(--accent-400);">${fmt(totalAdv)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-lg);">
            <span>إجمالي المصروف:</span>
            <span style="font-weight: 600; color: var(--warning-400);">${fmt(totalExp)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-lg);">
            <span>المتبقي:</span>
            <span style="font-weight: 600; color: ${remain < 0 ? 'var(--danger-400)' : 'var(--success-400)'};">${fmt(remain)}${over}</span>
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">
            عدد العُهد: ${state.advances.length} — عدد المصروفات: ${state.expenses.length}
          </div>
        </div>
      `;
    }

    function renderReportDetails(){
      const id = $('#reportAdvance').value; 
      const a = state.advances.find(x=>x.id===id);
      
      const container = $('#reportDetails');
      
      if(!a){ 
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3>اختر عُهدة</h3>
            <p>اختر عُهدة لعرض تفاصيل التقرير</p>
          </div>
        `; 
        return; 
      }
      
      const exps = state.expenses.filter(x=>x.advanceId===id).sort((x,y)=>x.date>y.date?1:-1);
      const spent = exps.reduce((s,x)=>s+Number(x.amount||0),0);
      const rem = a.amount - spent;
      
      const rows = exps.map(x=> `<tr>
        <td>${x.date}</td>
        <td>${x.kind==='invoice'?'فاتورة':'بدون فاتورة'}</td>
        <td>${x.invoiceNo?x.invoiceNo:'—'}</td>
        <td>${x.name}</td>
        <td style="font-weight: 600;">${fmt(x.amount)}</td>
        <td class="text-muted">${x.notes||''}</td>
      </tr>`).join('');
      
      container.innerHTML = `
        <div style="margin-top: 16px;">
          <div style="background: var(--accent-500); color: white; padding: 12px; border-radius: var(--radius-lg); margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${a.track}</div>
            <div style="font-size: 12px; opacity: 0.9;">${a.title}</div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px;">
            <div style="background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-lg); text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">المبلغ</div>
              <div style="font-weight: 600; color: var(--accent-400);">${fmt(a.amount)}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-lg); text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">المصروف</div>
              <div style="font-weight: 600; color: var(--warning-400);">${fmt(spent)}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-lg); text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">المتبقي</div>
              <div style="font-weight: 600;" class="${rem<0?'text-danger':(rem>0?'text-success':'text-warning')}">${fmt(rem)}</div>
            </div>
          </div>
          
          ${exps.length > 0 ? `
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>رقم الفاتورة</th>
                    <th>الاسم</th>
                    <th>المبلغ</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-state-icon">💳</div>
              <h3>لا توجد مصروفات</h3>
              <p>لم يتم تسجيل أي مصروفات لهذه العُهدة</p>
            </div>
          `}
        </div>
      `;
    }

    $('#reportAdvance').addEventListener('change', renderReportDetails);
    $('#btnPrint').addEventListener('click', ()=> window.print());

    // ====== تصدير/استيراد ======
    $('#btnExportJSON').addEventListener('click', ()=>{
      const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
      const a = document.createElement('a'); 
      a.href = URL.createObjectURL(blob); 
      a.download = 'qb-ledg-data.json'; 
      a.click();
    });

    $('#btnImportJSON').addEventListener('click', ()=> $('#importFile').click());

    $('#importFile').addEventListener('change', (e)=>{
      const f = e.target.files?.[0]; 
      if(!f) return;
      
      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          const data = JSON.parse(reader.result);
          if(!data || !Array.isArray(data.advances) || !Array.isArray(data.expenses)) {
            throw new Error('صيغة غير صحيحة');
          }
          
          state.advances = data.advances; 
          state.expenses = data.expenses; 
          db.save(state);
          renderAll(); 
          alert('تم الاستيراد بنجاح');
        }catch(err){ 
          alert('فشل الاستيراد: '+ err.message); 
        }
      };
      reader.readAsText(f);
    });

    // ====== تهيئة أولية ======
    function renderAll(){
      fillAdvanceSelects();
      renderAdvTable();
      renderExpTable();
      renderReportSummary();
      renderReportDetails();
      refreshSummary();
    }

    // ====== إعدادات أولية ======
    const today = new Date().toISOString().slice(0,10);
    $('#adv-date').value = today; 
    $('#exp-date').value = today; 
    $('#adv-track').value = genNextTrack();

    // إظهار/إخفاء حقل الفاتورة
    (function(){
      const kindSel = document.getElementById('exp-kind');
      const invRow = document.getElementById('invoiceRow');
      const invInput = document.getElementById('exp-invoice');
      
      const toggle = () => { 
        const on = (kindSel.value === 'invoice'); 
        invRow.style.display = on ? 'block' : 'none'; 
        if(!on) invInput.value = ''; 
      };
      
      kindSel.addEventListener('change', toggle); 
      toggle();
    })();

    // FAB للجوال
    $('#fabAdd').addEventListener('click', () => {
      // Switch to dashboard tab
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.hidden = true);
      document.querySelector('.nav-tab[data-tab="dashboard"]').classList.add('active');
      document.getElementById('tab-dashboard').hidden = false;
      
      // Focus on advance title input
      setTimeout(() => {
        document.getElementById('adv-title').focus();
      }, 100);
    });

    // تشغيل التطبيق
    renderAll();

    // إضافة بعض الأحداث للتحسين
    document.addEventListener('DOMContentLoaded', function() {
      // تحسين الأداء للجداول الكبيرة
      let searchTimeout;
      
      ['#searchAdv', '#searchExp'].forEach(selector => {
        const input = document.querySelector(selector);
        if (input) {
          input.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
              if (selector === '#searchAdv') {
                renderAdvTable();
              } else {
                renderExpTable();
              }
            }, 300);
          });
        }
      });
    });

    // تحسين الواجهة للجوال
    let touchStartY = 0;
    document.addEventListener('touchstart', function(e) {
      touchStartY = e.touches[0].clientY;
    });

    document.addEventListener('touchmove', function(e) {
      const touchY = e.touches[0].clientY;
      const touchDiff = touchStartY - touchY;
      
      // إخفاء/إظهار الهيدر عند التمرير
      const header = document.querySelector('.header');
      if (touchDiff > 5 && window.scrollY > 100) {
        header.style.transform = 'translateY(-100%)';
      } else if (touchDiff < -5) {
        header.style.transform = 'translateY(0)';
      }
    });

    // تحسين الأداء عند تغيير حجم الشاشة
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        renderAll();
      }, 250);
    });

    // إضافة تأثيرات انتقال للتبويبات
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        // إضافة تأثير loading
        const currentPane = document.querySelector('.tab-pane:not([hidden])');
        if (currentPane) {
          currentPane.style.opacity = '0.5';
          setTimeout(() => {
            currentPane.style.opacity = '1';
          }, 150);
        }
      });
    });

    // تحسين تجربة المستخدم
    function showNotification(message, type = 'success') {
      // يمكن تحسين هذا لاحقاً بإضافة نظام إشعارات أفضل
      const alertType = type === 'success' ? 'تم بنجاح' : 'خطأ';
      alert(`${alertType}: ${message}`);
    }

    // إضافة اختصارات لوحة المفاتيح
    document.addEventListener('keydown', function(e) {
      // Ctrl/Cmd + S للحفظ السريع (تصدير)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('btnExportJSON').click();
      }
      
      // Ctrl/Cmd + N لعُهدة جديدة
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        // التبديل للوحة التحكم والتركيز على حقل العنوان
        document.querySelector('.nav-tab[data-tab="dashboard"]').click();
        setTimeout(() => {
          document.getElementById('adv-title').focus();
        }, 100);
      }
    });

    // إضافة معاينة المبالغ المتبقية في الوقت الفعلي
    document.getElementById('exp-amount').addEventListener('input', function() {
      const selectedAdvanceId = document.getElementById('exp-advance').value;
      const enteredAmount = parseFloat(this.value) || 0;
      
      if (selectedAdvanceId && enteredAmount > 0) {
        const advance = state.advances.find(a => a.id === selectedAdvanceId);
        if (advance) {
          const remaining = advanceRemaining(advance);
          const afterExpense = remaining - enteredAmount;
          
          // تغيير لون الحقل حسب المبلغ المتبقي
          if (afterExpense < 0) {
            this.style.borderColor = 'var(--danger-500)';
            this.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
          } else if (afterExpense === 0) {
            this.style.borderColor = 'var(--warning-500)';
            this.style.boxShadow = '0 0 0 3px rgba(234, 179, 8, 0.1)';
          } else {
            this.style.borderColor = 'var(--success-500)';
            this.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
          }
        }
      } else {
        // إعادة تعيين الألوان
        this.style.borderColor = '';
        this.style.boxShadow = '';
      }
    });

    // تحسين تجربة الطباعة
    window.addEventListener('beforeprint', function() {
      // إخفاء العناصر غير المطلوبة في الطباعة
      document.body.classList.add('printing');
    });

    window.addEventListener('afterprint', function() {
      document.body.classList.remove('printing');
    });
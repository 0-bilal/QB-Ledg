// app.js (واجهة التطبيق — متوافق مع QBStorage بنسخة GAS)
// ملاحظة: QBStorage.load() غير متزامن، لذا نقرأ من الكاش _state فوراً
// ثم نعيد renderAll بعد أول تحميل ناجح.

(function () {
  // ===== Helpers =====
  const $ = sel => document.querySelector(sel);
  const fmt = n => Number(n).toLocaleString('ar-SA',{minimumFractionDigits:2,maximumFractionDigits:2});

  // الحالة من الكاش المحلي داخل QBStorage (قد تكون فارغة عند الإقلاع)
  function getState() {
    return (window.QBStorage && window.QBStorage._state) || { advances: [], expenses: [] };
  }

  function sumExpensesForAdvance(state, advId){
    return state.expenses.filter(x=>x.advanceId===advId).reduce((a,b)=>a+Number(b.amount||0),0);
  }

  function advanceRemaining(state, adv){
    return Number(adv.amount) - sumExpensesForAdvance(state, adv.id);
  }

  function genNextTrack(state) {
    const input = document.querySelector('#adv-date');
    const dateStr = (input && input.value) ? input.value : new Date().toISOString().slice(0, 10);
    const year = /^\d{4}/.test(dateStr) ? dateStr.slice(0, 4) : String(new Date().getFullYear());
    const prefix = 'CH';
    const re = new RegExp('^' + prefix + '-' + year + '-(\\d{3,})$');
    const advances = Array.isArray(state?.advances) ? state.advances : [];

    let max = 0;
    for (const a of advances) {
      const track = (a && a.track) ? a.track : '';
      const m = track.match(re);
      if (m) {
        const n = Number(m[1]);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    const next = String(max + 1).padStart(3, '0');
    return `${prefix}-${year}-${next}`;
  }

  // ===== UI =====
  function refreshSummary(){
    const state = getState();
    const total = state.advances.reduce((a,b)=>a+Number(b.amount||0),0);
    const spent = state.expenses.reduce((a,b)=>a+Number(b.amount||0),0);
    const remain = total - spent;

    $('#totalAdvances').textContent = fmt(total);
    $('#totalSpent').textContent = fmt(spent);
    $('#totalRemaining').textContent = fmt(remain);

    const remainingEl = $('#totalRemaining');
    remainingEl.className = 'summary-remaining';
    remainingEl.classList.remove('text-danger','text-warning','text-success');
    if(remain < 0) remainingEl.classList.add('text-danger');
    else if(remain === 0) remainingEl.classList.add('text-warning');
    else remainingEl.classList.add('text-success');
  }

  function fillAdvanceSelects(){
    const state = getState();
    const opts = (state.advances || []).map(a=>({
      id: a.id,
      label: `${a.track} — ${a.title} (المتبقي ${fmt(advanceRemaining(state,a))})`
    }));

    ['#exp-advance','#filterAdvance','#reportAdvance'].forEach(sel=>{
      const s=$(sel); if(!s) return;
      s.innerHTML='';
      if(sel==='#filterAdvance') {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '— كل العُهد —';
        s.appendChild(option);
      }
      opts.forEach(o=>{
        const option = document.createElement('option');
        option.value = o.id;
        option.textContent = o.label;
        s.appendChild(option);
      });
    });
  }

  function renderAdvTable(){
    const state = getState();
    const q = ($('#searchAdv')?.value||'').trim().toLowerCase();
    const list = (state.advances || []).filter(a=> !q || [a.track,a.title,a.notes].join(' ').toLowerCase().includes(q));
    const container = $('#advTableWrap');

    if(!list.length){
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h3>لا توجد عُهد مسجلة</h3>
          <p>ابدأ بإضافة عُهدة جديدة من لوحة التحكم</p>
        </div>`;
      return;
    }

    const rows = list.map(a=>{
      const spent = sumExpensesForAdvance(state,a.id);
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

    const mobileCards = list.map(a=>{
      const spent = sumExpensesForAdvance(state,a.id);
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

    container.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.addEventListener('click', async ()=> {
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        if (act === 'del') await handleDeleteAdvance(id);
        if (act === 'edit') await handleEditAdvance(id);
      });
    });
  }

  function renderExpTable(){
    const state = getState();
    const q = ($('#searchExp')?.value||'').trim().toLowerCase();
    const filterId = $('#filterAdvance')?.value || '';

    let list = (state.expenses || []).slice().sort((a,b)=> (a.date>b.date?-1:1));
    if(filterId) list = list.filter(x=>x.advanceId===filterId);
    if(q) list = list.filter(x=> [x.name,x.notes,x.amount, x.date, x.invoiceNo].join(' ').toLowerCase().includes(q));

    const container = $('#expTableWrap');

    if(!list.length){
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💳</div>
          <h3>لا توجد مصروفات مسجلة</h3>
          <p>ابدأ بإضافة مصروف جديد من لوحة التحكم</p>
        </div>`;
      return;
    }

    const rows = list.map(x=>{
      const adv = (getState().advances || []).find(a=>a.id===x.advanceId);
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

    const mobileCards = list.map(x=>{
      const adv = (getState().advances || []).find(a=>a.id===x.advanceId);
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

    container.querySelectorAll('button[data-act]').forEach(btn=>{
      btn.addEventListener('click', async ()=> {
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        if (act === 'del') await handleDeleteExpense(id);
        if (act === 'edit') await handleEditExpense(id);
      });
    });
  }

  function renderReportSummary(){
    const state = getState();
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
          <span style="font-weight: 600;" class="${remain<0?'text-danger':(remain>0?'text-success':'text-warning')}">${fmt(remain)}${over}</span>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">
          عدد العُهد: ${getState().advances.length} — عدد المصروفات: ${getState().expenses.length}
        </div>
      </div>
    `;
  }

  function renderReportDetails(){
    const state = getState();
    const id = $('#reportAdvance').value;
    const a = state.advances.find(x=>x.id===id);
    const container = $('#reportDetails');

    if(!a){
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>اختر عُهدة</h3>
          <p>اختر عُهدة لعرض تفاصيل التقرير</p>
        </div>`;
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

  // ===== Handlers (async) =====
  async function handleDeleteAdvance(id){
    const res = await window.QBStorage.deleteAdvance(id);
    if (res.ok) {
      renderAll();
      alert('تم حذف العُهدة');
    } else {
      if (res.reason === 'hasExpenses') alert('لا يمكن حذف العُهدة لوجود مصروفات مرتبطة بها');
      else alert('العُهدة غير موجودة');
    }
  }

  async function handleEditAdvance(id){
    const state = getState();
    const a = state.advances.find(x=>x.id===id);
    if(!a) return;
    const track = prompt('رقم التتبع', a.track); if(track===null) return;
    const title = prompt('اسم/وصف العُهدة', a.title); if(title===null) return;
    const amount = Number(prompt('المبلغ', a.amount)); if(!(amount>=0)) { alert('قيمة غير صالحة'); return; }
    const date = prompt('التاريخ (YYYY-MM-DD)', a.date) || a.date;
    const notes = prompt('ملاحظات', a.notes||'')||'';
    const spent = sumExpensesForAdvance(state,a.id);
    if(amount < spent) { alert('المبلغ الجديد أقل من إجمالي المصروفات المسجلة'); return; }
    await window.QBStorage.updateAdvance(id, { track, title, amount, date, notes });
    renderAll();
  }

  async function handleDeleteExpense(id){
    if(!confirm('تأكيد حذف المصروف؟')) return;
    const r = await window.QBStorage.deleteExpense(id);
    if(r.ok) {
      renderAll();
      alert('تم حذف المصروف');
    } else alert('خطأ أثناء الحذف');
  }

  async function handleEditExpense(id){
    const state = getState();
    const x = state.expenses.find(e=>e.id===id); if(!x) return;
    const name = prompt('اسم المصروف', x.name); if(name===null) return;
    const amount = Number(prompt('المبلغ', x.amount)); if(!(amount>0)) { alert('قيمة غير صالحة'); return; }
    const kind = prompt('النوع (invoice/no-invoice)', x.kind) || x.kind;
    const date = prompt('التاريخ (YYYY-MM-DD)', x.date) || x.date;
    const notes = prompt('ملاحظات', x.notes||'')||'';
    const invoiceNo = (kind==='invoice') ? (prompt('رقم الفاتورة', x.invoiceNo||'')||'').trim() : '';
    const adv = state.advances.find(a=>a.id===x.advanceId);
    const otherSpent = sumExpensesForAdvance(state, x.advanceId) - Number(x.amount);
    if(amount > (adv.amount - otherSpent)) { alert('المبلغ يتجاوز المتبقي في العُهدة'); return; }
    await window.QBStorage.updateExpense(id, { name, amount, kind, date, notes, invoiceNo });
    renderAll();
  }

  // ===== Forms (async) =====
  document.getElementById('advanceForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const state = getState();
    let track = $('#adv-track').value.trim() || genNextTrack(state);
    const title = $('#adv-title').value.trim();
    const amount = Number($('#adv-amount').value);
    const date = $('#adv-date').value || new Date().toISOString().slice(0,10);
    const notes = $('#adv-notes').value.trim();
    if(!title || !(amount>=0)) { alert('تحقق من المدخلات'); return; }

    // ensure unique track within year
    const year = date.slice(0,4);
    const re = new RegExp('^CH-' + year + '-(\\d{3,})$');
    while(getState().advances.some(a=>a.track===track)){
      const m = track.match(re);
      const n = m ? parseInt(m[1],10)+1 : 1;
      track = `CH-${year}-${String(n).padStart(3,'0')}`;
    }

    const btn = e.submitter || e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الحفظ…'; }
    try {
      await window.QBStorage.addAdvance({ track, title, amount, date, notes });
      e.target.reset();
      $('#adv-date').value = date;
      $('#adv-track').value = genNextTrack(getState());
      fillAdvanceSelects(); renderAdvTable(); refreshSummary();
      alert('تم حفظ العُهدة');
    } catch (err) {
      console.error(err);
      alert('تعذّر حفظ العُهدة. تحقّق من اتصال GAS أو الصلاحيات.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'حفظ العُهدة'; }
    }
  });

  document.getElementById('expenseForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const advanceId = $('#exp-advance').value;
    if(!advanceId) { alert('اختر العُهدة'); return; }
    const amount = Number($('#exp-amount').value);
    if(!(amount>0)) { alert('أدخل مبلغًا صحيحًا'); return; }
    const kind = $('#exp-kind').value;
    const name = $('#exp-name').value.trim();
    const notes = $('#exp-notes').value.trim();
    const date = $('#exp-date').value|| new Date().toISOString().slice(0,10);
    const adv = getState().advances.find(a=>a.id===advanceId);
    if(!adv) { alert('عُهدة غير موجودة'); return; }
    const remaining = advanceRemaining(getState(), adv);
    if(amount>remaining+1e-9) { alert('المبلغ يتجاوز المتبقي في العُهدة'); return; }
    const invoiceNo = kind==='invoice' ? ($('#exp-invoice').value||'').trim() : '';
    if(kind==='invoice' && !invoiceNo) { alert('أدخل رقم الفاتورة.'); return; }

    const btn = e.submitter || e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الحفظ…'; }
    try {
      await window.QBStorage.addExpense({ advanceId, amount, kind, invoiceNo, name, notes, date });
      e.target.reset();
      document.getElementById('invoiceRow').style.display='none';
      fillAdvanceSelects(); renderExpTable(); renderAdvTable(); refreshSummary();
      alert('تم تسجيل المصروف');
    } catch (err) {
      console.error(err);
      alert('تعذّر تسجيل المصروف. تحقّق من اتصال GAS أو الصلاحيات.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'تسجيل المصروف'; }
    }
  });

  // ===== Small UI glue =====
  $('#exp-kind').addEventListener('change', () => {
    const invRow = document.getElementById('invoiceRow');
    const on = $('#exp-kind').value === 'invoice';
    invRow.style.display = on ? 'block' : 'none';
    if(!on) $('#exp-invoice').value = '';
  });

  $('#btnExportJSON').addEventListener('click', ()=>{
    const content = window.QBStorage.exportJSON();
    const blob = new Blob([content],{type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'qb-ledg-data.json'; a.click();
  });

  $('#btnImportJSON').addEventListener('click', ()=> $('#importFile').click());
  $('#importFile').addEventListener('change', (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try {
        window.QBStorage.importJSON(reader.result);
        renderAll();
        alert('تم الاستيراد بنجاح');
      } catch(err) { alert('فشل الاستيراد: '+ err.message); }
    };
    reader.readAsText(f);
  });

  $('#searchAdv').addEventListener('input', renderAdvTable);
  $('#searchExp').addEventListener('input', renderExpTable);
  $('#filterAdvance').addEventListener('change', renderExpTable);
  $('#btnClearFilter').addEventListener('click', ()=>{ $('#filterAdvance').value=''; renderExpTable(); });

  $('#fabAdd').addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.hidden = true);
    document.querySelector('.nav-tab[data-tab="dashboard"]').classList.add('active');
    document.getElementById('tab-dashboard').hidden = false;
    setTimeout(()=> document.getElementById('adv-title').focus(), 100);
  });

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

  function renderAll(){
    fillAdvanceSelects();
    renderAdvTable();
    renderExpTable();
    renderReportSummary();
    renderReportDetails();
    refreshSummary();
    const today = new Date().toISOString().slice(0,10);
    if ($('#adv-date')) $('#adv-date').value = $('#adv-date').value || today;
    if ($('#exp-date')) $('#exp-date').value = $('#exp-date').value || today;
    if ($('#adv-track')) $('#adv-track').value = $('#adv-track').value || genNextTrack(getState());
  }

  // ===== Init =====
  renderAll(); // رندر مبدئي بكاش فارغ
  if (window.QBStorage && typeof window.QBStorage.load === 'function') {
    window.QBStorage.load({ force: true })
      .then(() => renderAll())
      .catch(err => console.error('GAS load failed', err));
  }

  // ===== Extras =====
  document.addEventListener('DOMContentLoaded', function() {
    let searchTimeout;
    ['#searchAdv', '#searchExp'].forEach(selector => {
      const input = document.querySelector(selector);
      if (input) {
        input.addEventListener('input', function() {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            if (selector === '#searchAdv') renderAdvTable(); else renderExpTable();
          }, 300);
        });
      }
    });
  });

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const btn = document.getElementById('btnExportJSON');
      if (btn) btn.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      const tab = document.querySelector('.nav-tab[data-tab="dashboard"]');
      if (tab) tab.click();
      setTimeout(()=> {
        const t = document.getElementById('adv-title');
        if (t) t.focus();
      }, 100);
    }
  });

})();

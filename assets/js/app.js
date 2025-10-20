// app.js - نسخة كاملة مُحدّثة مع شاشة انتظار أثناء الحفظ
(function () {
  // ===== Helpers =====
  const $  = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ✅ دالة لتنسيق التاريخ من ISO إلى yyyy-mm-dd فقط
  function formatDate(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr; // جاهز أصلاً
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toISOString().split('T')[0];
  }

  // حالات واجهة العرض
  let expensesFilterAdvanceId = ''; // فلتر صفحة المصروفات
  let initialized = false;

  // جلب الحالة من QBStorage (يتم ملؤها أثناء init)
  function getState() {
    return (window.QBStorage && window.QBStorage._state) || { advances: [], expenses: [] };
  }

  function sumExpensesForAdvance(state, advId) {
    return (state.expenses || [])
      .filter(x => x.advanceId === advId)
      .reduce((a, b) => a + Number(b.amount || 0), 0);
  }

  function advanceRemaining(state, adv) {
    return Number(adv.amount || 0) - sumExpensesForAdvance(state, adv.id);
  }

  // توليد رقم تتبّع بالشكل CH-YYYY-###
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

  // ===== Summary (أعلى الصفحة) =====
  function refreshSummary() {
    const state = getState();
    const total = (state.advances || []).reduce((a, b) => a + Number(b.amount || 0), 0);
    const spent = (state.expenses || []).reduce((a, b) => a + Number(b.amount || 0), 0);
    const remain = total - spent;

    $('#totalAdvances') && ($('#totalAdvances').textContent = fmt(total));
    $('#totalSpent') && ($('#totalSpent').textContent = fmt(spent));
    $('#totalRemaining') && ($('#totalRemaining').textContent = fmt(remain));
  }

  // ===== تعبئة قوائم العهد (تستخدم في الإضافة/التعديل/التصفية/التقرير) =====
  function populateAdvanceSelect(selectEl, { includeAll = false, keepValue = true } = {}) {
    if (!selectEl) return;
    const state = getState();
    const previous = keepValue ? selectEl.value : '';
    selectEl.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = includeAll ? 'كل العهد' : 'اختر عهدة...';
    selectEl.appendChild(placeholder);

    (state.advances || []).forEach(adv => {
      const remaining = advanceRemaining(state, adv);
      const opt = document.createElement('option');
      opt.value = adv.id;
      opt.textContent = `${adv.track || '#---'} — ${adv.title || 'عهدة'} (المتبقي ${fmt(remaining)})`;
      selectEl.appendChild(opt);
    });

    if (keepValue && previous) selectEl.value = previous;
  }

  function fillAdvanceSelects() {
    const selects = $$('select.form-input');
    selects.forEach(select => {
      if (select.id === 'expenseType') return; // نوع المصروف، ليس قائمة عهد
      const includeAll = (select.id === 'expensesAdvanceFilter');
      populateAdvanceSelect(select, { includeAll, keepValue: true });
    });
  }

  // ===== العهد (قائمة) =====
  function renderAdvancesList() {
    const state = getState();
    const container = $('#advancesList');
    if (!container) return;

    if (!state.advances || state.advances.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>لا توجد عهد مسجلة حالياً<br>ابدأ بإضافة عهدة جديدة</p>
        </div>`;
      return;
    }

    const html = state.advances.map(adv => {
      const spent = sumExpensesForAdvance(state, adv.id);
      const remaining = Number(adv.amount || 0) - spent;
      const remClass = remaining > 0 ? 'success' : (remaining < 0 ? 'danger' : 'warning');
      return `
        <div class="data-item">
          <div class="data-item-header">
            <div class="data-item-title">${adv.title || 'عهدة'}</div>
            <div class="data-item-badge">${adv.track || '#CH-000'}</div>
          </div>
          <div class="data-item-grid">
            <div class="data-field">
              <span class="data-field-label">المبلغ الكلي</span>
              <span class="data-field-value">${fmt(adv.amount)} ريال</span>
            </div>
            <div class="data-field">
              <span class="data-field-label">المصروف</span>
              <span class="data-field-value">${fmt(spent)} ريال</span>
            </div>
            <div class="data-field">
              <span class="data-field-label">المتبقي</span>
              <span class="data-field-value" style="color: var(--${remClass})">${fmt(remaining)} ريال</span>
            </div>
            <div class="data-field">
              <span class="data-field-label">تاريخ الاستلام</span>
              <span class="data-field-value">${formatDate(adv.date)}</span>
            </div>
          </div>
          <div class="data-item-actions">
            <button class="btn btn-danger btn-sm" onclick="viewAdvance('${adv.id}')">👁️ عرض</button>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = html;
  }

  // ===== المصروفات (قائمة + فلترة بالعهدة) =====
  function getExpensesFiltered() {
    const state = getState();
    const all = state.expenses || [];
    if (!expensesFilterAdvanceId) return all;
    return all.filter(e => e.advanceId === expensesFilterAdvanceId);
  }

  function renderExpensesList() {
    const state = getState();
    const container = $('#expensesList');
    if (!container) return;

    const list = getExpensesFiltered();

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💸</div>
          <p>${expensesFilterAdvanceId ? 'لا توجد مصروفات لهذه العهدة' : 'لا توجد مصروفات مسجلة حالياً'}<br>ابدأ بإضافة مصروف جديد</p>
        </div>`;
      return;
    }

    const html = list.map(exp => {
      const adv = (state.advances || []).find(a => a.id === exp.advanceId);
      const advTrack = adv ? (adv.track || '#---') : '#---';
      const badgeText = exp.kind === 'invoice' ? 'فاتورة' : 'بدون فاتورة';
      return `
        <div class="data-item">
          <div class="data-item-header">
            <div class="data-item-title">${exp.name || 'مصروف'}</div>
            <div class="data-item-badge">${badgeText}</div>
          </div>
          <div class="data-item-grid">
            <div class="data-field">
              <span class="data-field-label">المبلغ</span>
              <span class="data-field-value">${fmt(exp.amount)} ريال</span>
            </div>
            <div class="data-field">
              <span class="data-field-label">التاريخ</span>
              <span class="data-field-value">${formatDate(exp.date)}</span>
            </div>
            <div class="data-field">
              <span class="data-field-label">العهدة</span>
              <span class="data-field-value">${advTrack}</span>
            </div>
            <div class="data-field">
              <span class="data-field-label">رقم الفاتورة</span>
              <span class="data-field-value">${exp.invoiceNo || '---'}</span>
            </div>
          </div>
          ${exp.notes ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">${exp.notes}</div>` : ''}
          <div class="data-item-actions"></div>
        </div>`;
    }).join('');

    container.innerHTML = html;
  }

  // ربط عناصر الفلترة في صفحة المصروفات
  function wireExpensesFilter() {
    const tab = $('#tab-expenses');
    if (!tab) return;

    let select = tab.querySelector('.toolbar select.form-input');
    if (select) {
      select.id = 'expensesAdvanceFilter';
      populateAdvanceSelect(select, { includeAll: true, keepValue: false });
      select.value = expensesFilterAdvanceId;
      select.onchange = () => {
        expensesFilterAdvanceId = select.value || '';
        renderExpensesList();
      };
    }

    const clearBtn = Array.from(tab.querySelectorAll('.toolbar .btn'))
      .find(b => /إلغاء التصفية/.test(b.textContent || ''));
    if (clearBtn) {
      clearBtn.onclick = () => {
        expensesFilterAdvanceId = '';
        if (select) select.value = '';
        renderExpensesList();
      };
    }
  }

  // ===== التقارير =====
  function refreshReportsHeaderCards() {
    const state = getState();
    const activeAdvances = (state.advances || []).length;
    const totalSpent = (state.expenses || []).reduce((a, b) => a + Number(b.amount || 0), 0);
    const totalAdvances = (state.advances || []).reduce((a, b) => a + Number(b.amount || 0), 0);
    const avgSpent = activeAdvances > 0 ? totalSpent / activeAdvances : 0;
    const spendingRate = totalAdvances > 0 ? (totalSpent / totalAdvances * 100) : 0;

    const stats = $('#tab-reports')?.querySelector('.data-item-grid');
    if (stats) {
      stats.innerHTML = `
        <div class="data-field">
          <span class="data-field-label">عدد العهد النشطة</span>
          <span class="data-field-value" style="font-size: 28px; color: var(--primary-light)">${activeAdvances}</span>
        </div>
        <div class="data-field">
          <span class="data-field-label">إجمالي المصروفات</span>
          <span class="data-field-value" style="font-size: 28px; color: var(--warning)">${fmt(totalSpent)} ريال</span>
        </div>
        <div class="data-field">
          <span class="data-field-label">متوسط المصروف</span>
          <span class="data-field-value" style="font-size: 28px;">${fmt(avgSpent)} ريال</span>
        </div>
        <div class="data-field">
          <span class="data-field-label">نسبة الإنفاق</span>
          <span class="data-field-value" style="font-size: 28px; color: var(--success)">${spendingRate.toFixed(1)}%</span>
        </div>`;
    }
  }

  function buildAdvanceReportText(state, advId) {
    const adv = (state.advances || []).find(a => a.id === advId);
    if (!adv) return '';

    const expenses = (state.expenses || []).filter(e => e.advanceId === advId);
    const total = Number(adv.amount || 0);
    const spent = expenses.reduce((a, b) => a + Number(b.amount || 0), 0);
    const remaining = total - spent;

    const lines = [];
    lines.push(`📌 تقرير عهدة رقم: ${adv.track || '#---'}`);
    lines.push(`اسم العهدة: ${adv.title || ''}`);
    lines.push(`المبلغ المستلم: ${fmt(total)} ريال`);
    lines.push(`تاريخ الاستلام: ${formatDate(adv.date)}`);
    lines.push('');
    lines.push('--------------------------');
    lines.push('💵 طريقة صرف المبلغ:');

    if (expenses.length === 0) {
      lines.push('لا توجد مصروفات مسجلة لهذه العهدة.');
    } else {
      expenses
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .forEach(e => {
          lines.push(`${formatDate(e.date)} – ${e.name || 'مصروف'} – ${fmt(e.amount)} ريال`);
        });
    }

    lines.push('--------------------------');
    lines.push('');
    lines.push(`✅ المتبقي من العهدة: ${fmt(remaining)} ريال`);

    return lines.join('\n');
  }

  function renderReportUI() {
    const card = Array.from($('#tab-reports')?.querySelectorAll('.card') || [])[1];
    if (!card) return;

    const selectWrap = card.querySelector('.form-group');
    const select = selectWrap?.querySelector('select.form-input');
    if (select) {
      select.id = 'reportAdvanceSelect';
      populateAdvanceSelect(select, { includeAll: false, keepValue: false });

      // منطقة إخراج التقرير
      let out = card.querySelector('#reportOutput');
      if (!out) {
        out = document.createElement('div');
        out.id = 'reportOutput';
        out.className = 'data-item';
        out.style.marginTop = '12px';
        out.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <p>اختر عهدة لعرض التقرير التفصيلي</p>
          </div>`;
        card.appendChild(out);
      }

      select.onchange = () => {
        const advId = select.value;
        if (!advId) {
          out.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <p>اختر عهدة لعرض التقرير التفصيلي</p>
            </div>`;
          return;
        }
        const text = buildAdvanceReportText(getState(), advId);
        out.innerHTML = `
          <div class="data-item-header" style="margin-bottom:10px">
            <div class="data-item-title">📄 التقرير النصي</div>
          </div>
          <pre id="reportText" style="white-space:pre-wrap; line-height:1.7; font-family:inherit; background: var(--surface-light); border:1px solid var(--border); border-radius:12px; padding:16px;">${text}</pre>
          <div style="display:flex; gap:10px; margin-top:12px;">
            <button class="btn btn-secondary" onclick="copyReportText()">📋 نسخ التقرير</button>
            <button class="btn btn-primary" onclick="shareReportWhatsApp()">💬 مشاركة واتساب</button>
          </div>
        `;
      };
    }
  }

  function refreshReports() {
    refreshReportsHeaderCards();
    renderReportUI();
  }

  // ===== مودال عرض التفاصيل =====
  function showCustomModal(title, content, buttons = []) {
    const modal = document.createElement('div');
    modal.className = 'modal active custom-modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${buttons.map(btn => `
            <button class="btn ${btn.class || 'btn-secondary'}" 
                    onclick="${btn.onclick || ''}; this.closest('.modal').remove();">
              ${btn.text}
            </button>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        document.body.style.overflow = '';
      }
    });
    return modal;
  }

  // ===== نوافذ إضافة العهدة/المصروف =====
  window.openAdvanceModal = function () {
    const modal = document.querySelector('#advanceModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const form = modal.querySelector('#advanceForm');
    if (form) form.reset();

    const trackInput = modal.querySelector('.form-input[readonly]');
    const dateInput  = modal.querySelector('input[type="date"]');
    if (trackInput) trackInput.value = genNextTrack(getState());
    if (dateInput)  dateInput.value  = formatDate(new Date().toISOString());
  };
  window.closeAdvanceModal = function () {
    document.querySelector('#advanceModal')?.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.openExpenseModal = function () {
    const modal = document.querySelector('#expenseModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const advSelect = modal.querySelector('select.form-input');
    if (advSelect) populateAdvanceSelect(advSelect, { includeAll: false, keepValue: false });

    const dateInput = modal.querySelector('input[type="date"]');
    if (dateInput) dateInput.value = formatDate(new Date().toISOString());

    toggleInvoiceField();
  };
  window.closeExpenseModal = function () {
    document.querySelector('#expenseModal')?.classList.remove('active');
    document.body.style.overflow = '';
  };

  // إظهار/إخفاء خانة رقم الفاتورة حسب النوع
  window.toggleInvoiceField = function () {
    const modal = document.querySelector('#expenseModal');
    if (!modal) return;
    const typeSel = modal.querySelector('#expenseType');
    const invField = modal.querySelector('#invoiceField');
    if (!typeSel || !invField) return;
    invField.style.display = (typeSel.value === 'invoice') ? 'block' : 'none';
  };

  // ===== شاشة انتظار عامّة =====
  function ensureSavingModal() {
    let modal = document.querySelector('#savingModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'savingModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:420px; text-align:center;">
        <div style="padding:28px 24px;">
          <div class="loading-spinner" style="
            width:56px;height:56px;margin:0 auto 14px;border-radius:50%;
            border:5px solid rgba(255,255,255,0.2); border-top-color:#3f83f8;
            animation: spin 0.9s linear infinite;"></div>
          <h3 style="margin:0 0 6px; font-size:18px;">جاري المعالجة</h3>
          <p id="savingModalMsg" style="color:var(--text-muted); margin:0;">الرجاء الانتظار...</p>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function showSaving(message = 'الرجاء الانتظار...') {
    const modal = ensureSavingModal();
    const msgEl = modal.querySelector('#savingModalMsg');
    if (msgEl) msgEl.textContent = message;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function hideSaving() {
    const modal = document.querySelector('#savingModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ===== ربط نموذج إضافة العهدة بالحفظ =====
  function bindAdvanceForm() {
    const modal = document.querySelector('#advanceModal');
    if (!modal) return;
    const form = modal.querySelector('#advanceForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"], .btn.btn-primary');
      try {
        submitBtn && (submitBtn.disabled = true);
        showSaving('جاري حفظ العهدة...');

        const trackInput = modal.querySelector('.form-input[readonly]');
        const dateInput  = modal.querySelector('input[type="date"]');
        const inputs = modal.querySelectorAll('.form-input');
        const titleInput = Array.from(inputs).find(i => i.placeholder && i.placeholder.startsWith('مثال: عهدة'));
        const amountInput= modal.querySelector('input[type="number"]');
        const notesInput = modal.querySelector('textarea');

        const trackDisplay = (trackInput?.value || '').trim();
        const track = trackDisplay.replace(/^#\s*/, '');
        const payload = {
          track,
          title: (titleInput?.value || '').trim(),
          amount: Number(amountInput?.value || 0),
          date: dateInput?.value || formatDate(new Date().toISOString()),
          notes: (notesInput?.value || '').trim()
        };

        await window.QBStorage.addAdvance(payload);
        await window.QBStorage.load({ force: true });
        closeAdvanceModal();
        refreshSummary();
        renderAdvancesList();
        renderExpensesList();
        fillAdvanceSelects();
        alert('✅ تم حفظ العهدة بنجاح');
      } catch (err) {
        console.error(err);
        alert('⚠️ لم يتم حفظ العهدة. تحقق من الاتصال أو صلاحيات GAS.');
      } finally {
        hideSaving();
        submitBtn && (submitBtn.disabled = false);
      }
    });
  }

  // ===== ربط نموذج إضافة المصروف بالحفظ =====
  function bindExpenseForm() {
    const modal = document.querySelector('#expenseModal');
    if (!modal) return;
    const form = modal.querySelector('#expenseForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"], .btn.btn-primary');
      try {
        submitBtn && (submitBtn.disabled = true);
        showSaving('جاري تسجيل المصروف...');

        const advSelect  = modal.querySelector('select.form-input');
        const dateInput  = modal.querySelector('input[type="date"]');
        const amountInput= modal.querySelector('input[type="number"]');
        const typeSel    = modal.querySelector('#expenseType');
        const invoiceIn  = modal.querySelector('#invoiceField input');
        const inputs     = modal.querySelectorAll('.form-input');
        const nameInput  = Array.from(inputs).find(i => i.placeholder && i.placeholder.startsWith('مثال: شراء'));
        const notesInput = modal.querySelector('textarea');

        const payload = {
          advanceId: advSelect?.value || '',
          amount: Number(amountInput?.value || 0),
          kind: typeSel?.value === 'invoice' ? 'invoice' : 'no-invoice',
          invoiceNo: (invoiceIn?.value || '').trim(),
          name: (nameInput?.value || '').trim(),
          notes: (notesInput?.value || '').trim(),
          date: dateInput?.value || formatDate(new Date().toISOString())
        };
        if (!payload.advanceId) { alert('اختر العهدة أولاً'); return; }

        await window.QBStorage.addExpense(payload);
        await window.QBStorage.load({ force: true });
        closeExpenseModal();
        refreshSummary();
        renderAdvancesList();
        renderExpensesList();
        fillAdvanceSelects();
        alert('✅ تم تسجيل المصروف بنجاح');
      } catch (err) {
        console.error(err);
        alert('⚠️ لم يتم تسجيل المصروف. تحقق من المبلغ/الاتصال.');
      } finally {
        hideSaving();
        submitBtn && (submitBtn.disabled = false);
      }
    });
  }

  // ===== تهيئة (Init) =====
  async function init() {
    if (initialized) return;
    initialized = true;

    try {
      showSaving('جاري تحميل البيانات...');
      if (window.QBStorage && typeof window.QBStorage.load === 'function') {
        await window.QBStorage.load({ force: true });
      }
    } catch (e) {
      console.error('QBStorage.load failed', e);
    } finally {
      hideSaving();
    }

    refreshSummary();
    renderAdvancesList();
    renderExpensesList();
    fillAdvanceSelects();
    refreshReports();
    wireExpensesFilter();
    renderReportUI();

    // ربط النماذج
    bindAdvanceForm();
    bindExpenseForm();
  }

  // تشغيل عند تحميل DOM
  document.addEventListener('DOMContentLoaded', init);

  // ===== التبديل بين التبويبات =====
  window.switchTab = function (tab) {
    $$('.tab-content').forEach(el => el.classList.remove('active'));
    $('#tab-' + tab)?.classList.add('active');
    $$('.nav-item').forEach(el => el.classList.remove('active'));
    Array.from($$('.nav-item')).find(b => (b.textContent || '').includes(
      tab === 'advances' ? 'العهد' :
      tab === 'expenses' ? 'المصروفات' :
      tab === 'reports' ? 'التقارير' : 'عن النظام'
    ))?.classList.add('active');

    if (tab === 'expenses') {
      populateAdvanceSelect($('#expensesAdvanceFilter'), { includeAll: true, keepValue: true });
      renderExpensesList();
    } else if (tab === 'reports') {
      refreshReports();
    }
  };

  // ===== قائمة الإضافة العائمة =====
  window.toggleAddMenu = function () {
    const menu = $('#addMenu');
    const overlay = $('.overlay');
    if (!menu || !overlay) return;
    const active = menu.classList.toggle('active');
    overlay.classList.toggle('active', active);
  };
  window.closeAddMenu = function () {
    $('#addMenu')?.classList.remove('active');
    $('.overlay')?.classList.remove('active');
  };

})(); // نهاية IIFE

// ===== دوال التقرير العامة (خارج IIFE للوصول من onclick) =====

// ⚙️ مُساعد: يرجّع نص التقرير الحالي أو يُولّده من الاختيار
function getCurrentReportText() {
  const pre = document.querySelector('#reportText');
  if (pre && pre.innerText.trim()) return pre.innerText;

  const sel = document.querySelector('#reportAdvanceSelect');
  const advId = sel ? sel.value : '';
  if (!advId) return '';

  try {
    return (typeof buildAdvanceReportText === 'function')
      ? buildAdvanceReportText(((window.QBStorage && window.QBStorage._state) || {advances:[],expenses:[]}), advId)
      : '';
  } catch {
    return '';
  }
}

// 📋 نسخ التقرير
window.copyReportText = function () {
  const text = getCurrentReportText();
  if (!text.trim()) {
    alert('لا يوجد تقرير لنسخه');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    alert('✅ تم نسخ التقرير إلى الحافظة بنجاح');
  }).catch(() => {
    alert('⚠️ لم يتمكن المتصفح من نسخ النص تلقائيًا');
  });
};

// 💬 مشاركة واتساب
window.shareReportWhatsApp = function () {
  const text = getCurrentReportText();
  if (!text.trim()) {
    alert('لا يوجد تقرير للمشاركة');
    return;
  }
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
};

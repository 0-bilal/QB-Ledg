// storage.gas.js
// واجهة تخزين تعتمد Google Apps Script بدلاً من localStorage
// متوافقة مع app.js (نفس دوال QBStorage)

(function (global) {
  // ==== إعدادات ====
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbwhhoSQOzCR3dSSwPvv9kDzwFMavuNGWOa1cpoRJfX_ZpnikEtdFH37QRVlfsN-CwEJ/exec';
  // إذا فعّلت WEB_API_KEY في Script Properties، ضع المفتاح هنا (اختياري)
  const API_KEY = '8121008211';

  // نستخدم Content-Type: text/plain لتجنّب preflight
  const headersPOST = { 'Content-Type': 'text/plain' };

  function withApiKey(url, isGet = true) {
    if (!API_KEY) return url;
    return url + (url.includes('?') ? '&' : '?') + 'apiKey=' + encodeURIComponent(API_KEY);
  }

  const QBStorage = {
    _state: null,
    _loading: null,
    _lastFetchAt: 0,

    // تحميل الحالة كاملة من الشيت (عُهد + مصروفات)
    async load(options = {}) {
      if (this._loading) return this._loading;

      const mustRefetch = options.force || !this._state || (Date.now() - this._lastFetchAt > 15000);
      if (!mustRefetch) return this._state;

      this._loading = (async () => {
        const url = withApiKey(GAS_URL + '?action=export', true);
        const res = await fetch(url); // GET بدون هيدرات (Simple CORS)
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || json.message || 'GAS export failed');

        const advances = Array.isArray(json.advances) ? json.advances : [];
        const expenses = Array.isArray(json.expenses) ? json.expenses : [];
        this._state = { advances, expenses };
        this._lastFetchAt = Date.now();
        this._loading = null;
        return this._state;
      })();

      return this._loading;
    },

    save(state) {
      this._state = state || this._state;
      return this._state;
    },

    uid() {
      return 'id-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
    },

    // ===== العُهد =====
    async addAdvance(adv) {
      const payload = {
        action: 'addAdvance',
        data: {
          track: adv.track || '',
          title: adv.title,
          amount: Number(adv.amount) || 0,
          date: adv.date || new Date().toISOString().slice(0,10),
          notes: adv.notes || ''
        }
      };
      const res = await fetch(withApiKey(GAS_URL, false), {
        method: 'POST',
        headers: headersPOST,
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || json.message || 'addAdvance failed');

      await this.load({ force: true });
      const a = (this._state.advances || []).find(x => x.id === json.id)
            || (this._state.advances || [])[ (this._state.advances || []).length - 1 ];
      return a || { id: json.id, ...payload.data };
    },

    async updateAdvance(id, patch) {
      const payload = { action: 'updateAdvance', id, data: patch };
      const res = await fetch(withApiKey(GAS_URL, false), {
        method: 'POST',
        headers: headersPOST,
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || json.message || 'updateAdvance failed');
      await this.load({ force: true });
      return (this._state.advances || []).find(a => a.id === id) || null;
    },

    async deleteAdvance(id) {
      const payload = { action: 'deleteAdvance', id };
      const res = await fetch(withApiKey(GAS_URL, false), {
        method: 'POST',
        headers: headersPOST,
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!json.ok) {
        if (json.code === 'has_expenses') return { ok: false, reason: 'hasExpenses' };
        if (json.code === 'not_found')   return { ok: false, reason: 'notFound' };
        throw new Error(json.error || json.message || 'deleteAdvance failed');
      }

      await this.load({ force: true });
      return { ok: true };
    },

    // ===== المصروفات =====
    async addExpense(exp) {
      const payload = {
        action: 'addExpense',
        data: {
          advanceId: exp.advanceId,
          amount: Number(exp.amount) || 0,
          kind: exp.kind || '',
          invoiceNo: exp.invoiceNo || '',
          name: exp.name || '',
          notes: exp.notes || '',
          date: exp.date || new Date().toISOString().slice(0,10)
        }
      };
      const res = await fetch(withApiKey(GAS_URL, false), {
        method: 'POST',
        headers: headersPOST,
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.ok) {
        if (json.code === 'over_amount') throw new Error('المبلغ يتجاوز المتبقي في العُهدة');
        throw new Error(json.error || json.message || 'addExpense failed');
      }
      await this.load({ force: true });
      const x = (this._state.expenses || []).find(e => e.id === json.id)
            || (this._state.expenses || [])[ (this._state.expenses || []).length - 1 ];
      return x || { id: json.id, ...payload.data };
    },

    async updateExpense(id, patch) {
      const payload = { action: 'updateExpense', id, data: patch };
      const res = await fetch(withApiKey(GAS_URL, false), {
        method: 'POST',
        headers: headersPOST,
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || json.message || 'updateExpense failed');
      await this.load({ force: true });
      return (this._state.expenses || []).find(e => e.id === id) || null;
    },

    async deleteExpense(id) {
      const payload = { action: 'deleteExpense', id };
      const res = await fetch(withApiKey(GAS_URL, false), {
        method: 'POST',
        headers: headersPOST,
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || json.message || 'deleteExpense failed');
      await this.load({ force: true });
      return { ok: true };
    },

    // ===== أدوات إضافية =====
    exportJSON() {
      if (!this._state) return JSON.stringify({ advances: [], expenses: [] }, null, 2);
      return JSON.stringify(this._state, null, 2);
    },

    importJSON() {
      alert('الاستيراد المباشر غير مفعّل في نسخة GAS. فضلاً استخدم import على الخادم إن رغبت.');
      return false;
    },

    clear() {
      this._state = { advances: [], expenses: [] };
      return this._state;
    }
  };

  global.QBStorage = QBStorage;
})(window);

'use strict';
window.Client = (() => {
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const id = value => { const n = Number(value); return /^\d+$/.test(String(value)) && Number.isSafeInteger(n) && n > 0 ? n : null; };
  let currentUser = null;
  function clearAuth() {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    sessionStorage.removeItem('quest_logged_in'); sessionStorage.removeItem('quest_user'); currentUser = null;
  }
  function logout() { clearAuth(); location.assign('login.html'); }
  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem('token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body) headers.set('Content-Type', 'application/json');
    const res = await fetch(path, {...options, headers});
    let data; try { data = await res.json(); } catch { data = {}; }
    if (res.status === 401) { clearAuth(); location.replace('login.html'); throw new Error('Your session has expired. Please sign in again.'); }
    if (!res.ok || data.status === 'error') throw new Error(data.message || `Request failed (${res.status}).`);
    return data;
  }
  function updateNav(user) {
    document.querySelectorAll('a[href="login.html"]').forEach(link => {
      if (link.closest('nav')) {
        link.textContent = user ? 'Logout' : 'Login / Register';
        link.onclick = user ? event => { event.preventDefault(); logout(); } : null;
      }
    });
  }
  async function requireUser() {
    if (!localStorage.getItem('token')) { clearAuth(); location.replace('login.html'); throw new Error('Please sign in.'); }
    const data = await api('/api/auth/me');
    const user = data.user || data.data?.user || data.data;
    if (!user || !id(user.id) || !['buyer','admin'].includes(user.role)) { clearAuth(); location.replace('login.html'); throw new Error('Invalid account session.'); }
    currentUser = user; localStorage.setItem('user', JSON.stringify(user)); updateNav(user); return user;
  }
  async function busy(element, action) {
    if (element.dataset.busy === 'true') return;
    element.dataset.busy = 'true';
    const controls = element.matches('button') ? [element] : [...element.querySelectorAll('button, input, textarea, select')];
    const states = controls.map(c => c.disabled); controls.forEach(c => { c.disabled = true; });
    try { return await action(); } finally { controls.forEach((c,i) => { c.disabled = states[i]; }); delete element.dataset.busy; }
  }
  function message(text, error = false, target = 'page-message') {
    const el = document.getElementById(target); if (el) { el.textContent = text; el.className = error ? 'error-message' : 'success-message'; }
  }
  function rows(data) { if (!Array.isArray(data.data)) throw new Error('Unexpected response from server.'); return data.data; }
  function money(value) { const n=Number(value); return Number.isFinite(n) ? n.toLocaleString(undefined,{maximumFractionDigits:2}) : 'N/A'; }
  function date(value) { const d=new Date(value); return value && Number.isFinite(d.getTime()) ? d.toLocaleString() : 'N/A'; }
  function validateParticulars(payload) {
    if (!payload.full_name || !payload.ic_number || !payload.phone) throw new Error('Name, IC/passport and phone are required.');
    if ([payload.full_name,payload.ic_number,payload.phone,payload.remarks].some(value => String(value ?? '').includes('|'))) throw new Error('The | character is not allowed in customer particulars or remarks.');
    if (String(payload.remarks ?? '').length > 2000) throw new Error('Remarks must be 2,000 characters or fewer.');
  }
  document.addEventListener('DOMContentLoaded', () => {
    updateNav(null);
    const page = location.pathname.split('/').pop();
    if (!['units.html','buyers.html','login.html','signup.html'].includes(page) && localStorage.getItem('token')) requireUser().catch(err => message(err.message,true));
    // Legacy simulated sessions are never considered authenticated.
    sessionStorage.removeItem('quest_logged_in'); sessionStorage.removeItem('quest_user');
  });
  return {escapeHTML, id, api, clearAuth, logout, requireUser, busy, message, rows, money, date, validateParticulars, get user(){return currentUser;}};
})();

'use strict';
const form = document.getElementById('login-form') || document.getElementById('signup-form');
const isLogin = form.id === 'login-form';
// Check stored sessions with the server, never with a simulated frontend flag.
if (localStorage.getItem('token')) Client.requireUser().catch(err => Client.message(err.message,true,'auth-message'));
form.addEventListener('submit', event => {
  event.preventDefault();
  Client.busy(form, async () => {
    Client.message('',false,'auth-message');
    const email=document.getElementById('email').value.trim(), password=document.getElementById('password').value;
    const payload={email,password};
    try {
      if (!isLogin) {
        if ([...password].length < 8 || new TextEncoder().encode(password).length > 72) throw new Error('Password must contain at least 8 characters and at most 72 UTF-8 bytes.');
        payload.name=document.getElementById('name').value.trim(); payload.phone=document.getElementById('phone').value.trim();
        if (!payload.name) throw new Error('Please enter your full name.');
      }
      if (isLogin) Client.clearAuth();
      // Login deliberately uses fetch so bad credentials do not cause a 401 redirect loop.
      const res=await fetch(`/api/auth/${isLogin?'login':'register'}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      let data; try { data=await res.json(); } catch { throw new Error('Invalid server response. Please try again.'); }
      if (!res.ok || data.status==='error') throw new Error(data.message || (isLogin?'Invalid email or password.':'Registration failed.'));
      if (isLogin) {
        if (typeof data.token!=='string' || !data.token || !Client.id(data.user?.id) || !['buyer','admin'].includes(data.user?.role)) throw new Error('Invalid login response.');
        localStorage.setItem('token',data.token); localStorage.setItem('user',JSON.stringify(data.user)); location.assign('units.html');
      } else { Client.message('Registration successful. You can now sign in.',false,'auth-message'); form.reset(); }
    } catch(err) { if (isLogin) Client.clearAuth(); Client.message(err.message || 'Unable to connect to server.',true,'auth-message'); }
  });
});

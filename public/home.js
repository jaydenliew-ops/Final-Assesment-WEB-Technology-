'use strict';
(async () => {
  try {
    const properties=Client.rows(await Client.api('/api/properties'));
    document.getElementById('available-count').textContent=String(properties.filter(p=>String(p.status).toLowerCase()==='available').length);
  } catch { document.getElementById('available-count').textContent='See listings'; }
})();

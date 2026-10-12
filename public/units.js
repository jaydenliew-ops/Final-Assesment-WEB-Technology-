'use strict';
let currentReserveUnitId=null, loadVersion=0;
const E=Client.escapeHTML;

async function loadAllUnits() {
  const version=++loadVersion, container=document.getElementById('units-container');
  const currency=document.getElementById('currency-select').value;
  container.innerHTML='<p class="empty">Loading property details...</p>';
  try {
    const units=Client.rows(await Client.api(`/api/properties?currency=${encodeURIComponent(currency)}`));
    if (version!==loadVersion) return;
    if (!units.length) { container.innerHTML='<p class="empty">No property data available.</p>'; return; }
    const grouped=new Map();
    for (const unit of units) { const key=String(unit.project_name || 'Other Projects'); if (!grouped.has(key)) grouped.set(key,[]); grouped.get(key).push(unit); }
    let html='';
    for (const project of [...grouped.keys()].sort()) {
      const group=grouped.get(project).sort((a,b)=>String(a.unit_number||'').localeCompare(String(b.unit_number||'')));
      html+=`<div class="project-section-title">🏢 ${E(project)} (${group.length} Units)</div><div class="unit-grid">`;
      for (const unit of group) {
        const uid=Client.id(unit.unit_id), status=String(unit.status||'Unknown'), lower=status.toLowerCase();
        const statusClass=lower==='available'?'available':['sold','confirmed'].includes(lower)?'sold':'reserved';
        const displayCurrency=String(unit.display_currency||currency);
        const action=uid && lower==='available'?`<button class="btn btn-primary" onclick="openBookModal(${uid})">Reserve Property (No payment)</button>`:`<button class="btn btn-disabled" disabled>${E(status.toUpperCase())}</button>`;
        html+=`<div class="property-card"><div class="card-header"><h3>${E(unit.project_name||'Property Unit')}</h3><span class="unit-tag">${E(unit.unit_number||'N/A')}</span></div><div class="card-body"><div class="price-row"><span>Original Price (MYR):</span><span>MYR ${E(Client.money(unit.price_myr))}</span></div><div class="price-row main-price"><span>Indicative Price (${E(displayCurrency)}):</span><span class="price-val highlight">${E(displayCurrency)} ${E(Client.money(unit.converted_price??unit.price_myr))}</span></div><div class="info-row"><span>📍 GPS Coordinates:</span><span>Lat ${E(unit.latitude??'N/A')}, Long ${E(unit.longitude??'N/A')}</span></div><div class="info-row"><span>📌 Status:</span><span class="status-badge status-${statusClass}">${E(status)}</span></div></div><div class="card-footer">${action}</div></div>`;
      }
      html+='</div>';
    }
    container.innerHTML=html;
  } catch(err) { if(version===loadVersion) { container.innerHTML=`<p class="empty error-message">${E(err.message||'Unable to load properties.')}</p>`; } }
}

function autoGetLocation() {
  if (!navigator.geolocation) { Client.message('Location is unavailable. Enter coordinates manually.',true,'add-message'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    document.getElementById('latitude').value=pos.coords.latitude.toFixed(8);
    document.getElementById('longitude').value=pos.coords.longitude.toFixed(8);
    Client.message('Location detected. Check the coordinates before saving.',false,'add-message');
  },()=>Client.message('Location permission denied or timed out. Enter coordinates manually.',true,'add-message'),{timeout:5000});
}

function openAddModal() { Client.message('',false,'add-message'); document.getElementById('addModal').style.display='flex'; }
function closeAddModal() { if(document.getElementById('addPropertyForm').dataset.busy==='true') return; document.getElementById('addModal').style.display='none'; }
function openBookModal(value) { const uid=Client.id(value); if(!uid || !Client.user) return; currentReserveUnitId=uid; Client.message('',false,'book-message'); document.getElementById('bookModal').style.display='flex'; }
function closeBookModal() { if(document.getElementById('bookDetailsForm').dataset.busy==='true') return; hideBookModal(); }
function hideBookModal() { document.getElementById('bookModal').style.display='none'; document.getElementById('bookDetailsForm').reset(); currentReserveUnitId=null; }

for (const [formId,messageId] of [['addPropertyForm','add-message'],['bookDetailsForm','book-message']]) {
  const p=document.createElement('p'); p.id=messageId; p.setAttribute('role','alert'); document.getElementById(formId).prepend(p);
}

document.getElementById('addPropertyForm').addEventListener('submit',event=>{
  event.preventDefault(); const form=event.currentTarget;
  Client.busy(form,async()=>{
    try {
      const latitude=document.getElementById('latitude').value.trim(),longitude=document.getElementById('longitude').value.trim();
      const payload={project_name:document.getElementById('projectName').value.trim(),unit_number:document.getElementById('unitNumber').value.trim(),price_myr:Number(document.getElementById('priceMyr').value),latitude:latitude===''?null:Number(latitude),longitude:longitude===''?null:Number(longitude)};
      if(!payload.project_name || !payload.unit_number || !Number.isFinite(payload.price_myr) || payload.price_myr<=0) throw new Error('Enter a project, unit number and positive price.');
      if((latitude!=='' && (!Number.isFinite(payload.latitude)||Math.abs(payload.latitude)>90)) || (longitude!=='' && (!Number.isFinite(payload.longitude)||Math.abs(payload.longitude)>180))) throw new Error('Enter valid latitude and longitude.');
      await Client.api('/api/properties',{method:'POST',body:JSON.stringify(payload)});
      document.getElementById('addModal').style.display='none'; form.reset(); Client.message('Property added successfully.'); await loadAllUnits();
    } catch(err) { Client.message(err.message,true,'add-message'); }
  });
});

document.getElementById('bookDetailsForm').addEventListener('submit',event=>{
  event.preventDefault(); const form=event.currentTarget;
  Client.busy(form,async()=>{
    try {
      const payload={unit_id:Client.id(currentReserveUnitId),full_name:document.getElementById('bookFullName').value.trim(),ic_number:document.getElementById('bookIcNumber').value.trim(),phone:document.getElementById('bookPhone').value.trim(),remarks:document.getElementById('bookRemarks').value.trim()};
      if(!payload.unit_id) throw new Error('Select a valid property unit.');
      Client.validateParticulars(payload);
      await Client.api('/api/properties/reserve',{method:'POST',body:JSON.stringify(payload)});
      hideBookModal(); Client.message('Property reserved. Check My Bookings for the expiry time. No money was transferred.'); await loadAllUnits();
    } catch(err) { Client.message(err.message,true,'book-message'); }
  });
});

(async()=>{ try { await Client.requireUser(); await loadAllUnits(); } catch(err) { Client.message(err.message,true); } })();
'use strict';
let bookingsData=[], demoPayments=true, bookingsVersion=0;
const E=Client.escapeHTML;
function findBooking(value) { const id=Client.id(value); return id?bookingsData.find(row=>Client.id(row.reservation_id)===id):null; }
function pending(record) { return String(record?.status).toLowerCase()==='pending' && (!record.expires_at || new Date(record.expires_at).getTime()>Date.now()); }
function particulars(record) {
  const text=String(record.remarks||'');
  const match=key=>{const found=text.match(new RegExp(key+':\\s*([^|]+)','i'));return found?found[1].trim():'';};
  return {name:record.full_name||match('Name'),ic:record.ic_number||match('IC'),phone:record.phone||match('Phone'),note:text.match(/Note:\s*([\s\S]*)/i)?.[1]?.trim() || (text.includes('Name:')?'':text)};
}
async function loadUserBookings() {
  const version=++bookingsVersion,container=document.getElementById('booking-list');
  container.innerHTML='<p class="empty">Loading your bookings...</p>';
  try {
    const rows=Client.rows(await Client.api('/api/my-reservations')); if(version!==bookingsVersion) return; bookingsData=rows;
    if(!rows.length) { container.innerHTML='<p class="empty">No booking records found.</p>';return; }
    let html='<div class="bookings-grid">';
    for(const item of rows) {
      const rid=Client.id(item.reservation_id),status=String(item.status||'Unknown'),lower=status.toLowerCase();
      const badge=lower==='confirmed'?'confirmed':lower==='pending'?'pending':'cancelled';
      let actions=rid?`<button class="btn-action btn-particulars" onclick="showParticulars(${rid})">👤 Particulars</button>`:'';
      // 移除了支付按钮，只保留编辑和取消预约按钮
      if(rid && pending(item)) actions+=`<button class="btn-action btn-edit" onclick="openEditModal(${rid})">✏️ Edit</button><button class="btn-action btn-cancel" onclick="cancelReservation(${rid},this)">Cancel reservation</button>`;
      html+=`<div class="booking-card"><div><div class="booking-header"><span>🔖 Reservation #${E(item.reservation_id)}</span><span class="badge-tag badge-${badge}">${E(status)}</span></div><div class="booking-body"><div class="info-row"><span>🏠 Property Unit ID:</span><strong>Unit #${E(item.unit_id)}</strong></div><div class="info-row"><span>🏢 Project / Unit:</span><strong>${E(item.project_name||'N/A')} (${E(item.unit_number||'N/A')})</strong></div><div class="info-row"><span>Listed Booking Fee:</span><strong>MYR ${E(Client.money(item.booking_fee_myr??1000))}</strong></div><div class="info-row"><span>📅 Booking Date:</span><span>${E(Client.date(item.created_at))}</span></div><div class="info-row"><span>Reservation expires:</span><span>${E(Client.date(item.expires_at))}</span></div>${item.remarks?`<div class="particulars-box"><div class="particulars-title">Customer particulars / remarks:</div><div>${E(item.remarks)}</div></div>`:''}</div></div><div class="card-actions">${actions}</div></div>`;
    }
    container.innerHTML=html+'</div>';
  } catch(err) { if(version===bookingsVersion) container.innerHTML=`<p class="empty error-message">${E(err.message||'Unable to load bookings.')}</p>`; }
}
function showParticulars(value) {
  const record=findBooking(value); if(!record) return; const p=particulars(record);
  document.getElementById('viewParticularsBody').innerHTML=`<div class="detail-view-row"><strong>Full Name:</strong> ${E(p.name||'N/A')}</div><div class="detail-view-row"><strong>IC / Passport:</strong> ${E(p.ic||'N/A')}</div><div class="detail-view-row"><strong>Contact Phone:</strong> ${E(p.phone||'N/A')}</div><div class="detail-view-row"><strong>Remarks:</strong> ${E(p.note||'N/A')}</div>`;
  document.getElementById('viewParticularsModal').style.display='flex';
}
function openEditModal(value) {
  const record=findBooking(value); if(!pending(record)) return; const p=particulars(record);
  document.getElementById('editReservationId').value=Client.id(record.reservation_id);
  for(const [key,id] of [['name','buyerFullName'],['ic','buyerIcNumber'],['phone','buyerPhone'],['note','buyerRemarks']]) document.getElementById(id).value=p[key]==='N/A'?'':p[key];
  Client.message('',false,'edit-message');document.getElementById('buyerModal').style.display='flex';
}
function closeModal(value) { if(!['buyerModal','viewParticularsModal'].includes(value)) return; if(value==='buyerModal' && document.getElementById('buyerDetailsForm').dataset.busy==='true') return; document.getElementById(value).style.display='none'; }
const inflight=new Set();
async function reservationAction(value,button,pay) {
  const record=findBooking(value),id=Client.id(value); if(!id || !pending(record) || inflight.has(id)) return;
  if(!confirm('Cancel this pending reservation? No money will be transferred.')) return;
  inflight.add(id);
  try { await Client.busy(button,async()=>{
    try { await Client.api(`/api/properties/cancel-reservation`,{method:'POST',body:JSON.stringify({reservation_id:id})}); Client.message('Pending reservation cancelled.'); await loadUserBookings(); }
    catch(err) { Client.message(err.message,true); }
  }); } finally { inflight.delete(id); }
}
function cancelReservation(id,button) { return reservationAction(id,button,false); }
const editForm=document.getElementById('buyerDetailsForm'),editMessage=document.createElement('p'); editMessage.id='edit-message';editMessage.setAttribute('role','alert');editForm.prepend(editMessage);
editForm.addEventListener('submit',event=>{
  event.preventDefault(); Client.busy(editForm,async()=>{
    try {
      const id=Client.id(document.getElementById('editReservationId').value); if(!pending(findBooking(id))) throw new Error('Only pending, unexpired reservations can be edited.');
      const payload={reservation_id:id,full_name:document.getElementById('buyerFullName').value.trim(),ic_number:document.getElementById('buyerIcNumber').value.trim(),phone:document.getElementById('buyerPhone').value.trim(),remarks:document.getElementById('buyerRemarks').value.trim()};
      Client.validateParticulars(payload);
      await Client.api('/api/properties/update-buyer-details',{method:'POST',body:JSON.stringify(payload)});
      document.getElementById('buyerModal').style.display='none';Client.message('Buyer particulars updated.');await loadUserBookings();
    } catch(err) { Client.message(err.message,true,'edit-message'); }
  });
});
(async()=>{
  try {
    await Client.requireUser();
    await loadUserBookings();
  } catch(err) { Client.message(err.message,true); }
})();
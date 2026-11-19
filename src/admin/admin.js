import './admin.css';

const API = (import.meta.env && import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const dt = (s) => new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const app = $('#app');

const SHIP = { pending: 'Pendiente', preparing: 'Preparado', shipped: 'Despachado', delivered: 'Entregado', cancelled: 'Cancelado' };
const PAY = { pending: ['Pago pendiente', 'wait'], approved: ['Pagado', 'ok'], rejected: ['Rechazado', 'bad'], cancelled: ['Cancelado', 'bad'], refunded: ['Reembolsado', 'bad'] };
const SHIP_CLASS = { pending: 'wait', preparing: 'wait', shipped: '', delivered: 'ok', cancelled: 'bad' };

const S = { tab: 'orders', user: null, orders: [], products: [], zones: [], stats: null, summary: [], filter: '', q: '' };
const openOrders = new Set();

async function api(path, opts = {}) {
  const r = await fetch(API + '/api/admin' + path, {
    credentials: 'same-origin',
    ...opts,
    headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* sin cuerpo */ }
  if (r.status === 401 && path !== '/login') { S.user = null; renderLogin(); throw new Error('Tu sesión venció. Ingresá de nuevo.'); }
  if (!r.ok) throw new Error((data && data.error) || 'Algo salió mal.');
  return data;
}

let toastT;
function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 3500);
}
const fail = (e) => toast(e.message || 'Error');

/* ---------- login ---------- */
function renderLogin(message) {
  app.innerHTML = `<div class="login"><form id="login" autocomplete="on">
    <img src="/img/logo.jpg" alt="SAKKA">
    <h1>Panel de administración</h1>
    ${message ? `<p class="err" role="alert">${esc(message)}</p>` : ''}
    <label class="f">Usuario<input name="username" autocomplete="username" required></label>
    <label class="f">Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn primary" type="submit" style="width:100%">Ingresar</button></form></div>`;
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target; const btn = $('button', f); btn.disabled = true;
    try {
      const r = await api('/login', { method: 'POST', body: { username: f.username.value.trim(), password: f.password.value } });
      S.user = r.username; await start();
    } catch (err) { renderLogin(err.message); }
  });
  $('#login input').focus();
}

/* ---------- carga ---------- */
async function loadAll() {
  const [o, c, z, st, ps] = await Promise.all([api('/orders'), api('/catalog'), api('/zones'), api('/stats'), api('/production-summary')]);
  S.orders = o.orders; S.products = c.products; S.zones = z.zones; S.stats = st.stats; S.summary = ps.summary;
}
async function start() {
  try { await loadAll(); renderShell(); } catch (e) { if (S.user) { renderShell(); fail(e); } }
}

/* ---------- estructura ---------- */
const TABS = [['orders', 'Pedidos'], ['stock', 'Stock y precios'], ['zones', 'Envíos'], ['summary', 'Resumen']];
function renderShell() {
  app.innerHTML = `<header class="bar"><div class="in"><img src="/img/logo.jpg" alt="SAKKA">
    <nav class="tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${l}${k === 'orders' && S.stats?.to_ship ? ` (${S.stats.to_ship})` : ''}</button>`).join('')}</nav>
    <span class="sp"></span><span class="muted" style="color:#cfd3d9">${esc(S.user)}</span>
    <button class="btn sm" id="refresh" type="button">Actualizar</button><button class="btn sm" id="logout" type="button">Salir</button></div></header>
    <main id="view"></main>`;
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.tab; renderShell(); }));
  $('#refresh').addEventListener('click', async () => { try { await loadAll(); renderShell(); toast('Datos actualizados.'); } catch (e) { fail(e); } });
  $('#logout').addEventListener('click', async () => { try { await api('/logout', { method: 'POST' }); } catch (e) { /* ya salió */ } S.user = null; renderLogin(); });
  ({ orders: viewOrders, stock: viewStock, zones: viewZones, summary: viewSummary })[S.tab]();
}

/* ---------- pedidos ---------- */
function orderCard(o) {
  const [pl, pc] = PAY[o.payment_status] || [o.payment_status, ''];
  const a = typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : (o.shipping_address || {});
  const paid = o.payment_status === 'approved';
  const stockWarn = o.stock_status === 'insufficient';
  const addr = `${a.street || ''} ${a.number || ''}${a.apartment ? ', ' + a.apartment : ''} · ${o.shipping_zone_name || ''} (CP ${a.postalCode || ''})`;
  return `<details class="order" data-code="${esc(o.tracking_code)}" ${openOrders.has(o.tracking_code) ? 'open' : ''}>
    <summary><b>${esc(o.tracking_code)}</b><span style="min-width:0;overflow-wrap:anywhere">${esc(o.customer_name)} · ${esc(o.shipping_zone_name || '')}<br><span class="muted">${dt(o.created_at)} · ${money(o.total_amount)}</span></span>
      <span class="pill ${pc}">${pl}</span><span class="pill ${SHIP_CLASS[o.shipping_status] || ''}">${SHIP[o.shipping_status] || o.shipping_status}</span></summary>
    <div class="body">
      ${stockWarn ? `<div class="warn"><b>Falta stock.</b> Se cobró este pedido pero el stock cargado no alcanzaba. Cargá stock y reintentá el descuento. <button class="btn sm" data-act="retry-stock">Reintentar descuento</button></div>` : ''}
      <div class="grid">
        <div><h3>Cliente y entrega</h3><dl><dt>Nombre</dt><dd>${esc(o.customer_name)}</dd><dt>Teléfono</dt><dd>${esc(o.customer_phone)}</dd><dt>Correo</dt><dd>${esc(o.customer_email)}</dd><dt>Dirección</dt><dd>${esc(addr)}</dd>${a.references ? `<dt>Referencias</dt><dd>${esc(a.references)}</dd>` : ''}<dt>Envío</dt><dd>${money(o.shipping_amount)}</dd><dt>Stock</dt><dd>${esc({ none: 'Sin descontar', deducted: 'Descontado', insufficient: 'Faltante', restocked: 'Devuelto' }[o.stock_status] || o.stock_status)}</dd><dt>Mail</dt><dd>${esc(o.confirmation_email_status || '-')} ${paid ? '<button class="btn sm" data-act="resend">Reenviar confirmación</button>' : ''}</dd></dl>
          <h3 style="margin-top:14px">Camisetas</h3><ul style="margin:0;padding-left:18px">${o.items.map((i) => `<li>${i.quantity}× ${esc(i.product_name)} · talle ${esc(i.size)}</li>`).join('')}</ul></div>
        <div><h3>Estado del envío</h3>
          ${paid ? `<div class="row" style="margin-bottom:10px">${['pending', 'preparing', 'shipped', 'delivered', 'cancelled'].map((s) => `<button class="btn sm${o.shipping_status === s ? ' primary' : ''}" data-act="status" data-s="${s}" ${o.shipping_status === s ? 'disabled' : ''}>${SHIP[s]}</button>`).join('')}</div>
          <label class="f">Número de seguimiento (opcional)<input data-f="tn" maxlength="300" value="${esc(o.tracking_number || '')}"></label>
          <label class="f">Nota para el cliente (opcional)<input data-f="note" maxlength="300" value="${esc(o.shipping_note || '')}" placeholder="Ej: lo entregamos el viernes por la tarde"></label>
          <label class="chk"><input type="checkbox" data-f="notify" checked> Avisar al cliente por correo</label>
          <button class="btn sm" data-act="save-ship">Guardar nota y seguimiento</button>`
      : '<p class="muted">El estado de envío se habilita cuando el pago está acreditado.</p>'}
          <h3 style="margin-top:14px">Historial</h3><ul style="margin:0;padding-left:18px;font-size:.85rem">${o.events.map((e) => `<li>${dt(e.at)} · ${esc(e.kind)}: ${esc(e.status || '')}${e.note ? ' · ' + esc(e.note) : ''}</li>`).join('')}</ul></div>
      </div></div></details>`;
}
function viewOrders() {
  const q = S.q.trim().toLowerCase();
  const list = S.orders.filter((o) => (!S.filter || (S.filter === 'unpaid' ? o.payment_status !== 'approved' : o.payment_status === 'approved' && o.shipping_status === S.filter))
    && (!q || `${o.tracking_code} ${o.customer_name} ${o.customer_email} ${o.shipping_zone_name}`.toLowerCase().includes(q)));
  $('#view').innerHTML = `<div class="tools"><input id="oq" type="search" placeholder="Buscar por código, nombre, correo o localidad" value="${esc(S.q)}" aria-label="Buscar pedidos">
    <select id="of" aria-label="Filtrar"><option value="">Todos los pedidos</option><option value="pending">Pagados · pendientes</option><option value="preparing">Pagados · preparados</option><option value="shipped">Despachados</option><option value="delivered">Entregados</option><option value="cancelled">Cancelados</option><option value="unpaid">Sin pago acreditado</option></select></div>
    ${list.length ? list.map(orderCard).join('') : '<p class="muted">No hay pedidos que coincidan.</p>'}`;
  $('#of').value = S.filter;
  $('#oq').addEventListener('input', (e) => { S.q = e.target.value; const pos = e.target.selectionStart; viewOrders(); const i = $('#oq'); i.focus(); i.setSelectionRange(pos, pos); });
  $('#of').addEventListener('change', (e) => { S.filter = e.target.value; viewOrders(); });
  $$('.order').forEach((d) => d.addEventListener('toggle', () => { d.open ? openOrders.add(d.dataset.code) : openOrders.delete(d.dataset.code); }));
  $$('.order [data-act]').forEach((b) => b.addEventListener('click', () => orderAction(b)));
}
async function orderAction(btn) {
  const card = btn.closest('.order'); const code = card.dataset.code; const act = btn.dataset.act;
  btn.disabled = true;
  try {
    if (act === 'retry-stock') { await api(`/orders/${code}/retry-stock`, { method: 'POST' }); toast('Stock descontado.'); }
    else if (act === 'resend') { const r = await api(`/orders/${code}/resend-confirmation`, { method: 'POST' }); toast(r.ok ? 'Correo reenviado.' : 'No se pudo enviar el correo.'); }
    else {
      const body = { tracking_number: $('[data-f=tn]', card).value.trim(), note: $('[data-f=note]', card).value.trim(), notify: $('[data-f=notify]', card).checked };
      if (act === 'status') {
        body.shipping_status = btn.dataset.s;
        if (btn.dataset.s === 'cancelled' && !btn.dataset.sure) { btn.dataset.sure = '1'; btn.disabled = false; btn.textContent = '¿Seguro? Devuelve el stock'; return; }
      } else {
        body.shipping_status = S.orders.find((o) => o.tracking_code === code).shipping_status;
        body.notify = false;
      }
      const r = await api(`/orders/${code}`, { method: 'PATCH', body });
      toast(r.emailSent ? 'Guardado y cliente avisado.' : r.emailError ? 'Guardado, pero no se pudo enviar el correo.' : 'Guardado.');
    }
    await loadAll(); renderShell();
  } catch (e) { fail(e); btn.disabled = false; }
}

/* ---------- stock ---------- */
function viewStock() {
  $('#view').innerHTML = `<div class="box"><h2>Stock y precios</h2><p class="muted">Cargá la cantidad que tenés de cada talle. “—” significa que todavía no cargaste ese talle: se muestra como agotado. Los cambios se aplican al tocar Guardar en cada fila y se ven al instante en la tienda.</p>
    <div class="scroll"><table><thead><tr><th>Camiseta</th><th>Visible</th><th>Precio</th>${SIZES.map((s) => `<th>${s}</th>`).join('')}<th></th></tr></thead><tbody>
    ${S.products.map((p) => `<tr data-id="${esc(p.id)}"><td><b>${esc(p.name)}</b></td><td><input type="checkbox" data-f="active" ${p.active ? 'checked' : ''} aria-label="Visible en la tienda" style="width:auto;min-height:0"></td>
      <td><input class="price" data-f="price" type="number" min="1" step="100" value="${p.price}" aria-label="Precio de ${esc(p.name)}"></td>
      ${SIZES.map((s) => `<td><input data-f="s-${s}" type="number" min="0" max="9999" step="1" inputmode="numeric" value="${p.stock[s].configured ? p.stock[s].quantity : ''}" placeholder="—" aria-label="Stock talle ${s}"></td>`).join('')}
      <td><button class="btn sm" data-act="save" disabled>Guardar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  $$('#view tr[data-id]').forEach((tr) => {
    $$('input', tr).forEach((i) => i.addEventListener('input', () => { $('[data-act=save]', tr).disabled = false; }));
    $('[data-act=save]', tr).addEventListener('click', async (e) => {
      const p = S.products.find((x) => x.id === tr.dataset.id); const btn = e.currentTarget; btn.disabled = true;
      const patch = {};
      const price = Number($('[data-f=price]', tr).value);
      if (price !== p.price) patch.price = price;
      const active = $('[data-f=active]', tr).checked; if (active !== p.active) patch.active = active;
      const stock = {};
      SIZES.forEach((s) => { const v = $(`[data-f=s-${s}]`, tr).value; if (v === '') return; const n = Number(v); if (!p.stock[s].configured || n !== p.stock[s].quantity) stock[s] = n; });
      if (Object.keys(stock).length) patch.stock = stock;
      if (!Object.keys(patch).length) { toast('No hay cambios.'); return; }
      try { const r = await api(`/products/${p.id}`, { method: 'PATCH', body: patch }); Object.assign(p, r.product); toast('Guardado.'); viewStock(); }
      catch (err) { fail(err); btn.disabled = false; }
    });
  });
}

/* ---------- zonas ---------- */
function viewZones() {
  $('#view').innerHTML = `<div class="box"><h2>Costo de envío por localidad</h2><p class="muted">El cliente elige su localidad en el checkout y paga este importe junto con las camisetas. Si una localidad no está en la lista, no puede comprar con envío ahí. Los precios iniciales son provisorios: revisalos.</p>
    <form id="zadd" class="row" style="align-items:end;margin-bottom:14px"><label class="f" style="flex:2 1 160px;margin:0">Localidad<input name="name" required minlength="2"></label><label class="f" style="flex:2 1 160px;margin:0">Provincia<input name="province" required value="Buenos Aires"></label><label class="f" style="flex:1 1 110px;margin:0">Precio<input name="price" type="number" min="0" step="100" required></label><button class="btn primary" type="submit">Agregar</button></form>
    <div class="scroll"><table><thead><tr><th>Localidad</th><th>Provincia</th><th>Precio</th><th>Activa</th><th></th></tr></thead><tbody>
    ${S.zones.map((z) => `<tr data-id="${esc(z.id)}"><td>${esc(z.name)}</td><td>${esc(z.province)}</td><td><input class="price" data-f="price" type="number" min="0" step="100" value="${z.price}" aria-label="Precio de ${esc(z.name)}"></td><td><input type="checkbox" data-f="active" ${z.active ? 'checked' : ''} style="width:auto;min-height:0" aria-label="Activa"></td>
      <td class="row"><button class="btn sm" data-act="save" disabled>Guardar</button><button class="btn sm" data-act="del">Borrar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  $('#zadd').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    try { await api('/zones', { method: 'POST', body: { name: f.name.value, province: f.province.value, price: Number(f.price.value) } }); S.zones = (await api('/zones')).zones; toast('Localidad agregada.'); viewZones(); } catch (err) { fail(err); }
  });
  $$('#view tr[data-id]').forEach((tr) => {
    const id = tr.dataset.id;
    $$('input', tr).forEach((i) => i.addEventListener('input', () => { $('[data-act=save]', tr).disabled = false; }));
    $('[data-act=save]', tr).addEventListener('click', async () => {
      try { await api(`/zones/${id}`, { method: 'PATCH', body: { price: Number($('[data-f=price]', tr).value), active: $('[data-f=active]', tr).checked } }); S.zones = (await api('/zones')).zones; toast('Guardado.'); viewZones(); } catch (err) { fail(err); }
    });
    const del = $('[data-act=del]', tr);
    del.addEventListener('click', async () => {
      if (!del.dataset.sure) { del.dataset.sure = '1'; del.textContent = '¿Seguro?'; return; }
      try { await api(`/zones/${id}`, { method: 'DELETE' }); S.zones = S.zones.filter((z) => z.id !== id); toast('Localidad borrada.'); viewZones(); } catch (err) { fail(err); }
    });
  });
}

/* ---------- resumen ---------- */
function viewSummary() {
  const st = S.stats || {};
  $('#view').innerHTML = `<div class="cards"><div class="stat"><small>Pedidos</small><b>${st.total_orders ?? 0}</b></div><div class="stat"><small>Pagados</small><b>${st.approved_orders ?? 0}</b></div><div class="stat"><small>Pago pendiente</small><b>${st.pending_orders ?? 0}</b></div><div class="stat"><small>Para enviar</small><b>${st.to_ship ?? 0}</b></div><div class="stat"><small>Cobrado (con envío)</small><b>${money(st.approved_revenue ?? 0)}</b></div></div>
    <div class="box"><h2>Camisetas a preparar</h2><p class="muted">Suma de los pedidos pagados que todavía no se despacharon.</p>
    ${S.summary.length ? `<div class="scroll"><table><thead><tr><th>Camiseta</th><th>Talle</th><th>Cantidad</th></tr></thead><tbody>${S.summary.map((r) => `<tr><td>${esc(r.product_name)}</td><td>${esc(r.size)}</td><td><b>${r.quantity}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No hay nada pendiente de preparar.</p>'}</div>`;
}

/* ---------- inicio ---------- */
(async () => {
  try { const r = await fetch(API + '/api/admin/me', { credentials: 'same-origin' }); if (r.ok) { S.user = (await r.json()).username; return start(); } } catch (e) { /* sin conexión */ }
  renderLogin();
})();

import './store.css';
const API=(import.meta.env&&import.meta.env.VITE_API_URL||'').replace(/\/+$/,'');
const SIZES=['S','M','L','XL','XXL'];
const CATS=['Retro','Selecciones','Clubes','Ediciones especiales'];
const CAT_IMG={'Retro':'/img/cat-retro.jpg','Selecciones':'/img/cat-selecciones.jpg','Clubes':'/img/cat-clubes.jpg','Ediciones especiales':'/img/cat-especiales.jpg'};
const CAT_COPY={'Retro':'Épocas que no vuelven','Selecciones':'Camisetas de mundiales','Clubes':'Colores de barrio y de estadio','Ediciones especiales':'Fuera de serie'};
const PRICE_BANDS=[['','Todos los precios'],['lt','Hasta $55.000'],['mid','$55.000 a $60.000'],['gt','Más de $60.000']];
const KITS={1:'1ª equipación',2:'2ª equipación',3:'3ª equipación',E:'Edición especial'};
const KIT_KW={1:'1ra primera titular local',2:'2da segunda suplente visitante',3:'3ra tercera alternativa',E:'especial edicion limitada'};
const STOCK_SETS=[[2,5,6,3,1],[1,4,5,4,0],[3,6,4,2,1],[0,3,5,3,2],[2,4,4,1,0]];

/* Catálogo: viene del servidor (precios y stock reales). */
let PRODUCTS=[], byId={};
function hydrate(list){PRODUCTS=list.map(p=>({sleeve:'corta',kw:'',cats:[],season:'',...p,active:true}));byId=Object.fromEntries(PRODUCTS.map(p=>[p.id,p]))}

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n);
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const totalStock=p=>SIZES.reduce((a,s)=>a+(p.stock[s]||0),0);
const decade=p=>Math.floor(p.year/10)*10;
const decLabel=d=>d<2000?'Años '+String(d).slice(2):'Años '+d;
const kitLabel=p=>KITS[p.kit];
const model=p=>[p.edition,p.season,kitLabel(p)].filter(Boolean).join(' · ');
const desc=p=>p.look||`${kitLabel(p)} de ${p.team}${p.season?', temporada '+p.season:''}. Marca ${p.brand}.${p.sleeve==='larga'?' Manga larga.':''} Foto de frente y de dorso.`;
const IMG=(p,v)=>`/img/${p.id}-${v}.webp`;
const altTxt=(p,v)=>`${p.team}${p.season?' '+p.season:''}, ${kitLabel(p)}, vista ${v==='front'?'frontal':'trasera'}`;
const RM=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const CHEV={l:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',r:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'};

/* estado */
const F={q:'',cat:'Todas',team:'',kit:'',era:'',price:'',sort:'rel'};
const sel={};
let cart=[];
function loadCart(){try{cart=JSON.parse(localStorage.getItem('sakka-cart')||'[]').filter(i=>byId[i.id]&&SIZES.includes(i.size)).map(i=>({id:i.id,size:i.size,qty:Math.min(Math.max(1,i.qty|0),byId[i.id].stock[i.size]||0)})).filter(i=>i.qty>0)}catch(e){cart=[]}}
const saveCart=()=>{try{localStorage.setItem('sakka-cart',JSON.stringify(cart))}catch(e){}refreshCheckout()};
const cartCount=()=>cart.reduce((a,i)=>a+i.qty,0);
const cartTotal=()=>cart.reduce((a,i)=>a+i.qty*byId[i.id].price,0);
let D=null, cartView='cart', rmAsk=null, toastT=null;

/* toast */
function toast(msg,withCart){
  const t=$('#toast');
  t.innerHTML='';
  const s=document.createElement('span');s.textContent=msg;t.appendChild(s);
  if(withCart){const b=document.createElement('button');b.type='button';b.textContent='Ver carrito';b.dataset.act='open-cart';t.appendChild(b)}
  t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),3200);
}

/* carrusel frente / dorso */
function syncCar(car,i){
  car.dataset.i=i;
  $$('[data-act="slide"]',car).forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.i===i)));
  const pv=$('[data-act="car-prev"]',car),nx=$('[data-act="car-next"]',car);
  if(pv)pv.disabled=i===0;if(nx)nx.disabled=i===1;
}
function goSlide(car,i){
  const t=$('.car-track',car);if(!t)return;
  t.scrollTo({left:i*t.clientWidth,behavior:RM()?'auto':'smooth'});
  syncCar(car,i);
}
document.addEventListener('scroll',e=>{
  const t=e.target;
  if(!t||!t.classList||!t.classList.contains('car-track'))return;
  const car=t.closest('[data-car]');if(!car)return;
  const i=Math.round(t.scrollLeft/Math.max(1,t.clientWidth));
  if(+car.dataset.i!==i)syncCar(car,i);
},true);
function slidesHTML(p,link,lazy){
  return ['front','back'].map((v,i)=>{
    const img=`<img src="${IMG(p,v)}" alt="${altTxt(p,v)}" ${lazy?'loading="lazy" ':''}decoding="async" draggable="false">`;
    return link?`<a class="slide" href="#camiseta-${p.id}" ${i?'tabindex="-1" ':''}aria-label="Ver detalle de ${p.team} ${model(p)}">${img}</a>`:`<div class="slide">${img}</div>`;
  }).join('');
}
const navHTML=`<button class="car-nav prev" type="button" data-act="car-prev" aria-label="Ver frente" disabled>${CHEV.l}</button><button class="car-nav next" type="button" data-act="car-next" aria-label="Ver dorso">${CHEV.r}</button>`;
const tabsHTML=`<div class="car-tabs" role="group" aria-label="Vista de la camiseta"><button type="button" data-act="slide" data-i="0" aria-pressed="true">Frente</button><button type="button" data-act="slide" data-i="1" aria-pressed="false">Dorso</button></div>`;

/* carrito */
function badge(){
  const n=cartCount();
  $$('#badge,[data-badge]').forEach(b=>{b.textContent=n;b.dataset.n=n;b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump')});
}
function addToCart(id,size,q=1){
  const p=byId[id],st=p.stock[size]||0;
  const line=cart.find(i=>i.id===id&&i.size===size);
  const have=line?line.qty:0;
  if(have+q>st){toast(st?`Solo quedan ${st} en talle ${size}.`:`El talle ${size} está agotado.`);return false}
  if(line)line.qty+=q;else cart.push({id,size,qty:q});
  saveCart();badge();renderCart();
  toast(`${p.team} ${model(p)}, talle ${size}, agregada.`,true);
  return true;
}
function cartLines(){return cart.map(i=>({...i,p:byId[i.id]}))}

function renderCart(focusSel){
  const body=$('#dr-body'),foot=$('#dr-foot'),title=$('#dr-title');
  const n=cartCount();
  title.textContent=n?`Tu carrito (${n})`:'Tu carrito';
  if(!n){
    body.innerHTML=`<div class="cart-empty"><h3>Todavía no hay camisetas</h3><p>Elegí un talle en cualquier tarjeta y agregala acá.</p><button class="btn primary" type="button" data-act="close-cart-go">Ver catálogo</button></div>`;
    foot.hidden=true;return;
  }
  foot.hidden=false;
  body.innerHTML=cartLines().map(l=>{
    const k=l.id+'|'+l.size,st=l.p.stock[l.size]||0,ask=rmAsk===k;
    return `<div class="line"><div class="th"><img src="${IMG(l.p,'front')}" alt="" loading="lazy"></div><div style="min-width:0">
      <h3>${l.p.team}</h3><p class="mm">${model(l.p)} · Talle ${l.size} · ${money(l.p.price)} c/u</p>
      <div class="row"><div class="qty"><button type="button" data-act="qty-dec" data-k="${k}" aria-label="Quitar una unidad"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button><output aria-label="Cantidad">${l.qty}</output><button type="button" data-act="qty-inc" data-k="${k}" aria-label="Sumar una unidad" ${l.qty>=st?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>
      <span class="sub-t">${money(l.qty*l.p.price)}</span></div>
      <button class="rm${ask?' ask':''}" type="button" data-act="rm" data-k="${k}">${ask?'¿Seguro? Tocá para quitar':'Quitar'}</button>
    </div></div>`}).join('');
  foot.innerHTML=`<div class="tot"><span>Total (${n} ${n===1?'artículo':'artículos'})</span><b>${money(cartTotal())}</b></div>
    <button class="btn primary" type="button" data-act="checkout">Continuar con la compra</button>
    <button class="linkbtn" type="button" data-act="close-cart-go">Seguir viendo camisetas</button>`;
  if(focusSel)$(focusSel,body)?.focus();
}

/* checkout */
let ZONES=[], zoneId='', coStage='form', mpInst=null, cardCtl=null, walletCtl=null, idemKey=null, coBusy=false;
let buyerData=null, MP_KEY=undefined, paySig='';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const overlayOpen=()=>!$('#detail').hidden||!$('#checkout').hidden||!$('#track').hidden;
const uuid=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
const zoneById=id=>ZONES.find(z=>z.id===id);
const shipCost=()=>{const z=zoneById(zoneId);return z?z.price:null};

async function api(path,opts){
  const r=await fetch(API+path,{credentials:'same-origin',...opts});
  let data=null;try{data=await r.json()}catch(e){}
  if(!r.ok){const err=new Error((data&&data.error)||'Algo salió mal. Probá de nuevo.');err.status=r.status;throw err}
  return data;
}

function goCheckout(){
  closeCart();
  if(location.hash==='#checkout')openCheckout();else location.hash='checkout';
}
function zoneOptions(){
  const by={};ZONES.forEach(z=>(by[z.province]=by[z.province]||[]).push(z));
  return `<option value="">Elegí tu localidad</option>`+Object.keys(by).sort((a,b)=>a.localeCompare(b,'es')).map(p=>`<optgroup label="${esc(p)}">${by[p].map(z=>`<option value="${esc(z.id)}">${esc(z.name)} · ${money(z.price)}</option>`).join('')}</optgroup>`).join('');
}
function buildCheckout(){
  const fld=(id,label,attrs,full)=>`<label class="field${full?' full':''}"><span>${label}</span><input id="${id}" ${attrs}><span class="err" data-err="${id.slice(3)}"></span></label>`;
  $('#co-main').innerHTML=`
  <div class="empty" id="co-empty" hidden><h3>Tu carrito está vacío</h3><p>Elegí una camiseta y un talle para empezar.</p><a class="btn primary" href="#catalogo">Ver catálogo</a></div>
  <div class="co-form" id="co">
    <h1 class="t" id="co-title">Finalizar compra</h1>
    <form id="co-data" novalidate>
      <section class="co-sec"><h2 class="co-h"><span class="stepn">1</span>Tus datos</h2>
        <div class="fgrid">
          ${fld('co-name','Nombre y apellido','autocomplete="name" required',true)}
          ${fld('co-mail','Correo electrónico (acá te llega tu código)','type="email" autocomplete="email" required')}
          ${fld('co-tel','Teléfono (con característica)','type="tel" inputmode="tel" autocomplete="tel" required')}
        </div></section>
      <section class="co-sec"><h2 class="co-h"><span class="stepn">2</span>Entrega</h2>
        <div class="fgrid">
          <label class="field full"><span>Localidad</span><select id="co-zone" required>${zoneOptions()}</select><span class="err" data-err="zone"></span></label>
          ${fld('co-street','Calle','autocomplete="address-line1" required')}
          ${fld('co-number','Altura','inputmode="numeric" autocomplete="off" required')}
          ${fld('co-apt','Piso / depto (opcional)','autocomplete="address-line2"')}
          ${fld('co-zip','Código postal','autocomplete="postal-code" required')}
          ${fld('co-ref','Entre calles / referencias (opcional)','autocomplete="off"',true)}
        </div>
        <p class="zone-hint" id="zone-hint" aria-live="polite">Elegí tu localidad para ver el costo de envío. Los envíos los hacemos nosotros.</p></section>
      <div class="co-total"><span>Total con envío</span><b id="co-total"></b></div>
      <button class="btn primary big" type="submit" id="co-next">Continuar al pago</button>
    </form>
    <section class="co-sec" id="co-pay" hidden>
      <h2 class="co-h" id="pay-h"><span class="stepn">3</span>Pago</h2>
      <div class="co-lock"><span id="co-lock-txt"></span><button class="linkbtn" type="button" data-act="co-edit">Editar datos</button></div>
      <div class="pay-box-wrap"><h3>Tarjeta de crédito o débito</h3><p class="s">Los datos de la tarjeta los procesa Mercado Pago; esta página no los guarda.</p><div id="cardBox"></div></div>
      <div class="pay-sep">o</div>
      <div class="pay-box-wrap"><h3>Cuenta de Mercado Pago</h3><p class="s">Pagá con tu saldo, tarjetas guardadas o dinero en cuenta.</p>
        <div id="walletBox"><p class="co-wait">Preparando el botón de Mercado Pago…</p></div></div>
      <div id="co-out" aria-live="polite"></div>
    </section>
  </div>
  <aside class="co-sum" id="co-sum" aria-label="Resumen del pedido"></aside>`;
}
function refreshCheckout(){
  if($('#checkout').hidden||!$('#co'))return;
  if(coStage==='done')return;
  if(coStage==='pay'&&paySig!==JSON.stringify(cart)){editData();return}
  const has=cart.length>0;
  const done=coStage==='done';
  $('#co-empty').hidden=has||done;
  if(done)return;
  $('#co').hidden=!has;$('#co-sum').hidden=!has;
  if(!has)return;
  const sc=shipCost(),n=cartCount();
  $('#co-total').textContent=money(cartTotal()+(sc||0));
  const z=zoneById(zoneId);
  $('#zone-hint').innerHTML=z?`Envío a <b>${esc(z.name)}</b>: <b>${money(z.price)}</b>. Se paga junto con las camisetas.`:'Elegí tu localidad para ver el costo de envío. Los envíos los hacemos nosotros.';
  $('#co-sum').innerHTML=`<h2 class="co-h">Tu pedido</h2>`+cartLines().map(l=>`<div class="co-line"><div class="th"><img src="${IMG(l.p,'front')}" alt=""></div><div style="min-width:0"><b>${l.p.team}</b><span>${model(l.p)} · Talle ${l.size}</span><span>${l.qty} × ${money(l.p.price)}</span></div><b class="lt">${money(l.qty*l.p.price)}</b></div>`).join('')
   +`<div class="sumline"><span>Subtotal (${n} ${n===1?'artículo':'artículos'})</span><b>${money(cartTotal())}</b></div><div class="sumline"><span>Envío</span><b>${sc==null?'Elegí localidad':money(sc)}</b></div><div class="sumline"><span>Total</span><b>${money(cartTotal()+(sc||0))}</b></div>`
   +(coStage==='form'?`<button class="linkbtn" type="button" data-act="open-cart" style="margin-top:12px">Editar carrito</button>`:'');
}
async function openCheckout(){
  if(!$('#co')&&coStage!=='done'){
    try{ZONES=(await api('/api/shipping-zones')).zones}catch(e){ZONES=[]}
    buildCheckout();
  }
  $('#checkout').hidden=false;document.body.style.overflow='hidden';$('#checkout').scrollTop=0;
  document.title='Sakka T-Shirt';
  refreshCheckout();
  setTimeout(()=>$('#co-back').focus(),30);
}
function closeCheckoutUI(){
  if($('#checkout').hidden)return;
  $('#checkout').hidden=true;document.body.style.overflow='';
  if(coStage==='done'){coStage='form';$('#co-main').innerHTML='';}
}
function readData(){
  const g=id=>$('#'+id).value.trim();
  const v={name:g('co-name'),mail:g('co-mail'),tel:g('co-tel'),zone:g('co-zone'),street:g('co-street'),number:g('co-number'),apt:g('co-apt'),zip:g('co-zip'),ref:g('co-ref')};
  const errs={};
  if(v.name.length<3)errs.name='Ingresá tu nombre completo.';
  if(!/^\S+@\S+\.\S+$/.test(v.mail))errs.mail='Ingresá un correo válido.';
  if(v.tel.replace(/\D/g,'').length<8)errs.tel='Ingresá un teléfono con característica.';
  if(!v.zone)errs.zone='Elegí tu localidad.';
  if(v.street.length<2)errs.street='Ingresá la calle.';
  if(!v.number)errs.number='Ingresá la altura.';
  if(v.zip.length<3)errs.zip='Ingresá tu código postal.';
  $$('#co-data [data-err]').forEach(e=>e.textContent=errs[e.dataset.err]||'');
  const first=Object.keys(errs)[0];
  if(first){$('#co-'+first).focus();return null}
  return v;
}
function payload(){
  return {items:cart.map(i=>({id:i.id,size:i.size,quantity:i.qty})),buyer:{name:buyerData.name,phone:buyerData.tel,email:buyerData.mail},shippingZoneId:buyerData.zone,
    shippingAddress:{street:buyerData.street,number:buyerData.number,apartment:buyerData.apt,postalCode:buyerData.zip,references:buyerData.ref}};
}
function showErr(msg){const o=$('#co-out');if(o)o.innerHTML=msg?`<div class="co-err" role="alert">${esc(msg)}</div>`:''}
function loadMP(){
  return new Promise((res,rej)=>{
    if(window.MercadoPago)return res();
    const s=document.createElement('script');s.src='https://sdk.mercadopago.com/js/v2';s.onload=()=>res();s.onerror=()=>rej(new Error('No pudimos cargar Mercado Pago.'));document.head.appendChild(s);
  });
}
async function getMP(){
  if(mpInst)return mpInst;
  if(MP_KEY===undefined){try{MP_KEY=(await api('/api/config')).mpPublicKey||null}catch(e){MP_KEY=null}}
  if(!MP_KEY)throw new Error('Los pagos online no están disponibles por ahora. Escribinos por Instagram o WhatsApp.');
  await loadMP();
  mpInst=new window.MercadoPago(MP_KEY,{locale:'es-AR'});
  return mpInst;
}
async function unmountBricks(){
  for(const c of [cardCtl,walletCtl]){try{c&&await c.unmount()}catch(e){}}
  cardCtl=walletCtl=null;
}
async function startPayment(){
  const v=readData();if(!v)return;
  if(cart.some(i=>i.qty>(byId[i.id]?.stock[i.size]||0))){toast('Revisá el carrito: hay un talle sin stock suficiente.');return}
  buyerData=v;coStage='pay';paySig=JSON.stringify(cart);
  const z=zoneById(v.zone);
  $('#co-data').hidden=true;$('#co-pay').hidden=false;
  $('#co-lock-txt').textContent=`${v.name} · ${v.mail} · Envío a ${z.name} (${money(z.price)})`;
  showErr('');refreshCheckout();
  const total=cartTotal()+z.price;
  $('#cardBox').innerHTML='<p class="co-wait">Cargando formulario de pago…</p>';
  let mp;
  try{
    mp=await getMP();
  }catch(e){
    $('#cardBox').innerHTML='';
    $('#walletBox').innerHTML='';
    showErr(e.message);
    return;
  }
  try{
    $('#cardBox').innerHTML='';
    cardCtl=await mp.bricks().create('cardPayment','cardBox',{
      initialization:{amount:total,payer:{email:v.mail}},
      customization:{visual:{style:{theme:'default'}}},
      callbacks:{
        onReady:()=>{},
        onSubmit:(formData,additional)=>submitCard(formData,additional),
        onError:err=>{console.error(err)}
      }
    });
  }catch(e){
    $('#cardBox').innerHTML='';
    console.error('No se pudo cargar el formulario de tarjetas:',e);
  }
  await walletGo(mp);
}
function submitCard(formData,additional){
  return new Promise(async(resolve,reject)=>{
    showErr('');
    if(!idemKey)idemKey=uuid();
    const body={...payload(),idempotencyKey:idemKey,token:formData.token,payment_method_id:formData.payment_method_id,
      payment_type_id:(additional&&additional.paymentTypeId)||formData.payment_type_id,installments:Number(formData.installments),
      email:(formData.payer&&formData.payer.email)||buyerData.mail,identification:formData.payer&&formData.payer.identification};
    try{
      const r=await api('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      idemKey=null;
      if(r.paymentStatus==='approved'||r.paymentStatus==='pending'){resolve();finish(r.trackingCode,r.paymentStatus);return}
      showErr(r.paymentStatus==='rejected'?'El banco rechazó el pago. Revisá los datos de la tarjeta o probá con otra.':'No se pudo completar el pago. Probá de nuevo.');
      reject();
    }catch(e){
      if(e.status)idemKey=null;
      showErr(e.status?e.message:'No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo; no se te cobró dos veces.');
      reject();
    }
  });
}
async function walletGo(mpClient){
  if(coBusy)return;
  coBusy=true;showErr('');
  const box=$('#walletBox');
  box.innerHTML='<p class="co-wait">Preparando el botón de Mercado Pago…</p>';
  try{
    const mp=mpClient||await getMP();
    const r=await api('/api/checkout-preference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
    try{lastCode(r.trackingCode)}catch(e){}
    box.innerHTML='';
    walletCtl=await mp.bricks().create('wallet','walletBox',{initialization:{preferenceId:r.preferenceId,redirectMode:'self'}});
    box.insertAdjacentHTML('afterend',`<p class="co-wait">Tu código de seguimiento es <b>${esc(r.trackingCode)}</b>. Tocá el botón de Mercado Pago para pagar; al terminar volvés acá.</p>`);
  }catch(e){
    box.innerHTML='<p class="co-wait">No pudimos preparar el pago con Mercado Pago. Probá nuevamente o elegí pagar con tarjeta.</p>';
    showErr(e.message);
  }finally{
    coBusy=false;
  }
}
function lastCode(c){if(c)try{localStorage.setItem('sakka-last-code',c)}catch(e){}}
function savedCode(){try{return localStorage.getItem('sakka-last-code')||''}catch(e){return ''}}
async function finish(code,status){
  lastCode(code);
  coStage='done';
  cart=[];saveCart();badge();renderCart();
  unmountBricks();
  const wait=status==='pending';
  $('#co-main').innerHTML=`<div class="done"><h1>${wait?'Recibimos tu pedido':'¡Gracias por tu compra!'}</h1>
   <p>${wait?'Tu pago está siendo verificado. Apenas se acredite te avisamos por correo.':'Tu pago fue acreditado. Te mandamos la confirmación por correo.'}</p>
   <div class="codebox"><small>Tu código de seguimiento</small><b>${esc(code)}</b></div>
   <p>Guardalo: con este código seguís el estado de tu pedido (pendiente, preparado, despachado y entregado).</p>
   <div class="cta"><button class="btn primary" type="button" data-act="track-code" data-code="${esc(code)}">Seguir mi pedido</button><button class="btn ghost" type="button" data-act="close-checkout">Volver a la tienda</button></div></div>`;
  $('#checkout').scrollTop=0;
}
async function editData(){
  await unmountBricks();coStage='form';idemKey=null;
  $('#co-pay').hidden=true;$('#co-data').hidden=false;
  $('#walletBox,#co-pay .co-wait').forEach(e=>e.id==='walletBox'?e.innerHTML='':e.remove());
  showErr('');refreshCheckout();
}

/* seguimiento */
const SHIP_STEPS=[['pending','Pendiente'],['preparing','Preparado'],['shipped','Despachado'],['delivered','Entregado']];
const PAY_LBL={pending:['Pago pendiente','wait'],approved:['Pago acreditado','ok'],rejected:['Pago rechazado','bad'],cancelled:['Pago cancelado','bad'],refunded:['Pago reembolsado','bad']};
const EV_LBL={payment:{pending:'Pago pendiente',approved:'Pago acreditado',rejected:'Pago rechazado',cancelled:'Pago cancelado',refunded:'Pago reembolsado'},shipping:{pending:'Pendiente',preparing:'Preparado',shipped:'Despachado',delivered:'Entregado',cancelled:'Cancelado'}};
const dt=s=>new Date(s).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
function openTrack(code){
  $('#track').hidden=false;document.body.style.overflow='hidden';$('#track').scrollTop=0;
  document.title='Sakka T-Shirt';
  const inp=$('#tk-code');
  if(code){inp.value=code;lookup(code)}else if(!inp.value){inp.value=savedCode()}
  setTimeout(()=>inp.focus(),30);
}
function closeTrackUI(){if($('#track').hidden)return;$('#track').hidden=true;document.body.style.overflow=''}
async function lookup(raw){
  const code=String(raw||'').trim().toUpperCase().replace(/\s+/g,'');
  const out=$('#tk-out'),btn=$('#tk-btn');
  const c=/^SAKKA-/.test(code)?code:(code?'SAKKA-'+code:'');
  if(!/^SAKKA-[A-Z0-9]{6}$/.test(c)){out.innerHTML='<p class="tk-msg" role="alert">Ingresá tu código, con la forma SAKKA-XXXXXX.</p>';return}
  btn.disabled=true;out.innerHTML='<p class="co-wait">Buscando tu pedido…</p>';
  try{
    const t=await api('/api/tracking/'+encodeURIComponent(c));
    lastCode(t.code);
    out.innerHTML=trackHTML(t);
  }catch(e){out.innerHTML=`<p class="tk-msg" role="alert">${esc(e.message)}</p>`}
  btn.disabled=false;
}
function trackHTML(t){
  const cancelled=t.shippingStatus==='cancelled'||['rejected','cancelled','refunded'].includes(t.paymentStatus);
  const [pl,pc]=PAY_LBL[t.paymentStatus]||[t.paymentStatus,''];
  const idx=SHIP_STEPS.findIndex(s=>s[0]===t.shippingStatus);
  const steps=cancelled?'':`<ol class="steps" aria-label="Estado del envío">${SHIP_STEPS.map(([k,l],i)=>`<li class="${i<idx||(t.shippingStatus==='delivered'&&i===idx)?'done-s':i===idx?'cur':''}"${i===idx?' aria-current="step"':''}>${l}</li>`).join('')}</ol>`;
  const msg=cancelled?`<div class="tk-cancel"><b>${t.paymentStatus==='approved'||t.paymentStatus==='pending'?'Pedido cancelado':'Este pedido no se completó'}.</b> ${t.note?esc(t.note):'Si tenés dudas escribinos por Instagram o WhatsApp.'}</div>`:'';
  return `<div class="tk-card"><div class="tk-head"><h2>${esc(t.code)}</h2><span class="pill ${pc}">${pl}</span></div>${msg}${steps}
   <dl class="tk-dl"><dt>Fecha</dt><dd>${dt(t.createdAt)}</dd>${t.zone?`<dt>Envío a</dt><dd>${esc(t.zone)}</dd>`:''}${t.trackingNumber?`<dt>Seguimiento</dt><dd>${esc(t.trackingNumber)}</dd>`:''}${!cancelled&&t.note?`<dt>Aviso</dt><dd>${esc(t.note)}</dd>`:''}</dl>
   <h3 class="tk-h3">Tu pedido</h3><ul class="tk-items">${t.items.map(i=>`<li>${i.quantity}× ${esc(i.name)} · Talle ${esc(i.size)}</li>`).join('')}</ul>
   <h3 class="tk-h3">Historial</h3><ul class="tk-ev">${[...t.events].reverse().map(e=>`<li><time datetime="${e.at}">${dt(e.at)}</time><span>${esc((EV_LBL[e.kind]||{})[e.status]||e.status)}${e.note?` · ${esc(e.note)}`:''}</span></li>`).join('')}</ul></div>`;
}

function openCart(){
  cartView='cart';rmAsk=null;renderCart();
  $('#drawer').classList.add('on');$('#scrim').classList.add('on');$('#drawer').setAttribute('aria-hidden','false');
  setTimeout(()=>$('#dr-close').focus(),50);
}
function closeCart(){
  $('#drawer').classList.remove('on');$('#scrim').classList.remove('on');$('#drawer').setAttribute('aria-hidden','true');
}

/* catálogo */
function opts(arr){return arr.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
function buildControls(){
  const sortEs=(a,b)=>a.localeCompare(b,'es');
  const nations=[...new Set(PRODUCTS.filter(p=>p.cats.includes('Selecciones')).map(p=>p.team))].sort(sortEs);
  const clubs=[...new Set(PRODUCTS.filter(p=>!p.cats.includes('Selecciones')).map(p=>p.team))].sort(sortEs);
  const kits=Object.keys(KITS).filter(k=>PRODUCTS.some(p=>String(p.kit)===k));
  const eras=[...new Set(PRODUCTS.filter(p=>p.year).map(decade))].sort((a,b)=>a-b);
  $('#f-team').innerHTML=`<option value="">Todos los equipos</option><optgroup label="Selecciones">${opts(nations.map(t=>[t,t]))}</optgroup><optgroup label="Clubes">${opts(clubs.map(t=>[t,t]))}</optgroup>`;
  $('#f-type').innerHTML=opts([['','Todas las equipaciones'],...kits.map(k=>[k,KITS[k]])]);
  $('#f-era').innerHTML=opts([['','Todas las épocas'],...eras.map(d=>[d,decLabel(d)])]);
  $('#f-price').innerHTML=opts(PRICE_BANDS);
  $('#chips').innerHTML=['Todas',...CATS].map(c=>`<button class="chip" type="button" data-act="chip" data-cat="${c}" aria-pressed="${F.cat===c}">${c}</button>`).join('');
  $('#cats').innerHTML=CATS.map(c=>{
    const n=PRODUCTS.filter(p=>p.cats.includes(c)).length;
    return `<a class="cat" href="#catalogo" data-cat="${c}"><div class="cj"><img src="${CAT_IMG[c]}" alt="" loading="lazy"></div><div><h3>${c}</h3><p><span>${CAT_COPY[c]}</span><span class="go">${n}</span></p></div></a>`}).join('');
  const maxN=Math.max(...eras.map(d=>PRODUCTS.filter(p=>p.year&&decade(p)===d).length));
  $('#ruler').innerHTML=`<h3>Camisetas por época</h3>`+eras.map(d=>{const n=PRODUCTS.filter(p=>p.year&&decade(p)===d).length;return `<button class="dec" type="button" data-act="era" data-era="${d}" aria-label="${decLabel(d)}: ${n} camisetas"><span class="l">${decLabel(d)}</span><span class="bar"><i style="width:${n/maxN*100}%"></i></span><span class="n">${n}</span></button>`}).join('');
  const hero=id=>`/img/${id}-front.webp`;
  $('#heroArt').innerHTML=`<svg class="pitch" viewBox="0 0 400 400" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="2"><circle cx="200" cy="200" r="150"/><circle cx="200" cy="200" r="6" fill="rgba(255,255,255,.1)"/><path d="M0 200h400M200 0v400"/><rect x="110" y="0" width="180" height="70"/><rect x="110" y="330" width="180" height="70"/></svg>
   <div class="j j1"><img src="${hero('boca-juniors-2003-04')}" alt="" decoding="async"></div><div class="j j2"><img src="${hero('ac-milan-adidas-2011-12')}" alt="" decoding="async"></div><div class="j j3"><img src="${hero('napoli-nr-1988-89')}" alt="" decoding="async"></div>`;
}
function filtered(){
  const q=norm(F.q).trim().split(/\s+/).filter(Boolean);
  let l=PRODUCTS.filter(p=>p.active).filter(p=>{
    if(F.cat!=='Todas'&&!p.cats.includes(F.cat))return false;
    if(F.team&&p.team!==F.team)return false;
    if(F.kit&&String(p.kit)!==F.kit)return false;
    if(F.era&&(!p.year||String(decade(p))!==F.era))return false;
    if(F.price==='lt'&&p.price>55000)return false;
    if(F.price==='mid'&&(p.price<55000||p.price>60000))return false;
    if(F.price==='gt'&&p.price<=60000)return false;
    if(q.length){const hay=norm(`${p.team} ${p.edition||''} ${p.season} ${kitLabel(p)} ${KIT_KW[p.kit]} ${p.brand} ${p.cats.join(' ')} ${p.kw}`);if(!q.every(w=>hay.includes(w)))return false}
    return true;
  });
  const yr=p=>p.year||9999;
  const s={asc:(a,b)=>a.price-b.price,desc:(a,b)=>b.price-a.price,year:(a,b)=>yr(a)-yr(b),rel:(a,b)=>(b.feat||0)-(a.feat||0)||yr(a)-yr(b)}[F.sort];
  return l.sort(s);
}
const dirty=()=>F.q||F.cat!=='Todas'||F.team||F.kit||F.era||F.price;
function sizeBtns(p,s0){
  return SIZES.map(s=>{const n=p.stock[s]||0;return `<button type="button" class="sz${s0===s?' on':''}" data-act="size" data-id="${p.id}" data-size="${s}" aria-pressed="${s0===s}" ${n?'':'disabled'} title="${n?n+' disponibles':'Agotado'}" aria-label="Talle ${s}${n?'':', agotado'}">${s}</button>`}).join('');
}
function renderGrid(){
  const l=filtered();
  $('#count').innerHTML=`<b>${l.length}</b> ${l.length===1?'camiseta':'camisetas'}`;
  $('#clearBtn').hidden=!dirty();
  $$('#chips .chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.cat===F.cat));
  if(!l.length){
    $('#grid').innerHTML=`<div class="empty"><h3>No encontramos esa camiseta</h3><p>Probá con otro equipo, otra época o quitá algún filtro.</p><button class="btn primary" type="button" data-act="clear">Limpiar filtros</button></div>`;return;
  }
  $('#grid').innerHTML=l.map((p,i)=>{
    const out=totalStock(p)===0;
    const tag=out?'<span class="tag out">Agotada</span>':p.tag?`<span class="tag${p.tag==='Nuevo'?' new':''}">${p.tag}</span>`:'';
    return `<article class="card" style="animation-delay:${Math.min(i,8)*30}ms" data-card="${p.id}">
      <div class="media car" data-car data-i="0"><div class="car-track">${slidesHTML(p,true,i>3)}</div>${navHTML}${tabsHTML}${tag}${p.season?`<span class="yr">${p.season}</span>`:''}</div>
      <div class="body"><div><h3 class="team">${p.team}</h3><p class="model">${model(p)}</p></div><p class="price">${money(p.price)}</p>
      <div class="sizes" role="group" aria-label="Talle de ${p.team} ${model(p)}">${sizeBtns(p,sel[p.id])}</div>
      <div class="actions"><a class="btn ghost" href="#camiseta-${p.id}">Detalle</a><button class="btn primary" type="button" data-act="add" data-id="${p.id}" ${out?'disabled':''}>${out?'Agotada':'Agregar'}</button></div></div></article>`}).join('');
}
function syncControls(){
  $('#q').value=F.q;$('#f-team').value=F.team;$('#f-type').value=F.kit;$('#f-era').value=F.era;$('#f-price').value=F.price;$('#f-sort').value=F.sort;
}
function resetF(){Object.assign(F,{q:'',cat:'Todas',team:'',kit:'',era:'',price:'',sort:'rel'});}
function setFilter(patch){Object.assign(F,patch);syncControls();renderGrid()}

/* detalle */
function openDetail(id){
  const p=byId[id];
  if(!p){location.hash='catalogo';return}
  D={id,size:sel[id]&&(p.stock[sel[id]]>0)?sel[id]:null,qty:1};
  const spec=[['Equipo',p.team],['Equipación',kitLabel(p)],['Temporada',p.season],['Edición',p.edition],['Marca',p.brand],['Mangas',p.sleeve==='larga'?'Largas':'Cortas']].filter(r=>r[1]);
  $('#d-main').innerHTML=`<div data-car data-i="0">
      <div class="car big"><div class="car-track" tabindex="0" role="group" aria-roledescription="carrusel" aria-label="Fotos de ${p.team}, frente y dorso">${slidesHTML(p,false,false)}</div>${navHTML}</div>
      <div class="views" role="group" aria-label="Vistas de la camiseta">
        ${[['front','Frente'],['back','Dorso']].map(([v,l],i)=>`<button class="view" type="button" data-act="slide" data-i="${i}" aria-pressed="${i===0}"><span class="th"><img src="${IMG(p,v)}" alt=""></span><span>${l}</span></button>`).join('')}
      </div></div>
    <div class="info">
      <p class="kick">${p.cats.join(' · ')}</p>
      <h1 id="d-title">${p.team}</h1>
      <p class="m">${model(p)}</p>
      <p class="pr">${money(p.price)}</p>
      <p class="ds">${desc(p)}</p>
      <dl class="spec">${spec.map(r=>`<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>
      <div id="d-buy"></div>
      <p class="note">Pagás online con tarjeta de crédito, débito o Mercado Pago. El envío se calcula según tu localidad al finalizar la compra.</p>
    </div>`;
  renderBuy();
  $('#detail').hidden=false;document.body.style.overflow='hidden';$('#detail').scrollTop=0;
  document.title='Sakka T-Shirt';
  setTimeout(()=>$('#d-back').focus(),30);
}
function renderBuy(focusSel){
  const p=byId[D.id],out=totalStock(p)===0;
  const st=D.size?p.stock[D.size]:0;
  const inCart=D.size?(cart.find(i=>i.id===p.id&&i.size===D.size)?.qty||0):0;
  const room=Math.max(0,st-inCart);
  if(D.qty>Math.max(1,room))D.qty=Math.max(1,room);
  let msg='Elegí un talle para ver el stock.',warn=false;
  if(out){msg='Esta camiseta está agotada por ahora.';warn=true}
  else if(D.size){
    if(room===0){msg=`Ya tenés en el carrito todas las unidades del talle ${D.size}.`;warn=true}
    else if(st<=3){msg=`Últimas ${st} ${st===1?'unidad':'unidades'} en talle ${D.size}.`;warn=true}
    else msg=`Talle ${D.size} disponible.`;
  }
  $('#d-buy').innerHTML=`<p class="lbl"><span>Talle</span></p>
   <div class="sizes" id="d-sizes" role="group" aria-label="Talle">${SIZES.map(s=>{const n=p.stock[s]||0;return `<button type="button" class="sz${D.size===s?' on':''}" data-act="d-size" data-size="${s}" aria-pressed="${D.size===s}" ${n?'':'disabled'} aria-label="Talle ${s}${n?'':', agotado'}">${s}</button>`}).join('')}</div>
   <p class="stockmsg${warn?' warn':''}" aria-live="polite">${msg}</p>
   <div class="buy"><div class="qty"><button type="button" data-act="d-dec" aria-label="Menos unidades" ${D.qty<=1?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button><output aria-label="Cantidad">${D.qty}</output><button type="button" data-act="d-inc" aria-label="Más unidades" ${(!D.size||D.qty>=room)?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>
   <button class="btn primary" type="button" data-act="d-add" ${out?'disabled':''}>${out?'Agotada':'Agregar al carrito'}</button></div>`;
  if(focusSel)$(focusSel,$('#d-buy'))?.focus();
}
function closeDetailUI(){
  if($('#detail').hidden)return;
  $('#detail').hidden=true;document.body.style.overflow='';D=null;
}
let pendingTrack='';
function route(){
  const h=location.hash;
  const m=h.match(/^#camiseta-([a-z0-9-]+)$/);
  closeTrackUI_if(h);
  if(m){closeCheckoutUI();openDetail(m[1])}
  else if(h==='#checkout'){closeDetailUI();openCheckout()}
  else if(h==='#seguimiento'){closeDetailUI();closeCheckoutUI();const c=pendingTrack;pendingTrack='';openTrack(c)}
  else{closeDetailUI();closeCheckoutUI()}
}
function closeTrackUI_if(h){if(h!=='#seguimiento')closeTrackUI()}

/* eventos */
document.addEventListener('click',e=>{
  const lf=e.target.closest('a[data-cat]');
  if(lf){setFilter({cat:lf.dataset.cat,...(lf.dataset.cat==='Todas'?{team:'',kit:'',era:'',price:'',q:''}:{})});$('#nav').classList.remove('open');$('#burger').setAttribute('aria-expanded','false');if(overlayOpen()){location.hash=lf.getAttribute('href').slice(1)}return}
  const navA=e.target.closest('.nav a');
  if(navA){$('#nav').classList.remove('open');$('#burger').setAttribute('aria-expanded','false')}
  const el=e.target.closest('[data-act]');
  if(!el)return;
  const a=el.dataset.act;
  switch(a){
    case 'burger':{const o=$('#nav').classList.toggle('open');el.setAttribute('aria-expanded',o);el.setAttribute('aria-label',o?'Cerrar menú':'Abrir menú');break}
    case 'open-cart':openCart();break;
    case 'close-cart':closeCart();break;
    case 'close-cart-go':closeCart();if(overlayOpen())location.hash='catalogo';else $('#catalogo').scrollIntoView();break;
    case 'chip':setFilter({cat:el.dataset.cat});break;
    case 'era':setFilter({era:el.dataset.era});$('#catalogo').scrollIntoView();break;
    case 'clear':resetF();syncControls();renderGrid();break;
    case 'slide':goSlide(el.closest('[data-car]'),+el.dataset.i);break;
    case 'car-prev':goSlide(el.closest('[data-car]'),0);break;
    case 'car-next':goSlide(el.closest('[data-car]'),1);break;
    case 'size':{const id=el.dataset.id,s=el.dataset.size;sel[id]=sel[id]===s?null:s;const box=el.closest('.sizes');box.classList.remove('need');box.innerHTML=sizeBtns(byId[id],sel[id]);$(`[data-size="${s}"]`,box)?.focus();break}
    case 'add':{
      const id=el.dataset.id,s=sel[id];
      if(!s){const box=el.closest('.card').querySelector('.sizes');box.classList.remove('need');void box.offsetWidth;box.classList.add('need');toast(`Elegí un talle para ${byId[id].team} ${model(byId[id])}.`);break}
      addToCart(id,s,1);break}
    case 'd-size':D.size=D.size===el.dataset.size?null:el.dataset.size;D.qty=1;sel[D.id]=D.size;renderBuy(`[data-size="${el.dataset.size}"]`);break;
    case 'd-inc':D.qty++;renderBuy('[data-act="d-inc"]');if(!$('[data-act="d-inc"]',$('#d-buy'))?.disabled)break;$('[data-act="d-dec"]',$('#d-buy'))?.focus();break;
    case 'd-dec':D.qty=Math.max(1,D.qty-1);renderBuy('[data-act="d-dec"]');break;
    case 'd-add':{
      if(!D.size){const b=$('#d-sizes');b.classList.remove('need');void b.offsetWidth;b.classList.add('need');toast('Elegí un talle para continuar.');break}
      if(addToCart(D.id,D.size,D.qty)){D.qty=1;renderBuy('[data-act="d-add"]')}break}
    case 'close-detail':location.hash='catalogo';break;
    case 'qty-inc':{const[k,s]=el.dataset.k.split('|');const l=cart.find(i=>i.id===k&&i.size===s);if(l&&l.qty<(byId[k].stock[s]||0)){l.qty++;saveCart();badge();renderCart(`[data-act="qty-inc"][data-k="${el.dataset.k}"]`);if(D)renderBuy()}break}
    case 'qty-dec':{const[k,s]=el.dataset.k.split('|');const l=cart.find(i=>i.id===k&&i.size===s);if(l&&l.qty>1){l.qty--;saveCart();badge();renderCart(`[data-act="qty-dec"][data-k="${el.dataset.k}"]`);if(D)renderBuy()}break}
    case 'rm':{
      const k=el.dataset.k;
      if(rmAsk!==k){rmAsk=k;renderCart(`[data-act="rm"][data-k="${k}"]`);break}
      const[id,s]=k.split('|');cart=cart.filter(i=>!(i.id===id&&i.size===s));rmAsk=null;saveCart();badge();renderCart();if(D)renderBuy();toast('Camiseta quitada del carrito.');break}
    case 'checkout':goCheckout();break;
    case 'close-checkout':location.hash='catalogo';break;
    case 'co-edit':editData();break;
    case 'open-track':case 'track-code':closeCart();pendingTrack=el.dataset.code||'';if(location.hash==='#seguimiento')route();else location.hash='seguimiento';break;
    case 'close-track':location.hash='catalogo';break;
    case 'copy':{
      const txt='sakkadrops@gmail.com';
      const fallback=()=>{const r=document.createRange();r.selectNodeContents($('#mailTxt'));const s=getSelection();s.removeAllRanges();s.addRange(r);toast('Seleccionamos el correo, copialo con tu teclado.')};
      try{navigator.clipboard.writeText(txt).then(()=>toast('Correo copiado.'),fallback)}catch(err){fallback()}
      break}
  }
});
document.addEventListener('submit',e=>{
  if(e.target.id==='co-data'){e.preventDefault();startPayment()}
  if(e.target.id==='tk-form'){e.preventDefault();lookup($('#tk-code').value)}
});
$('#q').addEventListener('input',e=>setFilter({q:e.target.value}));
[['f-team','team'],['f-type','kit'],['f-era','era'],['f-price','price'],['f-sort','sort']].forEach(([id,k])=>$('#'+id).addEventListener('change',e=>setFilter({[k]:e.target.value})));
document.addEventListener('change',e=>{if(e.target.id==='co-zone'){zoneId=e.target.value;refreshCheckout()}});
document.addEventListener('keydown',e=>{
  if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&e.target.classList&&e.target.classList.contains('car-track')){
    const car=e.target.closest('[data-car]');if(car){e.preventDefault();goSlide(car,e.key==='ArrowRight'?1:0)}return;
  }
  if(e.key!=='Escape')return;
  if($('#drawer').classList.contains('on'))closeCart();
  else if(overlayOpen())location.hash='catalogo';
  else if($('#nav').classList.contains('open')){$('#nav').classList.remove('open');$('#burger').setAttribute('aria-expanded','false')}
});
window.addEventListener('hashchange',route);

/* inicio */
async function init(){
  // El link de Mercado Pago vuelve a /seguimiento?codigo=...: lo pasamos al esquema de hash.
  let startCode='';
  if(/^\/seguimiento/.test(location.pathname)){
    startCode=new URLSearchParams(location.search).get('codigo')||'';
    history.replaceState(null,'','/#seguimiento');
  }
  try{
    hydrate((await api('/api/catalog')).products);
  }catch(e){
    $('#grid').innerHTML='<div class="empty"><h3>No pudimos cargar el catálogo</h3><p>Probá de nuevo en un momento.</p><button class="btn primary" type="button" onclick="location.reload()">Reintentar</button></div>';
  }
  loadCart();buildControls();renderGrid();badge();renderCart();
  if(startCode)pendingTrack=startCode;
  route();
}
init();

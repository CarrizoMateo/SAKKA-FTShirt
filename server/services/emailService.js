// Mails automáticos con Resend.
const RESEND_URL = process.env.RESEND_API_URL || "https://api.resend.com/emails";

const STATUS_COPY = {
  preparing: {
    subject: "Tu pedido está preparado",
    title: "¡Tu pedido está preparado!",
    text: "Ya tenemos tus camisetas listas. En cuanto salgan a la calle te avisamos de nuevo.",
  },
  shipped: {
    subject: "Tu pedido fue despachado",
    title: "¡Tu pedido va en camino!",
    text: "Despachamos tu pedido. Pronto lo vas a tener en tu puerta.",
  },
  delivered: {
    subject: "Tu pedido fue entregado",
    title: "¡Pedido entregado!",
    text: "Tu pedido figura como entregado. ¡Gracias por elegir SAKKA, que la disfrutes!",
  },
  cancelled: {
    subject: "Tu pedido fue cancelado",
    title: "Tu pedido fue cancelado",
    text: "Cancelamos este pedido. Si tenés dudas o ya pagaste, escribinos a sakkadrops@gmail.com y lo resolvemos.",
  },
};

function siteUrl() {
  const first = String(process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")[0]
    .trim();
  return first.replace(/\/+$/, "");
}

function trackingUrl(code) {
  return `${siteUrl()}/seguimiento?codigo=${encodeURIComponent(code)}`;
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Falta configurar RESEND_API_KEY y EMAIL_FROM.");
  }

  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Resend no pudo enviar el correo.");
  }

  return result;
}

function formatARS(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

function layout(body) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#16181c;background:#ffffff">
    <div style="background:#0b0c0e;color:#ffffff;padding:22px 24px;font-size:22px;font-weight:bold;letter-spacing:1px">
      SAKKA <span style="color:#e8421e">Football T-Shirts</span>
    </div>
    <div style="padding:24px">${body}</div>
    <div style="padding:16px 24px;background:#f1f2f4;color:#5d636c;font-size:12px">
      SAKKA Football T-Shirts · Instagram @sakka_futbol · sakkadrops@gmail.com
    </div>
  </div>`;
}

function codeBox(code) {
  return `
    <div style="margin:22px 0;padding:18px;border:2px dashed #0b0c0e;text-align:center">
      <div style="font-size:12px;letter-spacing:2px;color:#5d636c">TU CÓDIGO DE SEGUIMIENTO</div>
      <div style="font-size:30px;font-weight:bold;letter-spacing:3px;margin-top:6px">${escapeHtml(code)}</div>
    </div>`;
}

function trackButton(code) {
  return `
    <div style="text-align:center;margin:26px 0">
      <a href="${escapeHtml(trackingUrl(code))}"
         style="display:inline-block;background:#e8421e;color:#0b0c0e;text-decoration:none;padding:15px 28px;border-radius:4px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">
        Seguir mi pedido
      </a>
    </div>`;
}

async function sendOrderConfirmation({ to, order, items }) {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee">
          ${escapeHtml(item.product_name)} · talle ${escapeHtml(item.size)} × ${Number(item.quantity)}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${formatARS(item.subtotal)}</td>
      </tr>`,
    )
    .join("");

  const productsTotal = Number(order.total_amount) - Number(order.shipping_amount || 0);

  const html = layout(`
    <h2 style="margin-top:0">¡Recibimos tu pago!</h2>
    <p>Gracias por comprar en SAKKA${order.customer_name ? `, ${escapeHtml(order.customer_name.split(" ")[0])}` : ""}. Tu pago fue acreditado y ya estamos preparando tu pedido.</p>
    ${codeBox(order.tracking_code)}
    <p>Con este código podés ver en cualquier momento si tu pedido está <b>pendiente, preparado, despachado o entregado</b>. Guardalo.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px">${rows}</table>
    <p style="margin:14px 0 4px">Camisetas: ${formatARS(productsTotal)}</p>
    <p style="margin:4px 0">Envío${order.shipping_zone_name ? ` a ${escapeHtml(order.shipping_zone_name)}` : ""}: ${formatARS(order.shipping_amount || 0)}</p>
    <h3 style="margin:10px 0">Total pagado: ${formatARS(order.total_amount)}</h3>
    ${trackButton(order.tracking_code)}
  `);

  return sendEmail({
    to,
    subject: `Pago confirmado · Pedido ${order.tracking_code}`,
    html,
  });
}

async function sendShippingUpdate({ to, order, status, trackingNumber, note }) {
  const copy = STATUS_COPY[status];
  if (!copy) return null;

  const extra = [
    trackingNumber
      ? `<p><b>Número de seguimiento:</b> ${escapeHtml(trackingNumber)}</p>`
      : "",
    note ? `<p style="background:#f1f2f4;padding:12px;border-left:4px solid #e8421e">${escapeHtml(note)}</p>` : "",
  ].join("");

  const html = layout(`
    <h2 style="margin-top:0">${escapeHtml(copy.title)}</h2>
    <p>${escapeHtml(copy.text)}</p>
    ${extra}
    ${codeBox(order.tracking_code)}
    ${trackButton(order.tracking_code)}
  `);

  return sendEmail({
    to,
    subject: `${copy.subject} · ${order.tracking_code}`,
    html,
  });
}

module.exports = { sendOrderConfirmation, sendShippingUpdate, trackingUrl };

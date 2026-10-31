async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Falta configurar Resend en el archivo .env");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Resend no pudo enviar el correo.");
  }

  return result;
}

async function sendOrderConfirmation({ to, order, items }) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee">
            ${escapeHtml(item.product_name)}
            × ${Number(item.quantity)}
          </td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right">
            ${formatARS(item.subtotal)}
          </td>
        </tr>
      `,
    )
    .join("");

  // URL pública del sitio. En producción, configurá FRONTEND_URL
  // con el dominio real de SAKKA.
  const siteUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/+$/,
    "",
  );

  const trackingUrl = `${siteUrl}/seguimiento?referencia=${encodeURIComponent(
    order.external_reference,
  )}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222">
      <h1 style="background:#171717;color:white;padding:24px">
        SAKKA <span style="color:#d6ad69">Football T-Shirts</span>
      </h1>

      <h2>¡Tu pago fue acreditado!</h2>

      <p>Gracias por comprar en SAKKA. Recibimos tu pago correctamente.</p>

      <p><strong>Pedido:</strong> ${escapeHtml(order.external_reference)}</p>

      <table style="width:100%;border-collapse:collapse">
        ${rows}
      </table>

      <p>Productos: ${formatARS(
        Number(order.total_amount) - Number(order.shipping_amount || 0),
      )}</p>

      <p>Envío: ${formatARS(order.shipping_amount || 0)}</p>

      <h3>Total pagado: ${formatARS(order.total_amount)}</h3>

      <p>Podés consultar las novedades de tu envío desde el siguiente botón:</p>

      <div style="text-align:center;margin:28px 0">
        <a
          href="${escapeHtml(trackingUrl)}"
          style="display:inline-block;background:#171717;color:#d6ad69;text-decoration:none;padding:15px 28px;border-radius:6px;font-weight:bold"
        >
          Seguir mi pedido
        </a>
      </div>

      <p>Para consultar tu pedido, ingresá la referencia que aparece arriba.</p>

      <p>Gracias por elegir SAKKA ⚽</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Pago confirmado — Pedido ${order.external_reference}`,
    html,
  });
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
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

module.exports = { sendOrderConfirmation };

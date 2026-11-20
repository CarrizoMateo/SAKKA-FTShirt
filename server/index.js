require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const { query, tx } = require("./db/pool");
const { ensureSchema } = require("./db/schema");
const catalog = require("./repositories/catalogRepository");
const orders = require("./repositories/ordersRepository");
const stock = require("./repositories/stockRepository");
const orderService = require("./services/orderService");
const auth = require("./services/auth");
const { slug } = require("./config/shippingSeed");

const SIZES = catalog.SIZES;
const MP_API = (process.env.MP_API_BASE || "https://api.mercadopago.com").replace(/\/+$/, "");

function checkEnvironment() {
  const missing = [];

  for (const name of ["DATABASE_URL", "MP_ACCESS_TOKEN", "ADMIN_USER", "ADMIN_SESSION_SECRET"]) {
    if (!process.env[name]) missing.push(name);
  }

  if (!process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD) {
    missing.push("ADMIN_PASSWORD_HASH (o ADMIN_PASSWORD)");
  }

  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }

  if (process.env.ADMIN_SESSION_SECRET.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET debe tener al menos 32 caracteres.");
  }

  if (!process.env.ADMIN_PASSWORD_HASH) {
    console.warn(
      "Aviso: se usa ADMIN_PASSWORD en texto plano. Es mejor ADMIN_PASSWORD_HASH (npm run hash-password).",
    );
  }
}

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: auth.allowedOrigins(),
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));

const wrap = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const clientIp = (req) => req.ip || req.socket?.remoteAddress || "unknown";

// =============================================
// DATOS PÚBLICOS
// =============================================

app.get(
  "/api/health",
  wrap(async (req, res) => {
    await query("SELECT 1");
    res.json({ ok: true, message: "Backend de SAKKA funcionando" });
  }),
);

// La clave pública de Mercado Pago es pública por diseño (va en el navegador).
app.get("/api/config", (req, res) => {
  res.json({ mpPublicKey: process.env.MP_PUBLIC_KEY || process.env.VITE_MP_PUBLIC_KEY || null });
});

app.get(
  "/api/catalog",
  wrap(async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ products: await catalog.getPublicCatalog() });
  }),
);

app.get(
  "/api/shipping-zones",
  wrap(async (req, res) => {
    res.json({ zones: await catalog.getShippingZones() });
  }),
);

const trackingLimiter = auth.createLimiter({ windowMs: 10 * 60 * 1000, max: 60 });

app.get(
  "/api/tracking/:code",
  wrap(async (req, res) => {
    if (!trackingLimiter.hit(clientIp(req))) {
      return res.status(429).json({ error: "Demasiadas consultas. Probá de nuevo en unos minutos." });
    }

    const code = orders.normalizeTrackingCode(req.params.code);

    if (!code) {
      return res.status(400).json({
        error: "El código no es válido. Tiene la forma SAKKA-XXXXXX.",
      });
    }

    const tracking = await orders.getTracking(code);

    if (!tracking) {
      return res.status(404).json({ error: "No encontramos un pedido con ese código." });
    }

    res.set("Cache-Control", "no-store");
    return res.json(tracking);
  }),
);

// =============================================
// VALIDACIONES DE COMPRA (siempre con datos del servidor)
// =============================================

const fail = (status, error, extra = {}) => ({ ok: false, status, error, ...extra });

async function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return fail(400, "El carrito está vacío.");
  }

  // Si llega el mismo producto y talle dos veces, se suman.
  const merged = new Map();

  for (const item of items) {
    const id = String(item?.id ?? "");
    const size = String(item?.size ?? "").trim().toUpperCase();
    const quantity = item?.quantity;

    if (!id || !SIZES.includes(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return fail(400, "Producto, talle o cantidad inválidos.");
    }

    const key = `${id}|${size}`;
    merged.set(key, { id, size, quantity: (merged.get(key)?.quantity ?? 0) + quantity });
  }

  const lines = [...merged.values()];
  const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0);

  if (totalItems > 20) {
    return fail(400, "El carrito supera la cantidad permitida.");
  }

  const products = await catalog.getProductsByIds([...new Set(lines.map((l) => l.id))]);
  const validatedItems = [];
  let productsAmount = 0;

  for (const line of lines) {
    const product = products.get(line.id);

    if (!product || !product.active) {
      return fail(400, "Una de las camisetas ya no está disponible.");
    }

    productsAmount += product.price * line.quantity;
    validatedItems.push({
      id: product.id,
      name: product.name,
      size: line.size,
      quantity: line.quantity,
      price: product.price,
    });
  }

  return { ok: true, validatedItems, productsAmount };
}

async function validateStock(items) {
  const available = await catalog.getAvailableStock(items);

  for (const item of items) {
    const have = available.get(`${item.id}|${item.size}`) ?? 0;

    if (have < 1) {
      return fail(409, `El talle ${item.size} de ${item.name} está agotado.`);
    }

    if (have < item.quantity) {
      return fail(409, `Solo quedan ${have} de ${item.name}, talle ${item.size}.`);
    }
  }

  return { ok: true };
}

function validateBuyer(buyer) {
  const name = String(buyer?.name ?? "").trim();
  const phone = String(buyer?.phone ?? "").trim();
  const email = String(buyer?.email ?? "").trim().toLowerCase();

  if (name.length < 3 || name.length > 120) {
    return fail(400, "Ingresá tu nombre y apellido.");
  }

  if (phone.replace(/\D/g, "").length < 8 || phone.length > 30) {
    return fail(400, "Ingresá un teléfono de contacto con característica.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return fail(400, "Ingresá un email válido para recibir tu código de seguimiento.");
  }

  return { ok: true, buyer: { name, phone, email } };
}

async function validateShipping(zoneId, rawAddress) {
  const zone = await catalog.getShippingZone(zoneId);

  if (!zone) {
    return fail(409, "Todavía no hacemos envíos a esa localidad. Elegí otra de la lista.");
  }

  if (!rawAddress || typeof rawAddress !== "object" || Array.isArray(rawAddress)) {
    return fail(400, "Faltan los datos de la dirección de entrega.");
  }

  const text = (value) => String(value ?? "").trim();

  const address = {
    street: text(rawAddress.street),
    number: text(rawAddress.number),
    apartment: text(rawAddress.apartment),
    postalCode: text(rawAddress.postalCode),
    city: zone.name,
    references: text(rawAddress.references),
    notes: text(rawAddress.notes),
  };

  if (!address.street || !address.number || !address.postalCode) {
    return fail(400, "Completá calle, altura y código postal.");
  }

  if (Object.values(address).some((value) => value.length > 250)) {
    return fail(400, "Uno de los datos de la dirección es demasiado largo.");
  }

  return { ok: true, zone, amount: zone.price, address };
}

// Compara direcciones sin depender del orden de las claves (jsonb las reordena).
const canonical = (value) => {
  const object = typeof value === "string" ? JSON.parse(value) : value;
  return JSON.stringify(Object.keys(object ?? {}).sort().map((key) => [key, object[key]]));
};

function sameOrderData(existing, shipping, buyer, totalAmount) {
  try {
    return (
      Number(existing.total_amount) === totalAmount &&
      existing.shipping_zone_id === shipping.zone.id &&
      Number(existing.shipping_amount) === shipping.amount &&
      canonical(existing.shipping_address) === canonical(shipping.address) &&
      existing.customer_email === buyer.email
    );
  } catch {
    return false;
  }
}

// Valida todo el pedido y devuelve los datos listos para guardar.
async function prepareCheckout(body) {
  const buyerResult = validateBuyer(body.buyer);
  if (!buyerResult.ok) return buyerResult;

  const itemsResult = await validateItems(body.items);
  if (!itemsResult.ok) return itemsResult;

  const shippingResult = await validateShipping(body.shippingZoneId, body.shippingAddress);
  if (!shippingResult.ok) return shippingResult;

  const stockResult = await validateStock(itemsResult.validatedItems);
  if (!stockResult.ok) return stockResult;

  return {
    ok: true,
    buyer: buyerResult.buyer,
    items: itemsResult.validatedItems,
    productsAmount: itemsResult.productsAmount,
    shipping: shippingResult,
    shippingAmount: shippingResult.amount,
    totalAmount: itemsResult.productsAmount + shippingResult.amount,
  };
}

const sendFailure = (res, result) =>
  res.status(result.status).json({ error: result.error });

// =============================================
// PAGO CON TARJETA (crédito o débito) — Mercado Pago, Orders API
// =============================================

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

app.post(
  "/api/orders",
  wrap(async (req, res) => {
    const body = req.body ?? {};
    const { token, payment_method_id, payment_type_id, installments, email, identification, idempotencyKey } = body;

    if (
      !token ||
      !payment_method_id ||
      !["credit_card", "debit_card"].includes(payment_type_id) ||
      !Number.isInteger(installments) ||
      installments < 1 ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({ error: "Faltan datos obligatorios del pago." });
    }

    if (typeof idempotencyKey !== "string" || !UUID_V4.test(idempotencyKey)) {
      return res.status(400).json({ error: "Clave de idempotencia inválida." });
    }

    const prepared = await prepareCheckout(body);
    if (!prepared.ok) return sendFailure(res, prepared);

    const { buyer, items, productsAmount, shipping, shippingAmount, totalAmount } = prepared;
    const externalReference = `SAKKA-${idempotencyKey}`;

    let order = await orders.findOrderByReference(externalReference);

    if (order) {
      if (!sameOrderData(order, shipping, buyer, totalAmount)) {
        return res.status(409).json({
          error: "Este intento de compra ya tiene otro importe o dirección. Actualizá la página e intentá de nuevo.",
        });
      }

      if (order.payment_status === "approved") {
        return res.status(409).json({ error: "Este pedido ya figura como pagado." });
      }
    } else {
      order = await orders.saveOrder({
        external_reference: externalReference,
        customer_name: buyer.name,
        customer_phone: buyer.phone,
        customer_email: buyer.email,
        total_amount: totalAmount,
        shipping_zone_id: shipping.zone.id,
        shipping_zone_name: shipping.zone.name,
        shipping_amount: shippingAmount,
        shipping_address: shipping.address,
      });
    }

    await orders.saveOrderItems(order.id, items);

    const amount = totalAmount.toFixed(2);

    const orderResponse = await fetch(`${MP_API}/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "automatic",
        capture_mode: "automatic",
        external_reference: externalReference,
        total_amount: amount,
        description: "Compra en SAKKA Football T-Shirts (incluye envío)",
        transactions: {
          payments: [
            {
              amount,
              payment_method: {
                id: payment_method_id,
                type: payment_type_id,
                token,
                installments,
              },
            },
          ],
        },
        payer: {
          email: email.trim(),
          ...(identification?.type && identification?.number
            ? { identification: { type: identification.type, number: String(identification.number) } }
            : {}),
        },
      }),
    });

    const mpOrder = await orderResponse.json().catch(() => ({}));

    if (!orderResponse.ok || !mpOrder.id) {
      console.error("Error creando la orden en Mercado Pago:", {
        httpStatus: orderResponse.status,
        response: mpOrder,
      });

      return res.status(502).json({ error: "Mercado Pago no pudo procesar el pago." });
    }

    await orders.linkProviderOrder(String(mpOrder.id), externalReference);

    const providerPayment = mpOrder.transactions?.payments?.[0];

    if (providerPayment?.id) {
      await orders.updateProviderPayment(String(providerPayment.id), externalReference);
    }

    const paymentStatus = providerPayment?.status ?? null;
    const paymentStatusDetail = providerPayment?.status_detail ?? null;
    const paidAmount = Number(providerPayment?.paid_amount ?? providerPayment?.amount ?? 0);
    const orderPaidAmount = Number(mpOrder.total_paid_amount ?? 0);

    let localStatus = "pending";

    // Solo se aprueba si Mercado Pago confirma que se acreditó el total, envío incluido.
    if (
      mpOrder.status === "processed" &&
      mpOrder.status_detail === "accredited" &&
      paymentStatus === "processed" &&
      paymentStatusDetail === "accredited" &&
      orderPaidAmount === totalAmount &&
      paidAmount === totalAmount
    ) {
      localStatus = "approved";
    } else if (mpOrder.status === "cancelled") {
      localStatus = "cancelled";
    } else if (mpOrder.status === "refunded") {
      localStatus = "refunded";
    } else if (["rejected", "failed"].includes(mpOrder.status) || paymentStatus === "rejected") {
      localStatus = "rejected";
    }

    if (localStatus !== "pending") {
      await orderService.applyPaymentStatus(externalReference, localStatus);
    }

    return res.status(201).json({
      trackingCode: order.tracking_code,
      orderId: mpOrder.id,
      paymentId: providerPayment?.id ?? null,
      status: mpOrder.status,
      statusDetail: paymentStatusDetail ?? mpOrder.status_detail ?? null,
      paymentStatus: localStatus,
      paidAmount,
      productsAmount,
      shippingAmount,
      totalAmount,
    });
  }),
);

// =============================================
// PAGO CON LA CUENTA DE MERCADO PAGO (botón Wallet)
// =============================================

app.post(
  "/api/checkout-preference",
  wrap(async (req, res) => {
    const prepared = await prepareCheckout(req.body ?? {});
    if (!prepared.ok) return sendFailure(res, prepared);

    const { buyer, items, productsAmount, shipping, shippingAmount, totalAmount } = prepared;
    const externalReference = `SAKKA-${crypto.randomUUID()}`;

    const order = await orders.saveOrder({
      external_reference: externalReference,
      customer_name: buyer.name,
      customer_phone: buyer.phone,
      customer_email: buyer.email,
      total_amount: totalAmount,
      shipping_zone_id: shipping.zone.id,
      shipping_zone_name: shipping.zone.name,
      shipping_amount: shippingAmount,
      shipping_address: shipping.address,
    });

    await orders.saveOrderItems(order.id, items);

    const preferenceItems = items.map((item) => ({
      id: item.id,
      title: `${item.name} · talle ${item.size}`,
      quantity: item.quantity,
      unit_price: item.price,
      currency_id: "ARS",
    }));

    if (shippingAmount > 0) {
      preferenceItems.push({
        id: "shipping",
        title: `Envío a ${shipping.zone.name}`,
        quantity: 1,
        unit_price: shippingAmount,
        currency_id: "ARS",
      });
    }

    const preference = {
      items: preferenceItems,
      purpose: "wallet_purchase",
      external_reference: externalReference,
      payer: { email: buyer.email },
    };

    // Al terminar el pago, Mercado Pago devuelve al cliente a la página de seguimiento.
    const front = auth.allowedOrigins()[0];
    if (front && front.startsWith("https://")) {
      const back = `${front}/seguimiento?codigo=${encodeURIComponent(order.tracking_code)}`;
      preference.back_urls = { success: back, pending: back, failure: back };
      preference.auto_return = "approved";
    }

    if (process.env.BACKEND_URL) {
      preference.notification_url = `${process.env.BACKEND_URL.replace(/\/+$/, "")}/api/webhooks/mercadopago`;
    }

    const mpResponse = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const result = await mpResponse.json().catch(() => ({}));

    if (!mpResponse.ok || !result.id) {
      console.error("Error creando la preferencia:", {
        status: mpResponse.status,
        message: result.message,
      });

      return res.status(502).json({ error: "No se pudo preparar el pago con Mercado Pago." });
    }

    return res.status(201).json({
      preferenceId: result.id,
      trackingCode: order.tracking_code,
      externalReference,
      productsAmount,
      shippingAmount,
      totalAmount,
    });
  }),
);

// =============================================
// WEBHOOK DE MERCADO PAGO
// =============================================

app.post(
  "/api/webhooks/mercadopago",
  wrap(async (req, res) => {
    const secret = process.env.MP_WEBHOOK_SECRET;
    const signature = req.headers["x-signature"];
    const requestId = req.headers["x-request-id"];
    const dataId = String(req.query["data.id"] || "");
    const eventType = String(req.query.type || req.body?.type || "");
    const eventId = dataId || String(req.body?.data?.id || "");

    if (!["payment", "order"].includes(eventType) || !eventId) {
      return res.status(400).json({ error: "Tipo de notificación o identificador inválido." });
    }

    if (!secret || !signature || !requestId || !dataId) {
      return res.status(401).json({ error: "Notificación incompleta o webhook sin configurar." });
    }

    const parts = Object.fromEntries(
      String(signature)
        .split(",")
        .map((part) => {
          const separator = part.indexOf("=");
          return separator === -1
            ? [part.trim(), ""]
            : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
        }),
    );

    if (!parts.ts || !parts.v1) {
      return res.status(401).json({ error: "Firma inválida." });
    }

    // MP firma con el id en minúsculas cuando es alfanumérico.
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
    const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
    const received = Buffer.from(parts.v1, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) {
      return res.status(401).json({ error: "Firma de notificación inválida." });
    }

    // Nunca se confía en el aviso: se consulta el recurso directamente a Mercado Pago.
    const resourceUrl =
      eventType === "payment"
        ? `${MP_API}/v1/payments/${encodeURIComponent(eventId)}`
        : `${MP_API}/v1/orders/${encodeURIComponent(eventId)}`;

    const resourceResponse = await fetch(resourceUrl, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    if (!resourceResponse.ok) {
      console.error("Error al consultar el recurso de Mercado Pago:", {
        httpStatus: resourceResponse.status,
        eventType,
        eventId,
      });

      // 404: simulación con un id ficticio; no tiene sentido reintentar.
      if (resourceResponse.status === 404) return res.sendStatus(200);

      return res.status(502).json({ error: "No se pudo verificar el recurso de Mercado Pago." });
    }

    const resource = await resourceResponse.json();
    const externalReference = resource.external_reference;

    if (!externalReference) {
      console.error("El recurso no tiene external_reference.", { eventType, resourceId: resource.id });
      return res.sendStatus(200);
    }

    const localOrder = await orders.findOrderByReference(externalReference);

    if (!localOrder) {
      console.error("No se encontró el pedido de SAKKA.", { externalReference });
      return res.sendStatus(200);
    }

    const remoteAmount =
      eventType === "payment" ? Number(resource.transaction_amount) : Number(resource.total_amount);

    if (!Number.isFinite(remoteAmount) || remoteAmount !== Number(localOrder.total_amount)) {
      console.error("El importe de Mercado Pago no coincide con el del pedido.", {
        expected: localOrder.total_amount,
        received: remoteAmount,
      });
      return res.sendStatus(200);
    }

    if (eventType === "payment") {
      await orders.updateProviderPayment(String(resource.id), externalReference);
    } else {
      await orders.linkProviderOrder(String(resource.id), externalReference);
    }

    let localStatus = null;

    if (eventType === "order") {
      const payments = resource.transactions?.payments ?? [];
      const total = Number(localOrder.total_amount);

      const accredited = payments.some(
        (payment) =>
          payment.status === "processed" &&
          payment.status_detail === "accredited" &&
          Number(payment.paid_amount ?? payment.amount) === total,
      );

      if (
        resource.status === "processed" &&
        resource.status_detail === "accredited" &&
        Number(resource.total_paid_amount) === total &&
        accredited
      ) {
        localStatus = "approved";
      } else if (resource.status === "cancelled") {
        localStatus = "cancelled";
      } else if (resource.status === "refunded") {
        localStatus = "refunded";
      } else if (["rejected", "failed"].includes(resource.status)) {
        localStatus = "rejected";
      }
    } else {
      localStatus =
        {
          approved: "approved",
          rejected: "rejected",
          cancelled: "cancelled",
          refunded: "refunded",
          charged_back: "refunded",
        }[resource.status] ?? null;
    }

    if (localStatus) {
      await orderService.applyPaymentStatus(externalReference, localStatus);
    }

    return res.sendStatus(200);
  }),
);

// =============================================
// ADMINISTRACIÓN PRIVADA
// =============================================

const loginLimiter = auth.createLimiter({ windowMs: 15 * 60 * 1000, max: 8 });

app.post("/api/admin/login", (req, res) => {
  const key = clientIp(req);

  if (loginLimiter.blocked(key)) {
    return res.status(429).json({ error: "Demasiados intentos. Esperá 15 minutos y probá de nuevo." });
  }

  const { username, password } = req.body ?? {};

  if (typeof username !== "string" || typeof password !== "string" || username.length > 100 || password.length > 200) {
    return res.status(400).json({ error: "Ingresá usuario y contraseña válidos." });
  }

  if (!auth.checkCredentials(username, password)) {
    loginLimiter.hit(key);
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }

  loginLimiter.reset(key);
  res.set("Set-Cookie", auth.sessionCookie(process.env.ADMIN_USER));
  return res.json({ ok: true, username: process.env.ADMIN_USER });
});

app.get("/api/admin/me", (req, res) => {
  if (!auth.currentAdmin(req)) return res.status(401).json({ authenticated: false });
  return res.json({ authenticated: true, username: process.env.ADMIN_USER });
});

app.post("/api/admin/logout", (req, res) => {
  res.set("Set-Cookie", auth.clearCookie());
  return res.json({ ok: true });
});

const admin = express.Router();
admin.use(auth.requireAdmin);

// ---- Stock y precios ----
admin.get(
  "/catalog",
  wrap(async (req, res) => {
    res.json({ products: await catalog.getAdminCatalog() });
  }),
);

admin.patch(
  "/products/:id",
  wrap(async (req, res) => {
    const { price, active, stock: stockPatch } = req.body ?? {};
    const patch = {};

    if (price !== undefined) {
      if (!Number.isInteger(price) || price < 1 || price > 10_000_000) {
        return res.status(400).json({ error: "El precio debe ser un número entero mayor a cero." });
      }
      patch.price = price;
    }

    if (active !== undefined) {
      if (typeof active !== "boolean") {
        return res.status(400).json({ error: "El valor de visibilidad no es válido." });
      }
      patch.active = active;
    }

    if (stockPatch !== undefined) {
      if (!stockPatch || typeof stockPatch !== "object" || Array.isArray(stockPatch)) {
        return res.status(400).json({ error: "El stock no es válido." });
      }

      for (const [size, quantity] of Object.entries(stockPatch)) {
        if (!SIZES.includes(size) || !Number.isInteger(quantity) || quantity < 0 || quantity > 9999) {
          return res.status(400).json({
            error: "El stock de cada talle debe ser un entero entre 0 y 9999.",
          });
        }
      }

      patch.stock = stockPatch;
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "No hay cambios para guardar." });
    }

    try {
      await catalog.updateProduct(req.params.id, patch);
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      throw error;
    }

    const products = await catalog.getAdminCatalog();
    return res.json({ ok: true, product: products.find((p) => p.id === req.params.id) });
  }),
);

// ---- Pedidos ----
admin.get(
  "/orders",
  wrap(async (req, res) => {
    res.json({ orders: await orders.listOrders() });
  }),
);

// Elimina solo pedidos sin pago aprobado o ya reembolsados.
// Si un pedido reembolsado todavía había descontado stock, lo devuelve antes de borrar.
admin.delete(
  "/orders/:code",
  wrap(async (req, res) => {
    const code = orders.normalizeTrackingCode(req.params.code);
    if (!code) {
      return res.status(400).json({ error: "El código del pedido no es válido." });
    }

    const result = await tx(async (client) => {
      const { rows } = await client.query(
        `SELECT id, tracking_code, payment_status, stock_status
         FROM orders WHERE tracking_code = $1 FOR UPDATE`,
        [code],
      );
      const order = rows[0];

      if (!order) return { status: 404, error: "No se encontró el pedido." };

      if (order.payment_status === "approved") {
        return {
          status: 409,
          error: "No se puede eliminar un pedido con pago aprobado. Primero debe estar reembolsado.",
        };
      }

      if (order.stock_status === "deducted") {
        if (order.payment_status !== "refunded") {
          return {
            status: 409,
            error: "El pedido tiene stock descontado. Solo se puede eliminar después de reembolsarlo.",
          };
        }

        await stock.restockWithClient(client, order);
      }

      await client.query("DELETE FROM orders WHERE id = $1", [order.id]);
      return { ok: true, code: order.tracking_code };
    });

    if (result.status) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ ok: true, code: result.code });
  }),
);

admin.get(
  "/stats",
  wrap(async (req, res) => {
    res.json({ stats: await orders.getStats() });
  }),
);

admin.get(
  "/production-summary",
  wrap(async (req, res) => {
    const summary = await orders.getProductionSummary();
    res.json({
      summary,
      totals: { total_shirts: summary.reduce((sum, row) => sum + Number(row.quantity), 0) },
    });
  }),
);

admin.patch(
  "/orders/:code",
  wrap(async (req, res) => {
    const code = orders.normalizeTrackingCode(req.params.code);
    const { shipping_status, tracking_number, note, notify } = req.body ?? {};

    if (!code) return res.status(400).json({ error: "El código del pedido no es válido." });

    for (const [value, label] of [[tracking_number, "El número de seguimiento"], [note, "La nota"]]) {
      if (value !== undefined && value !== null && (typeof value !== "string" || value.length > 300)) {
        return res.status(400).json({ error: `${label} debe ser texto de hasta 300 caracteres.` });
      }
    }

    try {
      const result = await orderService.changeShipping(code, {
        status: shipping_status,
        trackingNumber: tracking_number,
        note,
        notify: notify !== false,
      });

      return res.json({
        ok: true,
        order: result.order,
        emailSent: result.emailSent ?? null,
        emailError: result.emailError ?? null,
      });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      throw error;
    }
  }),
);

// Reintenta el descuento de stock de un pedido pagado (por ejemplo, después de cargar stock).
admin.post(
  "/orders/:code/retry-stock",
  wrap(async (req, res) => {
    const code = orders.normalizeTrackingCode(req.params.code);
    const order = code && (await orders.findOrderByCode(code));

    if (!order) return res.status(404).json({ error: "No se encontró el pedido." });

    try {
      const result = await stock.deductOrderStock(order.external_reference);
      return res.json({ ok: true, result });
    } catch (error) {
      return res.status(409).json({ error: error.message });
    }
  }),
);

admin.post(
  "/orders/:code/resend-confirmation",
  wrap(async (req, res) => {
    const code = orders.normalizeTrackingCode(req.params.code);
    const order = code && (await orders.findOrderByCode(code));

    if (!order) return res.status(404).json({ error: "No se encontró el pedido." });

    if (!(await orders.resetConfirmationEmail(code))) {
      return res.status(409).json({ error: "El pedido todavía no está pagado." });
    }

    await orderService.sendApprovedOrderEmail(order.external_reference);
    const updated = await orders.findOrderByCode(code);

    return res.json({ ok: updated.confirmation_email_status === "sent", status: updated.confirmation_email_status });
  }),
);

// ---- Tarifas de envío por localidad ----
admin.get(
  "/zones",
  wrap(async (req, res) => {
    res.json({ zones: await catalog.getShippingZones({ includeInactive: true }) });
  }),
);

function readZone(body, { partial }) {
  const out = {};
  const text = (value, label) => {
    const clean = String(value ?? "").trim();
    if (clean.length < 2 || clean.length > 80) throw new Error(`${label} debe tener entre 2 y 80 caracteres.`);
    return clean;
  };

  if (!partial || body.name !== undefined) out.name = text(body.name, "El nombre");
  if (!partial || body.province !== undefined) out.province = text(body.province, "La provincia");

  if (!partial || body.price !== undefined) {
    if (!Number.isInteger(body.price) || body.price < 0 || body.price > 1_000_000) {
      throw new Error("El precio debe ser un número entero entre 0 y 1.000.000.");
    }
    out.price = body.price;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") throw new Error("El valor de activo no es válido.");
    out.active = body.active;
  }

  return out;
}

admin.post(
  "/zones",
  wrap(async (req, res) => {
    let data;

    try {
      data = readZone(req.body ?? {}, { partial: false });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const base = slug(data.name) || "zona";

    for (let n = 1; n <= 30; n += 1) {
      const id = n === 1 ? base : `${base}_${n}`;
      const zone = await catalog.createShippingZone({ id, ...data });
      if (zone) return res.status(201).json({ zone });
    }

    return res.status(409).json({ error: "Ya existe una localidad con ese nombre." });
  }),
);

admin.patch(
  "/zones/:id",
  wrap(async (req, res) => {
    let data;

    try {
      data = readZone(req.body ?? {}, { partial: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const zone = await catalog.updateShippingZone(req.params.id, data);
    if (!zone) return res.status(404).json({ error: "No existe esa localidad." });
    return res.json({ zone });
  }),
);

admin.delete(
  "/zones/:id",
  wrap(async (req, res) => {
    const removed = await catalog.deleteShippingZone(req.params.id);
    if (!removed) return res.status(404).json({ error: "No existe esa localidad." });
    return res.json({ ok: true });
  }),
);

app.use("/api/admin", admin);

// =============================================
// ERRORES
// =============================================

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Ruta inexistente." });
});

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  if (error?.type === "entity.parse.failed" || error instanceof SyntaxError) {
    return res.status(400).json({ error: "El cuerpo de la solicitud no es un JSON válido." });
  }

  console.error("Error no controlado:", error);
  return res.status(500).json({ error: "Ocurrió un error interno. Probá de nuevo." });
});

// =============================================
// INICIO
// =============================================

async function start() {
  checkEnvironment();
  await ensureSchema();

  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Backend SAKKA disponible en el puerto ${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  });
}

module.exports = { app, start, checkEnvironment };

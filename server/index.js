require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { MercadoPagoConfig, Payment } = require("mercadopago");
const { sendApprovedOrderEmail } = require("./services/orderEmail");
const session = require("express-session");

const { getShippingOptions, getShippingByZone } = require("./config/shipping");

const {
  saveOrder,
  saveOrderItems,
  findOrderByReference,
  updateProviderPayment,
  updatePaymentStatus,
  linkProviderOrder,
} = require("./repositories/ordersRepository");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";
const sessionSameSite = process.env.SESSION_COOKIE_SAME_SITE || (isProduction ? "none" : "lax");

// Render y otros proxies terminan HTTPS antes de llegar a Express.
app.set("trust proxy", 1);
const {
  initializeInventory,
  getInventory,
  setStock,
  deductApprovedOrderStock,
} = require("./repositories/inventoryRepository");

const PRODUCT_CATALOG = {
  1: { name: "Juventus Kappa 1997/98", price: 60000 },
  2: { name: "Paris Saint-Germain 2003/04", price: 60000 },
  3: { name: "Real Madrid Kelme 1997/98", price: 60000 },
  4: { name: "Real Madrid Fly Emirates 2025/26", price: 60000 },
  5: { name: "Barcelona Kappa 1997/98", price: 60000 },
  6: { name: "Japón One Piece", price: 60000 },
  7: { name: "AC Milan Adidas 2011/12", price: 60000 },
  8: { name: "Italia Adidas 2023/24", price: 60000 },
  9: { name: "Fiorentina Lotto 1992/93", price: 60000 },
  10: { name: "Alemania Adidas 1990", price: 60000 },
  11: { name: "Japón Sakura Edition", price: 60000 },
  12: { name: "Brasil Nike Azul", price: 60000 },
  13: { name: "Juventus Kappa 1995/96", price: 60000 },
  14: { name: "Napoli NR 1988/89", price: 60000 },
  15: { name: "Napoli NR 1985/86", price: 60000 },
};

if (!process.env.MP_ACCESS_TOKEN) {
  console.error("Falta MP_ACCESS_TOKEN en el archivo .env");
  process.exit(1);
}

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// Se conserva para compatibilidad con la integración existente.
const paymentClient = new Payment(mpClient);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
if (
  !process.env.ADMIN_USER ||
  !process.env.ADMIN_PASSWORD ||
  !process.env.ADMIN_SESSION_SECRET
) {
  throw new Error(
    "Faltan ADMIN_USER, ADMIN_PASSWORD o ADMIN_SESSION_SECRET en server/.env",
  );
}

app.use(
  session({
    name: "sakka_admin_session",
    secret: process.env.ADMIN_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Desarrollo local; cambiar al publicar con HTTPS
      sameSite: sessionSameSite,
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

app.use(express.json({ limit: "100kb" }));

// =============================================
// ADMINISTRACIÓN PRIVADA
// =============================================

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin === true) {
    return next();
  }

  return res.status(401).json({
    error: "Necesitás iniciar sesión como administrador.",
  });
}

app.get("/api/admin/inventory", requireAdmin, async (req, res) => {
  try {
    return res.json({ inventory: await getInventory() });
  } catch (error) {
    console.error("Error consultando inventario:", error);
    return res.status(500).json({
      error: "No se pudo consultar el inventario.",
    });
  }
});

app.patch("/api/admin/inventory", requireAdmin, async (req, res) => {
  try {
    const { productId, size, quantity } = req.body ?? {};

    const item = await setStock(
      String(productId ?? ""),
      String(size ?? ""),
      quantity,
    );

    return res.json({
      message: "Stock actualizado correctamente.",
      item,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "No se pudo actualizar el stock.",
    });
  }
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body ?? {};

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length > 100 ||
    password.length > 200
  ) {
    return res.status(400).json({
      error: "Ingresá usuario y contraseña válidos.",
    });
  }

  const validUser = username === process.env.ADMIN_USER;
  const validPassword = password === process.env.ADMIN_PASSWORD;

  if (!validUser || !validPassword) {
    return res.status(401).json({
      error: "Usuario o contraseña incorrectos.",
    });
  }

  req.session.regenerate((error) => {
    if (error) {
      console.error("Error creando sesión de administrador:", error);

      return res.status(500).json({
        error: "No se pudo iniciar la sesión.",
      });
    }

    req.session.isAdmin = true;

    req.session.save((saveError) => {
      if (saveError) {
        console.error("Error guardando sesión:", saveError);

        return res.status(500).json({
          error: "No se pudo guardar la sesión.",
        });
      }

      return res.json({
        ok: true,
        message: "Sesión iniciada.",
      });
    });
  });
});

app.get("/api/admin/me", (req, res) => {
  if (req.session?.isAdmin !== true) {
    return res.status(401).json({
      authenticated: false,
    });
  }

  return res.json({
    authenticated: true,
    username: process.env.ADMIN_USER,
  });
});

app.post("/api/admin/logout", (req, res) => {
  if (!req.session) {
    return res.json({ ok: true });
  }

  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        error: "No se pudo cerrar la sesión.",
      });
    }

    res.clearCookie("sakka_admin_session", {
      httpOnly: true,
      secure: isProduction,
      sameSite: sessionSameSite,
    });

    return res.json({ ok: true });
  });
});

// ======================================================
// ADMINISTRACIÓN DE PEDIDOS — RUTAS PROTEGIDAS
// ======================================================

const { query: dbQuery, initializeDatabase } = require("./db/database");
const { getOrderItemsByReference } = require("./repositories/ordersRepository");

// GET: listar pedidos con sus productos.
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const result = await dbQuery("SELECT * FROM orders ORDER BY id DESC");
    const ordersWithItems = await Promise.all(
      result.rows.map(async (order) => {
        let shippingAddress = order.shipping_address;
        if (typeof shippingAddress === "string") {
          try { shippingAddress = JSON.parse(shippingAddress); } catch { /* conservar original */ }
        }
        return {
          ...order,
          shipping_address: shippingAddress,
          items: await getOrderItemsByReference(order.external_reference),
        };
      }),
    );
    return res.json({ orders: ordersWithItems });
  } catch (error) {
    console.error("Error listando pedidos:", error.message);
    return res.status(500).json({ error: "No se pudieron cargar los pedidos." });
  }
});

// GET: estadísticas generales y facturación aprobada.
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT COUNT(*)::INTEGER AS total_orders,
             COUNT(*) FILTER (WHERE payment_status = 'approved')::INTEGER AS approved_orders,
             COUNT(*) FILTER (WHERE payment_status = 'pending')::INTEGER AS pending_orders,
             COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'approved'), 0) AS approved_revenue
      FROM orders
    `);
    const stats = result.rows[0] || {};
    return res.json({
      stats: {
        total_orders: Number(stats.total_orders || 0),
        approved_orders: Number(stats.approved_orders || 0),
        pending_orders: Number(stats.pending_orders || 0),
        approved_revenue: Number(stats.approved_revenue || 0),
      },
    });
  } catch (error) {
    console.error("Error cargando estadísticas:", error.message);
    return res.status(500).json({ error: "No se pudieron cargar las estadísticas." });
  }
});

// GET: resumen de producción de pedidos con pago aprobado.
app.get("/api/admin/production-summary", requireAdmin, async (req, res) => {
  try {
    const summaryResult = await dbQuery(`
      SELECT oi.product_id, oi.product_name, oi.size,
             SUM(oi.quantity)::INTEGER AS quantity
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE o.payment_status = 'approved'
      GROUP BY oi.product_id, oi.product_name, oi.size
      ORDER BY oi.product_name ASC, oi.size ASC
    `);
    const totalsResult = await dbQuery(`
      SELECT COUNT(DISTINCT o.id)::INTEGER AS approved_orders,
             COALESCE(SUM(oi.quantity), 0)::INTEGER AS total_shirts
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.payment_status = 'approved'
    `);
    const totals = totalsResult.rows[0] || {};
    return res.json({
      summary: summaryResult.rows.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        size: item.size || "Sin talle registrado",
        quantity: Number(item.quantity || 0),
      })),
      totals: {
        approved_orders: Number(totals.approved_orders || 0),
        total_shirts: Number(totals.total_shirts || 0),
      },
    });
  } catch (error) {
    console.error("Error cargando resumen de producción:", error.message);
    return res.status(500).json({ error: "No se pudo cargar el resumen de producción." });
  }
});

// PATCH: actualizar únicamente el envío.
app.patch("/api/admin/orders/:reference/shipping", requireAdmin, async (req, res) => {
  try {
    const reference = req.params.reference;
    const { shipping_status, tracking_number } = req.body ?? {};
    const validStatuses = ["pending", "preparing", "shipped", "delivered", "cancelled"];
    if (typeof shipping_status !== "string" || !validStatuses.includes(shipping_status)) {
      return res.status(400).json({ error: "El estado de envío no es válido." });
    }
    if (tracking_number !== undefined && tracking_number !== null && typeof tracking_number !== "string") {
      return res.status(400).json({ error: "El número de seguimiento debe ser texto." });
    }
    const trackingNumber = String(tracking_number ?? "").trim();
    if (trackingNumber.length > 150) {
      return res.status(400).json({ error: "El número de seguimiento es demasiado largo." });
    }
    const existing = await dbQuery("SELECT id FROM orders WHERE external_reference = $1", [reference]);
    if (!existing.rows[0]) {
      return res.status(404).json({ error: "No se encontró el pedido." });
    }
    const updated = await dbQuery(`
      UPDATE orders
      SET shipping_status = $1,
          tracking_number = $2,
          shipping_updated_at = NOW(),
          updated_at = NOW()
      WHERE external_reference = $3
      RETURNING *
    `, [shipping_status, trackingNumber || null, reference]);
    return res.json({
      ok: true,
      message: "Envío actualizado correctamente.",
      order: updated.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando envío:", error.message);
    return res.status(500).json({ error: "No se pudo actualizar el envío." });
  }
});

// ======================================================
// ESTADO DEL BACKEND
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Backend de SAKKA funcionando",
  });
});

app.get("/api/inventory", async (req, res) => {
  try {
    const inventory = (await getInventory()).map((item) => ({
      product_id: item.product_id,
      size: item.size,
      quantity: item.configured === 1
        ? Number(item.quantity)
        : 0,
    }));

    return res.json({ inventory });
  } catch (error) {
    console.error("Error consultando stock público:", error);

    return res.status(500).json({
      error: "No se pudo consultar el stock.",
    });
  }
});

app.get("/api/mp-config", (req, res) => {
  res.json({
    configured: Boolean(process.env.MP_ACCESS_TOKEN),
    environment: process.env.MP_ENVIRONMENT || "test",
  });
});

// ======================================================
// ENVÍOS
// ======================================================

// Endpoint de opciones de envío.
app.get("/api/shipping/options", (req, res) => {
  res.json({
    options: getShippingOptions(),
    manualQuoteRequired: true,
  });
});

// Alias compatible con Checkout.jsx, que espera { zones: [...] }.
app.get("/api/shipping-zones", (req, res) => {
  res.json({
    zones: getShippingOptions(),
    manualQuoteRequired: true,
  });
});

// ======================================================
// VALIDACIÓN DE PRODUCTOS
// ======================================================

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "El carrito está vacío.",
    };
  }

  const validatedItems = [];
  let productsAmount = 0;
  let totalItems = 0;

  for (const item of items) {
    const product = PRODUCT_CATALOG[String(item?.id)];
    const quantity = item?.quantity;

    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      return {
        ok: false,
        status: 400,
        error: "Producto o cantidad inválidos.",
      };
    }

    totalItems += quantity;

    if (totalItems > 20) {
      return {
        ok: false,
        status: 400,
        error: "El carrito supera la cantidad permitida.",
      };
    }

    productsAmount += product.price * quantity;

    const size = String(item?.size ?? item?.talle ?? "").trim();
    console.log("TALLE RECIBIDO:", {
      producto: item.id,
      size: item.size,
      talle: item.talle,
      sizeValidado: size,
    });

    if (size.length > 20) {
      return {
        ok: false,
        status: 400,
        error: "El talle del producto no es válido.",
      };
    }

    validatedItems.push({
      id: String(item.id),
      name: product.name,
      quantity,
      price: product.price,
      size: size || null,
    });
  }

  return {
    ok: true,
    validatedItems,
    productsAmount,
  };
}

async function validateStock(items) {
  const inventory = await getInventory();

  for (const item of items) {
    if (!item.size) {
      return {
        ok: false,
        error: `Seleccioná un talle para ${item.name}.`,
      };
    }

    const stock = inventory.find(
      (entry) =>
        String(entry.product_id) === String(item.id) &&
        entry.size === item.size
    );

    if (!stock || stock.configured !== 1) {
      return {
        ok: false,
        error: `El talle ${item.size} de ${item.name} no está disponible.`,
      };
    }

    if (Number(stock.quantity) < item.quantity) {
      return {
        ok: false,
        error: `No hay suficiente stock de ${item.name}, talle ${item.size}.`,
      };
    }
  }

  return { ok: true };
}

// ======================================================
// VALIDACIÓN DEL ENVÍO
// ======================================================

function validateShipping(shippingZoneId, shippingAddress) {
  const zone = getShippingByZone(shippingZoneId);

  // Si la localidad no tiene tarifa configurada, no se permite pagar.
  if (!zone) {
    return {
      ok: false,
      status: 409,
      error:
        "El envío a esta localidad requiere cotización manual. Contactanos para confirmar el costo antes de pagar.",
      manualQuoteRequired: true,
    };
  }

  if (
    !shippingAddress ||
    typeof shippingAddress !== "object" ||
    Array.isArray(shippingAddress)
  ) {
    return {
      ok: false,
      status: 400,
      error: "Faltan los datos de la dirección de entrega.",
    };
  }

  // Se aceptan distintos nombres para mantener compatibilidad
  // con los campos del formulario del frontend.
  const street = String(
    shippingAddress.street ?? shippingAddress.calle ?? "",
  ).trim();

  const number = String(
    shippingAddress.number ?? shippingAddress.altura ?? "",
  ).trim();

  const postalCode = String(
    shippingAddress.postalCode ??
      shippingAddress.postal_code ??
      shippingAddress.codigoPostal ??
      "",
  ).trim();

  const city = String(
    shippingAddress.city ?? shippingAddress.partido ?? "",
  ).trim();

  const apartment = String(
    shippingAddress.apartment ?? shippingAddress.departamento ?? "",
  ).trim();

  const references = String(
    shippingAddress.references ?? shippingAddress.referencias ?? "",
  ).trim();

  const notes = String(
    shippingAddress.notes ?? shippingAddress.indicaciones ?? "",
  ).trim();

  if (!street || !number || !city || !postalCode) {
    return {
      ok: false,
      status: 400,
      error: "Completá calle, altura, partido y código postal.",
    };
  }

  const addressValues = [
    street,
    number,
    city,
    postalCode,
    apartment,
    references,
    notes,
  ];

  if (addressValues.some((value) => value.length > 250)) {
    return {
      ok: false,
      status: 400,
      error: "Uno de los datos de la dirección es demasiado largo.",
    };
  }

  return {
    ok: true,
    zone,
    amount: zone.price,
    address: {
      street,
      number,
      city,
      postalCode,
      apartment,
      references,
      notes,
    },
  };
}

// ======================================================
// VALIDACIONES DE PEDIDOS EXISTENTES
// ======================================================

function sameStoredAddress(stored, address) {
  try {
    const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;

    return JSON.stringify(parsed) === JSON.stringify(address);
  } catch {
    return false;
  }
}

function ensureOrderShippingMatches(existingOrder, shipping) {
  return (
    existingOrder.shipping_zone_id === shipping.zone.id &&
    Number(existingOrder.shipping_amount) === shipping.amount &&
    sameStoredAddress(existingOrder.shipping_address, shipping.address)
  );
}

app.get("/api/tracking/:reference", async (req, res) => {
  try {
    const reference = String(req.params.reference || "").trim();

    if (!/^SAKKA-[0-9a-f-]{36}$/i.test(reference)) {
      return res.status(400).json({
        error: "La referencia del pedido no es válida.",
      });
    }

    const order = await findOrderByReference(reference);

    if (!order) {
      return res.status(404).json({
        error: "No encontramos un pedido con esa referencia.",
      });
    }

    return res.json({
      reference: order.external_reference,
      paymentStatus: order.payment_status,
      shippingStatus: order.shipping_status || "pending",
      trackingNumber: order.tracking_number || null,
      updatedAt: order.shipping_updated_at || null,
    });
  } catch (error) {
    console.error("Error consultando seguimiento:", error);

    return res.status(500).json({
      error: "No se pudo consultar el seguimiento.",
    });
  }
});

// ======================================================
// PAGO CON TARJETA - MERCADO PAGO ORDERS API
// ======================================================

app.post("/api/orders", async (req, res) => {
  try {
    const {
      items,
      token,
      payment_method_id,
      payment_type_id,
      installments,
      email,
      identification,
      idempotencyKey,
      shippingZoneId,
      shippingAddress,
    } = req.body ?? {};

    // Validar información de pago.
    if (
      !token ||
      !payment_method_id ||
      !["credit_card", "debit_card"].includes(payment_type_id) ||
      !Number.isInteger(installments) ||
      installments < 1 ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        error: "Faltan datos obligatorios del pago.",
      });
    }
    const validatedCustomerEmail = email.trim().toLowerCase();

    // Validar clave de idempotencia UUID versión 4.
    if (
      typeof idempotencyKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    ) {
      return res.status(400).json({
        error: "Clave de idempotencia inválida.",
      });
    }

    // Validar productos utilizando precios del servidor.
    const itemsResult = validateItems(items);

    if (!itemsResult.ok) {
      return res.status(itemsResult.status).json({
        error: itemsResult.error,
      });
    }

    // Validar localidad, tarifa y dirección.
    const shippingResult = validateShipping(shippingZoneId, shippingAddress);

    if (!shippingResult.ok) {
      return res.status(shippingResult.status).json({
        error: shippingResult.error,
        manualQuoteRequired: Boolean(shippingResult.manualQuoteRequired),
      });
    }

    const { validatedItems, productsAmount } = itemsResult;

    const stockResult = await validateStock(validatedItems);

if (!stockResult.ok) {
  return res.status(409).json({
    error: stockResult.error,
  });
}

    const shipping = shippingResult;
    const shippingAmount = shipping.amount;

    // Total definitivo calculado por el backend.
    const totalAmount = productsAmount + shippingAmount;

    const externalReference = `SAKKA-${idempotencyKey}`;

    const existingOrder = await findOrderByReference(externalReference);

    if (existingOrder) {
      if (
        Number(existingOrder.total_amount) !== totalAmount ||
        !ensureOrderShippingMatches(existingOrder, shipping)
      ) {
        return res.status(409).json({
          error:
            "La clave de compra ya está asociada a otro importe o dirección. Actualizá el checkout e intentá nuevamente.",
        });
      }

      if (existingOrder.payment_status === "approved") {
        return res.status(409).json({
          error: "Este pedido ya figura como pagado.",
        });
      }
    } else {
      await saveOrder({
        external_reference: externalReference,
        provider_order_id: null,
        provider_payment_id: null,
        customer_email: validatedCustomerEmail,
        total_amount: totalAmount,
        currency: "ARS",
        payment_status: "pending",
        shipping_zone_id: shipping.zone.id,
        shipping_zone_name: shipping.zone.name,
        shipping_amount: shippingAmount,
        shipping_address: shipping.address,
      });
    }

    await saveOrderItems(externalReference, validatedItems);

    const amount = totalAmount.toFixed(2);

    const orderBody = {
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
          ? {
              identification: {
                type: identification.type,
                number: String(identification.number),
              },
            }
          : {}),
      },
    };

    const orderResponse = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(orderBody),
    });

    const order = await orderResponse.json();

    if (!orderResponse.ok || !order.id) {
      console.error("Error creando order con tarjeta:", {
        httpStatus: orderResponse.status,
        response: order,
      });

      return res.status(502).json({
        error: "Mercado Pago no pudo procesar el pago.",
      });
    }

    await linkProviderOrder(String(order.id), externalReference);

    const providerPayment = order.transactions?.payments?.[0];

    if (providerPayment?.id) {
      await updateProviderPayment(String(providerPayment.id), externalReference);
    }

    const paymentStatus = providerPayment?.status ?? null;

    const paymentStatusDetail = providerPayment?.status_detail ?? null;

    const paidAmount = Number(
      providerPayment?.paid_amount ?? providerPayment?.amount ?? 0,
    );

    const orderPaidAmount = Number(order.total_paid_amount ?? 0);

    let localStatus = "pending";

    // Marcar como aprobado únicamente si Mercado Pago confirma
    // que se acreditó el importe total, incluido el envío.
    if (
      order.status === "processed" &&
      order.status_detail === "accredited" &&
      paymentStatus === "processed" &&
      paymentStatusDetail === "accredited" &&
      orderPaidAmount === totalAmount &&
      paidAmount === totalAmount
    ) {
      localStatus = "approved";
    } else if (order.status === "cancelled") {
      localStatus = "cancelled";
    } else if (order.status === "refunded") {
      localStatus = "refunded";
    } else if (
      ["rejected", "failed"].includes(order.status) ||
      paymentStatus === "rejected"
    ) {
      localStatus = "rejected";
    }

    if (localStatus !== "pending") {
      await updatePaymentStatus(localStatus, externalReference);
    }
    if (localStatus === "approved") {
      await sendApprovedOrderEmail(externalReference);
    }

    return res.status(201).json({
      orderId: order.id,
      paymentId: providerPayment?.id ?? null,
      status: order.status,
      statusDetail: paymentStatusDetail ?? order.status_detail ?? null,
      paidAmount,
      productsAmount,
      shippingAmount,
      totalAmount,
      externalReference,
    });
  } catch (error) {
    console.error("Error procesando pago con tarjeta:", error);

    return res.status(500).json({
      error: "Error interno al procesar el pago.",
    });
  }
});

// ======================================================
// CHECKOUT CON BILLETERA MERCADO PAGO
// ======================================================

app.post("/api/checkout-preference", async (req, res) => {
  try {
    const { items, shippingZoneId, shippingAddress, customerEmail } =
      req.body ?? {};

    if (
      typeof customerEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
    ) {
      return res.status(400).json({
        error:
          "Ingresá un email válido para recibir la confirmación del pedido.",
      });
    }

    const validatedCustomerEmail = customerEmail.trim().toLowerCase();

    const itemsResult = validateItems(items);

    if (!itemsResult.ok) {
      return res.status(itemsResult.status).json({
        error: itemsResult.error,
      });
    }

    const shippingResult = validateShipping(shippingZoneId, shippingAddress);

    if (!shippingResult.ok) {
      return res.status(shippingResult.status).json({
        error: shippingResult.error,
        manualQuoteRequired: Boolean(shippingResult.manualQuoteRequired),
      });
    }

    const { validatedItems, productsAmount } = itemsResult;

    const stockResult = await validateStock(validatedItems);

if (!stockResult.ok) {
  return res.status(409).json({
    error: stockResult.error,
  });
}

    const shipping = shippingResult;
    const shippingAmount = shipping.amount;
    const totalAmount = productsAmount + shippingAmount;

    const externalReference = `SAKKA-${crypto.randomUUID()}`;

    const preferenceItems = validatedItems.map((item) => ({
      id: item.id,
      title: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      currency_id: "ARS",
    }));

    // El envío se agrega como un ítem separado.
    if (shippingAmount > 0) {
      preferenceItems.push({
        id: "shipping",
        title: `Envío a ${shipping.zone.name}`,
        quantity: 1,
        unit_price: shippingAmount,
        currency_id: "ARS",
      });
    }

    // Guardar el pedido antes de crear la preferencia,
    // para poder relacionarlo con el webhook.
    await saveOrder({
      external_reference: externalReference,
      provider_order_id: null,
      provider_payment_id: null,
      customer_email: validatedCustomerEmail,
      total_amount: totalAmount,
      currency: "ARS",
      payment_status: "pending",
      shipping_zone_id: shipping.zone.id,
      shipping_zone_name: shipping.zone.name,
      shipping_amount: shippingAmount,
      shipping_address: shipping.address,
    });

    await saveOrderItems(externalReference, validatedItems);

    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: preferenceItems,
          purpose: "wallet_purchase",
          external_reference: externalReference,
        }),
      },
    );

    const result = await mpResponse.json();

    if (!mpResponse.ok || !result.id) {
      console.error("Error creando preferencia:", {
        status: mpResponse.status,
        message: result.message,
      });

      return res.status(502).json({
        error: "No se pudo preparar el checkout de Mercado Pago.",
      });
    }

    return res.status(201).json({
      preferenceId: result.id,
      externalReference,
      productsAmount,
      shippingAmount,
      totalAmount,
    });
  } catch (error) {
    console.error("Error creando checkout:", error);

    return res.status(500).json({
      error: "Error al preparar el checkout.",
    });
  }
});

// ======================================================
// WEBHOOK MERCADO PAGO
// ======================================================

app.post("/api/webhooks/mercadopago", async (req, res) => {
  try {
    const secret = process.env.MP_WEBHOOK_SECRET;
    const signature = req.headers["x-signature"];
    const requestId = req.headers["x-request-id"];

    const dataId = String(req.query["data.id"] || "");
    // Mercado Pago requiere data.id en minúsculas para calcular la firma
    // cuando el identificador de la orden contiene caracteres alfanuméricos.
    // Conservamos dataId original para consultar el recurso con su ID exacto.
    const signatureDataId = dataId.toLowerCase();

    const eventType = String(req.query.type || req.body?.type || "");

    const eventId = dataId || String(req.body?.data?.id || "");

    if (!["payment", "order"].includes(eventType) || !eventId) {
      return res.status(400).json({
        error: "Tipo de notificación o identificador inválido.",
      });
    }

    if (!secret || !signature || !requestId || !dataId) {
      return res.status(401).json({
        error: "Notificación incompleta o webhook sin configurar.",
      });
    }

    // Validar firma de Mercado Pago.
    const parts = Object.fromEntries(
      signature.split(",").map((part) => {
        const separator = part.indexOf("=");

        return separator === -1
          ? [part.trim(), ""]
          : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
      }),
    );

    const timestamp = parts.ts;
    const receivedSignature = parts.v1;

    if (!timestamp || !receivedSignature) {
      return res.status(401).json({
        error: "Firma inválida.",
      });
    }

    const manifest = `id:${signatureDataId};request-id:${requestId};ts:${timestamp};`;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    const receivedBuffer = Buffer.from(receivedSignature, "hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return res.status(401).json({
        error: "Firma de notificación inválida.",
      });
    }

    // Consultar el recurso directamente a Mercado Pago.
    const resourceUrl =
      eventType === "payment"
        ? `https://api.mercadopago.com/v1/payments/${encodeURIComponent(eventId)}`
        : `https://api.mercadopago.com/v1/orders/${encodeURIComponent(eventId)}`;

    const resourceResponse = await fetch(resourceUrl, {
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
    });

    if (!resourceResponse.ok) {
      const errorDetails = await resourceResponse.text();

      console.error("Error al consultar recurso de Mercado Pago:", {
        httpStatus: resourceResponse.status,
        response: errorDetails,
        eventType,
        eventId,
      });

      if (resourceResponse.status === 404) {
        console.warn(
          "Recurso inexistente; puede ser una simulación con ID ficticio:",
          { eventType, eventId },
        );

        return res.sendStatus(200);
      }

      return res.status(502).json({
        error: "No se pudo verificar el recurso de Mercado Pago.",
      });
    }

    const resource = await resourceResponse.json();
    const externalReference = resource.external_reference;

    console.log("Recurso verificado:", {
      eventType,
      resourceId: resource.id,
      status: resource.status,
      externalReference,
    });

    if (!externalReference) {
      console.error("El recurso no contiene external_reference.", {
        eventType,
        resourceId: resource.id,
      });

      return res.sendStatus(200);
    }

    const localOrder = await findOrderByReference(externalReference);

    if (!localOrder) {
      console.error("No se encontró el pedido de SAKKA.", {
        externalReference,
      });

      return res.sendStatus(200);
    }

    // El importe remoto debe coincidir con el total local,
    // que ya incluye el envío.
    const remoteAmount =
      eventType === "payment"
        ? Number(resource.transaction_amount)
        : Number(resource.total_amount);

    if (
      !Number.isFinite(remoteAmount) ||
      remoteAmount !== Number(localOrder.total_amount)
    ) {
      console.error("El importe de Mercado Pago no coincide con SAKKA.", {
        expected: localOrder.total_amount,
        received: remoteAmount,
      });

      return res.sendStatus(200);
    }

    if (eventType === "payment") {
      await updateProviderPayment(String(resource.id), externalReference);
    } else {
      await linkProviderOrder(String(resource.id), externalReference);
    }

    let localStatus = null;

    if (eventType === "order") {
      const payments = resource.transactions?.payments ?? [];

      const accreditedPayment = payments.some(
        (payment) =>
          payment.status === "processed" &&
          payment.status_detail === "accredited" &&
          Number(payment.paid_amount ?? payment.amount) ===
            Number(localOrder.total_amount),
      );

      if (
        resource.status === "processed" &&
        resource.status_detail === "accredited" &&
        Number(resource.total_paid_amount) ===
          Number(localOrder.total_amount) &&
        accreditedPayment
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
      const statusMap = {
        approved: "approved",
        rejected: "rejected",
        cancelled: "cancelled",
        refunded: "refunded",
      };

      localStatus = statusMap[resource.status] ?? null;
    }

    if (localStatus) {
      await updatePaymentStatus(localStatus, externalReference);
    }

    if (localStatus === "approved") {
      // Descontar stock solo con el pago aprobado.
      // La función debe ser transaccional e idempotente.
      const stockResult = await deductApprovedOrderStock(externalReference);

      if (
        stockResult.deducted === false &&
        stockResult.reason !== "already_processed"
      ) {
        throw new Error("No se pudo confirmar el descuento de inventario.");
      }

      await sendApprovedOrderEmail(externalReference);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error procesando webhook:", error);

    return res.sendStatus(500);
  }
});

// ======================================================
// INICIAR SERVIDOR
// ======================================================

async function startServer() {
  await initializeDatabase();
  await initializeInventory();

  app.listen(PORT, () => {
    console.log(`Backend SAKKA escuchando en puerto ${PORT}`);
    console.log("PostgreSQL conectado. API de SAKKA lista.");
  });
}

startServer().catch((error) => {
  console.error("No se pudo iniciar SAKKA:", error);
  process.exit(1);
});

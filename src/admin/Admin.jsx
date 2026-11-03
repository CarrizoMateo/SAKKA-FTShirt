import { API_URL } from "../api";
import { useCallback, useEffect, useState } from "react";
import {
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import "./admin.css";
import Inventory from "./Inventory.jsx";

const API = `${API_URL}/api/admin`;

const money = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const shippingLabels = {
  pending: "Pendiente",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const paymentLabels = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "No se pudo completar la operación.");
  }

  return data;
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [production, setProduction] = useState({
    summary: [],
    totals: {
      approved_orders: 0,
      total_shirts: 0,
    },
  });

  useEffect(() => {
    let active = true;

    const timeoutId = setTimeout(() => {
      if (active) {
        setAuthenticated(false);
        setCheckingSession(false);
      }
    }, 8000);

    fetch(`${API}/me`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("La sesión no está activa.");
        }

        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setAuthenticated(data.authenticated === true);
      })
      .catch(() => {
        if (active) {
          setAuthenticated(false);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);

        if (active) {
          setCheckingSession(false);
        }
      });

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [ordersData, statsData, productionData] = await Promise.all([
        apiRequest("/orders"),
        apiRequest("/stats"),
        apiRequest("/production-summary"),
      ]);

      setOrders(
        Array.isArray(ordersData) ? ordersData : ordersData.orders || [],
      );

      setStats(statsData.stats || statsData);

      setProduction({
        summary: Array.isArray(productionData.summary)
          ? productionData.summary
          : [],
        totals: productionData.totals || {
          approved_orders: 0,
          total_shirts: 0,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) loadDashboard();
  }, [authenticated, loadDashboard]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const data = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setAuthenticated(data.ok === true);
      setPassword("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogout() {
    try {
      await apiRequest("/logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      setOrders([]);
      setStats({});
    }
  }

  async function saveShipping(event) {
    event.preventDefault();
    if (!editing) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/orders/${encodeURIComponent(editing.external_reference)}/shipping`,
        {
          method: "PATCH",
          body: JSON.stringify({
            shipping_status: editing.shipping_status,
            tracking_number: editing.tracking_number,
          }),
        },
      );

      setNotice("Envío actualizado correctamente.");
      setEditing(null);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function retryConfirmationEmail(order) {
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `/orders/${encodeURIComponent(order.external_reference)}/resend-confirmation`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      setNotice(result.message || "Se procesó el envío del correo.");
      setSelectedOrder((current) =>
        current
          ? { ...current, confirmation_email_status: result.emailStatus || current.confirmation_email_status }
          : current,
      );
      await loadDashboard();
    } catch (err) {
      setError(err.message);
      await loadDashboard();
    }
  }

  async function cleanupSandboxOrders() {
    const confirmed = window.confirm(
      "Vas a eliminar los 5 pedidos de prueba (1 aprobado y 4 pendientes) y sus productos asociados. Las cantidades del inventario y los movimientos de stock se conservarán. ¿Continuar?",
    );

    if (!confirmed) return;

    setCleanupLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest("/orders/cleanup-sandbox", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice(result.message || "Pedidos de prueba eliminados.");
      setSelectedOrder(null);
      await loadDashboard();
    } catch (err) {
      setError(err.message || "No se pudieron limpiar los pedidos de prueba.");
      await loadDashboard();
    } finally {
      setCleanupLoading(false);
    }
  }

  const filteredOrders = orders.filter((order) => {
    const term = search.trim().toLowerCase();

    const matchesSearch =
      !term ||
      String(order.external_reference || "")
        .toLowerCase()
        .includes(term) ||
      String(order.customer_email || "")
        .toLowerCase()
        .includes(term) ||
      String(order.tracking_number || "")
        .toLowerCase()
        .includes(term);

    const matchesFilter =
      filter === "all" ||
      (filter === "approved" && order.payment_status === "approved") ||
      (filter === "pending" && order.payment_status === "pending") ||
      (filter === "shipped" && order.shipping_status === "shipped") ||
      (filter === "delivered" && order.shipping_status === "delivered") ||
      (filter === "preparing" && order.shipping_status === "preparing") ||
      (filter === "shipping_pending" && order.shipping_status === "pending") ||
      (filter === "cancelled" && order.shipping_status === "cancelled");

    return matchesSearch && matchesFilter;
  });

  if (checkingSession) {
    return <div className="admin-loading">Verificando acceso a SAKKA...</div>;
  }

  if (!authenticated) {
    return (
      <main className="admin-login-page">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <div className="admin-brand-mark">S</div>
          <p className="admin-eyebrow">SAKKA FOOTBALL T-SHIRTS</p>
          <h1>Panel administrativo</h1>
          <p className="admin-muted">Ingresá con tu cuenta de administrador.</p>

          {error && <div className="admin-alert">{error}</div>}

          <label htmlFor="admin-username">Usuario</label>
          <input
            id="admin-username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

          <label htmlFor="admin-password">Contraseña</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button className="admin-primary-button" type="submit">
            Iniciar sesión
          </button>

          <a className="admin-back-link" href="/">
            Volver a la tienda
          </a>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <a className="admin-logo" href="/">
          SAKKA <span>/ ADMIN</span>
        </a>

        <div className="admin-topbar-actions">
          <span className="admin-secure-label">
            <ShieldCheck size={16} /> Sesión privada
          </span>

          <button
            className="admin-secondary-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>

          <button className="admin-secondary-button" onClick={handleLogout}>
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>

      <section className="admin-content">
        <div className="admin-heading">
          <div>
            <p className="admin-eyebrow">CENTRO DE OPERACIONES</p>
            <h1>Dashboard</h1>
            <p className="admin-muted">
              Controlá tus ventas, pedidos y envíos.
            </p>
          </div>
        </div>

        {error && <div className="admin-alert">{error}</div>}
        {notice && <div className="admin-success">{notice}</div>}

        <div className="admin-stats-grid">
          <StatCard
            icon={<Package />}
            label="Pedidos totales"
            value={stats.total_orders ?? 0}
          />

          <StatCard
            icon={<CheckCircle2 />}
            label="Pagos aprobados"
            value={stats.approved_orders ?? 0}
          />

          <StatCard
            icon={<Clock />}
            label="Pagos pendientes"
            value={stats.pending_orders ?? 0}
          />

          <StatCard
            icon={<TrendingUp />}
            label="Facturación aprobada"
            value={money(stats.approved_revenue ?? 0)}
            compact
          />
        </div>

        <Inventory />

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Resumen de producción</h2>
              <p className="admin-muted">
                Camisetas que debés preparar de pedidos con pago aprobado.
              </p>
            </div>

            <span className="admin-order-count">
              {production.totals.total_shirts} camisetas
            </span>
          </div>

          <div className="admin-stats-grid">
            <StatCard
              icon={<CheckCircle2 />}
              label="Pedidos aprobados"
              value={production.totals.approved_orders}
            />

            <StatCard
              icon={<Package />}
              label="Camisetas por preparar"
              value={production.totals.total_shirts}
            />
          </div>

          {production.summary.length === 0 ? (
            <div className="admin-empty">
              No hay camisetas de pedidos aprobados para preparar.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Talle</th>
                    <th>Unidades</th>
                  </tr>
                </thead>

                <tbody>
                  {production.summary.map((item, index) => (
                    <tr key={`${item.product_id}-${item.size}-${index}`}>
                      <td>{item.product_name}</td>
                      <td>{item.size}</td>
                      <td>
                        <strong>{item.quantity}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Pedidos</h2>
              <p className="admin-muted">
                Consultá los pagos y actualizá la logística.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="admin-order-count">
                {filteredOrders.length} pedidos
              </span>
              {Number(stats.total_orders) === 5 &&
                Number(stats.approved_orders) === 1 &&
                Number(stats.pending_orders) === 4 && (
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={cleanupSandboxOrders}
                    disabled={cleanupLoading}
                    style={{ borderColor: "#d92332", color: "#b91e2b" }}
                  >
                    {cleanupLoading ? "Limpiando..." : "Limpiar pedidos de prueba"}
                  </button>
                )}
            </div>
          </div>

          <div className="admin-filters">
            <div className="admin-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por referencia, email o seguimiento"
                aria-label="Buscar pedidos"
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filtrar pedidos"
            >
              <option value="all">Todos los pedidos</option>
              <option value="approved">Pagos aprobados</option>
              <option value="pending">Pagos pendientes</option>
              <option value="shipped">Envíos despachados</option>
              <option value="delivered">Envíos entregados</option>
              <option value="preparing">Pedidos en preparación</option>
              <option value="shipping_pending">Envíos pendientes</option>
              <option value="cancelled">Envíos cancelados</option>
            </select>
          </div>

          {loading ? (
            <div className="admin-empty">Cargando pedidos...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-empty">
              No hay pedidos que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Pago</th>
                    <th>Envío</th>
                    <th>Seguimiento</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.external_reference}>
                      <td>
                        <strong>{order.external_reference}</strong>
                        <small>{order.created_at || "—"}</small>
                      </td>
                      <td>{order.customer_email || "Sin email"}</td>
                      <td>{money(order.total_amount)}</td>
                      <td>
                        <span
                          className={`admin-status payment-${order.payment_status}`}
                        >
                          {paymentLabels[order.payment_status] ||
                            order.payment_status ||
                            "Desconocido"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-status shipping-${order.shipping_status}`}
                        >
                          {shippingLabels[order.shipping_status] ||
                            order.shipping_status ||
                            "Pendiente"}
                        </span>
                      </td>
                      <td>{order.tracking_number || "—"}</td>
                      <td>
                        <button
                          className="admin-edit-button"
                          onClick={() =>
                            setEditing({
                              external_reference: order.external_reference,
                              shipping_status:
                                order.shipping_status || "pending",
                              tracking_number: order.tracking_number || "",
                            })
                          }
                        >
                          <td>
                            <div className="admin-row-actions">
                              <button
                                type="button"
                                className="admin-edit-button"
                                onClick={() => setSelectedOrder(order)}
                              >
                                Ver detalle
                              </button>
                            </div>
                          </td>
                          <Truck size={15} /> Envío
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {editing && (
          <div
            className="admin-modal-backdrop"
            onClick={() => setEditing(null)}
          >
            <form
              className="admin-modal"
              onSubmit={saveShipping}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="admin-eyebrow">LOGÍSTICA</p>
              <h2>Actualizar envío</h2>
              <p className="admin-muted">
                Pedido: {editing.external_reference}
              </p>

              <label htmlFor="shipping-status">Estado del envío</label>
              <select
                id="shipping-status"
                value={editing.shipping_status}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    shipping_status: event.target.value,
                  })
                }
              >
                {Object.entries(shippingLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <label htmlFor="tracking-number">Número de seguimiento</label>
              <input
                id="tracking-number"
                maxLength={150}
                value={editing.tracking_number}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    tracking_number: event.target.value,
                  })
                }
                placeholder="Ej.: número de seguimiento del correo"
              />

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>
                <button className="admin-primary-button" type="submit">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
      {selectedOrder && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setSelectedOrder(null)}
        >
          <section
            className="admin-modal admin-order-detail"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="admin-eyebrow">DETALLE DE VENTA</p>
            <h2>Pedido</h2>

            <p className="admin-muted">
              Referencia: {selectedOrder.external_reference}
            </p>

            <div className="admin-detail-section">
              <h3>Datos del cliente</h3>
              <p>
                <strong>Email:</strong>{" "}
                {selectedOrder.customer_email || "No disponible"}
              </p>
              <p>
                <strong>Fecha:</strong>{" "}
                {selectedOrder.created_at || "No disponible"}
              </p>
            </div>

            <div className="admin-detail-section">
              <h3>Confirmación por email</h3>
              <p>
                <strong>Estado:</strong>{" "}
                {selectedOrder.confirmation_email_status === "sent"
                  ? "Enviado"
                  : selectedOrder.confirmation_email_status === "sending"
                    ? "En proceso"
                    : selectedOrder.confirmation_email_status === "error"
                      ? "Error de envío"
                      : "Pendiente"}
              </p>
              {selectedOrder.payment_status === "approved" &&
                selectedOrder.confirmation_email_status !== "sent" && (
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => retryConfirmationEmail(selectedOrder)}
                    disabled={selectedOrder.confirmation_email_status === "sending"}
                  >
                    {selectedOrder.confirmation_email_status === "sending"
                      ? "Envío en curso..."
                      : "Reintentar correo de confirmación"}
                  </button>
                )}
            </div>

            <div className="admin-detail-section">
              <h3>Productos</h3>

              {Array.isArray(selectedOrder.items) &&
              selectedOrder.items.length > 0 ? (
                selectedOrder.items.map((item, index) => (
                  <div
                    className="admin-detail-product"
                    key={item.product_id || index}
                  >
                    <div>
                      <strong>{item.product_name}</strong>
                      <p>
                        Cantidad: {item.quantity}
                        {item.size ? ` · Talle: ${item.size}` : ""}
                      </p>
                    </div>

                    <strong>
                      {money(
                        item.subtotal ??
                          Number(item.unit_price || 0) *
                            Number(item.quantity || 0),
                      )}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="admin-muted">
                  No hay productos disponibles en los datos de este pedido.
                </p>
              )}
            </div>

            <div className="admin-detail-section">
              <h3>Envío</h3>
              <p>
                <strong>Zona:</strong>{" "}
                {selectedOrder.shipping_zone_name || "No disponible"}
              </p>
              <p>
                <strong>Dirección:</strong>{" "}
                {typeof selectedOrder.shipping_address === "string"
                  ? selectedOrder.shipping_address
                  : selectedOrder.shipping_address
                    ? JSON.stringify(selectedOrder.shipping_address)
                    : "No disponible"}
              </p>
              <p>
                <strong>Costo de envío:</strong>{" "}
                {money(selectedOrder.shipping_amount)}
              </p>
              <p>
                <strong>Seguimiento:</strong>{" "}
                {selectedOrder.tracking_number || "Todavía sin seguimiento"}
              </p>
            </div>

            <div className="admin-detail-total">
              <span>Total del pedido</span>
              <strong>{money(selectedOrder.total_amount)}</strong>
            </div>

            <button
              type="button"
              className="admin-primary-button"
              onClick={() => setSelectedOrder(null)}
            >
              Cerrar detalle
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function StatCard({ icon, label, value, compact = false }) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-icon">{icon}</div>
      <p>{label}</p>
      <strong className={compact ? "admin-stat-money" : ""}>{value}</strong>
    </article>
  );
}

import { API_URL } from "./api";

import { useEffect, useState } from "react";
import { Package, Search, Truck, CheckCircle2 } from "lucide-react";

const API = `${API_URL}/api/tracking`;

const shippingSteps = [
  { value: "pending", label: "Pendiente" },
  { value: "preparing", label: "Preparando pedido" },
  { value: "shipped", label: "Pedido enviado" },
  { value: "delivered", label: "Entregado" },
];

export default function Tracking() {
  const [reference, setReference] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchOrder(referenceToSearch = reference) {
    const cleanReference = referenceToSearch.trim();

    if (!cleanReference) {
      setError("Ingresá la referencia de tu pedido.");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const response = await fetch(
        `${API}/${encodeURIComponent(cleanReference)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo consultar el pedido."
        );
      }

      setOrder(data);
    } catch (err) {
      setError(err.message || "Ocurrió un error al consultar el pedido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailReference = params.get("referencia");

    if (emailReference) {
      setReference(emailReference);
      searchOrder(emailReference);
    }
  }, []);

  const currentStep = shippingSteps.findIndex(
    (step) => step.value === order?.shippingStatus
  );

  const shippingLabel =
    shippingSteps.find((step) => step.value === order?.shippingStatus)
      ?.label ||
    (order?.shippingStatus === "cancelled"
      ? "Envío cancelado"
      : "Estado de envío no disponible");

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "60px auto",
        padding: 24,
        color: "#181818",
      }}
    >
      <p style={{ letterSpacing: 3, fontSize: 12 }}>
        SAKKA FOOTBALL T-SHIRTS
      </p>

      <h1>Seguimiento de tu pedido</h1>

      <p>
        Consultá el estado de tu compra y seguí las novedades de tu envío.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          searchOrder();
        }}
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          margin: "28px 0",
        }}
      >
        <input
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Ingresá la referencia de tu pedido"
          required
          style={{
            flex: "1 1 280px",
            minWidth: 0,
            padding: 14,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "14px 20px",
            border: 0,
            borderRadius: 8,
            background: "#181818",
            color: "#fff",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Search size={16} style={{ verticalAlign: "middle" }} />
          {" "}
          {loading ? "Buscando..." : "Consultar"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>
      )}

      {order && (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 24,
          }}
        >
          <p>Pedido</p>
          <strong>{order.reference}</strong>

          <h2 style={{ marginTop: 24 }}>
            <Truck size={22} style={{ verticalAlign: "middle" }} />
            {" "}
            {shippingLabel}
          </h2>

          {order.paymentStatus !== "approved" && (
            <p>El pago todavía no figura como aprobado.</p>
          )}

          {order.shippingStatus !== "cancelled" && (
            <div style={{ marginTop: 24 }}>
              {shippingSteps.map((step, index) => {
                const completed =
                  order.shippingStatus === "delivered" ||
                  (currentStep >= 0 && index <= currentStep);

                return (
                  <p key={step.value}>
                    {completed ? (
                      <CheckCircle2
                        size={18}
                        style={{ verticalAlign: "middle" }}
                      />
                    ) : (
                      <Package
                        size={18}
                        style={{ verticalAlign: "middle" }}
                      />
                    )}
                    {" "}
                    {step.label}
                  </p>
                );
              })}
            </div>
          )}

          {order.shippingStatus === "delivered" && (
            <p>¡Tu pedido fue entregado!</p>
          )}

          {order.trackingNumber && (
            <p style={{ marginTop: 24 }}>
              <strong>Número de seguimiento:</strong>{" "}
              {order.trackingNumber}
            </p>
          )}
        </section>
      )}
    </main>
  );
}

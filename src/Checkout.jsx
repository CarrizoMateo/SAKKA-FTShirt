import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CardPayment, Wallet } from "@mercadopago/sdk-react";
import { ArrowLeft, ShieldCheck, Truck } from "lucide-react";

const API_URL = "http://localhost:3000";

function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

const INITIAL_ADDRESS = {
  street: "",
  number: "",
  city: "",
  postalCode: "",
  references: "",
};

export default function Checkout({ items, onBack }) {
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [customerEmail, setCustomerEmail] = useState("");

  const [shippingZones, setShippingZones] = useState([]);
  const [shippingZoneId, setShippingZoneId] = useState("");
  const [shippingAddress, setShippingAddress] = useState(INITIAL_ADDRESS);
  const [shippingLoading, setShippingLoading] = useState(true);
  const [shippingError, setShippingError] = useState("");

  const [preferenceId, setPreferenceId] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [showWallet, setShowWallet] = useState(true);
  const [cardWasEnabled, setCardWasEnabled] = useState(false);
  const idempotencyKeyRef = useRef(null);
  const walletRequestRef = useRef("");

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0,
      ),
    [items],
  );

  const selectedZone = shippingZones.find((zone) => zone.id === shippingZoneId);

  const shippingAmount = selectedZone ? Number(selectedZone.price) : 0;

  const finalTotal = total + shippingAmount;

  const addressIsValid =
    shippingAddress.street.trim().length > 0 &&
    shippingAddress.number.trim().length > 0 &&
    shippingAddress.city.trim().length > 0 &&
    shippingAddress.postalCode.trim().length > 0;

  const canCheckout =
    items.length > 0 &&
    !shippingLoading &&
    !shippingError &&
    Boolean(selectedZone) &&
    addressIsValid &&
    Number.isFinite(finalTotal) &&
    finalTotal > 0 &&
    customerEmail.trim() !== "" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());

  useEffect(() => {
    let cancelled = false;

    async function loadShippingZones() {
      setShippingLoading(true);
      setShippingError("");

      try {
        const response = await fetch(`${API_URL}/api/shipping-zones`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudieron cargar las localidades.",
          );
        }

        if (!Array.isArray(data.zones)) {
          throw new Error("La respuesta de localidades no es válida.");
        }

        if (!cancelled) {
          setShippingZones(data.zones);
        }
      } catch (err) {
        if (!cancelled) {
          setShippingError(err.message || "No se pudieron cargar los envíos.");
        }
      } finally {
        if (!cancelled) {
          setShippingLoading(false);
        }
      }
    }

    loadShippingZones();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (canCheckout && finalTotal > 0) {
      setCardWasEnabled(true);
    }
  }, [canCheckout, finalTotal]);

  const getItemsPayload = useCallback(() => {
    return items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      size: item.size,
    }));
  }, [items]);

  const getShippingPayload = useCallback(() => {
    return {
      shippingZoneId,
      shippingAddress: {
        street: shippingAddress.street.trim(),
        number: shippingAddress.number.trim(),
        city: shippingAddress.city.trim(),
        postalCode: shippingAddress.postalCode.trim(),
        references: shippingAddress.references.trim(),
      },
    };
  }, [shippingZoneId, shippingAddress]);

  const walletRequestKey = useMemo(
    () =>
      JSON.stringify({
        items: getItemsPayload(),
        ...getShippingPayload(),
        customerEmail: customerEmail.trim(),
      }),
    [getItemsPayload, getShippingPayload, customerEmail],
  );

  const handleZoneChange = useCallback((event) => {
    setShippingZoneId(event.target.value);
    setError("");
    setResult(null);
    setPreferenceId("");
    walletRequestRef.current = false;
    idempotencyKeyRef.current = null;
  }, []);

  const handleAddressChange = useCallback((event) => {
    const { name, value } = event.target;

    setShippingAddress((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setResult(null);
    setPreferenceId("");
    walletRequestRef.current = false;
    idempotencyKeyRef.current = null;
  }, []);

  // handleSubmit estabilizado con useCallback
  const handleSubmit = useCallback(
    async (formData, additionalData) => {
      if (!canCheckout) {
        setError("Completá los datos de entrega antes de pagar.");
        throw new Error("Faltan datos de entrega.");
      }

      setError("");
      setProcessing(true);

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }

      try {
        const response = await fetch(`${API_URL}/api/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idempotencyKey: idempotencyKeyRef.current,
            items: getItemsPayload(),
            ...getShippingPayload(),

            token: formData.token,
            payment_method_id: formData.payment_method_id,
            payment_type_id: additionalData?.paymentTypeId,
            installments: formData.installments,
            email: formData.payer?.email,
            identification: formData.payer?.identification,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "No se pudo procesar el pago.");
        }

        setResult(data);
      } catch (err) {
        setError(err.message || "No se pudo procesar el pago.");
        throw err;
      } finally {
        setProcessing(false);
      }
    },
    [canCheckout, getItemsPayload, getShippingPayload],
  );

  const handleSubmitRef = useRef(handleSubmit);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const stableHandleSubmit = useCallback((formData, additionalData) => {
    return handleSubmitRef.current(formData, additionalData);
  }, []);

  async function handleWalletCheckout() {
    if (!canCheckout) {
      setError("Completá los datos de entrega antes de continuar.");
      return;
    }

    if (walletRequestRef.current || walletLoading) {
      return;
    }

    walletRequestRef.current = true;
    setError("");
    setWalletLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/checkout-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: getItemsPayload(),
          ...getShippingPayload(),
          customerEmail: customerEmail.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.preferenceId) {
        throw new Error(data.error || "No se pudo preparar Mercado Pago.");
      }

      setPreferenceId(data.preferenceId);
      setShowWallet(true);
    } catch (err) {
      setError(err.message || "No se pudo iniciar el pago.");
      walletRequestRef.current = false;
    } finally {
      setWalletLoading(false);
    }
  }

  useEffect(() => {
    if (
      canCheckout &&
      finalTotal > 0 &&
      !preferenceId &&
      !walletRequestRef.current
    ) {
      handleWalletCheckout();
    }
  }, [canCheckout, finalTotal, preferenceId, customerEmail]);

  // Objeto de inicialización memoizado para evitar recrearlo en cada render
  const cardInitialization = useMemo(
    () => ({
      amount: finalTotal,
    }),
    [finalTotal],
  );

  const handleCardReady = useCallback(() => {
    console.log("CardPayment listo");
  }, []);

  const handleCardError = useCallback((err) => {
    console.error("Error de CardPayment:", err);

    const mensaje =
      err?.cause || err?.message || "Error desconocido al cargar el formulario";

    setError(`Error al cargar el formulario: ${mensaje}`);
  }, []);

  const isAccredited =
    result !== null &&
    result?.status === "processed" &&
    result?.statusDetail === "accredited" &&
    Number(result?.paidAmount) === finalTotal &&
    Number(result?.totalAmount) === finalTotal;

  if (items.length === 0) {
    return (
      <section className="section section-light">
        <h2>Tu carrito está vacío</h2>
        <button className="button button-red" onClick={onBack}>
          VOLVER A LA TIENDA
        </button>
      </section>
    );
  }

  return (
    <section className="section section-light" style={{ minHeight: "70vh" }}>
      <button type="button" className="continue-shopping" onClick={onBack}>
        <ArrowLeft size={17} />
        Volver al carrito
      </button>

      <div
        style={{
          maxWidth: "1100px",
          margin: "32px auto",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "32px",
          alignItems: "start",
        }}
      >
        <div>
          <p className="eyebrow">COMPRA SEGURA</p>
          <h1>Finalizar compra</h1>
          <p>Completá tus datos para continuar con el pago.</p>

          <div
            style={{
              marginTop: "24px",
              padding: "20px",
              background: "#fff",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "18px",
              }}
            >
              <ShieldCheck size={22} />
              <strong>Pago protegido por Mercado Pago</strong>
            </div>

            {result ? (
              <div>
                {isAccredited ? (
                  <>
                    <h2>¡Pago acreditado!</h2>
                    <p>
                      Mercado Pago informó que tu pago fue procesado y
                      acreditado.
                    </p>
                    <p>Importe: {formatPrice(finalTotal)}</p>
                    <p>
                      Guardá el comprobante de Mercado Pago como referencia.
                    </p>
                  </>
                ) : (
                  <>
                    <h2>Pago en verificación</h2>
                    <p>
                      Estado informado por Mercado Pago:{" "}
                      <strong>{result?.status || "En revisión"}</strong>
                    </p>
                    <p>
                      Todavía no podemos confirmar la compra. No vuelvas a
                      pagar; verificá el estado definitivo de la orden.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "28px" }}>
                  <h3>
                    <Truck
                      size={19}
                      style={{ verticalAlign: "middle", marginRight: "8px" }}
                    />
                    Datos de entrega
                  </h3>
                  <label
                    htmlFor="customerEmail"
                    style={{ display: "block", marginTop: "16px" }}
                  >
                    Correo electrónico
                    <input
                      id="customerEmail"
                      name="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(event) => {
                        setCustomerEmail(event.target.value);
                        setError("");
                        setPreferenceId("");
                        walletRequestRef.current = false;
                      }}
                      placeholder="tu@email.com"
                      autoComplete="email"
                      required
                      style={{
                        display: "block",
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "12px",
                        marginTop: "6px",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                      }}
                    />
                  </label>

                  {shippingLoading && (
                    <p>Cargando localidades disponibles...</p>
                  )}

                  {shippingError && (
                    <div role="alert" style={{ color: "#c62828" }}>
                      <p>{shippingError}</p>
                      <button
                        type="button"
                        className="button button-red"
                        onClick={() => window.location.reload()}
                      >
                        VOLVER A CARGAR
                      </button>
                    </div>
                  )}

                  {!shippingLoading && !shippingError && (
                    <>
                      <label
                        htmlFor="shippingZoneId"
                        style={{ display: "block", marginTop: "16px" }}
                      >
                        Localidad de entrega
                      </label>

                      <select
                        id="shippingZoneId"
                        value={shippingZoneId}
                        onChange={handleZoneChange}
                        required
                        style={{
                          width: "100%",
                          padding: "12px",
                          marginTop: "6px",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                        }}
                      >
                        <option value="">Seleccioná tu localidad</option>
                        {shippingZones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name} — {formatPrice(zone.price)}
                          </option>
                        ))}
                      </select>

                      {shippingZones.length === 0 && (
                        <p>Todavía no hay localidades configuradas.</p>
                      )}

                      {[
                        ["street", "Calle"],
                        ["number", "Altura"],
                        ["city", "Partido"],
                        ["postalCode", "Código postal"],
                      ].map(([name, label]) => (
                        <label
                          key={name}
                          htmlFor={name}
                          style={{ display: "block", marginTop: "14px" }}
                        >
                          {label}
                          <input
                            id={name}
                            name={name}
                            value={shippingAddress[name]}
                            onChange={handleAddressChange}
                            autoComplete={
                              name === "street" ? "street-address" : "off"
                            }
                            required
                            style={{
                              display: "block",
                              width: "100%",
                              boxSizing: "border-box",
                              padding: "12px",
                              marginTop: "6px",
                              border: "1px solid #ddd",
                              borderRadius: "8px",
                            }}
                          />
                        </label>
                      ))}

                      <label
                        htmlFor="references"
                        style={{ display: "block", marginTop: "14px" }}
                      >
                        Piso, departamento o referencias (opcional)
                        <input
                          id="references"
                          name="references"
                          value={shippingAddress.references}
                          onChange={handleAddressChange}
                          style={{
                            display: "block",
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "12px",
                            marginTop: "6px",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                          }}
                        />
                      </label>

                      {selectedZone && (
                        <p style={{ marginTop: "16px" }}>
                          Envío a {selectedZone.name}:{" "}
                          <strong>{formatPrice(shippingAmount)}</strong>
                        </p>
                      )}
                    </>
                  )}
                </div>

                <h3>Tarjeta de crédito o débito</h3>

                {!canCheckout && (
                  <p>
                    Seleccioná una localidad habilitada y completá la dirección
                    para habilitar el pago.
                  </p>
                )}

                {cardWasEnabled && finalTotal > 0 && (
                  <CardPayment
                    initialization={cardInitialization}
                    onReady={handleCardReady}
                    onSubmit={stableHandleSubmit}
                    onError={handleCardError}
                  />
                )}

                <div
                  style={{
                    borderTop: "1px solid #eee",
                    marginTop: "24px",
                    paddingTop: "24px",
                  }}
                >
                  <h3>O pagá con Mercado Pago</h3>
                  <p>
                    Usá tu cuenta de Mercado Pago para consultar los medios de
                    pago disponibles.
                  </p>

                  {!preferenceId ? (
                    <p>
                      {walletLoading
                        ? "Preparando el botón de Mercado Pago..."
                        : "Completá tus datos para habilitar Mercado Pago."}
                    </p>
                  ) : (
                    showWallet && (
                      <Wallet
                        initialization={{ preferenceId }}
                        onReady={() =>
                          console.log("Wallet de Mercado Pago listo")
                        }
                        onError={(err) => {
                          console.error("Error en Wallet:", err);
                          setError(
                            "No se pudo cargar el botón de Mercado Pago.",
                          );
                        }}
                      />
                    )
                  )}
                </div>
              </>
            )}

            {processing && <p>Procesando solicitud...</p>}

            {error && (
              <p role="alert" style={{ color: "#c62828" }}>
                {error}
              </p>
            )}
          </div>
        </div>

        <aside
          style={{
            padding: "24px",
            background: "#fff",
            borderRadius: "12px",
          }}
        >
          <h2>Resumen de compra</h2>

          {items.map((item) => (
            <div
              key={`${item.id}-${item.size}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                padding: "14px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <div>
                <strong>{item.name}</strong>
                <p>
                  Talle {item.size} · Cantidad: {item.quantity}
                </p>
              </div>
              <strong>{formatPrice(item.price * item.quantity)}</strong>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "20px",
              gap: "12px",
            }}
          >
            <span>Subtotal</span>
            <strong>{formatPrice(total)}</strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "12px",
              gap: "12px",
            }}
          >
            <span>Envío</span>
            <strong>
              {selectedZone ? formatPrice(shippingAmount) : "A calcular"}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid #eee",
              fontSize: "18px",
              gap: "12px",
            }}
          >
            <strong>Total</strong>
            <strong>{formatPrice(finalTotal)}</strong>
          </div>

          <p style={{ fontSize: "13px", marginTop: "12px" }}>
            El costo de envío se calcula según la localidad seleccionada.
          </p>
        </aside>
      </div>
    </section>
  );
}

import { API_URL } from "../api";

import { useEffect, useState } from "react";
import {
  Package,
  RefreshCw,
  Save,
  ChevronDown,
} from "lucide-react";

const API = `${API_URL}/api/admin`;

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openProductId, setOpenProductId] = useState(null);

  async function loadInventory() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/inventory`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo cargar el stock.");
      }

      const rows = data.inventory || [];

      setInventory(rows);

      setDrafts(
        Object.fromEntries(
          rows.map((item) => [
            `${item.product_id}-${item.size}`,
            String(item.quantity),
          ])
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  async function saveStock(item) {
    const key = `${item.product_id}-${item.size}`;
    const raw = drafts[key];

    if (
      !/^\d+$/.test(raw ?? "") ||
      !Number.isSafeInteger(Number(raw))
    ) {
      setError("Ingresá una cantidad entera válida, desde 0.");
      return;
    }

    setSaving(key);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/inventory`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.product_id,
          size: item.size,
          quantity: Number(raw),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar el stock.");
      }

      setInventory((current) =>
        current.map((row) =>
          row.product_id === item.product_id &&
          row.size === item.size
            ? data.item
            : row
        )
      );

      setNotice(
        `Stock de ${item.product_name} (${item.size}) actualizado.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  const products = Object.values(
    inventory.reduce((acc, item) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = {
          id: item.product_id,
          name: item.product_name,
          items: [],
        };
      }

      acc[item.product_id].items.push(item);
      return acc;
    }, {})
  );

  const totalStock = inventory.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Inventario de camisetas</h2>
          <p className="admin-muted">
            Administrá las unidades disponibles por modelo y talle.
          </p>
        </div>

        <button
          type="button"
          className="admin-secondary-button"
          onClick={loadInventory}
          disabled={loading || saving !== null}
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="admin-alert">{error}</div>
      )}

      {notice && (
        <div className="admin-success">{notice}</div>
      )}

      <div className="admin-stats-grid">
        <article className="admin-stat-card">
          <div className="admin-stat-icon">
            <Package />
          </div>
          <p>Unidades registradas</p>
          <strong>{totalStock}</strong>
        </article>
      </div>

      {loading ? (
        <div className="admin-empty">
          Cargando inventario...
        </div>
      ) : (
        <div className="inventory-accordion">
          {products.map((product) => {
            const isOpen = openProductId === product.id;

            return (
              <article
                key={product.id}
                className="inventory-product-card"
              >
                <button
                  type="button"
                  className="inventory-product-toggle"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenProductId(
                      isOpen ? null : product.id
                    )
                  }
                >
                  <span>{product.name}</span>

                  <ChevronDown
                    size={20}
                    className={`inventory-chevron ${
                      isOpen ? "is-open" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="inventory-product-content">
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Talle</th>
                            <th>Stock actual</th>
                            <th>Modificar cantidad</th>
                            <th>Acción</th>
                          </tr>
                        </thead>

                        <tbody>
                          {product.items.map((item) => {
                            const key = `${item.product_id}-${item.size}`;

                            return (
                              <tr key={key}>
                                <td>
                                  <strong>{item.size}</strong>
                                </td>

                                <td>
                                  {item.configured
                                    ? item.quantity
                                    : "Sin configurar"}
                                </td>

                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    aria-label={`Stock de ${product.name}, talle ${item.size}`}
                                    value={drafts[key] ?? ""}
                                    onChange={(event) =>
                                      setDrafts((current) => ({
                                        ...current,
                                        [key]: event.target.value,
                                      }))
                                    }
                                    style={{
                                      width: 90,
                                      padding: 8,
                                      borderRadius: 8,
                                    }}
                                  />
                                </td>

                                <td>
                                  <button
                                    type="button"
                                    className="admin-edit-button"
                                    disabled={saving !== null}
                                    onClick={() => saveStock(item)}
                                  >
                                    <Save size={15} />
                                    {saving === key
                                      ? "Guardando..."
                                      : "Guardar"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

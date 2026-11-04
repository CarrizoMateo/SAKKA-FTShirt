import { API_URL } from "./api";
import {
  Search,
  UserRound,
  ShoppingCart,
  ArrowRight,
  Truck,
  CreditCard,
  ShieldCheck,
  Heart,
  Menu,
  X,
} from "lucide-react";

import "./index.css";

import { useEffect, useState } from "react";

import Checkout from "./Checkout.jsx";

import CardPaymentTest from "./CardPaymentTest.jsx";

import Admin from "./admin/Admin.jsx";

import Tracking from "./Tracking.jsx";

const SAKKA_WHATSAPP_URL =
  "https://wa.me/5491124797206?text=Hola%21%20Estoy%20viendo%20las%20camisetas%20de%20SAKKA%20y%20quer%C3%ADa%20hacer%20una%20consulta";

function WhatsAppIcon({ size = 20 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.52 3.48A11.82 11.82 0 0 0 12.1 0C5.55 0 .22 5.33.22 11.88c0 2.1.55 4.15 1.59 5.95L.12 24l6.3-1.65a11.9 11.9 0 0 0 5.68 1.45h.01c6.55 0 11.88-5.33 11.89-11.88a11.8 11.8 0 0 0-3.48-8.44ZM12.11 21.8h-.01a9.87 9.87 0 0 1-5.02-1.37l-.36-.22-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.28c0-5.46 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.46-4.44 9.9-9.9 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.06 2.88 1.21 3.08.15.2 2.09 3.2 5.07 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}


const categories = [
  {
    name: "SELECCIONES",

    filter: "selecciones",
    image: "/images/img-selecciones.png",

    color: "blue",
  },

  {
    name: "CLUBES",

    filter: "clubes",
    image: "/images/img-clubes.png",

    color: "red",
  },

  {
    name: "RETRO",

    filter: "retro",
    image: "/images/img-retro.png",

    color: "gray",
  },

  {
    name: "EDICIONES ESPECIALES",

    filter: "especiales",
    image: "/images/img-especiales.png",

    color: "blue",
  },
];

const products = [
  {
    id: 1,
    name: "Juventus Kappa 1997/98",
    description: "Visitante azul y amarilla. Sponsor Sony MiniDisc.",
    price: 60000,
    categories: ["clubes", "retro"],
    imageFront: "/images/camisetas/Juventus Kappa 1997-98 Corta Frente.png",
    imageBack: "/images/camisetas/Juventus Kappa 1997-98 Corta Detras.png",
  },
  {
    id: 2,
    name: "Paris Saint-Germain 2003/04",
    description: "Local Nike azul marino, franja roja y sponsor Thomson.",
    price: 60000,
    categories: ["clubes", "retro"],
    imageFront: "/images/camisetas/Paris Saint-Germain 2003-04 Frente.png",
    imageBack: "/images/camisetas/Paris Saint-Germain 2003-04 Detras.png",
  },
  {
    id: 3,
    name: "Real Madrid Kelme 1997/98",
    description: "Local blanca con detalles violetas y sponsor Teka.",
    price: 60000,
    categories: ["clubes", "retro"],
    imageFront: "/images/camisetas/Real Madrid Kelme 1997-98 Frente.png",
    imageBack: "/images/camisetas/Real Madrid Kelme 1997-98 Detras.png",
  },
  {
    id: 4,
    name: "Real Madrid Fly Emirates 2025-26",
    description: "Local blanca con detalles dorados y sponsor Fly Emirates.",
    price: 60000,
    categories: ["clubes"],
    imageFront: "/images/camisetas/Real Madrid Fly Emirates 2025-26 Frente.png",
    imageBack: "/images/camisetas/Real Madrid Fly Emirates 2025-26 Detras.png",
  },
  {
    id: 5,
    name: "Barcelona Kappa 1997/98",
    description: "Camiseta roja y azul con estampados de Kappa y del Barça.",
    price: 60000,
    categories: ["clubes", "retro"],
    imageFront: "/images/camisetas/Barcelona Kappa 1997-98 Frente.png",
    imageBack: "/images/camisetas/Barcelona Kappa 1997-98 Detras.png",
  },
  {
    id: 6,
    name: "Japón One Piece",
    description: "Edición personalizada blanca con ilustración de Luffy.",
    price: 60000,
    categories: ["especiales"],
    imageFront: "/images/camisetas/Japón One Piece Frente.png",
    imageBack: "/images/camisetas/Japón One Piece Detras.png",
  },
  {
    id: 7,
    name: "AC Milan Adidas 2011/12",
    description: "Local roja y negra, cuello blanco y sponsor Fly Emirates.",
    price: 60000,
    categories: ["clubes", "retro"],
    imageFront: "/images/camisetas/AC Milan Adidas 2011-12 Frente.png",
    imageBack: "/images/camisetas/AC Milan Adidas 2011-12 Detras.png",
  },
  {
    id: 8,
    name: "Italia Adidas 2023/24",
    description: "Azul con estampado de hojas y detalles dorados.",
    price: 60000,
    categories: ["selecciones"],
    imageFront: "/images/camisetas/Italia Adidas 2023-24 Frente.png",
    imageBack: "/images/camisetas/Italia Adidas 2023-24 Detras.png",
  },
  {
    id: 9,
    name: "Fiorentina Lotto 1992/93",
    description: "Visitante blanca, mangas violetas estampadas y sponsor 7UP.",
    price: 60000,
    categories: ["clubes", "retro"],
    imageFront: "/images/camisetas/Fiorentina Lotto 1992-93 Frente.png",
    imageBack: "/images/camisetas/Fiorentina Lotto 1992-93 Detras.png",
  },
  {
    id: 10,
    name: "Alemania Adidas 1990",
    description:
      "Local de Alemania Occidental con chevrón negro, rojo y amarillo.",
    price: 60000,
    categories: ["selecciones", "retro"],
    imageFront: "/images/camisetas/Alemania Adidas 1990 Frente.png",
    imageBack: "/images/camisetas/Alemania Adidas 1990 Detras.png",
  },
  {
    id: 11,
    name: "Japón Sakura Edition",
    description:
      "Edición personalizada blanca con flores de cerezo y ave mitológica.",
    price: 60000,
    categories: ["especiales"],
    imageFront: "/images/camisetas/Japón Sakura Edition Frente.png",
    imageBack: "/images/camisetas/Japón Sakura Edition Detras.png",
  },
  {
    id: 12,
    name: "Brasil Nike Azul",
    description:
      "Camiseta azul de manga larga con paneles blancos laterales. Año por confirmar.",
    price: 60000,
    categories: ["selecciones"],
    imageFront: "/images/camisetas/Brasil Nike Azul Frente.png",
    imageBack: "/images/camisetas/Brasil Nike Azul Detras.png",
  },
  {
    id: 13,
    name: "Juventus Kappa 1995/96",
    description:
      "Visitante azul y amarilla de manga larga. Sponsor Sony MiniDisc.",
    price: 60000,
    categories: ["clubes", "retro"],
    imageFront: "/images/camisetas/Juventus Kappa 1995-96 Larga Frente.png",
    imageBack: "/images/camisetas/Juventus Kappa 1995-96 Larga Detras.png",
  },
  {
    id: 14,
    name: "Napoli NR 1988/89",
    description: "Local celeste de manga corta, sponsor Mars.",
    price: 60000,
    categories: ["clubes", "retro"],
    imageFront: "/images/camisetas/Napoli NR 1988-89 Frente.png",
    imageBack: "/images/camisetas/Napoli NR 1988-89 Detras.png",
  },
  {
    id: 15,
    name: "Napoli NR 1985/86",
    description:
      "Local celeste de manga larga, sponsor Buitoni y escudo en la manga.",
    price: 60000,
    categories: ["clubes", "retro"],
    imageFront: "/images/camisetas/Napoli NR 1985-86 Frente.png",
    imageBack: "/images/camisetas/Napoli NR 1985-86 Detras.png",
  },
];

const formatPrice = (price) =>
  price.toLocaleString("es-AR", {
    style: "currency",

    currency: "ARS",

    maximumFractionDigits: 0,
  });

function Header({ cartCount = 0, onOpenCart, searchTerm, onSearchChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <a
        className="brand brand-image"
        href="#inicio"
        aria-label="SAKKA inicio"
        onClick={closeMenu}
      >
        <img src="/images/SakkaSF-Logo.jpg" alt="SAKKA Football T-Shirts" />
      </a>

      <nav className={`desktop-nav ${menuOpen ? "mobile-nav-open" : ""}`}>
        <a className="active" href="#inicio" onClick={closeMenu}>
          Inicio
        </a>
        <a href="#productos" onClick={closeMenu}>
          Camisetas
        </a>
        <a href="#categorias" onClick={closeMenu}>
          Novedades
        </a>
        <a href="#preguntas-frecuentes" onClick={closeMenu}>
          Preguntas frecuentes
        </a>
        <a href="#contacto" onClick={closeMenu}>
          Contacto
        </a>
      </nav>

      <div className="header-actions">
        <button
          type="button"
          aria-label="Buscar camisetas"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          <Search />
        </button>

        <button
          type="button"
          aria-label="Seguir mi pedido"
          title="Seguir mi pedido"
          onClick={() => {
            window.location.href = "/seguimiento";
          }}
        >
          <UserRound />
        </button>

        <button
          type="button"
          className="cart-link"
          aria-label={`Abrir carrito, ${cartCount} productos`}
          onClick={onOpenCart}
        >
          <ShoppingCart />
          <span className="cart-count">{cartCount}</span>
        </button>

        <button
          type="button"
          className="mobile-menu"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {searchOpen && (
        <div className="header-search">
          <input
            type="search"
            placeholder="Buscar camisetas, equipos o países..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            autoFocus
          />

          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              setSearchOpen(false);
            }}
          >
            Cerrar
          </button>
        </div>
      )}
    </header>
  );
}

function CartPanel({ items, onClose, onChangeQuantity, onRemove, onCheckout }) {
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,

    0,
  );

  return (
    <div className="cart-backdrop" onClick={onClose}>
      <aside
        className="cart-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cart-header">
          <div>
            <p className="eyebrow">SAKKA FOOTBALL T-SHIRTS</p>

            <h2 id="cart-title">Tu carrito</h2>
          </div>

          <button
            type="button"
            className="cart-close"
            onClick={onClose}
            aria-label="Cerrar carrito"
          >
            <X />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <ShoppingCart size={42} />

            <h3>Tu carrito está vacío</h3>

            <p>¡Encontrá tu próxima camiseta favorita!</p>

            <button
              type="button"
              className="button button-red"
              onClick={onClose}
            >
              SEGUIR COMPRANDO
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <article className="cart-item" key={`${item.id}-${item.size}`}>
                  <img src={item.image} alt={item.name} />

                  <div className="cart-item-info">
                    <h3>{item.name}</h3>

                    <p>Talle: {item.size}</p>

                    <strong>{formatPrice(item.price)}</strong>

                    <div className="cart-item-actions">
                      <div className="quantity-control">
                        <button
                          type="button"
                          aria-label="Disminuir cantidad"
                          onClick={() =>
                            onChangeQuantity(item, item.quantity - 1)
                          }
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          aria-label="Aumentar cantidad"
                          onClick={() =>
                            onChangeQuantity(item, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="remove-item"
                        onClick={() => onRemove(item)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="cart-summary">
              <div className="cart-subtotal">
                <span>Subtotal</span>

                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <p>El costo de envío se calcula por separado.</p>

              <button
                type="button"
                className="button button-red checkout-button"
                onClick={onCheckout}
              >
                CONTINUAR CON LA COMPRA
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                className="continue-shopping"
                onClick={onClose}
              >
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function ChevronDownFallback() {
  return <span className="chevron">⌄</span>;
}

function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-bg-shape hero-blue-shape" />

      <div className="hero-bg-shape hero-red-shape" />

      <div className="hero-content">
        <p className="eyebrow">PASIÓN POR LA REDONDA</p>

        <h1>
          TU PASIÓN.
          <br />
          TU <span>CAMISETA.</span>
        </h1>

        <p className="hero-description">
          Camisetas de fútbol actuales, retro y ediciones especiales para llevar
          los colores que te representan.
        </p>

        <div className="hero-buttons">
          <a className="button button-red" href="#productos">
            VER CAMISETAS <ArrowRight size={19} />
          </a>

          <a className="button button-outline" href="#categorias">
            NOVEDADES
          </a>
        </div>

        <div className="hero-benefits">
          <span>
            <Truck /> Envíos a todo el país
          </span>

          <span>
            <CreditCard /> Pagá con Mercado Pago
          </span>

          <a
            className="hero-whatsapp-benefit"
            href={SAKKA_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contactar a SAKKA por WhatsApp"
          >
            <WhatsAppIcon size={20} /> También por WhatsApp
          </a>
        </div>
      </div>

      <div className="hero-visual">
        <img
          src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1400&q=90"
          alt="Ambiente futbolero para la colección SAKKA"
        />

        <div className="hero-image-overlay" />

        <div className="hero-image-label">
          <span>SAKKA FOOTBALL T-SHIRTS</span>

          <strong>
            EL FÚTBOL
            <br />
            ES IDENTIDAD.
          </strong>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, link, href, onReset }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>

        <h2>
          {title} <span />
        </h2>
      </div>

      {link && (
        <a
          className="text-link"
          href={href}
          onClick={
            onReset
              ? (event) => {
                  event.preventDefault();
                  onReset();
                }
              : undefined
          }
        >
          {link} <ArrowRight size={16} />
        </a>
      )}
    </div>
  );
}

function Categories({ onSelectCategory, activeCategory }) {
  return (
    <section className="section section-light" id="categorias">
      <SectionHeading eyebrow="EXPLORÁ POR" title="CATEGORÍAS" />
      <div className="category-grid">
        {categories.map((category) => (
          <a
            className={`category-card category-${category.color}${activeCategory === category.filter ? " category-card-active" : ""}`}
            href="#productos"
            key={category.name}
            onClick={() => onSelectCategory(category.filter)}
          >
            <img src={category.image} alt="" loading="lazy" />
            <div className="category-overlay" />
            <div className="category-content">
              <h3>{category.name}</h3>
              <span>
                Ver más <ArrowRight size={14} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function FeaturedProducts({
  onAddToCart,
  productsToShow,
  activeCategory,
  onSelectCategory,
}) {
  const [selectedSizes, setSelectedSizes] = useState({});
  const [selectedViews, setSelectedViews] = useState({});
  const [inventory, setInventory] = useState([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadInventory = async () => {
      try {
        const response = await fetch(`${API_URL}/api/inventory`);

        if (!response.ok) {
          throw new Error("No se pudo consultar el stock.");
        }

        const data = await response.json();

        if (active) {
          setInventory(data.inventory || []);
          setInventoryLoaded(true);
        }
      } catch (error) {
        console.error("Error cargando inventario:", error);
      }
    };

    loadInventory();

    const interval = setInterval(loadInventory, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const activeCategoryName = categories.find(
    (category) => category.filter === activeCategory,
  )?.name;

  return (
    <section className="section section-light products-section" id="productos">
      <SectionHeading
        eyebrow={
          activeCategory === "todos"
            ? "COLECCIÓN SAKKA"
            : "EXPLORÁ POR CATEGORÍA"
        }
        title={
          activeCategory === "todos"
            ? "CAMISETAS DE FÚTBOL"
            : activeCategoryName || "CAMISETAS DE FÚTBOL"
        }
        link={activeCategory !== "todos" ? "Ver todas las camisetas" : null}
        href="#productos"
        onReset={() => onSelectCategory("todos")}
      />

      {productsToShow.length > 0 ? (
        <div className="product-grid">
          {productsToShow.map((product, index) => {
            const productInventory = inventory.filter(
              (item) => String(item.product_id) === String(product.id),
            );

            const getStockForSize = (size) =>
              productInventory.find((item) => item.size === size)?.quantity ??
              0;

            const selectedSize = selectedSizes[product.id] || "";
            const isAvailable = (size) =>
              inventoryLoaded && getStockForSize(size) > 0;

            const firstAvailableSize = ["S", "M", "L", "XL", "XXL"].find(
              (size) => isAvailable(size),
            );

            const currentView = selectedViews[product.id] || "front";

            const currentImage =
  currentView === "front" ? product.imageFront : product.imageBack;

            return (
              <article className="product-card" key={product.id}>
                <div className="product-image">
                  <img
                    src={currentImage || product.image}
                    alt={`${product.name} - ${
                      currentView === "front" ? "frente" : "espalda"
                    }`}
                    loading="lazy"
                  />

                  <button
                    className="favorite-button"
                    aria-label={`Agregar ${product.name} al carrito`}
                    title="Agregar al carrito"
                    type="button"
                    disabled={!firstAvailableSize}
onClick={() =>
  firstAvailableSize &&
  onAddToCart(
    {
      ...product,
      image: product.imageFront || product.image,
    },
    firstAvailableSize,
  )
}
                  >
                    <Heart size={19} />
                  </button>

                  {index === 0 && (
                    <span className="product-tag">DESTACADO</span>
                  )}
                </div>

                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-price">{formatPrice(product.price)}</p>

                  <div className="size-list" aria-label="Talles disponibles">
                    {["S", "M", "L", "XL", "XXL"].map((size) => {
                      const available = isAvailable(size);

                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={!available}
                          className={[
                            selectedSize === size ? "selected" : "",
                            !available ? "unavailable" : "",
                          ].join(" ")}
                          aria-label={`Talle ${size}${available ? "" : " agotado"}`}
                          aria-pressed={selectedSize === size}
                          onClick={() => {
                            if (available) {
                              setSelectedSizes((previous) => ({
                                ...previous,
                                [product.id]: size,
                              }));
                            }
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>

                  <div className="product-view-switch" role="group" aria-label={`Vista de ${product.name}`}>
                    <button
                      className={`product-view-button ${currentView === "front" ? "is-active" : ""}`}
                      type="button"
                      aria-pressed={currentView === "front"}
                      onClick={() =>
                        setSelectedViews((previous) => ({
                          ...previous,
                          [product.id]: "front",
                        }))
                      }
                    >
                      FRENTE
                    </button>

                    <button
                      className={`product-view-button ${currentView === "back" ? "is-active" : ""}`}
                      type="button"
                      aria-pressed={currentView === "back"}
                      onClick={() =>
                        setSelectedViews((previous) => ({
                          ...previous,
                          [product.id]: "back",
                        }))
                      }
                    >
                      ESPALDA
                    </button>
                  </div>

                  <button
                    className="button button-red add-button"
                    type="button"
                    onClick={() =>
                      onAddToCart(
                        {
                          ...product,
                          image: product.imageFront || product.image,
                        },
                        selectedSizes[product.id] || "M",
                      )
                    }
                  >
                    <ShoppingCart size={16} /> AGREGAR AL CARRITO
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p style={{ textAlign: "center", padding: "32px 0" }}>
          Todavía no hay camisetas en esta categoría.
        </p>
      )}

      {activeCategory !== "todos" && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            type="button"
            className="button button-outline"
            onClick={() => onSelectCategory("todos")}
          >
            VER TODAS LAS CAMISETAS
          </button>
        </div>
      )}
    </section>
  );
}

function RetroBanner() {
  return (
    <section className="retro-banner" id="retro">
      <img
        src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1800&q=90"
        alt=""
        loading="lazy"
      />

      <div className="retro-overlay" />

      <div className="retro-content">
        <p className="eyebrow">PARA LOS QUE SABEN</p>

        <h2>
          CAMISETAS
          <br />
          QUE <span>HACEN HISTORIA.</span>
        </h2>

        <p>Modelos retro, clásicos y ediciones inolvidables.</p>

        <a
          className="button button-red"
          href="#categorias"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          VER MODELOS <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}

function Benefits() {
  const benefits = [
    {
      icon: Truck,
      title: "Envíos a todo el país",
      text: "Correo y puntos de retiro.",
    },
    {
      icon: CreditCard,
      title: "Pagá como quieras",
      text: "Mercado Pago y otros medios.",
    },
    {
      icon: WhatsAppIcon,
      title: "También por WhatsApp",
      text: "Hacé tu pedido de forma simple.",
      href: SAKKA_WHATSAPP_URL,
    },
    {
      icon: ShieldCheck,
      title: "Compra segura",
      text: "Tus datos protegidos.",
    },
  ];

  return (
    <section className="benefits">
      {benefits.map(({ icon: Icon, title, text, href }) => (
        <div className="benefit" key={title}>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={title}
              style={{
                color: "inherit",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Icon />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </a>
          ) : (
            <>
              <Icon />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}

function FAQ() {
  const questions = [
    {
      question: "¿Cómo puedo comprar una camiseta?",
      answer:
        "Elegí la camiseta que te guste, seleccioná tu talle y agregala al carrito. Luego completá tus datos de entrega y elegí tu medio de pago para finalizar la compra.",
    },
    {
      question: "¿Qué medios de pago aceptan?",
      answer:
        "Podés pagar a través de Mercado Pago, utilizando los medios de pago disponibles en tu cuenta. O también podes realizar tu pago a través de tarjeta de crédito o débito.",
    },
    {
      question: "¿Realizan envíos a todo el país?",
      answer:
        "Sí, realizamos envíos a todo el país. El costo y las opciones de entrega se muestran durante el proceso de compra según tu localidad.",
    },
    {
      question: "¿Cómo puedo seguir mi pedido?",
      answer:
        "Ingresá a la sección 'Seguir mi pedido' desde el pie de página o desde el ícono de usuario. Allí podrás consultar el estado de tu compra.",
    },
    {
      question: "¿Cómo puedo consultar por un talle?",
      answer:
        "Podés escribirnos por WhatsApp o Instagram y te ayudaremos a consultar la disponibilidad de talles. Siempre recomendamos revisar la guía de talles antes de realizar tu compra y elegir un talle más al que suelen usar en remeras. Por ejemplo, si usas un talle M, te recomendamos elegir un talle L en nuestras camisetas. Dado que, al ser camisetas importadas, los talles pueden variar respecto a los talles de remeras normales.",
    },
    {
      question: "¿Puedo realizar cambios?",
      answer:
        "No realizamos cambios ni devoluciones, por lo que te recomendamos revisar la guía de talles antes de realizar tu compra.",
    },
  ];

  const [openQuestion, setOpenQuestion] = useState(null);

  return (
    <section className="faq-section" id="preguntas-frecuentes">
      <div className="faq-container">
        <p className="eyebrow">ESTAMOS PARA AYUDARTE</p>
        <h2>Preguntas frecuentes</h2>
        <p className="faq-description">
          Todo lo que necesitás saber antes de elegir tu próxima camiseta.
        </p>

        <div className="faq-list">
          {questions.map((item, index) => (
            <div className="faq-item" key={index}>
              <button
                type="button"
                className="faq-question"
                aria-expanded={openQuestion === index}
                onClick={() =>
                  setOpenQuestion(openQuestion === index ? null : index)
                }
              >
                <span>{item.question}</span>
                <span className="faq-icon">
                  {openQuestion === index ? "−" : "+"}
                </span>
              </button>

              {openQuestion === index && (
                <div className="faq-answer">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="faq-contact">
          <p>¿Tenés alguna otra consulta?</p>
          <a
            href={SAKKA_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            CONTACTANOS POR WHATSAPP
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer" id="contacto">
      <div className="footer-main">
        <div className="footer-brand">
          <a
            className="brand brand-image"
            href="#inicio"
            aria-label="SAKKA inicio"
          >
            <img src="/images/SakkaSF-Logo.jpg" alt="SAKKA Football T-Shirts" />
          </a>

          <p>
            Camisetas de fútbol para quienes viven la pasión dentro y fuera de
            la cancha.
          </p>

          <div className="social-links">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/sakka_futbol/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram SAKKA"
            >
              <svg
                viewBox="0 0 22 22"
                width="17"
                height="17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle
                  cx="17.5"
                  cy="6.5"
                  r="0.8"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@sakkakits"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok SAKKA"
            >
              <svg
                viewBox="0 0 21 20"
                width="17"
                height="17"
                fill="currentColor"
              >
                <path d="M19.5 8.2a7.1 7.1 0 0 1-4.3-1.4v8.1a6.1 6.1 0 1 1-6.1-6.1c.4 0 .8 0 1.2.1v3.4a2.8 2.8 0 1 0 1.5 2.5V2.5h3.4c.3 2.3 2.1 4.1 4.3 4.3v3.4Z" />
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href={SAKKA_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp SAKKA"
            >
              <WhatsAppIcon size={17} />
            </a>
          </div>
        </div>

        <div className="footer-column">
          <h3>Navegación</h3>

          <a href="#inicio">Inicio</a>

          <a href="#productos">Camisetas</a>

          <a href="#categorias">Categorías</a>

          <a href="#categorias">Novedades</a>

          <a href="#contacto">Contacto</a>
        </div>

        <div className="footer-column">
          <h3>Ayuda</h3>

          <a href="#preguntas-frecuentes">Preguntas frecuentes</a>

          <a href="#contacto">Envíos</a>

          <a href="/seguimiento">Seguir mi pedido</a>
        </div>

        <div className="footer-newsletter">
          <h3>Suscribite</h3>

          <p>Enterate de novedades y lanzamientos.</p>

          <form onSubmit={(event) => event.preventDefault()}>
            <input
              type="email"
              placeholder="Tu correo electrónico"
              aria-label="Correo electrónico"
            />

            <button type="submit" aria-label="Suscribirse">
              <ArrowRight />
            </button>
          </form>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 SAKKA Football T-Shirts. Todos los derechos reservados.</p>

        <p>Diseñado para los amantes del fútbol.</p>
      </div>
    </footer>
  );
}

function Store() {
  const [activeCategory, setActiveCategory] = useState("todos");
  const [cartItems, setCartItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const productsToShow = products.filter((product) => {
    const matchesCategory =
      activeCategory === "todos" || product.categories.includes(activeCategory);

    const searchableText = [
      product.name,
      product.category,
      product.team,
      product.country,
      ...(product.categories || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !normalizedSearch || searchableText.includes(normalizedSearch);

    return matchesCategory && matchesSearch;
  });

  const [cartOpen, setCartOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const addToCart = (product, size) => {
    setCartItems((previous) => {
      const existingItem = previous.find(
        (item) => item.id === product.id && item.size === size,
      );

      if (existingItem) {
        return previous.map((item) =>
          item.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...previous, { ...product, size, quantity: 1 }];
    });

    setCartOpen(true);
  };

  const changeQuantity = (item, quantity) => {
    if (quantity < 1) {
      removeItem(item);

      return;
    }
    setCartItems((previous) =>
      previous.map((current) =>
        current.id === item.id && current.size === item.size
          ? { ...current, quantity }
          : current,
      ),
    );
  };

  const removeItem = (item) => {
    setCartItems((previous) =>
      previous.filter(
        (current) => !(current.id === item.id && current.size === item.size),
      ),
    );
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <>
      {checkoutOpen ? (
        <Checkout
          items={cartItems}
          onBack={() => {
            setCheckoutOpen(false);

            setCartOpen(true);
          }}
        />
      ) : (
        <>
          <div className="announcement-bar">
            <span>SAKKA FOOTBALL T-SHIRTS</span>

            <span>FÚTBOL, IDENTIDAD Y CULTURA.</span>
          </div>

          <Header
            cartCount={cartCount}
            onOpenCart={() => setCartOpen(true)}
            searchTerm={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setActiveCategory("todos");
            }}
          />

          <main>
            <Hero />

            <Categories
              onSelectCategory={setActiveCategory}
              activeCategory={activeCategory}
            />

            <FeaturedProducts
              onAddToCart={addToCart}
              productsToShow={productsToShow}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
            />

            <RetroBanner />

            <Benefits />

            <FAQ />
          </main>

          <Footer />

          {cartOpen && (
            <CartPanel
              items={cartItems}
              onClose={() => setCartOpen(false)}
              onChangeQuantity={changeQuantity}
              onRemove={removeItem}
              onCheckout={() => {
                setCartOpen(false);

                setCheckoutOpen(true);
              }}
            />
          )}
        </>
      )}
    </>
  );
}

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  const isPrivatePath = ["/admin", "/seguimiento", "/prueba-tarjeta"].includes(pathname);

  useEffect(() => {
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) {
      robots.content = isPrivatePath
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large";
    }

    if (isPrivatePath) {
      document.title =
        pathname === "/admin"
          ? "Panel administrativo | SAKKA Kits"
          : pathname === "/seguimiento"
            ? "Seguimiento de pedido | SAKKA Kits"
            : "Prueba de pago | SAKKA Kits";
      document.querySelector('link[rel="canonical"]')?.remove();
    } else {
      document.title =
        "SAKKA Kits | Camisetas de fútbol retro y ediciones especiales";
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = "https://sakka-ftshirt.vercel.app/";
    }
  }, [pathname, isPrivatePath]);

  // Pantalla temporal para probar el formulario aislado
  if (pathname === "/prueba-tarjeta") {
    return <CardPaymentTest />;
  }

  if (pathname === "/admin") {
    return <Admin />;
  }

  if (pathname === "/seguimiento") {
    return <Tracking />;
  }

  return <Store />;
}

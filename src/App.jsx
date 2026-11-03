import { API_URL } from "./api";
import {
  Search,
  UserRound,
  ShoppingCart,
  ArrowRight,
  Truck,
  CreditCard,
  MessageCircle,
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

          <span>
            <MessageCircle /> También por WhatsApp
          </span>
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
            ? "CAMISETAS"
            : activeCategoryName || "CAMISETAS"
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

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      margin: "12px 0",
                    }}
                  >
                    <button
                      type="button"
                      aria-pressed={currentView === "front"}
                      onClick={() =>
                        setSelectedViews((previous) => ({
                          ...previous,
                          [product.id]: "front",
                        }))
                      }
                      style={{
                        flex: 1,
                        padding: "9px",
                        border: "1px solid #222",
                        borderRadius: "4px",
                        cursor: "pointer",
                        background: currentView === "front" ? "#222" : "white",
                        color: currentView === "front" ? "white" : "#222",
                        fontWeight: 600,
                      }}
                    >
                      FRENTE
                    </button>

                    <button
                      type="button"
                      aria-pressed={currentView === "back"}
                      onClick={() =>
                        setSelectedViews((previous) => ({
                          ...previous,
                          [product.id]: "back",
                        }))
                      }
                      style={{
                        flex: 1,
                        padding: "9px",
                        border: "1px solid #222",
                        borderRadius: "4px",
                        cursor: "pointer",
                        background: currentView === "back" ? "#222" : "white",
                        color: currentView === "back" ? "white" : "#222",
                        fontWeight: 600,
                      }}
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
      icon: MessageCircle,
      title: "También por WhatsApp",
      text: "Hacé tu pedido de forma simple.",
      href: "https://wa.me/5491124797206?text=Hola%21%20Estoy%20viendo%20las%20camisetas%20de%20SAKKA%20y%20quer%C3%ADa%20hacer%20una%20consulta",
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
            href="https://wa.me/5491124797206"
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
              href="https://wa.me/5491124797206"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp SAKKA"
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
                <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7a8.5 8.5 0 1 1 16.3-3.8Z" />
                <path d="M9 8.5c.3-.5.6-.5.9-.1l1 1.5c.2.3.1.6-.2.9l-.5.5c.6 1.2 1.4 2 2.6 2.6l.5-.5c.3-.3.6-.4.9-.2l1.5 1c.4.3.4.6-.1.9-.6.5-1.3.7-2 .5-2.5-.7-4.9-3.1-5.6-5.6-.2-.7 0-1.4.5-2Z" />
              </svg>
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

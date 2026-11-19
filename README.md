# SAKKA Football T-Shirts

Tienda online de camisetas retro. Compra sin contactar al local: elige talle, calcula el envío por localidad, paga con tarjeta de crédito/débito o con Mercado Pago, recibe un código y sigue el pedido.

- **Frontend** (Vercel): `index.html` + `src/store/` (tienda, checkout y seguimiento) y `admin/` + `src/admin/` (panel privado). Vite, sin framework.
- **Backend** (Render): `server/` (Express + Neon Postgres + Mercado Pago + Resend).

## Cómo funciona

1. El catálogo, los precios y el stock salen del backend (`/api/catalog`); el panel los edita.
2. En el checkout el cliente elige su **localidad**; el costo de envío sale de la tabla `shipping_zones` (editable en el panel, pestaña *Envíos*) y se cobra junto con las camisetas. Los envíos los hace SAKKA.
3. Paga con el formulario de tarjeta de Mercado Pago (Card Payment Brick, crédito o débito) o con su cuenta de Mercado Pago (botón Wallet). El backend recalcula todo con precios del servidor: el navegador solo manda producto, talle y cantidad.
4. Al acreditarse el pago se descuenta el stock, se crea el **código `SAKKA-XXXXXX`** y se envía el mail de confirmación.
5. En **Seguir mi pedido** (`/seguimiento`) el cliente ve Pendiente → Preparado → Despachado → Entregado. SAKKA cambia el estado desde el panel (con aviso por mail opcional). Cancelar un pedido devuelve el stock.
6. El panel (`/admin`) tiene usuario y contraseña propios: pedidos, stock y precios por talle, tarifas de envío y resumen de lo que hay que preparar.

## Variables de entorno

Ver `server/.env.example`. Van en **Render** (nunca en el repositorio ni en el frontend):
`DATABASE_URL`, `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `FRONTEND_URL`, `BACKEND_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `NODE_ENV=production`.

Contraseña del panel: `cd server && npm install && npm run hash-password -- "tu contraseña larga"` y pegar el resultado en `ADMIN_PASSWORD_HASH`.

## Puesta en marcha

1. **Render** (backend, carpeta `server`): Build `npm install`, Start `npm start`. Cargar las variables. Al iniciar crea las tablas, el catálogo (25 camisetas, precio inicial $60.000) y 92 localidades de envío.
2. **Vercel** (frontend, raíz): editar `vercel.json` y reemplazar `TU-BACKEND.onrender.com` por la URL real de Render. Así `/api` queda en el mismo dominio y la cookie del panel funciona.
3. **Mercado Pago**: en *Tus integraciones → Webhooks* cargar `https://TU-BACKEND.onrender.com/api/webhooks/mercadopago` (evento Pagos y Orders) y copiar la clave secreta en `MP_WEBHOOK_SECRET`.
4. Entrar a `https://TU-TIENDA.vercel.app/admin`, cargar el **stock** de cada camiseta (hasta cargarlo figura agotado) y revisar **precios** y **tarifas de envío**.
5. Hacer una compra de prueba real con una tarjeta propia y reembolsarla.

## Desarrollo local

```
cd server && cp .env.example .env && npm install && npm run dev   # puerto 3000
npm install && npm run dev                                          # tienda en 5173, /api va al backend
```

import { createRoot } from "react-dom/client";
import { initMercadoPago } from "@mercadopago/sdk-react";
import "./index.css";
import App from "./App.jsx";

const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
console.log("MP public key cargada:", Boolean(publicKey));

if (!publicKey) {
  console.error("Falta VITE_MP_PUBLIC_KEY en el archivo .env");
} else {
  initMercadoPago(publicKey, {
    locale: "es-AR",
  });
  console.log("Mercado Pago inicializado");
}

createRoot(document.getElementById("root")).render(<App />);
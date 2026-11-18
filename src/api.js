// URL base del backend. Configurar VITE_API_URL en Vercel para apuntar a Render.
export const API_URL = (
  import.meta.env.VITE_API_URL || "https://sakka-ftshirt.onrender.com"
).replace(/\/+$/, "");

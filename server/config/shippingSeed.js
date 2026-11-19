// Tarifas de envío por localidad (en pesos argentinos).
//
// IMPORTANTE: son valores PROVISIONALES, pensados como una escalera de precios
// que crece con la distancia desde Tigre. Se cargan en la base solo la primera
// vez; después se editan desde el panel de administración (pestaña "Envíos") y
// los cambios NO se pisan al reiniciar el servidor.
//
// Formato: [nombre, provincia, precio] — el id se arma solo a partir del nombre,
// salvo los que ya existían en la tienda anterior (se conservan).

const CABA = "Ciudad Autónoma de Buenos Aires";
const BA = "Buenos Aires";

const LEGACY_IDS = {
  "General San Martín": "san_martin",
};

const ZONES = [
  // ---- Zona norte (cerca de Tigre) ----
  ["Tigre", BA, 5000],
  ["Rincón de Milberg", BA, 5000],
  ["General Pacheco", BA, 5000],
  ["Don Torcuato", BA, 5000],
  ["El Talar", BA, 5000],
  ["Troncos del Talar", BA, 5000],
  ["Ricardo Rojas", BA, 5000],
  ["Nordelta", BA, 5000],
  ["San Fernando", BA, 5000],
  ["Victoria", BA, 5000],
  ["Virreyes", BA, 5000],
  ["Benavídez", BA, 6000],
  ["San Isidro", BA, 6000],
  ["Béccar", BA, 6000],
  ["Martínez", BA, 6000],
  ["Acassuso", BA, 6000],
  ["Boulogne", BA, 6000],
  ["Vicente López", BA, 7000],
  ["Olivos", BA, 7000],
  ["Florida", BA, 7000],
  ["Munro", BA, 7000],
  ["La Lucila", BA, 7000],
  ["Villa Adelina", BA, 7000],
  ["Carapachay", BA, 7000],
  ["Villa Martelli", BA, 7000],
  ["General San Martín", BA, 7000],
  ["Villa Ballester", BA, 7000],
  ["José León Suárez", BA, 7000],
  ["San Andrés", BA, 7000],
  ["Billinghurst", BA, 7000],

  // ---- Zona oeste / noroeste ----
  ["Tres de Febrero", BA, 8000],
  ["Caseros", BA, 8000],
  ["Ciudadela", BA, 8000],
  ["Santos Lugares", BA, 8000],
  ["Martín Coronado", BA, 8000],
  ["Villa Bosch", BA, 8000],
  ["San Miguel", BA, 8000],
  ["Malvinas Argentinas", BA, 8000],
  ["Los Polvorines", BA, 8000],
  ["Grand Bourg", BA, 8000],
  ["Tortuguitas", BA, 8000],
  ["José C. Paz", BA, 9000],
  ["Escobar", BA, 9000],
  ["Garín", BA, 9000],
  ["Maquinista Savio", BA, 9000],
  ["Pilar", BA, 9000],
  ["Del Viso", BA, 9000],
  ["Hurlingham", BA, 9000],
  ["Morón", BA, 10000],
  ["Haedo", BA, 10000],
  ["Castelar", BA, 10000],
  ["Ituzaingó", BA, 10000],
  ["Ramos Mejía", BA, 10000],
  ["San Justo", BA, 11000],
  ["Moreno", BA, 11000],
  ["Merlo", BA, 12000],

  // ---- Ciudad de Buenos Aires ----
  ["Núñez", CABA, 8000],
  ["Belgrano", CABA, 8000],
  ["Saavedra", CABA, 8000],
  ["Colegiales", CABA, 8000],
  ["Palermo", CABA, 8000],
  ["Villa Urquiza", CABA, 8000],
  ["Coghlan", CABA, 8000],
  ["Villa Pueyrredón", CABA, 8000],
  ["Villa Devoto", CABA, 9000],
  ["Villa Crespo", CABA, 9000],
  ["Chacarita", CABA, 9000],
  ["Recoleta", CABA, 9000],
  ["Retiro", CABA, 9000],
  ["Almagro", CABA, 9000],
  ["Caballito", CABA, 9000],
  ["Villa del Parque", CABA, 9000],
  ["Flores", CABA, 9000],
  ["Floresta", CABA, 9000],
  ["Liniers", CABA, 9000],
  ["Mataderos", CABA, 10000],
  ["Boedo", CABA, 10000],
  ["Balvanera", CABA, 10000],
  ["San Telmo", CABA, 10000],
  ["Puerto Madero", CABA, 10000],
  ["Barracas", CABA, 10000],
  ["Parque Patricios", CABA, 10000],
  ["Villa Lugano", CABA, 11000],

  // ---- Zona sur y resto de Buenos Aires ----
  ["Avellaneda", BA, 12000],
  ["Lanús", BA, 12000],
  ["Lomas de Zamora", BA, 13000],
  ["Quilmes", BA, 14000],
  ["La Plata", BA, 12000],
  ["Berisso", BA, 12000],
  ["Ensenada", BA, 12000],
  ["Mar del Plata", BA, 15000],
  ["Bahía Blanca", BA, 18000],
];

function slug(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const SHIPPING_ZONES = ZONES.map(([name, province, price]) => ({
  id: LEGACY_IDS[name] || slug(name),
  name,
  province,
  price,
}));

module.exports = { SHIPPING_ZONES, slug };

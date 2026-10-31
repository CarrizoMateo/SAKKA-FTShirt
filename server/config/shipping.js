
const SHIPPING_ZONES = {
  // Valores PROVISIONALES en pesos argentinos.
  // Cambiá cada precio cuando definas las tarifas reales.
  // Agregá cada localidad como una entrada independiente.

  tigre: { name: "Tigre", province: "Buenos Aires", price: 5000 },
  rincon_de_milberg: { name: "Rincón de Milberg", province: "Buenos Aires", price: 5000 },
  general_pacheco: { name: "General Pacheco", province: "Buenos Aires", price: 5000 },
  don_torcuato: { name: "Don Torcuato", province: "Buenos Aires", price: 5000 },
  el_talar: { name: "El Talar", province: "Buenos Aires", price: 5000 },
  benavidez: { name: "Benavídez", province: "Buenos Aires", price: 6000 },
  san_fernando: { name: "San Fernando", province: "Buenos Aires", price: 5000 },
  victoria: { name: "Victoria", province: "Buenos Aires", price: 5000 },
  virreyes: { name: "Virreyes", province: "Buenos Aires", price: 5000 },
  san_isidro: { name: "San Isidro", province: "Buenos Aires", price: 6000 },
  beccar: { name: "Béccar", province: "Buenos Aires", price: 6000 },
  martinez: { name: "Martínez", province: "Buenos Aires", price: 6000 },
  acassuso: { name: "Acassuso", province: "Buenos Aires", price: 6000 },
  boulogne: { name: "Boulogne", province: "Buenos Aires", price: 6000 },
  vicente_lopez: { name: "Vicente López", province: "Buenos Aires", price: 7000 },
  olivos: { name: "Olivos", province: "Buenos Aires", price: 7000 },
  florida: { name: "Florida", province: "Buenos Aires", price: 7000 },
  munro: { name: "Munro", province: "Buenos Aires", price: 7000 },
  san_martin: { name: "General San Martín", province: "Buenos Aires", price: 7000 },
  tres_de_febrero: { name: "Tres de Febrero", province: "Buenos Aires", price: 8000 },
  san_miguel: { name: "San Miguel", province: "Buenos Aires", price: 8000 },
  malvinas_argentinas: { name: "Malvinas Argentinas", province: "Buenos Aires", price: 8000 },
  jose_c_paz: { name: "José C. Paz", province: "Buenos Aires", price: 9000 },
  escobar: { name: "Escobar", province: "Buenos Aires", price: 9000 },
  garin: { name: "Garín", province: "Buenos Aires", price: 9000 },
  maquinista_savio: { name: "Maquinista Savio", province: "Buenos Aires", price: 9000 },
  pilar: { name: "Pilar", province: "Buenos Aires", price: 9000 },
  del_viso: { name: "Del Viso", province: "Buenos Aires", price: 9000 },
  la_plata: { name: "La Plata", province: "Buenos Aires", price: 12000 },
  berisso: { name: "Berisso", province: "Buenos Aires", price: 12000 },
  ensenada: { name: "Ensenada", province: "Buenos Aires", price: 12000 },
  mar_del_plata: { name: "Mar del Plata", province: "Buenos Aires", price: 15000 },
  bahia_blanca: { name: "Bahía Blanca", province: "Buenos Aires", price: 18000 },
};

function getShippingOptions() {
  return Object.entries(SHIPPING_ZONES)
    .map(([id, zone]) => ({
      id,
      name: zone.name,
      province: zone.province,
      price: zone.price,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function getShippingByZone(zoneId) {
  if (typeof zoneId !== "string") return null;

  const zone = SHIPPING_ZONES[zoneId];

  if (!zone) return null;

  if (!Number.isSafeInteger(zone.price) || zone.price < 0) {
    return null;
  }

  return {
    id: zoneId,
    name: zone.name,
    province: zone.province,
    price: zone.price,
  };
}

module.exports = {
  getShippingOptions,
  getShippingByZone,
};

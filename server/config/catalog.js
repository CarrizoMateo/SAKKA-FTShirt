// Catálogo de SAKKA. Se carga en la base al iniciar el servidor.
// El precio inicial es de $60.000 (el que ya usaba la tienda); después se edita
// desde el panel de administración y esos cambios NO se pisan al reiniciar.
// Los datos de texto (nombre, equipo, temporada...) sí se actualizan desde acá.

const PRODUCTS = [
  {
    "id": "alemania-adidas-1990",
    "name": "Alemania Adidas 1990",
    "price": 60000,
    "team": "Alemania",
    "season": "1990",
    "year": 1990,
    "kit": "1",
    "brand": "Adidas",
    "cats": [
      "Retro",
      "Selecciones"
    ],
    "sleeve": "corta",
    "tag": "Destacado",
    "feat": 1,
    "kw": "germany deutschland mannschaft italia 90 mundial",
    "look": "Camiseta de Alemania de 1990, blanca con la V tricolor en negro, rojo y dorado. Lleva el detalle \"Italia 90\" en el pecho."
  },
  {
    "id": "barcelona-kappa-1997-98",
    "name": "FC Barcelona Kappa 1997/98",
    "price": 60000,
    "team": "FC Barcelona",
    "season": "1997-98",
    "year": 1997,
    "kit": "1",
    "brand": "Kappa",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "corta",
    "tag": "Destacado",
    "feat": 1,
    "kw": "barca blaugrana cule camp nou"
  },
  {
    "id": "boca-juniors-2003-04",
    "name": "Boca Juniors Nike 2003/04",
    "price": 60000,
    "team": "Boca Juniors",
    "season": "2003-04",
    "year": 2003,
    "kit": "1",
    "brand": "Nike",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "corta",
    "tag": "Destacado",
    "feat": 1,
    "kw": "xeneize bombonera azul y oro"
  },
  {
    "id": "napoli-nr-1988-89",
    "name": "Napoli NR 1988/89",
    "price": 60000,
    "team": "Napoli",
    "season": "1988-89",
    "year": 1988,
    "kit": "1",
    "brand": "NR",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "corta",
    "tag": "Destacado",
    "feat": 1,
    "kw": "maradona partenopei scudetto"
  },
  {
    "id": "japon-one-piece",
    "name": "Japón One Piece",
    "price": 60000,
    "team": "Japón",
    "season": "",
    "year": null,
    "kit": "E",
    "brand": "Adidas",
    "cats": [
      "Selecciones",
      "Ediciones especiales"
    ],
    "sleeve": "corta",
    "edition": "One Piece",
    "tag": "Nuevo",
    "feat": 1,
    "kw": "japan anime luffy manga",
    "look": "Edición especial de Japón con la ilustración de Luffy, de One Piece, en el frente y el dorso. Fondo blanco, mangas estampadas y cuello negro."
  },
  {
    "id": "japon-sakura-edition",
    "name": "Japón Sakura Edition",
    "price": 60000,
    "team": "Japón",
    "season": "",
    "year": null,
    "kit": "E",
    "brand": "Adidas",
    "cats": [
      "Selecciones",
      "Ediciones especiales"
    ],
    "sleeve": "corta",
    "edition": "Sakura Edition",
    "tag": "Nuevo",
    "feat": 1,
    "kw": "japan cerezo flores buho rosa",
    "look": "Edición especial de Japón con ramas de cerezo en flor y un búho ilustrado en rosa y azul, sobre un fondo floral gris claro."
  },
  {
    "id": "ac-milan-adidas-2011-12",
    "name": "AC Milan Adidas 2011/12",
    "price": 60000,
    "team": "AC Milan",
    "season": "2011-12",
    "year": 2011,
    "kit": "1",
    "brand": "Adidas",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "corta",
    "kw": "rossoneri san siro"
  },
  {
    "id": "atletico-madrid-2004-05",
    "name": "Atlético de Madrid Nike 2004/05",
    "price": 60000,
    "team": "Atlético de Madrid",
    "season": "2004-05",
    "year": 2004,
    "kit": "1",
    "brand": "Nike",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "corta",
    "kw": "atleti colchonero spider-man"
  },
  {
    "id": "benfica-2024-25",
    "name": "Benfica Adidas 2024/25",
    "price": 60000,
    "team": "Benfica",
    "season": "2024-25",
    "year": 2024,
    "kit": "1",
    "brand": "Adidas",
    "cats": [
      "Clubes"
    ],
    "sleeve": "corta",
    "kw": "aguias lisboa portugal"
  },
  {
    "id": "brasil-nike-2024-25",
    "name": "Brasil Nike 2024/25",
    "price": 60000,
    "team": "Brasil",
    "season": "2024-25",
    "year": 2024,
    "kit": "1",
    "brand": "Nike",
    "cats": [
      "Selecciones"
    ],
    "sleeve": "corta",
    "kw": "brazil verdeamarela canarinha cbf"
  },
  {
    "id": "brasil-nike-azul",
    "name": "Brasil Nike manga larga (2ª equipación)",
    "price": 60000,
    "team": "Brasil",
    "season": "",
    "year": null,
    "kit": "2",
    "brand": "Nike",
    "cats": [
      "Retro",
      "Selecciones"
    ],
    "sleeve": "larga",
    "kw": "brazil azul cbf"
  },
  {
    "id": "fiorentina-lotto-1992-93",
    "name": "Fiorentina Lotto 1992/93 (2ª equipación)",
    "price": 60000,
    "team": "Fiorentina",
    "season": "1992-93",
    "year": 1992,
    "kit": "2",
    "brand": "Lotto",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "corta",
    "kw": "viola florencia 7up"
  },
  {
    "id": "inter-2025-26",
    "name": "Inter Nike 2025/26",
    "price": 60000,
    "team": "Inter",
    "season": "2025-26",
    "year": 2025,
    "kit": "1",
    "brand": "Nike",
    "cats": [
      "Clubes"
    ],
    "sleeve": "corta",
    "tag": "Nuevo",
    "kw": "internazionale nerazzurri milan"
  },
  {
    "id": "italia-adidas-2023-24",
    "name": "Italia Adidas 2023/24",
    "price": 60000,
    "team": "Italia",
    "season": "2023-24",
    "year": 2023,
    "kit": "1",
    "brand": "Adidas",
    "cats": [
      "Selecciones"
    ],
    "sleeve": "corta",
    "kw": "azzurra figc"
  },
  {
    "id": "juventus-2025-26",
    "name": "Juventus Adidas 2025/26 (3ª equipación)",
    "price": 60000,
    "team": "Juventus",
    "season": "2025-26",
    "year": 2025,
    "kit": "3",
    "brand": "Adidas",
    "cats": [
      "Clubes"
    ],
    "sleeve": "corta",
    "tag": "Nuevo",
    "kw": "juve bianconeri turin negra",
    "look": "Tercera equipación de Juventus en negro, con estampado tono sobre tono de hojas y racimos de uva, vivos color crema y un caballo en el pecho."
  },
  {
    "id": "juventus-kappa-1995-96-larga",
    "name": "Juventus Kappa 1995/96 manga larga (2ª equipación)",
    "price": 60000,
    "team": "Juventus",
    "season": "1995-96",
    "year": 1995,
    "kit": "2",
    "brand": "Kappa",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "larga",
    "kw": "juve bianconeri sony azul"
  },
  {
    "id": "juventus-kappa-1997-98-corta",
    "name": "Juventus Kappa 1997/98 (2ª equipación)",
    "price": 60000,
    "team": "Juventus",
    "season": "1997-98",
    "year": 1997,
    "kit": "2",
    "brand": "Kappa",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "corta",
    "kw": "juve bianconeri sony minidisc azul"
  },
  {
    "id": "napoli-2024-25",
    "name": "Napoli EA7 2024/25",
    "price": 60000,
    "team": "Napoli",
    "season": "2024-25",
    "year": 2024,
    "kit": "1",
    "brand": "EA7",
    "cats": [
      "Clubes"
    ],
    "sleeve": "corta",
    "kw": "partenopei msc"
  },
  {
    "id": "napoli-nr-1985-86",
    "name": "Napoli NR 1985/86 manga larga",
    "price": 60000,
    "team": "Napoli",
    "season": "1985-86",
    "year": 1985,
    "kit": "1",
    "brand": "NR",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "larga",
    "kw": "maradona partenopei buitoni"
  },
  {
    "id": "paris-saint-germain-2003-04",
    "name": "Paris Saint-Germain Nike 2003/04",
    "price": 60000,
    "team": "Paris Saint-Germain",
    "season": "2003-04",
    "year": 2003,
    "kit": "1",
    "brand": "Nike",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "corta",
    "kw": "psg paris thomson"
  },
  {
    "id": "paris-saint-germain-2024-25",
    "name": "Paris Saint-Germain Nike 2024/25 (2ª equipación)",
    "price": 60000,
    "team": "Paris Saint-Germain",
    "season": "2024-25",
    "year": 2024,
    "kit": "2",
    "brand": "Nike",
    "cats": [
      "Clubes"
    ],
    "sleeve": "corta",
    "kw": "psg paris qatar blanca"
  },
  {
    "id": "real-madrid-2025-26",
    "name": "Real Madrid Adidas 2025/26",
    "price": 60000,
    "team": "Real Madrid",
    "season": "2025-26",
    "year": 2025,
    "kit": "1",
    "brand": "Adidas",
    "cats": [
      "Clubes"
    ],
    "sleeve": "corta",
    "tag": "Nuevo",
    "kw": "merengue blancos bernabeu"
  },
  {
    "id": "real-madrid-kelme-1997-98",
    "name": "Real Madrid Kelme 1997/98",
    "price": 60000,
    "team": "Real Madrid",
    "season": "1997-98",
    "year": 1997,
    "kit": "1",
    "brand": "Kelme",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "corta",
    "kw": "merengue blancos teka bernabeu"
  },
  {
    "id": "river-plate-2025-26",
    "name": "River Plate Adidas 2025/26 (3ª equipación)",
    "price": 60000,
    "team": "River Plate",
    "season": "2025-26",
    "year": 2025,
    "kit": "3",
    "brand": "Adidas",
    "cats": [
      "Clubes"
    ],
    "sleeve": "corta",
    "tag": "Nuevo",
    "kw": "millonario monumental banda negra roja"
  },
  {
    "id": "schalke-04-2011-12",
    "name": "Schalke 04 Adidas 2011/12",
    "price": 60000,
    "team": "Schalke 04",
    "season": "2011-12",
    "year": 2011,
    "kit": "1",
    "brand": "Adidas",
    "cats": [
      "Retro",
      "Clubes"
    ],
    "sleeve": "corta",
    "kw": "knappen gelsenkirchen gazprom"
  }
];

module.exports = { PRODUCTS };

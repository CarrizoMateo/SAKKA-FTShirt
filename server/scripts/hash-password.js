// Uso: npm run hash-password -- "tu contraseña"
// Imprime el valor para la variable ADMIN_PASSWORD_HASH (la contraseña real no se guarda).
const { hashPassword } = require("../services/auth");

const password = process.argv[2];

if (!password || password.length < 10) {
  console.error('Uso: npm run hash-password -- "una contraseña de al menos 10 caracteres"');
  process.exit(1);
}

console.log("\nCopiá esta línea en las variables de entorno de Render:\n");
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}\n`);

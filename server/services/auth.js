// Login del panel: usuario y contraseña propios, sesión en una cookie firmada.
const crypto = require("crypto");

const COOKIE = "sakka_admin";
const SESSION_MS = 1000 * 60 * 60 * 8; // 8 horas

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Formato guardado: scrypt$N$r$p$salt(base64)$hash(base64)
function hashPassword(password) {
  const N = 16384, r = 8, p = 1;
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function verifyHash(password, stored) {
  try {
    const [scheme, N, r, p, salt, hash] = String(stored).split("$");
    if (scheme !== "scrypt") return false;
    const expected = Buffer.from(hash, "base64");
    const actual = crypto.scryptSync(password, Buffer.from(salt, "base64"), expected.length, {
      N: Number(N), r: Number(r), p: Number(p),
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function checkCredentials(username, password) {
  const userOk = safeEqual(username, process.env.ADMIN_USER ?? "");
  let passOk = false;

  if (process.env.ADMIN_PASSWORD_HASH) {
    passOk = verifyHash(password, process.env.ADMIN_PASSWORD_HASH);
  } else if (process.env.ADMIN_PASSWORD) {
    passOk = safeEqual(password, process.env.ADMIN_PASSWORD);
  }

  return userOk && passOk;
}

const b64 = (value) => Buffer.from(value).toString("base64url");

function sign(payload) {
  return crypto
    .createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
    .update(payload)
    .digest("base64url");
}

function createToken(username) {
  const payload = b64(JSON.stringify({ u: username, exp: Date.now() + SESSION_MS }));
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (!safeEqual(data.u, process.env.ADMIN_USER ?? "")) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function cookieAttributes() {
  const secure =
    process.env.ADMIN_COOKIE_SECURE === "true" ||
    (process.env.NODE_ENV === "production" && process.env.ADMIN_COOKIE_SECURE !== "false");
  const sameSite = process.env.ADMIN_COOKIE_SAMESITE || "Lax";
  return `Path=/; HttpOnly; SameSite=${sameSite}${secure || sameSite === "None" ? "; Secure" : ""}`;
}

function sessionCookie(username) {
  return `${COOKIE}=${createToken(username)}; Max-Age=${Math.floor(SESSION_MS / 1000)}; ${cookieAttributes()}`;
}

function clearCookie() {
  return `${COOKIE}=; Max-Age=0; ${cookieAttributes()}`;
}

function currentAdmin(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  return readToken(token);
}

// Orígenes que pueden hacer cambios desde el navegador (FRONTEND_URL, separados por coma).
function allowedOrigins() {
  return String(process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function requireAdmin(req, res, next) {
  const admin = currentAdmin(req);

  if (!admin) {
    return res.status(401).json({ error: "Necesitás iniciar sesión como administrador." });
  }

  // Los cambios solo se aceptan si vienen de la propia tienda.
  const origin = req.headers.origin;
  if (req.method !== "GET" && origin && !allowedOrigins().includes(origin.replace(/\/+$/, ""))) {
    return res.status(403).json({ error: "Origen no permitido." });
  }

  req.admin = admin;
  return next();
}

// Limitador simple en memoria: máximo `max` intentos por clave dentro de `windowMs`.
function createLimiter({ windowMs, max }) {
  const hits = new Map();

  return {
    hit(key) {
      const now = Date.now();
      const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 5000) {
        for (const [k, times] of hits) {
          if (!times.some((time) => now - time < windowMs)) hits.delete(k);
        }
      }
      return recent.length <= max;
    },
    reset(key) {
      hits.delete(key);
    },
    blocked(key) {
      const now = Date.now();
      return (hits.get(key) || []).filter((time) => now - time < windowMs).length >= max;
    },
  };
}

module.exports = {
  hashPassword,
  checkCredentials,
  sessionCookie,
  clearCookie,
  currentAdmin,
  requireAdmin,
  allowedOrigins,
  createLimiter,
};

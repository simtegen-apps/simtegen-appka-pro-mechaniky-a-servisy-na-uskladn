// Shared helpers for the Pages Functions. Lives OUTSIDE functions/ on
// purpose: everything under functions/ is a route candidate, and a helper
// module that suddenly answers HTTP requests is a bug nobody looks for.

const KODOVAC = new TextEncoder();

export async function otisk(token) {
  // Tokens are stored only as SHA-256 digests — a leaked database must not
  // be a bag of valid logins.
  const digest = await crypto.subtle.digest("SHA-256", KODOVAC.encode(token));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function novyToken() {
  const bajty = new Uint8Array(32);
  crypto.getRandomValues(bajty);
  return [...bajty].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ted() {
  // Unix seconds, matching the INTEGER columns in db/migrace.
  return Math.floor(Date.now() / 1000);
}

export function json(telo, status = 200, hlavicky = {}) {
  return new Response(JSON.stringify(telo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...hlavicky },
  });
}

export function ctiCookie(request, nazev) {
  const cookies = request.headers.get("Cookie") || "";
  for (const kus of cookies.split(";")) {
    const [k, ...v] = kus.trim().split("=");
    if (k === nazev) return v.join("=");
  }
  return null;
}

export const RELACE_COOKIE = "relace";
export const RELACE_TRVANI = 30 * 24 * 3600; // matches manifest: 30 days
export const ODKAZ_TRVANI = 3600; // link valid 1 hour; rows purged after 24 h

export function cookieHlavicka(token, maxAge) {
  // HttpOnly: the frontend never reads the session token — it only asks
  // /api/ja who it is. SameSite=Lax also blanks the cookie on cross-site
  // POSTs, which is the v1 CSRF story.
  return (
    `${RELACE_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; ` +
    `Path=/; Max-Age=${maxAge}`
  );
}

export async function nactiUzivatele(request, env) {
  const token = ctiCookie(request, RELACE_COOKIE);
  if (!token) return null;
  const radek = await env.DB.prepare(
    "SELECT u.id, u.email FROM relace r JOIN uzivatele u ON u.id = r.uzivatel_id " +
    "WHERE r.otisk_tokenu = ? AND r.expirace > ?"
  ).bind(await otisk(token), ted()).first();
  return radek || null;
}

// ---------------------------------------------------------------------------
// Pneusklad helpers
// ---------------------------------------------------------------------------

export const CASOVA_ZONA = "Europe/Prague";

// "Today" and "tomorrow" are the two words this product lives on, and the
// Workers runtime is UTC: at 00:30 in Prague a naive UTC day boundary would
// still be showing yesterday's bookings. Every day boundary therefore goes
// through the Prague wall clock. Slots that fall inside a DST transition hour
// can land an hour off — a tyre shop does not book at 02:30 on the last
// Sunday in March, so that trade is deliberate.
const CASTI = new Intl.DateTimeFormat("en-GB", {
  timeZone: CASOVA_ZONA,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hourCycle: "h23",
});

function castiVPraze(ts) {
  const casti = {};
  for (const c of CASTI.formatToParts(new Date(ts * 1000))) {
    if (c.type !== "literal") casti[c.type] = Number(c.value);
  }
  // hourCycle h23 should already give 0 for midnight, but some engines still
  // report 24 there. Left unnormalised it would push posunZony a whole day
  // out between 00:00 and 00:59 Prague time — the exact hour a shop is least
  // likely to notice and most likely to be doing paperwork.
  if (casti.hour === 24) casti.hour = 0;
  return casti;
}

// Seconds Prague is ahead of UTC at that instant (+3600 or +7200).
function posunZony(ts) {
  const c = castiVPraze(ts);
  const jakoUtc = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second) / 1000;
  return jakoUtc - ts;
}

export function zacatekDne(ts) {
  const c = castiVPraze(ts);
  return Date.UTC(c.year, c.month - 1, c.day) / 1000 - posunZony(ts);
}

export const DEN = 24 * 3600;

// "2026-09-07" + "08:30" -> unix seconds. The frontend never computes epochs
// from the device clock; it sends what the mechanic typed and the server owns
// the timezone.
export function epochZDataCasu(datum, cas) {
  const [rok, mesic, den] = String(datum || "").split("-").map(Number);
  const [hodina, minuta] = String(cas || "00:00").split(":").map(Number);
  if (!rok || !mesic || !den) return null;
  const hrube = Date.UTC(rok, mesic - 1, den, hodina || 0, minuta || 0) / 1000;
  return hrube - posunZony(hrube);
}

// Both halves of a timestamp as the mechanic reads them, so the frontend can
// render without a timezone library or a guess about the device clock.
export function denACas(ts) {
  const c = castiVPraze(ts);
  const dvojmisto = (n) => String(n).padStart(2, "0");
  return {
    den: `${c.year}-${dvojmisto(c.month)}-${dvojmisto(c.day)}`,
    cas: `${dvojmisto(c.hour)}:${dvojmisto(c.minute)}`,
  };
}

export const ZKUSEBNI_DNU = 60;
export const ZKUSEBNI_LIMIT_SAD = 40;
export const RETENCE_ARCHIV = 730 * DEN; // 24 months, matches the manifest

export async function nactiNastaveni(env, uzivatelId) {
  // Created on first read instead of at signup: the account exists before the
  // shop ever opens the settings screen, and a missing row would otherwise
  // have to be handled in every single handler.
  await env.DB.prepare(
    "INSERT INTO nastaveni_servisu (uzivatel_id, zkusebni_do, limit_sad) " +
    "VALUES (?, ?, ?) ON CONFLICT(uzivatel_id) DO NOTHING"
  ).bind(uzivatelId, ted() + ZKUSEBNI_DNU * DEN, ZKUSEBNI_LIMIT_SAD).run();
  return env.DB.prepare(
    "SELECT * FROM nastaveni_servisu WHERE uzivatel_id = ?"
  ).bind(uzivatelId).first();
}

export async function novyKodSady(env, uzivatelId) {
  // Per-shop sequence, not a global id: the code goes on a printed label and
  // must not leak how many sets every other shop has. A 1-2 person shop does
  // not create two sets in the same millisecond; UNIQUE(uzivatel_id, kod)
  // catches it anyway if they manage to.
  await env.DB.prepare(
    "UPDATE nastaveni_servisu SET posledni_cislo = posledni_cislo + 1 WHERE uzivatel_id = ?"
  ).bind(uzivatelId).run();
  const radek = await env.DB.prepare(
    "SELECT posledni_cislo FROM nastaveni_servisu WHERE uzivatel_id = ?"
  ).bind(uzivatelId).first();
  const rok = String(castiVPraze(ted()).year).slice(2);
  return `${rok}-${String(radek.posledni_cislo).padStart(4, "0")}`;
}

export async function zkontrolujLimit(env, uzivatelId, nastaveni) {
  // Returns a Czech sentence to refuse with, or null. Only the trial is
  // capped — a paying shop is never told it may not store a customer's wheels.
  if (nastaveni.plan !== "zkusebni") return null;
  if (nastaveni.zkusebni_do && nastaveni.zkusebni_do < ted()) {
    return "Zkušební období skončilo. Napište nám na podporu a předplatné vám rádi nastavíme.";
  }
  const { n } = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM sady WHERE uzivatel_id = ? AND stav = 'uskladneno'"
  ).bind(uzivatelId).first();
  if (n >= nastaveni.limit_sad) {
    return `Ve zkušebním režimu můžete mít uskladněno nejvýše ${nastaveni.limit_sad} sad. `
      + "Napište nám na podporu a limit vám zvedneme.";
  }
  return null;
}

export async function uklid(env, uzivatelId) {
  // The retention promises from the manifest, kept without a scheduler:
  // Pages Functions have no cron, so cleanup rides along with logging in and
  // with opening the overview. Cheap, idempotent, and it can only ever delete
  // rows the policy already says are gone.
  const mez = ted() - RETENCE_ARCHIV;
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM pohyby WHERE uzivatel_id = ? AND sada_id IN " +
      "(SELECT id FROM sady WHERE uzivatel_id = ? AND stav = 'vydano' AND datum_vydeje < ?)"
    ).bind(uzivatelId, uzivatelId, mez),
    env.DB.prepare(
      "DELETE FROM sady WHERE uzivatel_id = ? AND stav = 'vydano' AND datum_vydeje < ?"
    ).bind(uzivatelId, mez),
    env.DB.prepare(
      "DELETE FROM objednavky WHERE uzivatel_id = ? AND datum < ?"
    ).bind(uzivatelId, mez),
  ]);
}

// One shape for a set everywhere it is listed, so the label, the search
// result and the preparation checklist cannot drift apart. Split in two so a
// report can slot an extra computed column in between (see /api/prehled)
// without string surgery on a finished query.
export const SADY_SLOUPCE =
  "SELECT s.id, s.kod, s.spz, s.vozidlo, s.typ, s.rozmer, s.pocet_kusu, s.dezen, " +
  "s.na_discich, s.hloubka_lp, s.hloubka_pp, s.hloubka_lz, s.hloubka_pz, s.pozice, " +
  "s.stav, s.datum_prijmu, s.datum_vydeje, s.cena_skladovani, s.zaplaceno, " +
  "s.poznamka, s.zakaznik_id, z.jmeno, z.telefon, z.email";

export const SADY_ZDROJ = "FROM sady s JOIN zakaznici z ON z.id = s.zakaznik_id";

export const SADY_SELECT = `${SADY_SLOUPCE} ${SADY_ZDROJ}`;

// A booking may hang on a stored set, on a customer without one, or on
// nothing but a name written down in the doorway — all three render the same,
// so the joins and the flattening live here and not in three handlers.
export const OBJEDNAVKY_SELECT =
  "SELECT o.id, o.datum, o.delka_min, o.ukon, o.stav, o.pripraveno, o.poznamka, " +
  "o.zakaznik_id, o.sada_id, o.jmeno_bez_zakaznika, z.jmeno, z.telefon, " +
  "s.kod, s.pozice, s.typ AS sada_typ, s.rozmer, s.pocet_kusu, s.spz " +
  "FROM objednavky o " +
  "LEFT JOIN zakaznici z ON z.id = o.zakaznik_id " +
  "LEFT JOIN sady s ON s.id = o.sada_id";

export function objednavkaProFrontend(radek) {
  const { den, cas } = denACas(radek.datum);
  return {
    ...radek,
    den,
    cas,
    nazev: radek.jmeno || radek.jmeno_bez_zakaznika || "Bez jména",
  };
}

export const TYPY_PNEU = ["zimni", "letni", "celorocni"];
export const UKONY = ["prezuti", "prehozeni", "uskladneni", "vydej", "oprava"];

export function ocisti(hodnota, maxDelka = 120) {
  return String(hodnota == null ? "" : hodnota).trim().slice(0, maxDelka);
}

export function cislo(hodnota, vychozi = 0) {
  const n = Number(hodnota);
  return Number.isFinite(n) ? Math.trunc(n) : vychozi;
}

export async function tabulkySUzivatelem(env) {
  // Every app table carries uzivatel_id (CI enforces it), so export and
  // deletion can be generic: introspect instead of maintaining a list that
  // would drift the first time a builder adds a table.
  const tabulky = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' " +
    "AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf%' " +
    "AND name != 'd1_migrations'"
  ).all();
  const vysledek = [];
  for (const { name } of tabulky.results) {
    const sloupce = await env.DB.prepare(`PRAGMA table_info("${name}")`).all();
    if (sloupce.results.some((s) => s.name === "uzivatel_id")) {
      vysledek.push(name);
    }
  }
  return vysledek;
}

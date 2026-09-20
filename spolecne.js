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

// Matches ZKUSEBNI_DNI in predplatne.js and zkusebni_dni in the manifest,
// which is what the terms of service promise. Shops created before this was
// shortened keep the zkusebni_do they were given — the column is written
// once, on first read.
export const ZKUSEBNI_DNU = 14;
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
  //
  // A trial that has RUN OUT is no longer handled here: that is the
  // subscription's job (vyzadujPredplatne → 402), and two different refusals
  // for one situation is how a customer ends up reading two different stories
  // about why the app will not take their wheels.
  if (nastaveni.plan !== "zkusebni") return null;
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
  "o.na_discich, o.cely_den, " +
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
// "Přehození" is gone: the distinction that matters in the bay is whether the
// wheels are on rims, which is now a flag on the booking. Migration 0004
// folded the old rows into 'prezuti'.
export const UKONY = ["prezuti", "uskladneni", "vydej", "oprava"];

// ---------------------------------------------------------------------------
// Searching Czech names
// ---------------------------------------------------------------------------
// SQLite's LOWER() only folds ASCII, so "Šimon" stays "Šimon" while the
// browser sends "šimon" — every customer with a diacritic was unfindable.
// There is no ICU in D1, so the folding is done explicitly on both sides: the
// query is folded in JS, and the column is folded in SQL by the same table of
// pairs. Both cases are listed because LOWER() cannot lowercase 'Š' either.
const DIAKRITIKA = [
  ["á", "a"], ["Á", "a"], ["č", "c"], ["Č", "c"], ["ď", "d"], ["Ď", "d"],
  ["é", "e"], ["É", "e"], ["ě", "e"], ["Ě", "e"], ["í", "i"], ["Í", "i"],
  ["ň", "n"], ["Ň", "n"], ["ó", "o"], ["Ó", "o"], ["ř", "r"], ["Ř", "r"],
  ["š", "s"], ["Š", "s"], ["ť", "t"], ["Ť", "t"], ["ú", "u"], ["Ú", "u"],
  ["ů", "u"], ["Ů", "u"], ["ý", "y"], ["Ý", "y"], ["ž", "z"], ["Ž", "z"],
];

// Wraps a column reference in the REPLACE() chain. The pairs are a fixed
// literal table, never user input, so there is nothing to escape.
export function sqlBezDiakritiky(sloupec) {
  let vyraz = `LOWER(${sloupec})`;
  for (const [znak, nahrada] of DIAKRITIKA) {
    vyraz = `REPLACE(${vyraz}, '${znak}', '${nahrada}')`;
  }
  return vyraz;
}

export function bezDiakritiky(text) {
  let vysledek = String(text == null ? "" : text).toLowerCase();
  for (const [znak, nahrada] of DIAKRITIKA) {
    vysledek = vysledek.split(znak).join(nahrada);
  }
  return vysledek;
}

// ---------------------------------------------------------------------------
// Who is signed in, and for which shop
// ---------------------------------------------------------------------------
// One account is one shop. A colleague signs in with their own e-mail through
// the ordinary one-time link; a row in clenove is what turns that login into
// access to this shop. Everything else in the product keys off servis.id, so
// a colleague's own (empty) account never owns any shop data — which is also
// why /api/ucet/smazat stays correct without changes.
//
// Priority when both exist: the account's OWN shop wins over any invitation.
// An invitation is an offer, not a claim on somebody else's warehouse.
export const ROLE = ["spravce", "mechanik", "cteni"];

// Does this account run a shop of its own? nastaveni_servisu deliberately does
// not count: nactiNastaveni() creates that row on first read, so every account
// has one and it proves nothing. Only records a person actually entered do.
async function maVlastniData(env, uzivatelId) {
  const radek = await env.DB.prepare(
    "SELECT (EXISTS(SELECT 1 FROM sady WHERE uzivatel_id = ?) " +
    "OR EXISTS(SELECT 1 FROM zakaznici WHERE uzivatel_id = ?) " +
    "OR EXISTS(SELECT 1 FROM objednavky WHERE uzivatel_id = ?)) AS ma"
  ).bind(uzivatelId, uzivatelId, uzivatelId).first();
  return !!(radek && radek.ma);
}

export async function nactiKontext(env, uzivatel) {
  if (!uzivatel) return null;

  const clenstvi = await env.DB.prepare(
    "SELECT uzivatel_id, role FROM clenove WHERE email = ? ORDER BY id LIMIT 1"
  ).bind(uzivatel.email).first();

  // No invitation, or one pointing back at this very account: own shop.
  // Checking membership first keeps the ordinary case at a single query.
  if (!clenstvi || clenstvi.uzivatel_id === uzivatel.id) {
    return { id: uzivatel.id, role: "spravce", vlastni: true };
  }

  // An invitation must never shadow a shop that is already in use. Otherwise
  // any správce could type a stranger's address into their team and take that
  // person's own warehouse away from them at the next login — they would sign
  // in and see somebody else's sets with no way back to their own. Own data
  // therefore wins; the invitation only applies to an account that has not
  // started a warehouse of its own.
  if (await maVlastniData(env, uzivatel.id)) {
    return { id: uzivatel.id, role: "spravce", vlastni: true };
  }

  return { id: clenstvi.uzivatel_id, role: clenstvi.role, vlastni: false };
}

export function smiPsat(servis) {
  return !!servis && servis.role !== "cteni";
}

export function smiSpravovat(servis) {
  return !!servis && servis.role === "spravce";
}

// Two guards with the sentences the customer actually reads.
export function odepriZapis() {
  return json({ chyba: "Máte přístup jen pro čtení. Požádejte správce účtu o vyšší oprávnění." }, 403);
}

export function odepriSpravu() {
  return json({ chyba: "Tuto část smí měnit jen správce účtu." }, 403);
}

// ---------------------------------------------------------------------------
// Time of day (opening hours, lunch) — MINUTES since midnight
// ---------------------------------------------------------------------------
export function minutyNaCas(minuty) {
  const m = Math.max(0, Math.min(cislo(minuty, 0), 24 * 60));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function casNaMinuty(cas, vychozi = 0) {
  const shoda = /^(\d{1,2}):(\d{2})$/.exec(String(cas || "").trim());
  if (!shoda) return vychozi;
  return Math.max(0, Math.min(Number(shoda[1]) * 60 + Number(shoda[2]), 24 * 60));
}

// ---------------------------------------------------------------------------
// Booking validation and the "you are full here" check
// ---------------------------------------------------------------------------
function sklonujObjednavky(n) {
  if (n === 1) return "objednávku";
  if (n >= 2 && n <= 4) return "objednávky";
  return "objednávek";
}

// Everything the mechanic typed, validated once — shared by create and edit so
// the two cannot drift apart.
export async function pripravObjednavku(env, servisId, telo) {
  const nastaveni = await nactiNastaveni(env, servisId);
  const celyDen = telo.cely_den ? 1 : 0;
  // A car with no agreed hour is parked at opening time: it sorts to the top
  // of the day without pretending to hold a slot.
  const cas = celyDen
    ? minutyNaCas(nastaveni.otevreno_od)
    : (ocisti(telo.cas, 5) || "08:00");
  const datum = epochZDataCasu(ocisti(telo.den, 10), cas);
  if (!datum) return { chyba: "Zadejte prosím datum termínu." };

  let sadaId = Number(telo.sada_id) || null;
  let zakaznikId = Number(telo.zakaznik_id) || null;

  if (sadaId) {
    const sada = await env.DB.prepare(
      "SELECT id, zakaznik_id FROM sady WHERE uzivatel_id = ? AND id = ?"
    ).bind(servisId, sadaId).first();
    if (!sada) return { chyba: "Sada nebyla nalezena." };
    // The set already knows whose it is — never make the mechanic pick twice.
    zakaznikId = sada.zakaznik_id;
  } else if (zakaznikId) {
    const zakaznik = await env.DB.prepare(
      "SELECT id FROM zakaznici WHERE uzivatel_id = ? AND id = ?"
    ).bind(servisId, zakaznikId).first();
    if (!zakaznik) return { chyba: "Zákazník nebyl nalezen." };
  }

  const jmenoBez = ocisti(telo.jmeno_bez_zakaznika, 80);
  if (!zakaznikId && !jmenoBez) {
    return { chyba: "Vyberte zákazníka nebo napište jméno." };
  }

  return {
    datum,
    celyDen,
    sadaId,
    zakaznikId,
    jmenoBez: zakaznikId ? "" : jmenoBez,
    ukon: UKONY.includes(telo.ukon) ? telo.ukon : "prezuti",
    naDiscich: telo.na_discich === false ? 0 : 1,
    delka: Math.min(Math.max(cislo(telo.delka_min, 30), 5), 480),
    poznamka: ocisti(telo.poznamka, 300),
    nastaveni,
  };
}

// Returns a Czech sentence to confirm, or null. Deliberately a warning and
// not a refusal: the mechanic is the one who knows whether two cars really
// fit in the bay at once. An all-day car is excluded both ways — it is the
// job you slot into a gap, so counting it would make every slot look full.
export async function zkontrolujKolizi(env, servisId, v, vyjmoutId) {
  if (v.celyDen) return null;

  const kapacita = Math.max(1, cislo(v.nastaveni.soubezne_objednavky, 1));
  const konec = v.datum + v.delka * 60;
  const { n } = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM objednavky WHERE uzivatel_id = ? AND stav != 'zruseno' " +
    "AND cely_den = 0 AND id != ? AND datum < ? AND (datum + delka_min * 60) > ?"
  ).bind(servisId, vyjmoutId || 0, konec, v.datum).first();
  if (n >= kapacita) {
    return `V tomhle čase už máte ${n} ${sklonujObjednavky(n)} a najednou zvládáte `
      + `${kapacita}. Tady máte plno.`;
  }

  const zacatek = casNaMinuty(denACas(v.datum).cas);
  const konecMin = zacatek + v.delka;
  const n2 = v.nastaveni;
  if (zacatek < n2.otevreno_od || konecMin > n2.otevreno_do) {
    return `Termín je mimo otevírací dobu (${minutyNaCas(n2.otevreno_od)}–`
      + `${minutyNaCas(n2.otevreno_do)}).`;
  }
  if (n2.obed_do > n2.obed_od && zacatek < n2.obed_do && konecMin > n2.obed_od) {
    return `Termín zasahuje do pauzy na oběd (${minutyNaCas(n2.obed_od)}–`
      + `${minutyNaCas(n2.obed_do)}).`;
  }
  return null;
}

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
  // would drift the first time a builder adds a table. Tables declared in
  // the manifest under `agregaty` deliberately have no uzivatel_id — they
  // hold anonymous counters that belong to no account — and fall out here
  // on their own, which is exactly what the policy promises.
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

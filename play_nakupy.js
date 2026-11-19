// Google Play purchases: verify, acknowledge, extend the subscription.
//
// The app inside Google Play may sell its subscription only through Play
// Billing (Payments policy); the web keeps the invoice. Both end in the
// same predplatne.plati_do, the later date wins — so a customer who paid
// either way is paid up everywhere, and predplatne.js needs no change.
//
// Why on the server and why here:
//   - A purchase token from the page proves nothing until Google confirms
//     it (fraud), and an unacknowledged purchase is refunded by Google
//     after three days. Both need a Google key, which never reaches the
//     browser.
//   - The key is a SEPARATE service account (Play Console permission "Manage
//     orders and subscriptions"). It cannot publish or change an app — but
//     that permission also refunds and cancels (security audit 19. 11. 2026),
//     so a leaked product secret costs more than order visibility: grant it
//     per app, never account-wide (docs/Google_Play_Kroky.md, oddíl C).
//   - Lives outside functions/ (like spolecne.js), so it is template
//     infrastructure refreshed on every build: a fix here reaches every
//     product. The route (functions/api/play.js) stays a thin shell.
//
// Environment (set by the Vydani workflow and the deploy, never in code):
//   PLAY_NAKUPY_UCET  service account JSON (secret)
//   PLAY_BALICEK      the app's package, e.g. cz.simtegen.kusovnik

import { ted } from "./spolecne.js";

const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ROZSAH = "https://www.googleapis.com/auth/androidpublisher";

// States that carry access until expiryTime. CANCELED means "will not
// renew" — the paid period still runs (Subscriptions policy: cancellation
// takes effect at the end of the period).
const S_PRISTUPEM = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED",
]);
// Re-ask Google about a purchase when its period ends within this window,
// and not more often than every OBNOVA_ZA seconds.
const OBNOVA_PRED = 2 * 86400;
const OBNOVA_ZA = 6 * 3600;
// And about every live purchase at least this often (batch C, 14. 11. 2026):
// a refund or a revocation mid-period was only seen near the period's end,
// so a refunded customer kept the access — and the payment stayed counted —
// for up to a year. A week bounds it at one Google call per customer.
const KONTROLA_ZA = 7 * 86400;
// The grace period is access while Google retries a FAILED renewal
// (Subscriptions policy wants the access kept) — not money received, so it
// never writes a payment: the renewal that succeeds afterwards does.
const S_ZAPLACENO = new Set(["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_CANCELED"]);

export const PRODUKTY = { predplatne_mesic: 1, predplatne_rok: 12 };

export function dostupne(env) {
  return Boolean(env.PLAY_NAKUPY_UCET && env.PLAY_BALICEK);
}

function base64url(bajty) {
  let s = "";
  for (const b of bajty) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function zKlice(pem) {
  // PKCS#8 body between the armour lines; the armour itself is matched by
  // shape, so no key marker ever appears in the repository.
  const telo = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(telo);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

// One access token per isolate, renewed a minute before it runs out.
let pristup = { token: null, do: 0 };

export async function pristupovyToken(env, fetchFn = fetch) {
  const nyni = ted();
  if (pristup.token && pristup.do - 60 > nyni) return pristup.token;
  const ucet = JSON.parse(env.PLAY_NAKUPY_UCET);
  const kodovac = new TextEncoder();
  const hlava = base64url(kodovac.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const naroky = base64url(kodovac.encode(JSON.stringify({
    iss: ucet.client_email, scope: ROZSAH, aud: TOKEN_URL, iat: nyni, exp: nyni + 3600,
  })));
  const klic = await crypto.subtle.importKey(
    "pkcs8", zKlice(ucet.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const podpis = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", klic, kodovac.encode(`${hlava}.${naroky}`)));
  const odpoved = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${hlava}.${naroky}.${base64url(podpis)}`,
    }),
  });
  if (!odpoved.ok) throw new Error(`Google odmítl přihlášení (${odpoved.status})`);
  const data = await odpoved.json();
  pristup = { token: data.access_token, do: nyni + Number(data.expires_in || 3600) };
  return pristup.token;
}

// Why a subscription was cancelled, as Google recorded it (batch D2,
// 14. 11. 2026): the customer's answer to Play's own cancel survey, or a
// payment Google could not collect. Mapped onto the template's reasons
// (functions/api/odchod.js DUVODY); the free-text answer Google may carry is
// never read. null = not cancelled, or cancelled without a reason.
const PLAY_DUVODY = {
  CANCEL_SURVEY_REASON_COST_RELATED: "cena",
  CANCEL_SURVEY_REASON_NOT_ENOUGH_USAGE: "malo_pouziti",
  CANCEL_SURVEY_REASON_TECHNICAL_ISSUES: "chyba",
  CANCEL_SURVEY_REASON_FOUND_BETTER_APP: "jiny_nastroj",
  CANCEL_SURVEY_REASON_OTHERS: "jine",
};

export function duvodZruseni(kontext) {
  if (!kontext) return null;
  if (kontext.systemInitiatedCancellation) return { kanal: "play_platba", duvod: "platba" };
  const pruzkum = kontext.userInitiatedCancellation && kontext.userInitiatedCancellation.cancelSurveyResult;
  const duvod = pruzkum && PLAY_DUVODY[pruzkum.reason];
  return kontext.userInitiatedCancellation ? { kanal: "play", duvod: duvod || "neuvedeno" } : null;
}

// Google's word on one token: { platiDo, produkt, potvrdit, stav } or null
// when the token is not a live subscription of THIS app.
export async function overNakup(env, token, fetchFn = fetch) {
  const balicek = encodeURIComponent(env.PLAY_BALICEK);
  const odpoved = await fetchFn(
    `${API}/${balicek}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`,
    { headers: { Authorization: `Bearer ${await pristupovyToken(env, fetchFn)}` } });
  if (odpoved.status === 400 || odpoved.status === 404 || odpoved.status === 410) return null;
  if (!odpoved.ok) throw new Error(`Google neověřil nákup (${odpoved.status})`);
  const data = await odpoved.json();
  const polozka = (data.lineItems || []).find((p) => p.productId in PRODUKTY);
  if (!polozka) return null;
  const platiDo = Math.floor(Date.parse(polozka.expiryTime) / 1000) || 0;
  return {
    produkt: polozka.productId,
    stav: data.subscriptionState || "",
    zruseni: duvodZruseni(data.canceledStateContext),
    platiDo: S_PRISTUPEM.has(data.subscriptionState) ? platiDo : 0,
    potvrdit: data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING",
  };
}

async function potvrd(env, produkt, token, fetchFn) {
  const balicek = encodeURIComponent(env.PLAY_BALICEK);
  const odpoved = await fetchFn(
    `${API}/${balicek}/purchases/subscriptions/${encodeURIComponent(produkt)}` +
    `/tokens/${encodeURIComponent(token)}:acknowledge`,
    { method: "POST", headers: { Authorization: `Bearer ${await pristupovyToken(env, fetchFn)}`,
      "Content-Type": "application/json" }, body: "{}" });
  // 400 here is "already acknowledged" in practice — a retry after a lost
  // answer, not an error worth failing the purchase over.
  if (!odpoved.ok && odpoved.status !== 400) throw new Error(`Google nepřijal potvrzení (${odpoved.status})`);
}

// Claim and apply one token for the signed-in user. Returns
// { stav: "aktivni" | "neplatny" | "cizi", plati_do }.
export async function zapisNakup(env, uzivatelId, token, fetchFn = fetch) {
  // mimo-uzivatele: a purchase token belongs to whoever claimed it first; the
  // lookup by token is exactly what stops a second account from using it.
  const drivejsi = await env.DB.prepare(
    "SELECT uzivatel_id, plati_do, stav FROM play_nakupy WHERE token = ?").bind(token).first();
  if (drivejsi && drivejsi.uzivatel_id !== uzivatelId) return { stav: "cizi", plati_do: null };

  const nakup = await overNakup(env, token, fetchFn);
  if (!nakup || (drivejsi && nakup.platiDo <= ted() && (drivejsi.plati_do || 0) > ted())) {
    if (drivejsi) await odeber(env, uzivatelId, token, drivejsi, nakup);
    return { stav: "neplatny", plati_do: null };
  }
  // Acknowledge before granting: an unacknowledged purchase is refunded
  // after three days, and a customer must never keep access Google took back.
  if (nakup.potvrdit) await potvrd(env, nakup.produkt, token, fetchFn);

  const nyni = ted();
  const prikazy = [
    env.DB.prepare(
      "INSERT INTO play_nakupy (uzivatel_id, token, produkt, plati_do, stav, overeno) " +
      "VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(token) DO UPDATE SET plati_do = excluded.plati_do, " +
      "stav = excluded.stav, overeno = excluded.overeno WHERE play_nakupy.uzivatel_id = excluded.uzivatel_id"
    ).bind(uzivatelId, token, nakup.produkt, nakup.platiDo, nakup.stav, nyni),
  ];
  // Access and payment only for the account that OWNS the token after the
  // claim above — in the same transaction. The owner check at the top runs
  // before Google's answer (hundreds of milliseconds): one token sent from
  // N accounts at once passed it N times, the claim gave the row to one,
  // and the rest still got the subscription and a payment each (security
  // audit 19. 11. 2026). The ownership test is written out in both
  // statements, not interpolated: the product checker refuses ${…} in SQL.
  if (nakup.platiDo > nyni) {
    // The later date wins: a web invoice already paid ahead is never cut short.
    prikazy.push(env.DB.prepare(
      "INSERT INTO predplatne (uzivatel_id, plati_do, poznamka, zmeneno) SELECT ?, ?, 'Google Play', ? " +
      "WHERE EXISTS (SELECT 1 FROM play_nakupy WHERE token = ? AND uzivatel_id = ?) " +
      "ON CONFLICT(uzivatel_id) DO UPDATE SET plati_do = MAX(predplatne.plati_do, excluded.plati_do), " +
      "zmeneno = excluded.zmeneno WHERE predplatne.uzivatel_id = ?"
    ).bind(uzivatelId, nakup.platiDo, nyni, token, uzivatelId, uzivatelId));
    if (S_ZAPLACENO.has(nakup.stav) && (!drivejsi || nakup.platiDo > (drivejsi.plati_do || 0))) {
      // A new paid period is a payment: the monthly review counts second
      // purchases from this ledger, whichever way the money came.
      prikazy.push(env.DB.prepare(
        "INSERT INTO platby (uzivatel_id, mesice, poznamka) SELECT ?, ?, 'Google Play' " +
        "WHERE EXISTS (SELECT 1 FROM play_nakupy WHERE token = ? AND uzivatel_id = ?)"
      ).bind(uzivatelId, PRODUKTY[nakup.produkt] || 1, token, uzivatelId));
    }
  }
  await env.DB.batch(prikazy);
  const majitel = await env.DB.prepare("SELECT uzivatel_id FROM play_nakupy WHERE token = ?").bind(token).first();
  if (!majitel || majitel.uzivatel_id !== uzivatelId) return { stav: "cizi", plati_do: null };
  // A cancellation counts once — when this purchase first reads CANCELED
  // (the weekly recheck sees it again and again). A tally in odchody
  // (migration 0960), no account; before the migration it is just skipped.
  if (nakup.stav === "SUBSCRIPTION_STATE_CANCELED" && nakup.zruseni &&
      (!drivejsi || drivejsi.stav !== "SUBSCRIPTION_STATE_CANCELED")) {
    try {
      await env.DB.prepare(
        "INSERT INTO odchody (den, kanal, duvod, pocet) VALUES (?, ?, ?, 1) " +
        "ON CONFLICT(den, kanal, duvod) DO UPDATE SET pocet = pocet + 1"
      ).bind(new Date().toISOString().slice(0, 10), nakup.zruseni.kanal, nakup.zruseni.duvod).run();
    } catch {
      // No 0960 yet: the access above is what matters.
    }
  }
  return { stav: nakup.platiDo > nyni ? "aktivni" : "neplatny", plati_do: nakup.platiDo || null };
}

// Google took a purchase back before its period ended (a refund, a
// revocation, a chargeback): the access it gave ends now, and the payment it
// wrote is not money the firm keeps. Only the date THIS purchase put into
// predplatne is cut — a later date from a web invoice (or another purchase)
// stays; the remainder of an earlier, shorter web period is lost in that
// rare case (the table keeps one merged date) — the owner sees the refund in
// Play. A purchase that simply ran out (date already past) changes nothing.
async function odeber(env, uzivatelId, token, drivejsi, nakup) {
  const nyni = ted();
  const prikazy = [env.DB.prepare(
    "UPDATE play_nakupy SET stav = ?, plati_do = 0, overeno = ? WHERE token = ? AND uzivatel_id = ?"
  ).bind(nakup ? nakup.stav || "SUBSCRIPTION_STATE_EXPIRED" : "SUBSCRIPTION_STATE_EXPIRED", nyni, token,
    uzivatelId)];
  if ((drivejsi.plati_do || 0) > nyni) {
    prikazy.push(env.DB.prepare(
      "UPDATE predplatne SET plati_do = MAX(?, COALESCE((SELECT MAX(plati_do) FROM play_nakupy " +
      "WHERE uzivatel_id = ? AND token != ? AND plati_do > ?), 0)), zmeneno = ? " +
      "WHERE uzivatel_id = ? AND plati_do = ?"
    ).bind(nyni, uzivatelId, token, nyni, nyni, uzivatelId, drivejsi.plati_do));
    prikazy.push(env.DB.prepare(
      "DELETE FROM platby WHERE id = (SELECT MAX(id) FROM platby WHERE uzivatel_id = ? AND poznamka = 'Google Play')"
    ).bind(uzivatelId));
  }
  await env.DB.batch(prikazy);
}

// Renewals: Google renews on its own, the product learns it by asking.
// Only purchases whose period is about to end, and each at most every
// OBNOVA_ZA — so a page load costs nothing most of the time.
export async function obnovNakupy(env, uzivatelId, fetchFn = fetch) {
  const nyni = ted();
  const radky = await env.DB.prepare(
    "SELECT token FROM play_nakupy WHERE uzivatel_id = ? AND stav != 'SUBSCRIPTION_STATE_EXPIRED' AND " +
    "((plati_do < ? AND overeno < ?) OR (plati_do > ? AND overeno < ?))"
  ).bind(uzivatelId, nyni + OBNOVA_PRED, nyni - OBNOVA_ZA, nyni, nyni - KONTROLA_ZA).all();
  let obnoveno = 0;
  for (const { token } of radky.results || []) {
    const vysledek = await zapisNakup(env, uzivatelId, token, fetchFn);
    if (vysledek.stav === "aktivni") obnoveno += 1;
  }
  return obnoveno;
}

// Asking for a rating in Google Play (backlog bod 17). Who: a customer
// who paid a SECOND time (or a yearly subscriber 30 days in) — someone who
// chose to stay, not someone still deciding; the app does not track active
// days, and adding that would be new personal data for one banner. Never
// gated on "do you like it?" first, never with a reward: Google's ratings
// policy forbids both, and a stopped app costs more than a missed star.
//
// How often: the upominky ledger (0920, "once per account" by its primary
// key) holds the answer. "Ohodnotit" closes it for good; "Teď ne" waits
// for the next payment, at most RECENZE_ODLOZENI times — after that the
// customer said no often enough. The policy names this (stavitel adds the
// sentence to the upominky entity of every product with this module).
export const RECENZE_HOTOVO = "recenze_play";
export const RECENZE_POZDEJI = "recenze_pozdeji_";
const RECENZE_ODLOZENI = 2;
const RECENZE_ROCNI_PO = 30 * 86400;

async function stavRecenze(env, uzivatelId) {
  return env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM platby WHERE uzivatel_id = ?1) AS platby, " +
    "(SELECT COUNT(*) FROM platby WHERE uzivatel_id = ?1 AND mesice >= 12 AND zapsano <= ?2) AS rocni, " +
    "(SELECT COUNT(*) FROM upominky WHERE uzivatel_id = ?1 AND druh = ?3) AS hotovo, " +
    "(SELECT COUNT(*) FROM upominky WHERE uzivatel_id = ?1 AND druh LIKE ?4) AS odlozeno"
  ).bind(uzivatelId, ted() - RECENZE_ROCNI_PO, RECENZE_HOTOVO, RECENZE_POZDEJI + "%").first();
}

// True when the app should ask now. A product from before the 0920
// migration has no upominky table: the query fails and the answer is no.
export async function zadostORecenzi(env, uzivatelId) {
  try {
    const s = await stavRecenze(env, uzivatelId);
    if (!s || s.hotovo || s.odlozeno >= RECENZE_ODLOZENI) return false;
    if (!(s.platby >= 2 || s.rocni >= 1)) return false;
    // "Teď ne" at this payment count already: wait for the next one.
    const odlozenoTed = await env.DB.prepare("SELECT 1 AS x FROM upominky WHERE uzivatel_id = ? AND druh = ?")
      .bind(uzivatelId, RECENZE_POZDEJI + s.platby).first();
    return !odlozenoTed;
  } catch {
    return false;
  }
}

// odpoved: "hotovo" (went to Google Play) or "pozdeji". INSERT OR IGNORE:
// a double tap or a second device writes nothing new.
export async function zapisRecenzi(env, uzivatelId, odpoved) {
  let druh = RECENZE_HOTOVO;
  if (odpoved === "pozdeji") {
    const s = await stavRecenze(env, uzivatelId);
    druh = RECENZE_POZDEJI + ((s && s.platby) || 0);
  }
  await env.DB.prepare("INSERT OR IGNORE INTO upominky (uzivatel_id, druh) VALUES (?, ?)")
    .bind(uzivatelId, druh).run();
  return druh;
}

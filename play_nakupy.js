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
//   - The key is a SEPARATE service account that can only see and
//     acknowledge orders (Play Console permission "Manage orders and
//     subscriptions"). It cannot publish or change an app; a leaked product
//     secret costs order visibility, not the store.
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
    "SELECT uzivatel_id, plati_do FROM play_nakupy WHERE token = ?").bind(token).first();
  if (drivejsi && drivejsi.uzivatel_id !== uzivatelId) return { stav: "cizi", plati_do: null };

  const nakup = await overNakup(env, token, fetchFn);
  if (!nakup) {
    if (drivejsi) {
      // Google forgot the token (long expired, refunded): stop asking.
      await env.DB.prepare(
        "UPDATE play_nakupy SET stav = 'SUBSCRIPTION_STATE_EXPIRED', overeno = ? " +
        "WHERE token = ? AND uzivatel_id = ?").bind(ted(), token, uzivatelId).run();
    }
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
  if (nakup.platiDo > nyni) {
    // The later date wins: a web invoice already paid ahead is never cut short.
    prikazy.push(env.DB.prepare(
      "INSERT INTO predplatne (uzivatel_id, plati_do, poznamka, zmeneno) VALUES (?, ?, 'Google Play', ?) " +
      "ON CONFLICT(uzivatel_id) DO UPDATE SET plati_do = MAX(predplatne.plati_do, excluded.plati_do), " +
      "zmeneno = excluded.zmeneno WHERE predplatne.uzivatel_id = ?"
    ).bind(uzivatelId, nakup.platiDo, nyni, uzivatelId));
    if (!drivejsi || nakup.platiDo > (drivejsi.plati_do || 0)) {
      // A new paid period is a payment: the monthly review counts second
      // purchases from this ledger, whichever way the money came.
      prikazy.push(env.DB.prepare(
        "INSERT INTO platby (uzivatel_id, mesice, poznamka) VALUES (?, ?, 'Google Play')"
      ).bind(uzivatelId, PRODUKTY[nakup.produkt] || 1));
    }
  }
  await env.DB.batch(prikazy);
  return { stav: nakup.platiDo > nyni ? "aktivni" : "neplatny", plati_do: nakup.platiDo || null };
}

// Renewals: Google renews on its own, the product learns it by asking.
// Only purchases whose period is about to end, and each at most every
// OBNOVA_ZA — so a page load costs nothing most of the time.
export async function obnovNakupy(env, uzivatelId, fetchFn = fetch) {
  const nyni = ted();
  const radky = await env.DB.prepare(
    "SELECT token FROM play_nakupy WHERE uzivatel_id = ? AND plati_do < ? AND overeno < ? " +
    "AND stav != 'SUBSCRIPTION_STATE_EXPIRED'"
  ).bind(uzivatelId, nyni + OBNOVA_PRED, nyni - OBNOVA_ZA).all();
  let obnoveno = 0;
  for (const { token } of radky.results || []) {
    const vysledek = await zapisNakup(env, uzivatelId, token, fetchFn);
    if (vysledek.stav === "aktivni") obnoveno += 1;
  }
  return obnoveno;
}

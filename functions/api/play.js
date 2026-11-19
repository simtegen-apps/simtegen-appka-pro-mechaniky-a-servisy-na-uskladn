// /api/play — subscription bought in the Google Play app.
// Thin route over play_nakupy.js (template infrastructure, refreshed on
// every build); keep the logic there so a fix reaches every product.
//
//   GET [?aplikace=play] → { v_aplikaci, dostupne, ukazka, balicek, produkty,
//                            objednavka, nakup, recenze }
//                          nakup: the account already has a live or pending
//                          Play purchase — the app offers no second one
//   POST {token}         → verify, acknowledge, extend predplatne (after a
//                          purchase, and for every purchase listPurchases()
//                          still reports)
//   POST {obnov: true}   → re-ask Google about purchases about to run out,
//                          and (at most every 6 h for the whole app) about
//                          refunds and chargebacks (kontrolaVracenych)
//   POST {recenze: "hotovo"|"pozdeji"} → the answer to the rating request
//                          (play_nakupy.zadostORecenzi); needs no Google key
//
// v_aplikaci: the page inside the Google Play app must never show the
// invoice order (Payments policy). The app is recognisable only at launch
// (web/play.js), so the first sign is remembered in a technical cookie
// "aplikace" and every later page asks here. Answered also to a stranger
// (with 401): the login screen needs it as much as the account.

import { ctiCookie, json } from "../../spolecne.js";
import {
  dostupne, kontrolaVracenych, maNakup, obnovNakupy, zapisNakup, zadostORecenzi, zapisRecenzi, PRODUKTY,
} from "../../play_nakupy.js";

const COOKIE = "aplikace";
const ROK = 365 * 24 * 3600;

// Demo accounts (Vyzkoušet ukázku) are wiped after 24 hours — a purchase
// tied to one would vanish with it.
function jeUkazka(uzivatel) {
  return uzivatel.email.endsWith("@ukazka.invalid");
}

// An invoice order still open (ordered, or invoiced and unpaid): the app
// must not sell the same subscription again — paid by both, the customer
// paid twice (audit before Play production, 18. 11. 2026). The other
// direction is the API middleware's (no invoice while Play renews).
async function objednavkaOtevrena(env, uzivatelId) {
  try {
    const radek = await env.DB.prepare(
      "SELECT 1 AS x FROM objednavky WHERE uzivatel_id = ? AND stav IN ('nova', 'fakturovana') LIMIT 1"
    ).bind(uzivatelId).first();
    return Boolean(radek);
  } catch {
    return false;
  }
}

export async function onRequestGet(context) {
  const { env, data, request } = context;
  const zAplikace = new URL(request.url).searchParams.get("aplikace") === "play";
  const vAplikaci = zAplikace || ctiCookie(request, COOKIE) === "play";
  const hlavicky = zAplikace
    ? { "Set-Cookie": `${COOKIE}=play; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${ROK}` }
    : {};
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni.", v_aplikaci: vAplikaci }, 401, hlavicky);
  const ukazka = jeUkazka(data.uzivatel);
  return json({
    v_aplikaci: vAplikaci,
    dostupne: dostupne(env) && !ukazka,
    ukazka,
    balicek: env.PLAY_BALICEK || null,
    produkty: Object.keys(PRODUKTY),
    objednavka: !ukazka && await objednavkaOtevrena(env, data.uzivatel.id),
    nakup: !ukazka && await maNakup(env, data.uzivatel.id),
    // Only in the app (a rating needs the app installed from Google Play)
    // and never for the demo — Google's reviewer must not be asked to rate.
    recenze: vAplikaci && !ukazka && Boolean(env.PLAY_BALICEK)
      && await zadostORecenzi(env, data.uzivatel.id),
  }, 200, hlavicky);
}

export async function onRequestPost(context) {
  const { env, data, request } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  if (jeUkazka(data.uzivatel)) return json({ chyba: "V ukázce se nic nekupuje." }, 403);
  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Neplatný požadavek." }, 400);
  }
  if (telo && (telo.recenze === "hotovo" || telo.recenze === "pozdeji")) {
    await zapisRecenzi(env, data.uzivatel.id, telo.recenze);
    return json({ ok: true });
  }
  if (!dostupne(env)) return json({ chyba: "Nákupy přes Google Play tu zatím nejdou ověřit." }, 503);
  try {
    if (telo && telo.obnov === true) {
      const obnoveno = await obnovNakupy(env, data.uzivatel.id);
      // Refunds of ANY customer, not this one's: the call that every page
      // load already makes is the only clock a Pages product has. Its
      // failure is not this customer's problem — the next load retries.
      try {
        await kontrolaVracenych(env);
      } catch {
        // retried on the next page load (the slot was given back)
      }
      return json({ obnoveno });
    }
    const token = typeof telo?.token === "string" ? telo.token.trim() : "";
    if (!token || token.length > 1000) return json({ chyba: "Chybí doklad o nákupu." }, 400);
    const vysledek = await zapisNakup(env, data.uzivatel.id, token);
    if (vysledek.stav === "cizi") {
      return json({ chyba: "Tenhle nákup patří k jinému účtu." }, 409);
    }
    if (vysledek.stav !== "aktivni") {
      return json({ chyba: "Google tenhle nákup nepotvrdil." }, 402);
    }
    return json(vysledek);
  } catch (e) {
    // Google unreachable or refusing: the purchase is safe — Play keeps it
    // and the app re-sends it from listPurchases() on the next start.
    // detail: our own short reason ("Google neověřil nákup (403)"), shown
    // as a code under the sentence — without it the first test purchase
    // (19. 11. 2026) could not tell a missing permission from a bad key.
    // Never the key or Google's body: only the sentences play_nakupy.js
    // writes ("Google …"); anything else by its type alone — a JSON.parse
    // error quotes the text it failed on, and that text is the key.
    // 503, not 502: Cloudflare swaps an origin's 502 (and 504) for its own
    // error page, so this JSON never reached the app — the second test
    // purchase showed "HTTP 502" with no sentence and no code (19. 11. 2026).
    const zprava = String((e && e.message) || "");
    const detail = /^Google [^\n]{0,120}$/.test(zprava) ? zprava : String((e && e.name) || "Error");
    return json({ chyba: "Nákup se teď nepodařilo ověřit, zkusíme to znovu při příštím otevření.",
      kod: "google", detail }, 503);
  }
}

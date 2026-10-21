// /api/play — subscription bought in the Google Play app.
// Thin route over play_nakupy.js (template infrastructure, refreshed on
// every build); keep the logic there so a fix reaches every product.
//
//   GET [?aplikace=play] → { v_aplikaci, dostupne, ukazka, balicek, produkty }
//   POST {token}         → verify, acknowledge, extend predplatne (after a
//                          purchase, and for every purchase listPurchases()
//                          still reports)
//   POST {obnov: true}   → re-ask Google about purchases about to run out
//
// v_aplikaci: the page inside the Google Play app must never show the
// invoice order (Payments policy). The app is recognisable only at launch
// (web/play.js), so the first sign is remembered in a technical cookie
// "aplikace" and every later page asks here. Answered also to a stranger
// (with 401): the login screen needs it as much as the account.

import { ctiCookie, json } from "../../spolecne.js";
import { dostupne, obnovNakupy, zapisNakup, PRODUKTY } from "../../play_nakupy.js";

const COOKIE = "aplikace";
const ROK = 365 * 24 * 3600;

// Demo accounts (Vyzkoušet ukázku) are wiped after 24 hours — a purchase
// tied to one would vanish with it.
function jeUkazka(uzivatel) {
  return uzivatel.email.endsWith("@ukazka.invalid");
}

export async function onRequestGet(context) {
  const { env, data, request } = context;
  const zAplikace = new URL(request.url).searchParams.get("aplikace") === "play";
  const vAplikaci = zAplikace || ctiCookie(request, COOKIE) === "play";
  const hlavicky = zAplikace
    ? { "Set-Cookie": `${COOKIE}=play; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${ROK}` }
    : {};
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni.", v_aplikaci: vAplikaci }, 401, hlavicky);
  return json({
    v_aplikaci: vAplikaci,
    dostupne: dostupne(env) && !jeUkazka(data.uzivatel),
    ukazka: jeUkazka(data.uzivatel),
    balicek: env.PLAY_BALICEK || null,
    produkty: Object.keys(PRODUKTY),
  }, 200, hlavicky);
}

export async function onRequestPost(context) {
  const { env, data, request } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  if (jeUkazka(data.uzivatel)) return json({ chyba: "V ukázce se nic nekupuje." }, 403);
  if (!dostupne(env)) return json({ chyba: "Nákupy přes Google Play tu zatím nejdou ověřit." }, 503);
  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Neplatný požadavek." }, 400);
  }
  try {
    if (telo && telo.obnov === true) {
      const obnoveno = await obnovNakupy(env, data.uzivatel.id);
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
  } catch {
    // Google unreachable or refusing: the purchase is safe — Play keeps it
    // and the app re-sends it from listPurchases() on the next start.
    return json({ chyba: "Nákup se teď nepodařilo ověřit, zkusíme to znovu při příštím otevření." }, 502);
  }
}

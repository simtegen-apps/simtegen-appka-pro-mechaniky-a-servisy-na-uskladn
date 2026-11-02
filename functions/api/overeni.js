// GET /api/overeni?token=... — the link from the email. Verifies the token,
// creates the account on first login, opens a session, redirects home.
//
// Two steps, not one. Opened alone, the link only shows "Přihlásit se jako
// x@y?" and a button; the session opens on the second request, which that
// page makes. Before, the GET itself logged in and replaced whatever session
// the browser had: an attacker could ask for a link to their OWN address and
// slip it to a mechanic of another shop (a link, an image on a page, a QR
// code) — the mechanic was quietly signed in to the attacker's account and
// the motorists' names they typed went there. Now the page names the
// account, and the second step only counts with a one-time code that the
// page put into a SameSite=Strict cookie: a request from anywhere else does
// not carry it. Mail scanners that open links no longer spend them, too.
//
// Still GET in both steps: the template's attribution middleware
// (functions/api/_middleware.js, not ours to edit) labels a NEW account on
// "GET /api/overeni → 303". Development deployments (no e-mail sending, the
// link comes back in the API response, "not a real login boundary") keep the
// single step — the acceptance tests sign in exactly that way.

import {
  ctiCookie, cookieHlavicka, novyToken, otisk, ted, uklid, RELACE_TRVANI,
} from "../../spolecne.js";

const POTVRZENI_COOKIE = "potvrzeni_prihlaseni";
const POTVRZENI_TRVANI = 600;

function html(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function potvrzovaciStranka(email, token, kod) {
  const telo = `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="application-name" content="Pneusklad">
  <meta name="robots" content="noindex">
  <title>Přihlášení — Pneusklad</title>
  <link rel="stylesheet" href="/styl.css">
  <link rel="stylesheet" href="/produkt.css">
</head>
<body>
  <main class="obsah">
    <h1>Přihlásit se jako ${html(email)}?</h1>
    <p>Odkaz z e-mailu vás přihlásí k účtu s touto adresou. Pokud to není vaše
    adresa, nepokračujte — odkaz vám mohl poslat někdo jiný, aby se k němu
    dostala data, která zapíšete.</p>
    <form method="get" action="/api/overeni">
      <input type="hidden" name="token" value="${html(token)}">
      <input type="hidden" name="potvrzeni" value="${html(kod)}">
      <button class="tlacitko" type="submit">Přihlásit se</button>
    </form>
    <p><a href="/">Zpět na úvod bez přihlášení</a></p>
  </main>
</body>
</html>`;
  return new Response(telo, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; "
        + "form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      "X-Frame-Options": "DENY",
      "Set-Cookie": `${POTVRZENI_COOKIE}=${kod}; HttpOnly; Secure; SameSite=Strict; `
        + `Path=/api/overeni; Max-Age=${POTVRZENI_TRVANI}`,
    },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const domu = new URL("/", request.url).toString();

  const chybova = () => new Response(
    "Přihlašovací odkaz je neplatný nebo vypršel. Nechte si prosím poslat nový.",
    { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );

  if (!/^[0-9a-f]{64}$/.test(token)) return chybova();

  const digest = await otisk(token);
  const odkaz = await env.DB.prepare(
    "SELECT id, email FROM prihlasovaci_odkazy " +
    "WHERE otisk_tokenu = ? AND pouzito = 0 AND expirace > ?"
  ).bind(digest, ted()).first();
  if (!odkaz) return chybova();

  // Real e-mail sending = a real login boundary: the person confirms which
  // account they are entering, from a page only this site can produce.
  const ostre = !!(env.RESEND_API_KEY && env.EMAIL_ODESILATEL);
  if (ostre) {
    const kod = url.searchParams.get("potvrzeni") || "";
    const ulozeny = ctiCookie(request, POTVRZENI_COOKIE) || "";
    if (!/^[0-9a-f]{64}$/.test(kod) || kod !== ulozeny) {
      return potvrzovaciStranka(odkaz.email, token, novyToken());
    }
  }

  // Single-use before anything else: a replayed link must find it spent.
  await env.DB.prepare(
    "UPDATE prihlasovaci_odkazy SET pouzito = 1 WHERE id = ?"
  ).bind(odkaz.id).run();

  await env.DB.prepare(
    "INSERT INTO uzivatele (email) VALUES (?) ON CONFLICT(email) DO NOTHING"
  ).bind(odkaz.email).run();
  const uzivatel = await env.DB.prepare(
    "SELECT id FROM uzivatele WHERE email = ?"
  ).bind(odkaz.email).first();

  const relaceToken = novyToken();
  await env.DB.prepare(
    "INSERT INTO relace (otisk_tokenu, uzivatel_id, expirace) VALUES (?, ?, ?)"
  ).bind(await otisk(relaceToken), uzivatel.id, ted() + RELACE_TRVANI).run();

  // Login is the housekeeping moment: cheap, and guarantees the retention
  // promises in the policy without needing any scheduler.
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM prihlasovaci_odkazy WHERE expirace < ? OR pouzito = 1"
    ).bind(ted() - 23 * 3600),
    env.DB.prepare("DELETE FROM relace WHERE expirace < ?").bind(ted()),
  ]);
  // App-table retention rides along for the same reason.
  await uklid(env, uzivatel.id);

  const hlavicky = new Headers({ Location: domu });
  hlavicky.append("Set-Cookie", cookieHlavicka(relaceToken, RELACE_TRVANI));
  hlavicky.append("Set-Cookie",
    `${POTVRZENI_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api/overeni; Max-Age=0`);
  return new Response(null, { status: 303, headers: hlavicky });
}

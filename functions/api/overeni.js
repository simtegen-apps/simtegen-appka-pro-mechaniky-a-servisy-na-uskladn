// GET  /api/overeni?token=... — the link from the email. Only shows
//                               "Přihlásit se jako x@y?" and a button.
// POST /api/overeni {token}   — the button: verifies the token, creates the
//                               account on first login, opens a session,
//                               redirects home.
//
// Two steps, and the login is never a GET. Before, the GET itself logged in
// and replaced whatever session the browser had: an attacker could ask for a
// link to their OWN address and slip it to a mechanic of another shop (a
// link, an image on a page, a QR code) — the mechanic was quietly signed in
// to the attacker's account and the motorists' names they typed went there.
// Mail scanners and link previews also open links with GET and spent them
// before the customer clicked. Now the page names the account, and only its
// POST logs in: a form on a foreign page sends a foreign Origin, which this
// handler (where e-mail really goes out) and the template's middleware refuse.
//
// The POST takes the form's urlencoded body or JSON {token} (the acceptance
// tests post JSON). The template's middleware (functions/api/_middleware.js)
// reads the token before us for attribution and treats a handler WITHOUT
// onRequestPost as "logs in on GET" — then it answers GET itself and forwards
// the POST as a GET that Pages never routes to onRequestGet. Hence both
// handlers live here.

import {
  novyToken, otisk, ted, uklid, zeStejneStranky, cookieHlavicka, RELACE_TRVANI,
} from "../../spolecne.js";

const TOKEN = /^[0-9a-f]{64}$/;

function html(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function chybova() {
  return new Response(
    "Přihlašovací odkaz je neplatný nebo vypršel. Nechte si prosím poslat nový.",
    { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}

async function platnyOdkaz(env, token) {
  if (!TOKEN.test(token)) return null;
  return env.DB.prepare(
    "SELECT id, email FROM prihlasovaci_odkazy " +
    "WHERE otisk_tokenu = ? AND pouzito = 0 AND expirace > ?"
  ).bind(await otisk(token), ted()).first();
}

const HLAVICKY_STRANKY = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  // same-origin, not no-referrer: with no-referrer the browser sends
  // "Origin: null" on the form's POST and the origin check refuses our
  // own button.
  "Referrer-Policy": "same-origin",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; "
    + "form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "X-Frame-Options": "DENY",
};

// The link from the e-mail opened again after it was used (or after it
// expired): a page with the way back, 410 Gone — the single-use link is
// spent, nobody is refused anything. Not 403 plain text: the customer
// tapping an old e-mail deserves a page, and the check after a migration
// (uat_kontrola) re-opens every page an old account could read, this
// confirmation page included, and reads 401/403 as "the migration signed
// customers out". The button's POST still refuses a bad token with 403.
function neplatnyOdkazStranka() {
  const telo = `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="application-name" content="Pneusklad">
  <meta name="robots" content="noindex">
  <title>Odkaz už neplatí — Pneusklad</title>
  <link rel="stylesheet" href="/styl.css">
  <link rel="stylesheet" href="/produkt.css">
</head>
<body>
  <main class="obsah">
    <h1>Odkaz už neplatí</h1>
    <p>Přihlašovací odkaz je použitý nebo vypršel. Nechte si poslat nový.</p>
    <p><a class="tlacitko" href="/">Zpět na úvod</a></p>
  </main>
</body>
</html>`;
  return new Response(telo, { status: 410, headers: HLAVICKY_STRANKY });
}

function potvrzovaciStranka(email, token) {
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
    <form method="post" action="/api/overeni">
      <input type="hidden" name="token" value="${html(token)}">
      <button class="tlacitko" type="submit">Přihlásit se</button>
    </form>
    <p><a href="/">Zpět na úvod bez přihlášení</a></p>
  </main>
</body>
</html>`;
  return new Response(telo, { status: 200, headers: HLAVICKY_STRANKY });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const token = new URL(request.url).searchParams.get("token") || "";
  const odkaz = await platnyOdkaz(env, token);
  if (!odkaz) return neplatnyOdkazStranka();
  return potvrzovaciStranka(odkaz.email, token);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Real e-mail sending = a real login boundary: only our own page may press
  // the button. A development deployment (no mail, the link comes back in
  // the API response) is posted to by scripts without an Origin.
  if (env.RESEND_API_KEY && env.EMAIL_ODESILATEL && !zeStejneStranky(request)) {
    return chybova();
  }

  let token = "";
  const typ = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  try {
    if (typ === "application/json") {
      token = String(((await request.json()) || {}).token || "");
    } else {
      token = String((await request.formData()).get("token") || "");
    }
  } catch {
    return chybova();
  }

  const odkaz = await platnyOdkaz(env, token);
  if (!odkaz) return chybova();

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

  const hlavicky = new Headers({ Location: new URL("/", request.url).toString() });
  hlavicky.append("Set-Cookie", cookieHlavicka(relaceToken, RELACE_TRVANI, request, env));
  return new Response(null, { status: 303, headers: hlavicky });
}

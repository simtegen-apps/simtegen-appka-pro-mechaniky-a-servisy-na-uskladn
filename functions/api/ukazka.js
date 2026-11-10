// POST /api/ukazka — "Vyzkoušet ukázku": a throwaway account with the
// product's demo data, for anyone who wants to look before signing up —
// and for Google's reviewer, who cannot finish a login by e-mail link.
// Template infrastructure (NEUPRAVOVAT V PRODUKTU), public endpoint.
//
// Each visitor gets an account of their own, so nobody sees what another
// typed in; it lives 24 hours and is deleted the same way as a customer
// deleting theirs (every table with uzivatel_id). No e-mail, no name: the
// address is a random label on the reserved .invalid domain, which also
// makes a login link to it impossible. The demo data is the product's own
// play/ukazka.json (published as /ukazka.json by vykresli_aplikaci.py) —
// the same data the store screenshots show; the page replays it.
//
// Without /ukazka.json the endpoint answers 404: only products in Google
// Play have a demo, and only they need one.

import {
  cookieHlavicka, json, novyToken, otisk, tabulkySUzivatelem, ted,
} from "../../spolecne.js";
import { adresaKlienta, vLimitu } from "../../ochrana.js";

const DOMENA = "@ukazka.invalid";
const TRVANI = 24 * 3600;
// Per network address and per product an hour, counted in D1 as a digest
// (ochrana.js, never the address): enough for real visitors, a wall for a
// script filling the database. The old per-data-centre cache counter was
// dodged by spreading over the network and let everything through when
// the cache failed; this one refuses instead.
const LIMIT_IP = 5;
const LIMIT_CELKEM = 60;

async function uklid(env) {
  // A few expired demos per new one: housekeeping without a scheduler, and
  // never a long request.
  // mimo-uzivatele: picks expired demo accounts by their reserved domain, across accounts by design.
  const stare = await env.DB.prepare(
    "SELECT id FROM uzivatele WHERE email LIKE ? AND vytvoreno < ? LIMIT 10"
  ).bind(`%${DOMENA}`, ted() - TRVANI).all();
  const ids = (stare.results || []).map((r) => r.id);
  if (!ids.length) return;
  const tabulky = await tabulkySUzivatelem(env);
  const prikazy = [];
  for (const id of ids) {
    for (const nazev of tabulky) {
      prikazy.push(env.DB.prepare(`DELETE FROM "${nazev}" WHERE uzivatel_id = ?`).bind(id));
    }
    prikazy.push(env.DB.prepare("DELETE FROM uzivatele WHERE id = ?").bind(id));
  }
  await env.DB.batch(prikazy);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let ukazka;
  try {
    const odpoved = await env.ASSETS.fetch(new URL("/ukazka.json", request.url));
    ukazka = odpoved.ok ? await odpoved.json() : null;
  } catch {
    ukazka = null;
  }
  if (!ukazka || !Array.isArray(ukazka.kroky)) return json({ chyba: "Ukázka tu není." }, 404);
  if (!(await vLimitu(env, "ukazka_ip", adresaKlienta(request, env), LIMIT_IP, 3600))
      || !(await vLimitu(env, "ukazka", "vse", LIMIT_CELKEM, 3600))) {
    return json({ chyba: "Ukázek je teď moc, zkus to za chvíli." }, 429);
  }

  await uklid(env);
  const email = `ukazka-${novyToken().slice(0, 16)}${DOMENA}`;
  const uzivatel = await env.DB.prepare(
    "INSERT INTO uzivatele (email) VALUES (?) RETURNING id").bind(email).first();
  const relace = novyToken();
  await env.DB.prepare(
    "INSERT INTO relace (otisk_tokenu, uzivatel_id, expirace) VALUES (?, ?, ?)"
  ).bind(await otisk(relace), uzivatel.id, ted() + TRVANI).run();
  try {
    // The paid features are what the reviewer and the visitor came to see.
    // Only in products with the subscription module (no table otherwise).
    await env.DB.prepare(
      "INSERT INTO predplatne (uzivatel_id, plati_do, poznamka) VALUES (?, ?, 'ukázka')"
    ).bind(uzivatel.id, ted() + TRVANI).run();
  } catch {
    // no predplatne table: nothing is paid in this product
  }
  return json({ kroky: ukazka.kroky }, 200, { "Set-Cookie": cookieHlavicka(relace, TRVANI, request, env) });
}

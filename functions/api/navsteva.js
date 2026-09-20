// POST /api/navsteva {stranka, zdroj} — one anonymous tally mark.
//
// Counts only. No cookie, no IP, no user agent, no account: the row is
// (day, page, source, count), so the review can see how many people reached
// the landing screen versus how many asked for a login link — and the
// privacy policy stays true, because this is not tracking, it is a tally.
// Unauthenticated on purpose: the visitors that matter here are the ones
// without an account yet. Signed-in reloads are skipped, otherwise the shop
// that opens the app twenty times a day would drown the number it is
// supposed to measure.
//
// Bots inflate it; a product with real customers does not decide on this
// number alone. If it ever gets abused, that belongs in a Cloudflare rate
// limit, not in this file.

import { json, denACas, ted, DEN, ocisti } from "../../spolecne.js";

// Closed list, so a typo or a bored visitor cannot invent new rows.
const STRANKY = new Set(["uvod", "uvod-odeslano"]);
// Matches the manifest: aggregates are kept for 24 months, then dropped.
const RETENCE = 730 * DEN;

export async function onRequestPost(context) {
  const { env, data } = context;

  // Logged in? Nothing to count — this measures strangers.
  if (data.uzivatel) return json({ stav: "ok" });

  let telo;
  try {
    telo = await context.request.json();
  } catch {
    return json({ chyba: "Neplatný požadavek." }, 400);
  }

  const stranka = ocisti(telo && telo.stranka, 32);
  if (!STRANKY.has(stranka)) return json({ chyba: "Neznámá stránka." }, 400);

  // The tag from ?z= in a shared link. Lower case, letters/digits/dashes,
  // short: it is a label for the owner ("fb", "vizitka"), not free text,
  // and a bounded alphabet keeps the table from growing a row per visitor.
  const zdroj = ocisti(telo && telo.zdroj, 16).toLowerCase()
    .replace(/[^a-z0-9-]/g, "").slice(0, 16);

  const den = denACas(ted()).den;
  const mez = denACas(ted() - RETENCE).den;
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO navstevy (den, stranka, zdroj, pocet) VALUES (?, ?, ?, 1) " +
      "ON CONFLICT(den, stranka, zdroj) DO UPDATE SET pocet = pocet + 1"
    ).bind(den, stranka, zdroj),
    // No scheduler in Pages Functions, so retention rides along with the
    // write. The table holds a handful of rows per day; this is cheap.
    env.DB.prepare("DELETE FROM navstevy WHERE den < ?").bind(mez),
  ]);

  return json({ stav: "ok" });
}

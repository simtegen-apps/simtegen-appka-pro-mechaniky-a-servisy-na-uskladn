// GET /api/napovedy — what this shop has typed before.
//
// Feeds the datalists in the new-set wizard: tyre brands it has already
// written and shelf positions it already uses. A shop numbers its rack its own
// way ("A1-04", "regál 3 dole"), so guessing a scheme would be wrong — the
// only useful suggestion is what they used last time. Most recent first,
// because a shop filling a rack works through it in order.

import { json } from "../../spolecne.js";

export async function onRequestGet(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  const znacky = await env.DB.prepare(
    "SELECT dezen, MAX(id) AS posledni FROM sady " +
    "WHERE uzivatel_id = ? AND dezen != '' GROUP BY dezen " +
    "ORDER BY posledni DESC LIMIT 40"
  ).bind(data.servis.id).all();

  const pozice = await env.DB.prepare(
    "SELECT pozice, MAX(id) AS posledni FROM sady " +
    "WHERE uzivatel_id = ? AND pozice != '' GROUP BY pozice " +
    "ORDER BY posledni DESC LIMIT 60"
  ).bind(data.servis.id).all();

  const rozmery = await env.DB.prepare(
    "SELECT rozmer, MAX(id) AS posledni FROM sady " +
    "WHERE uzivatel_id = ? AND rozmer != '' GROUP BY rozmer " +
    "ORDER BY posledni DESC LIMIT 40"
  ).bind(data.servis.id).all();

  return json({
    znacky: znacky.results.map((r) => r.dezen),
    pozice: pozice.results.map((r) => r.pozice),
    rozmery: rozmery.results.map((r) => r.rozmer),
  });
}

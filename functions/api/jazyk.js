// GET  /api/jazyk — the language this person chose for the app ("cs", "en"
//                   or null when they never chose).
// POST /api/jazyk {jazyk} — remember the choice on the account.
//
// The person, not the shop: data.uzivatel.id, never data.servis.id — an
// invited mechanic switching to English must not switch the owner. No role
// and no subscription check either: reading the app in one's own language is
// not a write into the warehouse, and a shop whose subscription ran out still
// has to be able to read why.

import { json, ocisti } from "../../spolecne.js";

const JAZYKY = ["cs", "en"];

export async function onRequestGet(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  const radek = await env.DB.prepare(
    "SELECT jazyk FROM predvolby WHERE uzivatel_id = ?"
  ).bind(data.uzivatel.id).first();
  return json({ jazyk: radek ? radek.jazyk : null });
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }
  const jazyk = ocisti(telo.jazyk, 5);
  if (!JAZYKY.includes(jazyk)) return json({ chyba: "Neznámý jazyk." }, 422);

  await env.DB.prepare(
    "INSERT INTO predvolby (uzivatel_id, jazyk, zmeneno) VALUES (?, ?, unixepoch()) " +
    "ON CONFLICT(uzivatel_id) DO UPDATE SET jazyk = excluded.jazyk, zmeneno = excluded.zmeneno"
  ).bind(data.uzivatel.id, jazyk).run();

  return json({ stav: "ulozeno", jazyk });
}

// GET  /api/predvolby          → { jazyk: "cs" | "en" | null }
// POST /api/predvolby {jazyk}  → { stav: "ulozeno", jazyk }
//
// The app's language chosen by hand by the signed-in PERSON (not the shop):
// one row in predvolby (migration 0011), keyed by the account, so it holds
// on the workshop tablet and on the phone alike. No row = never chose, and
// the app picks the language itself (build 16).
//
// Until build 16 this lived at /api/jazyk. The template now owns that path
// (functions/api/jazyk.js, refreshed on every build: it keeps the language
// for the firm's later e-mails in uzivatele.jazyk and simtegen.js calls it
// itself). The product's own choice therefore has its own path, which a
// template refresh never overwrites.
//
// Not gated by the role or the subscription: the language is a personal
// setting, not a write into the shop's records.

import { json } from "../../spolecne.js";

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
  const { env, data, request } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }
  const jazyk = String((telo && telo.jazyk) || "");
  if (!JAZYKY.includes(jazyk)) return json({ chyba: "Neznámý jazyk." }, 422);
  await env.DB.prepare(
    "INSERT INTO predvolby (uzivatel_id, jazyk, zmeneno) VALUES (?, ?, unixepoch()) " +
    "ON CONFLICT(uzivatel_id) DO UPDATE SET jazyk = excluded.jazyk, zmeneno = excluded.zmeneno"
  ).bind(data.uzivatel.id, jazyk).run();
  return json({ stav: "ulozeno", jazyk });
}

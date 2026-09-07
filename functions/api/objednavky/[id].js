// POST /api/objednavky/:id {akce} — hotovo | zruseno | planovano |
//                                    pripraveno | smazat
//
// Marking a booking "hotovo" is the mechanic's last touch of the day, so it is
// one tap from the day list. "pripraveno" is separate on purpose: the wheels
// get pulled off the rack the evening before, hours before the job is done.

import {
  json, objednavkaProFrontend, ocisti, OBJEDNAVKY_SELECT,
} from "../../../spolecne.js";

const STAVY = ["planovano", "hotovo", "zruseno"];

export async function onRequestPost(context) {
  const { request, env, data, params } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }

  const id = Number(params.id);
  const existuje = await env.DB.prepare(
    "SELECT id FROM objednavky WHERE uzivatel_id = ? AND id = ?"
  ).bind(data.uzivatel.id, id).first();
  if (!existuje) return json({ chyba: "Objednávka nebyla nalezena." }, 404);

  const akce = ocisti(telo.akce, 20);

  if (akce === "smazat") {
    await env.DB.prepare(
      "DELETE FROM objednavky WHERE uzivatel_id = ? AND id = ?"
    ).bind(data.uzivatel.id, id).run();
    return json({ stav: "smazano" });
  }

  if (akce === "pripraveno") {
    await env.DB.prepare(
      "UPDATE objednavky SET pripraveno = ? WHERE uzivatel_id = ? AND id = ?"
    ).bind(telo.pripraveno ? 1 : 0, data.uzivatel.id, id).run();
  } else if (STAVY.includes(akce)) {
    await env.DB.prepare(
      "UPDATE objednavky SET stav = ? WHERE uzivatel_id = ? AND id = ?"
    ).bind(akce, data.uzivatel.id, id).run();
  } else {
    return json({ chyba: "Neznámá akce." }, 422);
  }

  const ulozena = await env.DB.prepare(
    `${OBJEDNAVKY_SELECT} WHERE o.uzivatel_id = ? AND o.id = ?`
  ).bind(data.uzivatel.id, id).first();

  return json({ stav: "ulozeno", objednavka: objednavkaProFrontend(ulozena) });
}

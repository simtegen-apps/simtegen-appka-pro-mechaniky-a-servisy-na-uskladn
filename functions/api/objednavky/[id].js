// POST /api/objednavky/:id {akce} — upravit | hotovo | zruseno | planovano |
//                                    pripraveno | smazat
//
// Marking a booking "hotovo" is the mechanic's last touch of the day, so it is
// one tap from the day list. "pripraveno" is separate on purpose: the wheels
// get pulled off the rack the evening before, hours before the job is done.
// "upravit" runs the same validation and the same "you are full here" check as
// creating one — a moved time can overfill a slot just as easily as a new one.

import {
  json, objednavkaProFrontend, ocisti, odepriZapis, pripravObjednavku, smiPsat,
  zkontrolujKolizi, OBJEDNAVKY_SELECT,
} from "../../../spolecne.js";
import { vyzadujPredplatne } from "../../../predplatne.js";

const STAVY = ["planovano", "hotovo", "zruseno"];

export async function onRequestPost(context) {
  const { request, env, data, params } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  const stop = vyzadujPredplatne(context);
  if (stop) return stop;
  if (!smiPsat(data.servis)) return odepriZapis();

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }

  const id = Number(params.id);
  const existuje = await env.DB.prepare(
    "SELECT id FROM objednavky WHERE uzivatel_id = ? AND id = ?"
  ).bind(data.servis.id, id).first();
  if (!existuje) return json({ chyba: "Objednávka nebyla nalezena." }, 404);

  const akce = ocisti(telo.akce, 20);

  if (akce === "smazat") {
    await env.DB.prepare(
      "DELETE FROM objednavky WHERE uzivatel_id = ? AND id = ?"
    ).bind(data.servis.id, id).run();
    return json({ stav: "smazano" });
  }

  if (akce === "upravit") {
    const v = await pripravObjednavku(env, data.servis.id, telo);
    if (v.chyba) return json({ chyba: v.chyba }, 422);
    if (!telo.potvrzeno) {
      // Exclude this booking from its own clash check, otherwise every edit
      // would report a collision with itself.
      const kolize = await zkontrolujKolizi(env, data.servis.id, v, id);
      if (kolize) return json({ chyba: kolize, kolize: true }, 409);
    }
    await env.DB.prepare(
      "UPDATE objednavky SET zakaznik_id = ?, sada_id = ?, jmeno_bez_zakaznika = ?, " +
      "datum = ?, delka_min = ?, ukon = ?, na_discich = ?, cely_den = ?, poznamka = ? " +
      "WHERE uzivatel_id = ? AND id = ?"
    ).bind(
      v.zakaznikId, v.sadaId, v.jmenoBez, v.datum, v.delka, v.ukon,
      v.naDiscich, v.celyDen, v.poznamka, data.servis.id, id,
    ).run();
  } else if (akce === "pripraveno") {
    await env.DB.prepare(
      "UPDATE objednavky SET pripraveno = ? WHERE uzivatel_id = ? AND id = ?"
    ).bind(telo.pripraveno ? 1 : 0, data.servis.id, id).run();
  } else if (STAVY.includes(akce)) {
    await env.DB.prepare(
      "UPDATE objednavky SET stav = ? WHERE uzivatel_id = ? AND id = ?"
    ).bind(akce, data.servis.id, id).run();
  } else {
    return json({ chyba: "Neznámá akce." }, 422);
  }

  const ulozena = await env.DB.prepare(
    `${OBJEDNAVKY_SELECT} WHERE o.uzivatel_id = ? AND o.id = ?`
  ).bind(data.servis.id, id).first();

  return json({ stav: "ulozeno", objednavka: objednavkaProFrontend(ulozena) });
}

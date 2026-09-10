// GET  /api/sady/:id — one set with its movement history.
// POST /api/sady/:id {akce} — vydat | vratit | presunout | zaplaceno | upravit
//
// Every state change also appends to pohyby. That log is the part a shop
// cannot rebuild from memory after a season, so it is written by the same
// batch that changes the state — never as a best-effort afterthought.

import {
  cislo, json, ocisti, ted, SADY_SELECT, TYPY_PNEU,
} from "../../../spolecne.js";

function hloubka(hodnota) {
  const n = Number(String(hodnota == null ? "" : hodnota).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.round(n * 10), 250);
}

async function nactiSadu(env, uzivatelId, id) {
  return env.DB.prepare(
    `${SADY_SELECT} WHERE s.uzivatel_id = ? AND s.id = ?`
  ).bind(uzivatelId, id).first();
}

export async function onRequestGet(context) {
  const { env, data, params } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  const id = Number(params.id);
  const sada = await nactiSadu(env, data.uzivatel.id, id);
  if (!sada) return json({ chyba: "Sada nebyla nalezena." }, 404);

  const pohyby = await env.DB.prepare(
    "SELECT typ, datum, poznamka FROM pohyby WHERE uzivatel_id = ? AND sada_id = ? " +
    "ORDER BY datum DESC, id DESC LIMIT 40"
  ).bind(data.uzivatel.id, id).all();

  return json({ sada, pohyby: pohyby.results });
}

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
  const sada = await nactiSadu(env, data.uzivatel.id, id);
  if (!sada) return json({ chyba: "Sada nebyla nalezena." }, 404);
  const akce = ocisti(telo.akce, 20);
  const nyni = ted();

  if (akce === "vydat") {
    if (sada.stav === "vydano") {
      return json({ chyba: "Tato sada je už vydaná." }, 409);
    }
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE sady SET stav = 'vydano', datum_vydeje = ? WHERE uzivatel_id = ? AND id = ?"
      ).bind(nyni, data.uzivatel.id, id),
      env.DB.prepare(
        "INSERT INTO pohyby (uzivatel_id, sada_id, typ, datum, poznamka) VALUES (?, ?, ?, ?, ?)"
      ).bind(data.uzivatel.id, id, "vydej", nyni, ocisti(telo.poznamka, 200)),
    ]);
  } else if (akce === "vratit") {
    // A set handed out by mistake, or the same wheels coming back for another
    // season: the code and the history stay, only the state reopens.
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE sady SET stav = 'uskladneno', datum_vydeje = NULL, datum_prijmu = ?, " +
        "pozice = ? WHERE uzivatel_id = ? AND id = ?"
      ).bind(nyni, ocisti(telo.pozice, 40) || sada.pozice, data.uzivatel.id, id),
      env.DB.prepare(
        "INSERT INTO pohyby (uzivatel_id, sada_id, typ, datum, poznamka) VALUES (?, ?, ?, ?, ?)"
      ).bind(data.uzivatel.id, id, "prijem", nyni, ocisti(telo.pozice, 40) || sada.pozice),
    ]);
  } else if (akce === "presunout") {
    const pozice = ocisti(telo.pozice, 40);
    if (!pozice) return json({ chyba: "Zadejte prosím nové místo ve skladu." }, 422);
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE sady SET pozice = ? WHERE uzivatel_id = ? AND id = ?"
      ).bind(pozice, data.uzivatel.id, id),
      env.DB.prepare(
        "INSERT INTO pohyby (uzivatel_id, sada_id, typ, datum, poznamka) VALUES (?, ?, ?, ?, ?)"
      ).bind(data.uzivatel.id, id, "presun", nyni, `${sada.pozice || "—"} → ${pozice}`),
    ]);
  } else if (akce === "zaplaceno") {
    await env.DB.prepare(
      "UPDATE sady SET zaplaceno = ? WHERE uzivatel_id = ? AND id = ?"
    ).bind(telo.zaplaceno ? 1 : 0, data.uzivatel.id, id).run();
  } else if (akce === "upravit") {
    const typ = TYPY_PNEU.includes(telo.typ) ? telo.typ : sada.typ;
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE sady SET spz = ?, vozidlo = ?, typ = ?, rozmer = ?, pocet_kusu = ?, " +
        "dezen = ?, na_discich = ?, hloubka_lp = ?, hloubka_pp = ?, hloubka_lz = ?, " +
        "hloubka_pz = ?, cena_skladovani = ?, poznamka = ? WHERE uzivatel_id = ? AND id = ?"
      ).bind(
        ocisti(telo.spz, 15).toUpperCase(), ocisti(telo.vozidlo, 60), typ,
        ocisti(telo.rozmer, 30),
        Math.min(Math.max(cislo(telo.pocet_kusu, sada.pocet_kusu), 1), 8),
        ocisti(telo.dezen, 60), telo.na_discich === false ? 0 : 1,
        hloubka(telo.hloubka_lp), hloubka(telo.hloubka_pp),
        hloubka(telo.hloubka_lz), hloubka(telo.hloubka_pz),
        Math.min(Math.max(cislo(telo.cena_skladovani, sada.cena_skladovani), 0), 100000),
        ocisti(telo.poznamka, 300), data.uzivatel.id, id,
      ),
      env.DB.prepare(
        "INSERT INTO pohyby (uzivatel_id, sada_id, typ, datum, poznamka) VALUES (?, ?, ?, ?, ?)"
      ).bind(data.uzivatel.id, id, "kontrola", nyni, "úprava údajů sady"),
    ]);
  } else {
    return json({ chyba: "Neznámá akce." }, 422);
  }

  return json({ stav: "ulozeno", sada: await nactiSadu(env, data.uzivatel.id, id) });
}

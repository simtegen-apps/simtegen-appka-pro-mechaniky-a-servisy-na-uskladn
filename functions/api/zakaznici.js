// GET  /api/zakaznici?q=… — typeahead over the shop's motorists.
// POST /api/zakaznici {akce: novy|upravit|smazat} — maintain them.
//
// The phone number is the working field here: the whole "call the people whose
// wheels are still in the rack" report is worthless without it, so a customer
// cannot be created without one. The e-mail stays optional — plenty of
// motorists never give one.

import { json, ocisti } from "../../spolecne.js";

const VYBER = "SELECT id, jmeno, telefon, email, poznamka FROM zakaznici";

export async function onRequestGet(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  const q = ocisti(new URL(request.url).searchParams.get("q"), 60);
  if (!q) {
    const vse = await env.DB.prepare(
      `${VYBER} WHERE uzivatel_id = ? ORDER BY jmeno LIMIT 30`
    ).bind(data.uzivatel.id).all();
    return json({ zakaznici: vse.results });
  }

  const vzor = `%${q.toLowerCase()}%`;
  // Stored as "601 000 101", typed as "601000101".
  const bezMezer = `%${q.replace(/\s/g, "")}%`;
  const nalezeni = await env.DB.prepare(
    `${VYBER} WHERE uzivatel_id = ? AND (LOWER(jmeno) LIKE ? ` +
    "OR REPLACE(telefon, ' ', '') LIKE ?) ORDER BY jmeno LIMIT 20"
  ).bind(data.uzivatel.id, vzor, bezMezer).all();
  return json({ zakaznici: nalezeni.results });
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
  const akce = ocisti(telo.akce, 20) || "novy";

  if (akce === "smazat") {
    const id = Number(telo.id);
    const sady = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM sady WHERE uzivatel_id = ? AND zakaznik_id = ?"
    ).bind(data.uzivatel.id, id).first();
    if (sady.n > 0) {
      return json({
        chyba: "Zákazníka nelze smazat, dokud u vás má vedené sady pneu. "
          + "Nejdřív je prosím vydejte.",
      }, 409);
    }
    await env.DB.prepare(
      "DELETE FROM zakaznici WHERE uzivatel_id = ? AND id = ?"
    ).bind(data.uzivatel.id, id).run();
    return json({ stav: "smazano" });
  }

  const jmeno = ocisti(telo.jmeno, 80);
  const telefon = ocisti(telo.telefon, 30);
  if (!jmeno) return json({ chyba: "Zadejte prosím jméno zákazníka." }, 422);
  if (!telefon) return json({ chyba: "Zadejte prosím telefon — bez něj ho nepozvete na přezutí." }, 422);
  const email = ocisti(telo.email, 120);
  const poznamka = ocisti(telo.poznamka, 300);

  if (akce === "upravit") {
    await env.DB.prepare(
      "UPDATE zakaznici SET jmeno = ?, telefon = ?, email = ?, poznamka = ? " +
      "WHERE uzivatel_id = ? AND id = ?"
    ).bind(jmeno, telefon, email, poznamka, data.uzivatel.id, Number(telo.id)).run();
    return json({ stav: "ulozeno", id: Number(telo.id) });
  }

  const vysledek = await env.DB.prepare(
    "INSERT INTO zakaznici (uzivatel_id, jmeno, telefon, email, poznamka) " +
    "VALUES (?, ?, ?, ?, ?) RETURNING id, jmeno, telefon, email, poznamka"
  ).bind(data.uzivatel.id, jmeno, telefon, email, poznamka).first();
  return json({ stav: "vytvoreno", zakaznik: vysledek });
}

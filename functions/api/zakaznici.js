// GET  /api/zakaznici?q=… — the shop's motorists, for the list screen and for
//      the typeahead in the new-set wizard.
// POST /api/zakaznici {akce: novy|upravit|smazat} — maintain them.
//
// The phone number is the working field here: the whole "call the people whose
// wheels are still in the rack" report is worthless without it, so a customer
// cannot be created without one. The e-mail stays optional — plenty of
// motorists never give one.
//
// Each row carries how many sets hang on it. The list screen shows that as a
// badge, and it is the same number that decides whether the customer may be
// deleted — one query instead of a second round trip per customer.

import {
  bezDiakritiky, json, ocisti, odepriZapis, smiPsat, sqlBezDiakritiky,
} from "../../spolecne.js";

const VYBER =
  "SELECT z.id, z.jmeno, z.telefon, z.email, z.poznamka, " +
  "(SELECT COUNT(*) FROM sady s WHERE s.zakaznik_id = z.id " +
  "AND s.stav = 'uskladneno') AS sad_uskladneno, " +
  "(SELECT COUNT(*) FROM sady s WHERE s.zakaznik_id = z.id) AS sad_celkem " +
  "FROM zakaznici z";

export async function onRequestGet(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  const q = ocisti(new URL(request.url).searchParams.get("q"), 60);
  if (!q) {
    // The list screen shows everyone, so the ceiling has to clear a real
    // shop's book rather than a typeahead's ten suggestions.
    const vse = await env.DB.prepare(
      `${VYBER} WHERE z.uzivatel_id = ? ORDER BY z.jmeno LIMIT 300`
    ).bind(data.servis.id).all();
    const celkem = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM zakaznici WHERE uzivatel_id = ?"
    ).bind(data.servis.id).first();
    return json({ zakaznici: vse.results, celkem: celkem.n });
  }

  // Diacritics folded on both sides: "sim" finds Šimon, "Š" finds Šimon.
  const vzor = `%${bezDiakritiky(q)}%`;
  // Stored as "601 000 101", typed as "601000101".
  const bezMezer = `%${q.replace(/\s/g, "")}%`;
  const nalezeni = await env.DB.prepare(
    `${VYBER} WHERE z.uzivatel_id = ? AND (${sqlBezDiakritiky("z.jmeno")} LIKE ? ` +
    "OR REPLACE(z.telefon, ' ', '') LIKE ?) ORDER BY z.jmeno LIMIT 30"
  ).bind(data.servis.id, vzor, bezMezer).all();
  return json({ zakaznici: nalezeni.results, celkem: nalezeni.results.length });
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  if (!smiPsat(data.servis)) return odepriZapis();

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }
  const akce = ocisti(telo.akce, 20) || "novy";

  if (akce === "smazat") {
    const id = Number(telo.id);
    // Only wheels the shop is physically holding block the deletion — you
    // cannot throw away the record of something sitting in your rack. Released
    // sets are history, and blocking on those would mean the policy's promise
    // of deletion in the app quietly did not apply for 24 months. They go with
    // the customer through sady.zakaznik_id ON DELETE CASCADE, and their
    // movement log follows through pohyby.sada_id.
    const sady = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM sady WHERE uzivatel_id = ? AND zakaznik_id = ? " +
      "AND stav = 'uskladneno'"
    ).bind(data.servis.id, id).first();
    if (sady.n > 0) {
      return json({
        chyba: `Zákazníka nelze smazat, dokud u vás má uskladněné sady (${sady.n}). `
          + "Nejdřív je prosím vydejte.",
      }, 409);
    }
    await env.DB.prepare(
      "DELETE FROM zakaznici WHERE uzivatel_id = ? AND id = ?"
    ).bind(data.servis.id, id).run();
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
    ).bind(jmeno, telefon, email, poznamka, data.servis.id, Number(telo.id)).run();
    return json({ stav: "ulozeno", id: Number(telo.id) });
  }

  const vysledek = await env.DB.prepare(
    "INSERT INTO zakaznici (uzivatel_id, jmeno, telefon, email, poznamka) " +
    "VALUES (?, ?, ?, ?, ?) RETURNING id, jmeno, telefon, email, poznamka"
  ).bind(data.servis.id, jmeno, telefon, email, poznamka).first();
  return json({ stav: "vytvoreno", zakaznik: { ...vysledek, sad_uskladneno: 0, sad_celkem: 0 } });
}

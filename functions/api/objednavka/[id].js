// POST /api/objednavka/:id {akce: "zrusit"} — zrušení vlastní objednávky
// předplatného, dokud za ni servis nezaplatil.
//
// Proč to musí jít: /api/objednavka odmítá druhou objednávku, dokud je jedna
// rozpracovaná ("Máte už rozpracovanou objednávku"). Bez zrušení by jediné
// omylem odeslané „12 měsíců“ zablokovalo objednávání natrvalo a zákazník by
// musel psát na podporu — přesně to, co má nákupní tok v aplikaci nahradit.
//
// Zrušit lze jen objednávku ve stavu `nova`: jakmile je vystavená faktura
// (stav `fakturovana`) nebo zaplacená, je to doklad a stornuje ho člověk
// v účetnictví, ne tlačítko v appce.
//
// Objednávka patří PROVOZOVNĚ (uzivatel_id = data.servis.id) a ruší ji jen
// správce — stejně jako ji jen správce smí odeslat.

import { json, odepriSpravu, smiSpravovat, ocisti } from "../../../spolecne.js";

export async function onRequestPost(context) {
  const { request, env, data, params } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  if (!smiSpravovat(data.servis)) return odepriSpravu();

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Neplatný požadavek." }, 400);
  }
  if (ocisti(telo && telo.akce, 20) !== "zrusit") {
    return json({ chyba: "Neznámá akce." }, 400);
  }

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return json({ chyba: "Objednávka nebyla nalezena." }, 404);
  }

  const objednavka = await env.DB.prepare(
    "SELECT id, stav FROM objednavky_predplatneho WHERE uzivatel_id = ? AND id = ?"
  ).bind(data.servis.id, id).first();
  if (!objednavka) return json({ chyba: "Objednávka nebyla nalezena." }, 404);
  if (objednavka.stav === "zrusena") return json({ id, stav: "zrusena" });
  if (objednavka.stav !== "nova") {
    return json({
      chyba: "Tuhle objednávku už zrušit nejde — je na ni vystavená faktura. "
        + "Napište nám prosím na podporu.",
    }, 409);
  }

  await env.DB.prepare(
    "UPDATE objednavky_predplatneho SET stav = 'zrusena' WHERE uzivatel_id = ? AND id = ?"
  ).bind(data.servis.id, id).run();

  return json({ id, stav: "zrusena" });
}

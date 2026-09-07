// GET  /api/objednavky?od=YYYY-MM-DD&do=YYYY-MM-DD — the shop's day book.
// POST /api/objednavky — the mechanic books a slot.
//
// Bookings are entered by the shop, not by motorists: that is what the owner
// asked for and it keeps the calendar free of no-shows nobody agreed to.
// A booking may hang on a stored set (then the preparation list knows which
// wheels to pull off the rack), on a customer without a set, or on nothing but
// a name written in the doorway.

import {
  cislo, epochZDataCasu, json, objednavkaProFrontend, ocisti, ted, zacatekDne,
  DEN, OBJEDNAVKY_SELECT, UKONY,
} from "../../spolecne.js";

export async function onRequestGet(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  const parametry = new URL(request.url).searchParams;
  const od = epochZDataCasu(parametry.get("od"), "00:00") ?? zacatekDne(ted());
  const doKdy = (epochZDataCasu(parametry.get("do"), "00:00") ?? (od + 6 * DEN)) + DEN;

  const nalezene = await env.DB.prepare(
    `${OBJEDNAVKY_SELECT} WHERE o.uzivatel_id = ? AND o.datum >= ? AND o.datum < ? ` +
    "ORDER BY o.datum LIMIT 200"
  ).bind(data.uzivatel.id, od, doKdy).all();

  return json({ objednavky: nalezene.results.map(objednavkaProFrontend) });
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

  const datum = epochZDataCasu(ocisti(telo.den, 10), ocisti(telo.cas, 5) || "08:00");
  if (!datum) return json({ chyba: "Zadejte prosím datum termínu." }, 422);

  let sadaId = Number(telo.sada_id) || null;
  let zakaznikId = Number(telo.zakaznik_id) || null;

  if (sadaId) {
    const sada = await env.DB.prepare(
      "SELECT id, zakaznik_id FROM sady WHERE uzivatel_id = ? AND id = ?"
    ).bind(data.uzivatel.id, sadaId).first();
    if (!sada) return json({ chyba: "Sada nebyla nalezena." }, 404);
    // The set already knows whose it is — never make the mechanic pick twice.
    zakaznikId = sada.zakaznik_id;
  } else if (zakaznikId) {
    const zakaznik = await env.DB.prepare(
      "SELECT id FROM zakaznici WHERE uzivatel_id = ? AND id = ?"
    ).bind(data.uzivatel.id, zakaznikId).first();
    if (!zakaznik) return json({ chyba: "Zákazník nebyl nalezen." }, 404);
  }

  const jmenoBez = ocisti(telo.jmeno_bez_zakaznika, 80);
  if (!zakaznikId && !jmenoBez) {
    return json({ chyba: "Vyberte zákazníka nebo napište jméno." }, 422);
  }

  const ukon = UKONY.includes(telo.ukon) ? telo.ukon : "prezuti";
  const delka = Math.min(Math.max(cislo(telo.delka_min, 30), 5), 480);

  const novy = await env.DB.prepare(
    "INSERT INTO objednavky (uzivatel_id, zakaznik_id, sada_id, jmeno_bez_zakaznika, " +
    "datum, delka_min, ukon, poznamka) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id"
  ).bind(
    data.uzivatel.id, zakaznikId, sadaId, zakaznikId ? "" : jmenoBez,
    datum, delka, ukon, ocisti(telo.poznamka, 300),
  ).first();

  const ulozena = await env.DB.prepare(
    `${OBJEDNAVKY_SELECT} WHERE o.uzivatel_id = ? AND o.id = ?`
  ).bind(data.uzivatel.id, novy.id).first();

  return json({ stav: "objednano", objednavka: objednavkaProFrontend(ulozena) });
}

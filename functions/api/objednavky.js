// GET  /api/objednavky?od=YYYY-MM-DD&do=YYYY-MM-DD — the shop's day book.
// POST /api/objednavky — the mechanic books a slot.
//
// Bookings are entered by the shop, not by motorists: that is what the owner
// asked for and it keeps the calendar free of no-shows nobody agreed to.
// A booking may hang on a stored set (then the preparation list knows which
// wheels to pull off the rack), on a customer without a set, or on nothing but
// a name written in the doorway.

import {
  epochZDataCasu, json, objednavkaProFrontend, odepriZapis, pripravObjednavku,
  smiPsat, ted, zacatekDne, zkontrolujKolizi, DEN, OBJEDNAVKY_SELECT,
} from "../../spolecne.js";
import { vyzadujPredplatne } from "../../predplatne.js";

export async function onRequestGet(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  const parametry = new URL(request.url).searchParams;
  const od = epochZDataCasu(parametry.get("od"), "00:00") ?? zacatekDne(ted());
  const doKdy = (epochZDataCasu(parametry.get("do"), "00:00") ?? (od + 6 * DEN)) + DEN;

  const nalezene = await env.DB.prepare(
    `${OBJEDNAVKY_SELECT} WHERE o.uzivatel_id = ? AND o.datum >= ? AND o.datum < ? ` +
    "ORDER BY o.cely_den, o.datum LIMIT 200"
  ).bind(data.servis.id, od, doKdy).all();

  return json({
    objednavky: nalezene.results.map(objednavkaProFrontend),
    ted: ted(),
  });
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
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

  const v = await pripravObjednavku(env, data.servis.id, telo);
  if (v.chyba) return json({ chyba: v.chyba }, 422);

  // The shop is warned, not blocked: the mechanic is the one who knows
  // whether two cars really fit. Re-sending with potvrzeno skips the check.
  if (!telo.potvrzeno) {
    const kolize = await zkontrolujKolizi(env, data.servis.id, v, null);
    if (kolize) return json({ chyba: kolize, kolize: true }, 409);
  }

  const novy = await env.DB.prepare(
    "INSERT INTO objednavky (uzivatel_id, zakaznik_id, sada_id, jmeno_bez_zakaznika, " +
    "datum, delka_min, ukon, na_discich, cely_den, poznamka) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id"
  ).bind(
    data.servis.id, v.zakaznikId, v.sadaId, v.jmenoBez,
    v.datum, v.delka, v.ukon, v.naDiscich, v.celyDen, v.poznamka,
  ).first();

  const ulozena = await env.DB.prepare(
    `${OBJEDNAVKY_SELECT} WHERE o.uzivatel_id = ? AND o.id = ?`
  ).bind(data.servis.id, novy.id).first();

  return json({ stav: "objednano", objednavka: objednavkaProFrontend(ulozena) });
}

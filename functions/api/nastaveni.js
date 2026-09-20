// GET  /api/nastaveni — shop details for the label, opening hours, capacity,
//                       trial state and the signed-in person's role.
// POST /api/nastaveni — save them (správce only).
//
// The row is created on first read (see nactiNastaveni), so the very first
// login already has a working default: the label just prints without a shop
// name until the mechanic fills one in.

import {
  cislo, casNaMinuty, json, minutyNaCas, nactiNastaveni, ocisti, odepriSpravu,
  smiSpravovat, ted, DEN,
} from "../../spolecne.js";
import { vyzadujPredplatne } from "../../predplatne.js";

const FORMATY = ["role_100x50", "a4_3x8"];

async function stav(env, uzivatel, servis, predplatne) {
  const nastaveni = await nactiNastaveni(env, servis.id);
  // Two counts in one round trip: the subscription screen shows what the shop
  // would stop being able to write into, and that number is the whole reason
  // anybody renews.
  const { n, zakazniku } = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM sady WHERE uzivatel_id = ? AND stav = 'uskladneno') AS n, " +
    "(SELECT COUNT(*) FROM zakaznici WHERE uzivatel_id = ?) AS zakazniku"
  ).bind(servis.id, servis.id).first();
  const zbyva = nastaveni.zkusebni_do
    ? Math.max(0, Math.ceil((nastaveni.zkusebni_do - ted()) / DEN))
    : 0;
  return {
    email: uzivatel.email,
    role: servis.role,
    vlastni_ucet: servis.vlastni,
    nazev: nastaveni.nazev,
    telefon: nastaveni.telefon,
    adresa: nastaveni.adresa,
    format_stitku: nastaveni.format_stitku,
    vychozi_cena: nastaveni.vychozi_cena,
    soubezne_objednavky: nastaveni.soubezne_objednavky,
    otevreno_od: minutyNaCas(nastaveni.otevreno_od),
    otevreno_do: minutyNaCas(nastaveni.otevreno_do),
    obed_od: minutyNaCas(nastaveni.obed_od),
    obed_do: minutyNaCas(nastaveni.obed_do),
    plan: nastaveni.plan,
    limit_sad: nastaveni.plan === "zkusebni" ? nastaveni.limit_sad : null,
    zkusebni_zbyva_dnu: nastaveni.plan === "zkusebni" ? zbyva : null,
    uskladneno: n,
    zakazniku,
    // Carried here as well as on /api/ja so the frontend has one object to
    // render from after any settings round-trip.
    predplatne: predplatne || null,
    // Decides whether the walkthrough opens by itself on arrival.
    navod_viden: nastaveni.navod_viden ? 1 : 0,
  };
}

export async function onRequestGet(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  return json(await stav(env, data.uzivatel, data.servis, data.predplatne));
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  const stop = vyzadujPredplatne(context);
  if (stop) return stop;
  if (!smiSpravovat(data.servis)) return odepriSpravu();

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }

  await nactiNastaveni(env, data.servis.id);
  const format = FORMATY.includes(telo.format_stitku)
    ? telo.format_stitku : "role_100x50";
  const cena = Math.min(Math.max(cislo(telo.vychozi_cena, 0), 0), 100000);
  const soubezne = Math.min(Math.max(cislo(telo.soubezne_objednavky, 1), 1), 20);

  const otevrenoOd = casNaMinuty(telo.otevreno_od, 480);
  let otevrenoDo = casNaMinuty(telo.otevreno_do, 1020);
  // An end before the start would silently make every booking "mimo otevírací
  // dobu", so it is corrected rather than stored.
  if (otevrenoDo <= otevrenoOd) otevrenoDo = Math.min(otevrenoOd + 60, 24 * 60);
  const obedOd = casNaMinuty(telo.obed_od, 0);
  let obedDo = casNaMinuty(telo.obed_do, 0);
  if (obedDo < obedOd) obedDo = obedOd;

  await env.DB.prepare(
    "UPDATE nastaveni_servisu SET nazev = ?, telefon = ?, adresa = ?, " +
    "format_stitku = ?, vychozi_cena = ?, soubezne_objednavky = ?, " +
    "otevreno_od = ?, otevreno_do = ?, obed_od = ?, obed_do = ? " +
    "WHERE uzivatel_id = ?"
  ).bind(
    ocisti(telo.nazev, 80), ocisti(telo.telefon, 30), ocisti(telo.adresa, 120),
    format, cena, soubezne, otevrenoOd, otevrenoDo, obedOd, obedDo,
    data.servis.id,
  ).run();

  return json({
    stav: "ulozeno",
    nastaveni: await stav(env, data.uzivatel, data.servis, data.predplatne),
  });
}

// GET  /api/nastaveni — shop details for the label, plus trial state.
// POST /api/nastaveni — save them.
//
// The row is created on first read (see nactiNastaveni), so the very first
// login already has a working default: the label just prints without a shop
// name until the mechanic fills one in.

import {
  cislo, json, nactiNastaveni, ocisti, ted, DEN,
} from "../../spolecne.js";

const FORMATY = ["role_100x50", "a4_3x8"];

async function stav(env, uzivatel) {
  const nastaveni = await nactiNastaveni(env, uzivatel.id);
  const { n } = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM sady WHERE uzivatel_id = ? AND stav = 'uskladneno'"
  ).bind(uzivatel.id).first();
  const zbyva = nastaveni.zkusebni_do
    ? Math.max(0, Math.ceil((nastaveni.zkusebni_do - ted()) / DEN))
    : 0;
  return {
    email: uzivatel.email,
    nazev: nastaveni.nazev,
    telefon: nastaveni.telefon,
    adresa: nastaveni.adresa,
    format_stitku: nastaveni.format_stitku,
    vychozi_cena: nastaveni.vychozi_cena,
    plan: nastaveni.plan,
    limit_sad: nastaveni.plan === "zkusebni" ? nastaveni.limit_sad : null,
    zkusebni_zbyva_dnu: nastaveni.plan === "zkusebni" ? zbyva : null,
    uskladneno: n,
  };
}

export async function onRequestGet(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  return json(await stav(env, data.uzivatel));
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

  await nactiNastaveni(env, data.uzivatel.id);
  const format = FORMATY.includes(telo.format_stitku)
    ? telo.format_stitku : "role_100x50";
  const cena = Math.min(Math.max(cislo(telo.vychozi_cena, 0), 0), 100000);

  await env.DB.prepare(
    "UPDATE nastaveni_servisu SET nazev = ?, telefon = ?, adresa = ?, " +
    "format_stitku = ?, vychozi_cena = ? WHERE uzivatel_id = ?"
  ).bind(
    ocisti(telo.nazev, 80), ocisti(telo.telefon, 30), ocisti(telo.adresa, 120),
    format, cena, data.uzivatel.id,
  ).run();

  return json({ stav: "ulozeno", nastaveni: await stav(env, data.uzivatel) });
}

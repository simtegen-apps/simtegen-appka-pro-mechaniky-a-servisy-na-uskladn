// GET /api/prehled — the screen the subscription is actually renewed for.
//
// Three lists, all derived from stored sets, all of them money for the shop:
//   1. vyzva     — wheels in the rack whose owner has not booked this season,
//                  with a phone number to tap. This is the changeover campaign.
//   2. opotrebene — sets whose shallowest measured tyre is under 4 mm, i.e.
//                  customers to offer new tyres to before the season starts.
//   3. nezaplacene — storage the shop has not been paid for yet.
//
// "This season" is a rolling 150 days rather than fixed spring/autumn dates:
// a shop opening the app in February must not be told everyone is overdue
// because a calendar season boundary has not been crossed yet.

import {
  json, ted, uklid, zacatekDne, DEN, SADY_SLOUPCE, SADY_ZDROJ,
} from "../../spolecne.js";

const SEZONA = 150 * DEN;
const MEZ_HLOUBKY = 40; // tenths of a millimetre — the 4 mm winter-tyre rule

function nejmensiHloubka(sada) {
  // Zeros mean "not measured", not "bald": a set nobody measured must not
  // show up as an urgent sales lead.
  const merene = [sada.hloubka_lp, sada.hloubka_pp, sada.hloubka_lz, sada.hloubka_pz]
    .filter((h) => h > 0);
  return merene.length ? Math.min(...merene) : 0;
}

export async function onRequestGet(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  // Opening the overview is the second housekeeping moment (login is the
  // first) — a shop that never logs out still keeps its retention promises.
  await uklid(env, data.servis.id);

  const nyni = ted();
  const uskladnene = await env.DB.prepare(
    `${SADY_SLOUPCE}, (SELECT COUNT(*) FROM objednavky o WHERE o.sada_id = s.id ` +
    `AND o.stav != 'zruseno' AND o.datum >= ?) AS objednavek ${SADY_ZDROJ} ` +
    "WHERE s.uzivatel_id = ? AND s.stav = 'uskladneno' ORDER BY z.jmeno"
  ).bind(nyni - SEZONA, data.servis.id).all();

  const sady = uskladnene.results;
  const vyzva = [];
  const opotrebene = [];
  const nezaplacene = [];
  let dluh = 0;

  for (const sada of sady) {
    const hloubka = nejmensiHloubka(sada);
    const zaznam = { ...sada, nejmensi_hloubka: hloubka };
    if (!sada.objednavek) vyzva.push(zaznam);
    if (hloubka > 0 && hloubka < MEZ_HLOUBKY) opotrebene.push(zaznam);
    if (!sada.zaplaceno && sada.cena_skladovani > 0) {
      nezaplacene.push(zaznam);
      dluh += sada.cena_skladovani;
    }
  }

  opotrebene.sort((a, b) => a.nejmensi_hloubka - b.nejmensi_hloubka);

  // Tomorrow as the shop reads it, not "the next 48 hours".
  const zitrejsiPolnoc = zacatekDne(nyni) + DEN;
  const zitra = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM objednavky WHERE uzivatel_id = ? AND stav = 'planovano' " +
    "AND pripraveno = 0 AND datum >= ? AND datum < ?"
  ).bind(data.servis.id, zitrejsiPolnoc, zitrejsiPolnoc + DEN).first();

  return json({
    uskladneno: sady.length,
    vyzva,
    opotrebene,
    nezaplacene,
    dluh,
    nepripraveno: zitra.n,
  });
}

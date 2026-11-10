// GET  /api/clenstvi — the invitations waiting for the signed-in person.
// POST /api/clenstvi {akce: prijmout|odmitnout} — the invited person, own invitation only.
// POST /api/clenstvi {akce: odejit} — a colleague leaves the shop they work in.
//
// The signed-in person's OWN membership, apart from the team administration
// in functions/api/clenove.js, which is správce only (the owner's decision
// after the security review). These steps need no správce right — a
// mechanic must be able to leave a shop on his own, and an invitation is
// answered by the person it names — and they touch only rows addressed to
// the signed-in e-mail, or the signed-in person's own membership.

import {
  json, maVlastniData, ocisti, ted, CLENSTVI_NEPRIJATO, CLENSTVI_PRIJATO,
} from "../../spolecne.js";

// The 24-hour demo account from Google Play's "Vyzkoušet ukázku" signs in
// without a verified e-mail, on this reserved domain; it does not join shops.
const UKAZKA_DOMENA = "@ukazka.invalid";

function jeUkazka(uzivatel) {
  return String(uzivatel.email || "").toLowerCase().endsWith(UKAZKA_DOMENA);
}

export async function onRequestGet(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  // mimo-uzivatele: the invitations addressed to the signed-in person live
  // in other shops' rows; only the shop's name goes out, nothing else of it.
  const pozvanky = await env.DB.prepare(
    "SELECT c.id, c.role, n.nazev FROM clenove c JOIN uzivatele u ON u.id = ? " +
    "LEFT JOIN nastaveni_servisu n ON n.uzivatel_id = c.uzivatel_id " +
    `WHERE c.email = u.email AND c.uzivatel_id != u.id AND ${CLENSTVI_NEPRIJATO} ORDER BY c.id`
  ).bind(data.uzivatel.id).all();

  return json({
    pozvanky: pozvanky.results.map((p) => ({
      id: p.id, role: p.role, servis: p.nazev || "Pneuservis bez názvu",
    })),
    clen_ciziho: !data.servis.vlastni,
  });
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
  const akce = ocisti(telo.akce, 20);

  if (akce === "prijmout") {
    if (jeUkazka(data.uzivatel)) return json({ chyba: "V ukázce pozvánky přijímat nejde." }, 403);
    return prijmout(env, data, Number(telo.id));
  }
  if (akce === "odmitnout") {
    // mimo-uzivatele: the invitation sits in the inviting shop's rows.
    await env.DB.prepare(
      "DELETE FROM clenove WHERE id IN (SELECT c.id FROM clenove c JOIN uzivatele u ON u.id = ? " +
      `WHERE c.id = ? AND c.email = u.email AND c.uzivatel_id != u.id AND ${CLENSTVI_NEPRIJATO})`
    ).bind(data.uzivatel.id, Number(telo.id)).run();
    return json({ stav: "odmitnuto" });
  }
  if (akce === "odejit") {
    if (data.servis.vlastni) {
      return json({ chyba: "Ve vlastním servisu jste majitel, odejít z něj nejde." }, 422);
    }
    await env.DB.prepare(
      "DELETE FROM clenove WHERE uzivatel_id = ? AND email = ?"
    ).bind(data.servis.id, data.uzivatel.email).run();
    return json({ stav: "odesel" });
  }
  return json({ chyba: "Neznámá akce." }, 422);
}

// Accepting is the only way an invitation turns into access. The reasons it
// can be refused go to the invited person alone — they are about their own
// account.
async function prijmout(env, data, id) {
  // mimo-uzivatele: the invitation is a row of the inviting shop, found by
  // the signed-in person's own address.
  const pozvanka = await env.DB.prepare(
    "SELECT c.id, c.uzivatel_id FROM clenove c JOIN uzivatele u ON u.id = ? " +
    `WHERE c.id = ? AND c.email = u.email AND c.uzivatel_id != u.id AND ${CLENSTVI_NEPRIJATO}`
  ).bind(data.uzivatel.id, id).first();
  if (!pozvanka) return json({ chyba: "Pozvánka nebyla nalezena." }, 404);

  // Own records win (nactiKontext): accepting would change nothing, and
  // saying so is better than a silent no-op.
  if (await maVlastniData(env, data.uzivatel.id)) {
    return json({
      chyba: "Ve vlastním účtu už máte evidenci, a ta má přednost. Pozvánku přijměte "
        + "z jiné e-mailové adresy, nebo nejdřív stáhněte data a smažte účet.",
    }, 409);
  }
  // One person, one shop: the resolver takes the first accepted membership,
  // a second one would be silently ignored rather than offering a choice.
  // mimo-uzivatele: memberships of this address in any shop.
  const jinde = await env.DB.prepare(
    "SELECT c.id FROM clenove c JOIN uzivatele u ON u.id = ? " +
    `WHERE c.email = u.email AND c.uzivatel_id != u.id AND ${CLENSTVI_PRIJATO}`
  ).bind(data.uzivatel.id).first();
  if (jinde) {
    return json({
      chyba: "Už pracujete v jiném servisu. Nejdřív z něj odejděte (Nastavení → Účet a data).",
    }, 409);
  }

  await env.DB.prepare(
    "UPDATE clenove SET prijato = 1, prijato_cas = ? WHERE uzivatel_id = ? AND id = ? AND email = ?"
  ).bind(ted(), pozvanka.uzivatel_id, pozvanka.id, data.uzivatel.email).run();
  return json({ stav: "prijato" });
}

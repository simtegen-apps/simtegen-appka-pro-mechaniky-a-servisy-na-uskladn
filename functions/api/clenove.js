// GET  /api/clenove — who else may open this shop's account, and the
//                     invitations waiting for the signed-in person.
// POST /api/clenove {akce: pridat|zmenit|odebrat} — správce only.
// POST /api/clenove {akce: prijmout|odmitnout} — the invited person, own invitation only.
// POST /api/clenove {akce: odejit} — a colleague leaves the shop they work in.
//
// There is no invitation e-mail and no separate password: the colleague signs
// in with their own address through the ordinary one-time link. A row the
// správce adds is an INVITATION (prijato = 0); it becomes access only when
// the person signed in with that address accepts it. Before, the row alone
// was access, and any free account could pull a stranger into its own shop
// by typing their address (spolecne.nactiKontext reads accepted rows only).
//
// The answer to "pridat" is the same whatever the address is — taken
// elsewhere, unknown, an owner of another shop — so the form cannot be used
// to find out who works where. Whether the invitation can be accepted is
// decided when the invited person tries, and only they see the reason.
//
// The shop owner is not a row here — they are the account itself and always
// správce, which is why the list cannot be emptied into a shop nobody can
// administer.

import {
  json, maVlastniData, nactiNastaveni, ocisti, odepriSpravu, smiSpravovat, ted,
  CLENSTVI_NEPRIJATO, CLENSTVI_PRIJATO, ROLE,
} from "../../spolecne.js";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,}$/;

// The 24-hour demo account from Google Play's "Vyzkoušet ukázku" signs in
// without a verified e-mail, on this reserved domain. A row in clenove is not
// for it: a stranger trying the demo must not be able to invite a real
// address into a throwaway shop.
const UKAZKA_DOMENA = "@ukazka.invalid";

function jeUkazka(uzivatel) {
  return String(uzivatel.email || "").toLowerCase().endsWith(UKAZKA_DOMENA);
}
// Invitations per shop per hour (Vrátit after a removal counts too). A real
// shop adds two or three colleagues once; ten is room for typos.
const POZVANEK_ZA_HODINU = 10;

export async function onRequestGet(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  // prijato is the EFFECTIVE state (spolecne.CLENSTVI_PRIJATO): an old row
  // for someone who never signed in shows as waiting, like a new invitation.
  const clenove = await env.DB.prepare(
    `SELECT c.id, c.email, c.role, CASE WHEN ${CLENSTVI_PRIJATO} THEN 1 ELSE 0 END AS prijato, ` +
    "c.vytvoreno FROM clenove c LEFT JOIN uzivatele u ON u.email = c.email " +
    "WHERE c.uzivatel_id = ? ORDER BY c.email"
  ).bind(data.servis.id).all();

  // mimo-uzivatele: the invitations addressed to the signed-in person live
  // in other shops' rows; only the shop's name goes out, nothing else of it.
  const pozvanky = await env.DB.prepare(
    "SELECT c.id, c.role, n.nazev FROM clenove c JOIN uzivatele u ON u.id = ? " +
    "LEFT JOIN nastaveni_servisu n ON n.uzivatel_id = c.uzivatel_id " +
    `WHERE c.email = u.email AND c.uzivatel_id != u.id AND ${CLENSTVI_NEPRIJATO} ORDER BY c.id`
  ).bind(data.uzivatel.id).all();

  return json({
    clenove: clenove.results,
    pozvanky: pozvanky.results.map((p) => ({
      id: p.id, role: p.role, servis: p.nazev || "Pneuservis bez názvu",
    })),
    muze_spravovat: smiSpravovat(data.servis),
    clen_ciziho: !data.servis.vlastni,
    ja: data.uzivatel.email,
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
  const akce = ocisti(telo.akce, 20) || "pridat";

  // The invited person's own steps — no správce right needed, and they touch
  // only rows addressed to the signed-in e-mail.
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

  if (!smiSpravovat(data.servis)) return odepriSpravu();

  if (akce === "odebrat") {
    await env.DB.prepare(
      "DELETE FROM clenove WHERE uzivatel_id = ? AND id = ?"
    ).bind(data.servis.id, Number(telo.id)).run();
    return json({ stav: "odebrano" });
  }

  if (jeUkazka(data.uzivatel)) {
    return json({
      chyba: "V ukázce kolegy přidávat nejde. Tým si nastavíte ve vlastním účtu po přihlášení e-mailem.",
    }, 403);
  }

  const email = ocisti(telo.email, 160).toLowerCase();
  if (!EMAIL.test(email)) {
    return json({ chyba: "Zadejte prosím platnou e-mailovou adresu." }, 422);
  }
  const role = ROLE.includes(telo.role) ? telo.role : "mechanik";

  if (akce === "zmenit") {
    await env.DB.prepare(
      "UPDATE clenove SET role = ? WHERE uzivatel_id = ? AND id = ?"
    ).bind(role, data.servis.id, Number(telo.id)).run();
    return json({ stav: "ulozeno" });
  }

  // The OWNER's address never goes into the owner's own team — not by the
  // owner, and not by an invited správce who would like to demote them
  // (data.uzivatel is whoever asks; the shop's owner is servis.id). The
  // owner's address is no secret to anyone who administers the shop.
  // mimo-uzivatele: the owner's own account row, keyed by the shop id.
  const vlastnik = await env.DB.prepare(
    "SELECT email FROM uzivatele WHERE id = ?"
  ).bind(data.servis.id).first();
  if (email === data.uzivatel.email || (vlastnik && email === vlastnik.email)) {
    return json({ chyba: "Tato adresa patří majiteli servisu — účet je jeho, přidávat ji nemusíte." }, 422);
  }

  // A fixed one-hour window per shop.
  await nactiNastaveni(env, data.servis.id);
  const nyni = ted();
  const okno = await env.DB.prepare(
    "UPDATE nastaveni_servisu SET " +
    "pozvanky_pocet = CASE WHEN pozvanky_od > ? THEN pozvanky_pocet + 1 ELSE 1 END, " +
    "pozvanky_od = CASE WHEN pozvanky_od > ? THEN pozvanky_od ELSE ? END " +
    "WHERE uzivatel_id = ? RETURNING pozvanky_pocet"
  ).bind(nyni - 3600, nyni - 3600, nyni, data.servis.id).first();
  if (okno && okno.pozvanky_pocet > POZVANEK_ZA_HODINU) {
    return json({ chyba: "Za poslední hodinu jste pozvali příliš mnoho adres. Zkuste to prosím později." }, 429);
  }

  // Always an invitation, always the same answer. An existing row keeps its
  // acceptance; only the role changes.
  const vysledek = await env.DB.prepare(
    "INSERT INTO clenove (uzivatel_id, email, role, prijato) VALUES (?, ?, ?, 0) " +
    "ON CONFLICT(uzivatel_id, email) DO UPDATE SET role = excluded.role " +
    "RETURNING id, email, role, prijato, vytvoreno"
  ).bind(data.servis.id, email, role).first();

  return json({ stav: "pozvano", clen: vysledek });
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

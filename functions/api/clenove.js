// GET  /api/clenove — who else may open this shop's account.
// POST /api/clenove {akce: pridat|zmenit|odebrat} — change the team.
//
// Správce only, both reading and writing (the owner's decision after the
// security review): the team list is the colleagues' e-mail addresses and
// roles, a mechanic or a read-only colleague has no business with it. The
// signed-in person's own membership — the invitations waiting for them,
// accepting, declining, leaving a shop — is functions/api/clenstvi.js.
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
  json, nactiNastaveni, ocisti, odepriSpravu, smiSpravovat, ted, CLENSTVI_PRIJATO, ROLE,
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
  if (!smiSpravovat(data.servis)) return odepriSpravu();

  // prijato is the EFFECTIVE state (spolecne.CLENSTVI_PRIJATO): an old row
  // for someone who never signed in shows as waiting, like a new invitation.
  const clenove = await env.DB.prepare(
    `SELECT c.id, c.email, c.role, CASE WHEN ${CLENSTVI_PRIJATO} THEN 1 ELSE 0 END AS prijato, ` +
    "c.vytvoreno FROM clenove c LEFT JOIN uzivatele u ON u.email = c.email " +
    "WHERE c.uzivatel_id = ? ORDER BY c.email"
  ).bind(data.servis.id).all();

  return json({ clenove: clenove.results });
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  if (!smiSpravovat(data.servis)) return odepriSpravu();

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }
  const akce = ocisti(telo.akce, 20) || "pridat";
  if (!["pridat", "zmenit", "odebrat"].includes(akce)) {
    return json({ chyba: "Neznámá akce." }, 422);
  }

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

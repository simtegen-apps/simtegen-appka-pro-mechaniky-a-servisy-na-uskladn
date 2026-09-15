// GET  /api/clenove — who else may open this shop's account.
// POST /api/clenove {akce: pridat|zmenit|odebrat} — správce only.
//
// There is no invitation e-mail and no separate password: the colleague signs
// in with their own address through the ordinary one-time link, and this row
// is what turns that login into access to THIS shop. Adding someone therefore
// works even before they have ever opened the app.
//
// The shop owner is not a row here — they are the account itself and always
// správce, which is why the list cannot be emptied into a shop nobody can
// administer.

import {
  json, ocisti, odepriSpravu, smiSpravovat, ROLE,
} from "../../spolecne.js";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,}$/;

export async function onRequestGet(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  const clenove = await env.DB.prepare(
    "SELECT id, email, role, vytvoreno FROM clenove WHERE uzivatel_id = ? ORDER BY email"
  ).bind(data.servis.id).all();

  return json({
    clenove: clenove.results,
    muze_spravovat: smiSpravovat(data.servis),
    ja: data.uzivatel.email,
  });
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

  if (akce === "odebrat") {
    await env.DB.prepare(
      "DELETE FROM clenove WHERE uzivatel_id = ? AND id = ?"
    ).bind(data.servis.id, Number(telo.id)).run();
    return json({ stav: "odebrano" });
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

  // The owner's own address would create an account that is a member of
  // itself, and the context resolver would then read the membership instead
  // of the ownership — a správce could demote themselves out of their own shop.
  if (email === data.uzivatel.email) {
    return json({ chyba: "Sami sebe přidávat nemusíte — účet je váš." }, 422);
  }
  // One person, one shop: the context resolver picks the first membership, so
  // a second one would be silently ignored rather than offering a choice.
  const jinde = await env.DB.prepare(
    "SELECT uzivatel_id FROM clenove WHERE email = ? AND uzivatel_id != ?"
  ).bind(email, data.servis.id).first();
  if (jinde) {
    return json({
      chyba: "Tato adresa už má přístup k jinému servisu. Použijte prosím jinou.",
    }, 409);
  }

  const vysledek = await env.DB.prepare(
    "INSERT INTO clenove (uzivatel_id, email, role) VALUES (?, ?, ?) " +
    "ON CONFLICT(uzivatel_id, email) DO UPDATE SET role = excluded.role " +
    "RETURNING id, email, role, vytvoreno"
  ).bind(data.servis.id, email, role).first();

  return json({ stav: "pridano", clen: vysledek });
}

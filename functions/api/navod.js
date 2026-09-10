// POST /api/navod — remember the walkthrough has been shown.
//
// One-way on purpose: there is no endpoint to un-see it, because re-running
// the tour is a button in Nastaveni that does not need the flag cleared. The
// flag only answers "should this open by itself on arrival".

import { json, nactiNastaveni } from "../../spolecne.js";

export async function onRequestPost(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  // The settings row may not exist yet — a brand new account sees the tour
  // before it ever opens Nastaveni.
  await nactiNastaveni(env, data.uzivatel.id);
  await env.DB.prepare(
    "UPDATE nastaveni_servisu SET navod_viden = 1 WHERE uzivatel_id = ?"
  ).bind(data.uzivatel.id).run();

  return json({ stav: "ulozeno" });
}

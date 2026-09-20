// GET /api/ja — who am I. The frontend's only window into the session:
// the cookie is HttpOnly, so this is how the page decides which screen
// to show.

import { json } from "../../spolecne.js";

export async function onRequestGet(context) {
  const uzivatel = context.data.uzivatel;
  if (!uzivatel) return json({ prihlasen: false });
  // The subscription rides along: the first paint decides on this answer
  // alone whether the app is in read-only mode.
  return json({
    prihlasen: true,
    email: uzivatel.email,
    predplatne: context.data.predplatne,
  });
}

// GET /api/ja — who am I. The frontend's only window into the session:
// the cookie is HttpOnly, so this is how the page decides which screen
// to show.
//
// It also carries the price list, the trial length and the VAT sentence —
// for a stranger too, because the signed-out screen IS the product's public
// page and has to show what the thing costs. The page therefore holds no
// amount of its own: one approved price list (cenik.js), one answer, no
// second place to forget.

import { json } from "../../spolecne.js";
import { CENIK, OBDOBI, CENA_DPH } from "../../cenik.js";
import { ZKUSEBNI_DNI } from "../../predplatne.js";

function verejne() {
  return {
    cenik: CENIK,
    obdobi: OBDOBI,
    zkusebni_dni: ZKUSEBNI_DNI,
    cena_dph: CENA_DPH,
  };
}

export async function onRequestGet(context) {
  const uzivatel = context.data.uzivatel;
  if (!uzivatel) return json({ prihlasen: false, ...verejne() });
  // The subscription rides along: the first paint decides on this answer
  // alone whether the app is in read-only mode.
  return json({
    prihlasen: true,
    email: uzivatel.email,
    predplatne: context.data.predplatne,
    ...verejne(),
  });
}

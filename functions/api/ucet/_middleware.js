// /api/ucet/* in a product that sells through Google Play — before the
// erasure (functions/api/ucet/smazat.js) decides.
//
// smazat.js refuses to erase an account whose Play subscription Google still
// renews, but it judges by the stored state, which may be a week old
// (play_nakupy.js KONTROLA_ZA): a subscription that went ON_HOLD, or was
// restored, after the last look slipped through, and Google went on charging
// for an account that no longer existed (audit 19. 11. 2026). This asks
// Google first, so the stored state smazat.js reads is today's.
//
// Why a middleware of the module and not code in smazat.js: smazat.js is
// template infrastructure that the template refresh copies into EVERY
// product with accounts — also those without the Play module, where an
// import of play_nakupy.js would break the build. This file travels with the
// module (stavitel._PLAY_PREDPLATNE) and exists exactly where play_nakupy.js
// does. Pages runs it after functions/api/_middleware.js (which signs the
// customer in) and before the handler.

import { json } from "../../../spolecne.js";
import { dostupne, overPredSmazanim } from "../../../play_nakupy.js";

const SMAZANI = /^\/api\/ucet\/smazat\/?$/;

export async function onRequest(context) {
  const { request, env, data } = context;
  // Not signed in: smazat.js answers 401 itself.
  if (request.method !== "POST" || !SMAZANI.test(new URL(request.url).pathname)
      || !data || !data.uzivatel || !dostupne(env)) {
    return context.next();
  }
  try {
    await overPredSmazanim(env, data.uzivatel.id);
  } catch {
    // Google unreachable: the stored state may be stale in exactly the way
    // that costs the customer money — wait rather than guess.
    return json({
      chyba: "Předplatné v Google Play se teď nepodařilo ověřit. Zkuste smazání účtu za chvíli znovu.",
      kod: "play_neovereno",
    }, 503);
  }
  return context.next();
}

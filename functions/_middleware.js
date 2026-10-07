// Session middleware: resolve the cookie once, hand the user to every
// handler via context.data.uzivatel. Handlers stay one-purpose files.
//
// Since a shop can have more than one person, the user is not the same thing
// as the shop: context.data.servis says WHICH shop this request acts for and
// with what role. Handlers read servis.id for data and servis.role for
// permission; data.uzivatel stays the signed-in person (account e-mail,
// export, account deletion).

// The subscription is resolved here too, for the same reason: it belongs to
// the SHOP (data.servis), not to the person, so an invited mechanic is not
// locked out of a warehouse the správce has paid for.

import { nactiKontext, nactiUzivatele } from "../spolecne.js";
import { stavPredplatneho } from "../predplatne.js";

export async function onRequest(context) {
  context.data.uzivatel = await nactiUzivatele(context.request, context.env);
  context.data.servis = await nactiKontext(context.env, context.data.uzivatel);
  context.data.predplatne = await stavPredplatneho(context.env, context.data.servis);
  return context.next();
}

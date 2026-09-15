// Session middleware: resolve the cookie once, hand the user to every
// handler via context.data.uzivatel. Handlers stay one-purpose files.
//
// Since a shop can have more than one person, the user is not the same thing
// as the shop: context.data.servis says WHICH shop this request acts for and
// with what role. Handlers read servis.id for data and servis.role for
// permission; data.uzivatel stays the signed-in person (account e-mail,
// export, account deletion).

import { nactiKontext, nactiUzivatele } from "../spolecne.js";

export async function onRequest(context) {
  context.data.uzivatel = await nactiUzivatele(context.request, context.env);
  context.data.servis = await nactiKontext(context.env, context.data.uzivatel);
  return context.next();
}

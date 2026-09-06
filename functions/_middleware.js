// Session middleware: resolve the cookie once, hand the user to every
// handler via context.data.uzivatel. Handlers stay one-purpose files.

import { nactiUzivatele } from "../spolecne.js";

export async function onRequest(context) {
  context.data.uzivatel = await nactiUzivatele(context.request, context.env);
  return context.next();
}

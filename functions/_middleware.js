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

import {
  hrubyLimit, json, nactiKontext, nactiUzivatele, zeStejneStranky,
} from "../spolecne.js";
import { stavPredplatneho } from "../predplatne.js";

// Public endpoints that write without a login: each request is a D1 write
// (and for the login link an e-mail from the firm's domain). Fenced HERE,
// in the product's own middleware, and not only in their handlers — the
// handlers are template files that a template refresh rewrites, and the
// fence must survive that. Only our own page may call them (Origin /
// Sec-Fetch-Site), and one address only so many times an hour.
// The login link is fenced only where e-mail really goes out: a development
// deployment hands the link back in the response (that is how the
// acceptance tests sign in, from a script without Origin) and sends nothing.
const VEREJNE_ZAPISY = {
  "/api/navsteva": { max: 20 },
  "/api/chyba-stranky": { max: 30 },
  "/api/prihlaseni": { max: 10, jenSEmaily: true },
};

function branaVerejnychZapisu(context) {
  const { request, env } = context;
  if (request.method !== "POST") return null;
  const cesta = new URL(request.url).pathname;
  const pravidlo = VEREJNE_ZAPISY[cesta];
  if (!pravidlo) return null;
  if (pravidlo.jenSEmaily && !(env.RESEND_API_KEY && env.EMAIL_ODESILATEL)) return null;
  if (!zeStejneStranky(request)) {
    return json({ chyba: "Požadavek musí přijít ze stránky aplikace." }, 403);
  }
  if (!hrubyLimit(request, `brana${cesta}`, pravidlo.max, 3600)) {
    return json({ chyba: "Příliš mnoho požadavků. Zkuste to prosím za hodinu." }, 429);
  }
  return null;
}

export async function onRequest(context) {
  const zastaveno = branaVerejnychZapisu(context);
  if (zastaveno) return zastaveno;
  context.data.uzivatel = await nactiUzivatele(context.request, context.env);
  context.data.servis = await nactiKontext(context.env, context.data.uzivatel);
  context.data.predplatne = await stavPredplatneho(context.env, context.data.servis);
  return context.next();
}

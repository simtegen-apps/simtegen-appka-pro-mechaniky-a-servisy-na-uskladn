// /api/hlaseni — the product's mailbox.
//
// GET  → the signed-in customer's own reports, newest first, with answers.
// POST → {text, kontext}: store the report, then mirror it as an issue in
//        the product's GitHub repo — ENCRYPTED (schranka_sifra.js), because
//        the repo is public; the issue carries only the report number and a
//        block only SimteGen can open. No account details even inside it.
//        The firm's triage reads issues; the customer never leaves the app.
//        Mirroring is best effort: a failed GitHub call must not lose the
//        report.
//
// Not gated by the subscription: reporting a problem is a right, not a
// feature.
//
// Limits (ochrana.vLimitu — one atomic INSERT … ON CONFLICT … RETURNING in
// D1, counted BEFORE anything is written): per account, per product per
// hour and per product per day. Before, the per-account limit was a SELECT
// COUNT and then the INSERT — 200 parallel POSTs all read n < 5 and each
// wrote a row and an issue in the public repo with the firm's token. Free
// trial accounts are cheap, so the product-wide caps keep the repo and the
// GitHub token's quota (shared with other products) safe.
//
// The firm's own demo and check accounts (@ukazka.invalid — the public
// 24-hour demo in the Google Play app, the check after deploy) keep their
// rows, but are not mirrored to GitHub: anyone can open the demo.

import { json } from "../../spolecne.js";
import { ocistiKontext, zrcadliHlaseni, MIN_DELKA, MAX_DELKA } from "../../schranka_sifra.js";
import { vLimitu } from "../../ochrana.js";

const LIMIT_UCET_HODINA = 5;
const LIMIT_CELKEM_HODINA = 30;
const LIMIT_CELKEM_DEN = 200;
const HODINA_S = 3600;
const DEN_S = 86400;
const UKAZKA_DOMENA = "@ukazka.invalid";

export async function onRequestGet(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  const radky = await env.DB.prepare(
    "SELECT id, text, stav, odpoved, vytvoreno, zmeneno FROM hlaseni " +
    "WHERE uzivatel_id = ? ORDER BY id DESC LIMIT 50"
  ).bind(data.uzivatel.id).all();
  return json({ hlaseni: radky.results });
}

export async function onRequestPost(context) {
  const { env, data, request } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Neplatný požadavek." }, 400);
  }
  const text = String((telo && telo.text) || "").trim();
  if (text.length < MIN_DELKA) return json({ chyba: "Napište nám prosím, o co jde." }, 422);
  if (text.length > MAX_DELKA) {
    return json({ chyba: `Zpráva je moc dlouhá (max ${MAX_DELKA} znaků).` }, 422);
  }

  // Atomic, before the write: the account's own counter first, then the
  // product's — a request refused by its account does not spend the
  // product-wide budget of other customers.
  if (!(await vLimitu(env, "hlaseni_ucet", String(data.uzivatel.id), LIMIT_UCET_HODINA, HODINA_S))) {
    return json({ chyba: "Za poslední hodinu jste poslali hodně zpráv — zkuste to prosím později." }, 429);
  }
  if (!(await vLimitu(env, "hlaseni", "vse", LIMIT_CELKEM_HODINA, HODINA_S))
      || !(await vLimitu(env, "hlaseni_den", "vse", LIMIT_CELKEM_DEN, DEN_S))) {
    return json({ chyba: "Teď přijímáme hodně hlášení — zkuste to prosím za hodinu." }, 429);
  }

  const vlozeno = await env.DB.prepare(
    "INSERT INTO hlaseni (uzivatel_id, text) VALUES (?, ?) RETURNING id, vytvoreno"
  ).bind(data.uzivatel.id, text).first();

  let zrcadlo = false;
  const ukazka = String(data.uzivatel.email || "").toLowerCase().endsWith(UKAZKA_DOMENA);
  const cislo = ukazka ? null : await zrcadliHlaseni(env, `Hlášení #${vlozeno.id}`, {
    zdroj: "ucet", id: vlozeno.id, text, kontext: ocistiKontext(telo.kontext),
  });
  if (cislo) {
    await env.DB.prepare("UPDATE hlaseni SET issue_cislo = ? WHERE id = ? AND uzivatel_id = ?")
      .bind(cislo, vlozeno.id, data.uzivatel.id).run();
    zrcadlo = true;
  }
  return json({ id: vlozeno.id, stav: "nove", zrcadlo });
}

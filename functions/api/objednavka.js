// /api/objednavka — ordering a subscription from inside the app.
//
// The legal shape comes from the terms (čl. 3 and 4): the customer sees the
// scope, length and total price, presses a button labelled "Objednávka
// zavazující k platbě", and — being a consumer — may tick a SEPARATE
// consent to start the paid service before the 14-day withdrawal window
// closes (§ 1837 l). Without that tick a consumer's paid period starts
// only after 14 days; a business customer has no such window.
//
// Money still never flows through the app: the order goes to the operator
// by e-mail (billing details included) for the invoice, and the customer
// gets a confirmation "in textual form" (the § 1837 l record). Resend is
// the only outbound channel here, and the manifest has always declared it.
//
// GET → the orders of THIS SHOP (data.servis), not of the signed-in person.
// One account is one shop, but a colleague invited through Tým signs in with
// their own e-mail; keying orders on the person would hide a colleague's
// order from the správce and let the "one open order at a time" check be
// walked around by ordering as the second team member.
//
// The table is objednavky_predplatneho, not objednavky: in this product
// "objednávky" is the tyre shop's booking calendar (migration 0002).
//
// Deliberately NOT behind vyzadujPredplatne: ordering is exactly what an
// expired account is supposed to be able to do. It IS behind smiSpravovat —
// an order binding the shop to pay is not a mechanic's call.

import { json, odepriSpravu, smiSpravovat, ted } from "../../spolecne.js";

const MAX_FAKTURACE = 600;

// Schválený ceník, měsíčně za provozovnu. Je tady a ne jen ve stránce
// schválně: cena na objednávce zavazující k platbě nesmí být to, co pošle
// prohlížeč. Frontend posílá jen klíč varianty, částku dopočítá server.
const VARIANTY = {
  solo: { nazev: "Sólo", mesic: 89 },
  zaklad: { nazev: "Základ", mesic: 129 },
  tym: { nazev: "Tým", mesic: 249 },
};

export async function onRequestGet(context) {
  const { env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  const radky = await env.DB.prepare(
    "SELECT id, mesice, varianta, cena_czk, spotrebitel, souhlas_zahajeni, stav, vytvoreno " +
    "FROM objednavky_predplatneho WHERE uzivatel_id = ? ORDER BY id DESC LIMIT 20"
  ).bind(data.servis.id).all();
  return json({ objednavky: radky.results, muze_objednat: smiSpravovat(data.servis) });
}

export async function onRequestPost(context) {
  const { env, data, request } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  if (!smiSpravovat(data.servis)) return odepriSpravu();

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Neplatný požadavek." }, 400);
  }
  const mesice = Number(telo && telo.mesice);
  if (!Number.isInteger(mesice) || mesice < 1 || mesice > 24) {
    return json({ chyba: "Zvolte délku předplatného 1–24 měsíců." }, 422);
  }
  const vybrana = VARIANTY[String((telo && telo.varianta) || "").trim()];
  if (!vybrana) return json({ chyba: "Zvolte prosím variantu předplatného." }, 422);
  const varianta = vybrana.nazev;
  const cena = vybrana.mesic * mesice;
  const fakturace = String((telo && telo.fakturace) || "").trim();
  if (fakturace.length < 3) {
    return json({ chyba: "Vyplňte prosím fakturační údaje (název nebo jméno, adresa, IČO máte-li)." }, 422);
  }
  if (fakturace.length > MAX_FAKTURACE) {
    return json({ chyba: `Fakturační údaje jsou moc dlouhé (max ${MAX_FAKTURACE} znaků).` }, 422);
  }
  const spotrebitel = Boolean(telo && telo.spotrebitel);
  const souhlas = Boolean(telo && telo.souhlas_zahajeni);

  const otevrena = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM objednavky_predplatneho " +
    "WHERE uzivatel_id = ? AND stav IN ('nova', 'fakturovana')"
  ).bind(data.servis.id).first();
  if (otevrena && otevrena.n > 0) {
    return json({ chyba: "Máte už rozpracovanou objednávku — počkejte prosím na fakturu." }, 409);
  }

  const vlozeno = await env.DB.prepare(
    "INSERT INTO objednavky_predplatneho (uzivatel_id, mesice, varianta, cena_czk, fakturace, " +
    "spotrebitel, souhlas_zahajeni, souhlas_cas) VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
    "RETURNING id, vytvoreno"
  ).bind(
    data.servis.id, mesice, varianta, cena,
    fakturace, spotrebitel ? 1 : 0, souhlas ? 1 : 0, souhlas ? ted() : null,
  ).first();

  const emaily = await posliEmaily(env, data.uzivatel.email, {
    id: vlozeno.id, mesice, varianta, cena, fakturace, spotrebitel, souhlas,
  });
  return json({ id: vlozeno.id, stav: "nova", varianta, cena_czk: cena, emaily });
}

async function posliEmaily(env, zakaznik, o) {
  // Two mails: the operator gets the order (with billing details), the
  // customer gets the confirmation in textual form. Without Resend both
  // are skipped and the caller reports it — the order itself is stored.
  if (!env.RESEND_API_KEY || !env.EMAIL_ODESILATEL) return false;
  const kontakt = env.KONTAKT_EMAIL || env.EMAIL_ODESILATEL;
  const shrnuti = `Předplatné na ${o.mesice} měsíců` + (o.varianta ? ` (${o.varianta})` : "")
    + (o.cena ? `, cena ${o.cena} Kč` : "") + `, objednávka č. ${o.id}.`;
  const souhlasText = o.spotrebitel
    ? (o.souhlas
      ? "Udělil(a) jste výslovný souhlas se zahájením poskytování placené služby před uplynutím " +
        "14denní lhůty pro odstoupení a byl(a) jste poučen(a), že tím právo na odstoupení ztrácíte " +
        "(§ 1837 písm. l) občanského zákoníku)."
      : "Souhlas se zahájením před uplynutím 14denní lhůty jste neudělil(a) — placená služba začne " +
        "po uplynutí 14 dnů; do té doby můžete odstoupit bez sankce.")
    : "";
  const zpravy = [
    {
      to: [kontakt],
      subject: `Objednávka č. ${o.id} — ${o.mesice} měs.`,
      text: `${shrnuti}\n\nFakturační údaje:\n${o.fakturace}\n\nE-mail účtu: ${zakaznik}\n` +
            `Spotřebitel: ${o.spotrebitel ? "ano" : "ne"}; souhlas se zahájením: ${o.souhlas ? "ano" : "ne"}.\n` +
            "Po zaplacení označ platbu workflow Predplatne.",
    },
    {
      to: [zakaznik],
      subject: "Potvrzení objednávky předplatného",
      text: `Dobrý den,\n\ndostali jsme vaši objednávku. ${shrnuti}\n\nFakturu vám pošleme e-mailem; ` +
            "zaplacené období uvidíte v aplikaci u účtu.\n" + (souhlasText ? `\n${souhlasText}\n` : "") +
            "\nObchodní podmínky a odstoupení od smlouvy: viz odkazy v aplikaci.\n",
    },
  ];
  let ok = true;
  for (const zprava of zpravy) {
    try {
      const odpoved = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_ODESILATEL, ...zprava }),
      });
      ok = ok && odpoved.ok;
    } catch {
      ok = false;
    }
  }
  return ok;
}

// GET  /api/priprava?den=YYYY-MM-DD — what to pull off the rack (default: tomorrow).
// POST /api/priprava {den} — mail that list to the shop's own address.
//
// This is the owner's "remind me to get the wheels ready". Pages Functions
// have no cron, so there is no 18:00 push and the app does not pretend
// otherwise: the count is computed every time the app opens, and the mechanic
// can send himself the list with one tap when he locks up. The e-mail goes to
// the account address only — never to a motorist.

import {
  denACas, epochZDataCasu, json, nactiNastaveni, objednavkaProFrontend, ocisti,
  ted, zacatekDne, DEN, OBJEDNAVKY_SELECT,
} from "../../spolecne.js";
import { vyzadujPredplatne } from "../../predplatne.js";

// E-mails with the preparation list per shop per day (see onRequestPost).
const SEZNAMU_ZA_DEN = 5;

const NAZVY_UKONU = {
  prezuti: "přezutí",
  uskladneni: "uskladnění",
  vydej: "výdej pneu",
  oprava: "oprava",
};

// The mail goes to the person who tapped the button, so it speaks the
// language that person chose in the app (predvolby, migration 0011). No
// choice = Czech, as before.
const NAZVY_UKONU_EN = {
  prezuti: "tyre change",
  uskladneni: "storage",
  vydej: "tyre release",
  oprava: "repair",
};

function textCesky(den, polozky, nazev) {
  const radky = polozky.map((p) => {
    const kola = p.kod
      ? `sada ${p.kod}, místo ${p.pozice || "neuvedeno"}`
      : "bez uskladněné sady";
    const disky = p.ukon === "prezuti"
      ? (p.na_discich ? ", na discích" : ", bez disků") : "";
    const kdy = p.cely_den ? "celý den" : p.cas;
    return `${kdy}  ${p.nazev} — ${NAZVY_UKONU[p.ukon] || p.ukon}${disky}\n        ${kola}`;
  });
  return {
    predmet: `Příprava na ${den} — ${polozky.length} objednávek`,
    text: `Dobrý den,\n\npříprava na ${den} — ${polozky.length} objednávek:\n\n`
      + `${radky.join("\n")}\n\n`
      + "Kola s pneu si prosím připravte předem podle uvedených míst ve skladu.\n"
      + `${nazev || "Pneusklad"}\n`,
  };
}

function textAnglicky(den, polozky, nazev) {
  const radky = polozky.map((p) => {
    const kola = p.kod
      ? `set ${p.kod}, rack position ${p.pozice || "not given"}`
      : "no stored set";
    const disky = p.ukon === "prezuti"
      ? (p.na_discich ? ", on rims" : ", without rims") : "";
    const kdy = p.cely_den ? "all day" : p.cas;
    return `${kdy}  ${p.nazev} — ${NAZVY_UKONU_EN[p.ukon] || p.ukon}${disky}\n        ${kola}`;
  });
  const pocet = `${polozky.length} ${polozky.length === 1 ? "booking" : "bookings"}`;
  return {
    predmet: `Prepare for ${den} — ${pocet}`,
    text: `Hello,\n\nto prepare for ${den} — ${pocet}:\n\n`
      + `${radky.join("\n")}\n\n`
      + "Please get the wheels ready in advance from the rack positions listed above.\n"
      + `${nazev || "Pneusklad"}\n`,
  };
}

async function seznam(env, uzivatelId, den) {
  const od = epochZDataCasu(den, "00:00") ?? (zacatekDne(ted()) + DEN);
  const nalezene = await env.DB.prepare(
    `${OBJEDNAVKY_SELECT} WHERE o.uzivatel_id = ? AND o.datum >= ? AND o.datum < ? ` +
    "AND o.stav = 'planovano' ORDER BY o.datum"
  ).bind(uzivatelId, od, od + DEN).all();
  return { od, polozky: nalezene.results.map(objednavkaProFrontend) };
}

export async function onRequestGet(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  const zadany = ocisti(new URL(request.url).searchParams.get("den"), 10);
  const vychozi = denACas(zacatekDne(ted()) + DEN).den;
  const den = /^\d{4}-\d{2}-\d{2}$/.test(zadany) ? zadany : vychozi;

  const { polozky } = await seznam(env, data.servis.id, den);
  return json({
    den,
    polozky,
    zbyva: polozky.filter((p) => !p.pripraveno).length,
  });
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  const stop = vyzadujPredplatne(context);
  if (stop) return stop;

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }

  const zadany = ocisti(telo.den, 10);
  const den = /^\d{4}-\d{2}-\d{2}$/.test(zadany)
    ? zadany : denACas(zacatekDne(ted()) + DEN).den;

  const { polozky } = await seznam(env, data.servis.id, den);
  if (!polozky.length) {
    return json({ chyba: "Na tento den nemáte žádné naplánované objednávky." }, 409);
  }

  const nastaveni = await nactiNastaveni(env, data.servis.id);
  const volba = await env.DB.prepare(
    "SELECT jazyk FROM predvolby WHERE uzivatel_id = ?"
  ).bind(data.uzivatel.id).first();
  const anglicky = !!volba && volba.jazyk === "en";
  const { predmet, text } = anglicky
    ? textAnglicky(den, polozky, nastaveni.nazev)
    : textCesky(den, polozky, nastaveni.nazev);

  if (!env.RESEND_API_KEY || !env.EMAIL_ODESILATEL) {
    return json({
      stav: "vyvojovy_rezim",
      nahled: text,
      upozorneni: "Odesílání e-mailů není na tomto nasazení nastavené — "
        + "níže je náhled toho, co by přišlo do e-mailu.",
    });
  }

  // At most SEZNAMU_ZA_DEN mails per shop in a fixed one-day window
  // (migration 0010): counted before sending, so a failed send still counts
  // — a loop must not get around it by making Resend fail.
  const nyni = ted();
  const okno = await env.DB.prepare(
    "UPDATE nastaveni_servisu SET " +
    "priprava_pocet = CASE WHEN priprava_od > ? THEN priprava_pocet + 1 ELSE 1 END, " +
    "priprava_od = CASE WHEN priprava_od > ? THEN priprava_od ELSE ? END " +
    "WHERE uzivatel_id = ? RETURNING priprava_pocet"
  ).bind(nyni - DEN, nyni - DEN, nyni, data.servis.id).first();
  if (okno && okno.priprava_pocet > SEZNAMU_ZA_DEN) {
    return json({
      chyba: `Seznam jste dnes poslali už ${SEZNAMU_ZA_DEN}×. Další půjde odeslat zítra; `
        + "do té doby ho máte tady na obrazovce nebo v připomínce do kalendáře.",
    }, 429);
  }

  const odpoved = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_ODESILATEL,
      to: [data.uzivatel.email],
      subject: predmet,
      text,
    }),
  });
  if (!odpoved.ok) {
    return json({ chyba: "Odeslání e-mailu se nepodařilo. Zkuste to prosím znovu." }, 502);
  }
  return json({ stav: "odeslano", pocet: polozky.length });
}

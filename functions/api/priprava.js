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

const NAZVY_UKONU = {
  prezuti: "přezutí",
  prehozeni: "přehození kol",
  uskladneni: "uskladnění",
  vydej: "výdej pneu",
  oprava: "oprava",
};

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

  const { polozky } = await seznam(env, data.uzivatel.id, den);
  return json({
    den,
    polozky,
    zbyva: polozky.filter((p) => !p.pripraveno).length,
  });
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }

  const zadany = ocisti(telo.den, 10);
  const den = /^\d{4}-\d{2}-\d{2}$/.test(zadany)
    ? zadany : denACas(zacatekDne(ted()) + DEN).den;

  const { polozky } = await seznam(env, data.uzivatel.id, den);
  if (!polozky.length) {
    return json({ chyba: "Na tento den nemáte žádné naplánované objednávky." }, 409);
  }

  const nastaveni = await nactiNastaveni(env, data.uzivatel.id);
  const radky = polozky.map((p) => {
    const kola = p.kod
      ? `sada ${p.kod}, místo ${p.pozice || "neuvedeno"}`
      : "bez uskladněné sady";
    return `${p.cas}  ${p.nazev} — ${NAZVY_UKONU[p.ukon] || p.ukon}\n        ${kola}`;
  });
  const text =
    `Dobrý den,\n\npříprava na ${den} — ${polozky.length} objednávek:\n\n`
    + `${radky.join("\n")}\n\n`
    + "Kola s pneu si prosím připravte předem podle uvedených míst ve skladu.\n"
    + `${nastaveni.nazev || "Pneusklad"}\n`;

  if (!env.RESEND_API_KEY || !env.EMAIL_ODESILATEL) {
    return json({
      stav: "vyvojovy_rezim",
      nahled: text,
      upozorneni: "Odesílání e-mailů není na tomto nasazení nastavené — "
        + "níže je náhled toho, co by přišlo do e-mailu.",
    });
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
      subject: `Příprava na ${den} — ${polozky.length} objednávek`,
      text,
    }),
  });
  if (!odpoved.ok) {
    return json({ chyba: "Odeslání e-mailu se nepodařilo. Zkuste to prosím znovu." }, 502);
  }
  return json({ stav: "odeslano", pocet: polozky.length });
}

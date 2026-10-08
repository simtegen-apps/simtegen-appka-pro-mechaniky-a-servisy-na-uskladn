// GET  /api/sady?q=…&stav=… — the warehouse: search and list.
// POST /api/sady — take a set into storage, return its printable code.
//
// Search matters more than anything else in this product: the mechanic is
// standing in the rack with a phone in one hand. One query field covers code,
// plate, name and phone, because that is what he actually has — a customer
// saying a name, a car in the doorway, or a barcode scanner typing the code.

import {
  bezDiakritiky, cislo, json, nactiNastaveni, novyKodSady, ocisti, odepriZapis,
  smiPsat, sqlBezDiakritiky, ted, zkontrolujLimit, SADY_SELECT, TYPY_PNEU,
} from "../../spolecne.js";
import { vyzadujPredplatne } from "../../predplatne.js";

const STAVY = ["uskladneno", "vydano", "vse"];

// Čtyři hotové dotazy místo jednoho skládaného z kousků. Vypadá to
// ukecaněji, ale SQL je tím pádem zapsaný text — nic se do něj za běhu
// nelepí, takže se do něj ani nedá nic propašovat. Hodnoty jdou výhradně
// do .bind() a pořadí vazeb kopíruje pořadí otazníků: účet, [stav],
// [šestkrát hledaný výraz].
//
// Diakritika se srovnává na obou stranách, takže „sim“ najde Šimona a „Š“
// taky. Telefon a značku servis píše, jak mu přijde pod ruku („601 000 101“,
// „1AB 2345“), ale hledá je bez mezer — proto obě podoby.
const SADY_HLEDANI =
  `(${sqlBezDiakritiky("s.kod")} LIKE ? OR ${sqlBezDiakritiky("s.spz")} LIKE ? ` +
  `OR REPLACE(${sqlBezDiakritiky("s.spz")}, ' ', '') LIKE ? ` +
  `OR ${sqlBezDiakritiky("z.jmeno")} LIKE ? ` +
  `OR REPLACE(z.telefon, ' ', '') LIKE ? OR ${sqlBezDiakritiky("s.pozice")} LIKE ?)`;
const SADY_RAZENI = "ORDER BY s.stav, s.datum_prijmu DESC LIMIT 60";
const SADY_VSE = `${SADY_SELECT} WHERE s.uzivatel_id = ? ${SADY_RAZENI}`;
const SADY_STAV = `${SADY_SELECT} WHERE s.uzivatel_id = ? AND s.stav = ? ${SADY_RAZENI}`;
const SADY_VSE_HLEDANI =
  `${SADY_SELECT} WHERE s.uzivatel_id = ? AND ${SADY_HLEDANI} ${SADY_RAZENI}`;
const SADY_STAV_HLEDANI =
  `${SADY_SELECT} WHERE s.uzivatel_id = ? AND s.stav = ? AND ${SADY_HLEDANI} ${SADY_RAZENI}`;

function hloubka(hodnota) {
  // The mechanic types millimetres ("5,5"), the column holds tenths.
  const n = Number(String(hodnota == null ? "" : hodnota).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.round(n * 10), 250);
}

export async function onRequestGet(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);

  const parametry = new URL(request.url).searchParams;
  const q = ocisti(parametry.get("q"), 60);
  const stav = STAVY.includes(parametry.get("stav")) ? parametry.get("stav") : "uskladneno";

  const vsechny = stav === "vse";
  const vazby = [data.servis.id];
  if (!vsechny) vazby.push(stav);
  if (q) {
    const vzor = `%${bezDiakritiky(q)}%`;
    const bezMezer = `%${bezDiakritiky(q).replace(/\s/g, "")}%`;
    vazby.push(vzor, vzor, bezMezer, vzor, bezMezer, vzor);
  }

  let nalezene;
  if (q && !vsechny) {
    nalezene = await env.DB.prepare(SADY_STAV_HLEDANI).bind(...vazby).all();
  } else if (q) {
    nalezene = await env.DB.prepare(SADY_VSE_HLEDANI).bind(...vazby).all();
  } else if (!vsechny) {
    nalezene = await env.DB.prepare(SADY_STAV).bind(...vazby).all();
  } else {
    nalezene = await env.DB.prepare(SADY_VSE).bind(...vazby).all();
  }

  const celkem = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM sady WHERE uzivatel_id = ? AND stav = 'uskladneno'"
  ).bind(data.servis.id).first();

  return json({ sady: nalezene.results, uskladneno: celkem.n });
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  // Subscription before role: a shop whose period ran out should read that,
  // not "požádejte správce o vyšší oprávnění".
  const stop = vyzadujPredplatne(context);
  if (stop) return stop;
  if (!smiPsat(data.servis)) return odepriZapis();

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }

  const nastaveni = await nactiNastaveni(env, data.servis.id);
  const zamitnuti = await zkontrolujLimit(env, data.servis.id, nastaveni);
  if (zamitnuti) return json({ chyba: zamitnuti }, 403);

  // Either an existing motorist or a new one created in the same step — the
  // wizard must not force the mechanic out to a second screen mid-handover.
  let zakaznikId = Number(telo.zakaznik_id) || 0;
  if (zakaznikId) {
    const existuje = await env.DB.prepare(
      "SELECT id FROM zakaznici WHERE uzivatel_id = ? AND id = ?"
    ).bind(data.servis.id, zakaznikId).first();
    if (!existuje) return json({ chyba: "Zákazník nebyl nalezen." }, 404);
  } else {
    const jmeno = ocisti(telo.jmeno, 80);
    const telefon = ocisti(telo.telefon, 30);
    if (!jmeno) return json({ chyba: "Zadejte prosím jméno zákazníka." }, 422);
    if (!telefon) return json({ chyba: "Zadejte prosím telefon zákazníka." }, 422);
    const novy = await env.DB.prepare(
      "INSERT INTO zakaznici (uzivatel_id, jmeno, telefon, email) " +
      "VALUES (?, ?, ?, ?) RETURNING id"
    ).bind(data.servis.id, jmeno, telefon, ocisti(telo.email, 120)).first();
    zakaznikId = novy.id;
  }

  const kod = await novyKodSady(env, data.servis.id);
  const typ = TYPY_PNEU.includes(telo.typ) ? telo.typ : "zimni";
  const pocet = Math.min(Math.max(cislo(telo.pocet_kusu, 4), 1), 8);
  const cena = Math.min(Math.max(cislo(telo.cena_skladovani, nastaveni.vychozi_cena), 0), 100000);

  const sada = await env.DB.prepare(
    "INSERT INTO sady (uzivatel_id, zakaznik_id, kod, spz, vozidlo, typ, rozmer, " +
    "pocet_kusu, dezen, na_discich, hloubka_lp, hloubka_pp, hloubka_lz, hloubka_pz, " +
    "pozice, datum_prijmu, cena_skladovani, poznamka) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id"
  ).bind(
    data.servis.id, zakaznikId, kod,
    ocisti(telo.spz, 15).toUpperCase(), ocisti(telo.vozidlo, 60), typ,
    ocisti(telo.rozmer, 30), pocet, ocisti(telo.dezen, 60),
    telo.na_discich === false ? 0 : 1,
    hloubka(telo.hloubka_lp), hloubka(telo.hloubka_pp),
    hloubka(telo.hloubka_lz), hloubka(telo.hloubka_pz),
    ocisti(telo.pozice, 40), ted(), cena, ocisti(telo.poznamka, 300),
  ).first();

  await env.DB.prepare(
    "INSERT INTO pohyby (uzivatel_id, sada_id, typ, datum, poznamka) VALUES (?, ?, ?, ?, ?)"
  ).bind(data.servis.id, sada.id, "prijem", ted(), ocisti(telo.pozice, 40)).run();

  const ulozena = await env.DB.prepare(
    `${SADY_SELECT} WHERE s.uzivatel_id = ? AND s.id = ?`
  ).bind(data.servis.id, sada.id).first();

  return json({ stav: "uskladneno", sada: ulozena });
}

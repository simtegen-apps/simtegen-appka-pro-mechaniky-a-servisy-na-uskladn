// POST /api/ukazka {akce: naplnit|smazat} — fill the account with a rack full
// of example data, or remove it again.
//
// A demo that opens on an empty warehouse demonstrates nothing, and typing
// twelve sets in front of a customer is not a demo either. Everything created
// here carries ukazka = 1, so "remove example data" is exact and can never
// touch a real set the shop entered afterwards.
//
// The names, plates and phone numbers are INVENTED. No real motorist's data
// ever goes into a seed script: the numbers are in the 601 000 xxx block used
// for examples and the plates are not issued sequences.

import {
  cislo, denACas, json, nactiNastaveni, odepriSpravu, smiSpravovat, ted,
  zacatekDne, DEN,
} from "../../spolecne.js";

const ZAKAZNICI = [
  { jmeno: "Jana Dvořáková", telefon: "601 000 101", email: "" },
  { jmeno: "Petr Novotný", telefon: "601 000 102", email: "" },
  { jmeno: "Marie Kučerová", telefon: "601 000 103", email: "" },
  { jmeno: "Tomáš Beneš", telefon: "601 000 104", email: "" },
  { jmeno: "Lucie Horáková", telefon: "601 000 105", email: "" },
  { jmeno: "Autodoprava Krátký s.r.o.", telefon: "601 000 106", email: "" },
];

// zakaznik = index into ZAKAZNICI, hloubky in tenths of a millimetre,
// pred = days ago the set was taken in.
const SADY = [
  { zakaznik: 0, spz: "1AB 2345", vozidlo: "Škoda Octavia III", typ: "letni", rozmer: "205/55 R16", dezen: "Continental PremiumContact", hloubky: [62, 60, 58, 59], pozice: "A1-03", pred: 140, cena: 800, zaplaceno: 1 },
  { zakaznik: 0, spz: "1AB 2345", vozidlo: "Škoda Octavia III", typ: "zimni", rozmer: "195/65 R15", dezen: "Nokian WR", hloubky: [38, 36, 41, 40], pozice: "A1-04", pred: 20, cena: 800, zaplaceno: 0 },
  { zakaznik: 1, spz: "2CD 6789", vozidlo: "VW Golf VII", typ: "letni", rozmer: "225/45 R17", dezen: "Michelin Primacy", hloubky: [55, 54, 52, 53], pozice: "A2-01", pred: 135, cena: 900, zaplaceno: 1 },
  { zakaznik: 2, spz: "3EF 1122", vozidlo: "Hyundai i30", typ: "letni", rozmer: "195/65 R15", dezen: "Barum Bravuris", hloubky: [33, 35, 30, 31], pozice: "A2-05", pred: 150, cena: 700, zaplaceno: 0 },
  { zakaznik: 2, spz: "3EF 1122", vozidlo: "Hyundai i30", typ: "zimni", rozmer: "195/65 R15", dezen: "Semperit Speed-Grip", hloubky: [70, 68, 71, 69], pozice: "A2-06", pred: 25, cena: 700, zaplaceno: 1 },
  { zakaznik: 3, spz: "4GH 3344", vozidlo: "Ford Focus", typ: "letni", rozmer: "215/55 R16", dezen: "Goodyear EfficientGrip", hloubky: [48, 47, 45, 46], pozice: "B1-02", pred: 138, cena: 800, zaplaceno: 1 },
  { zakaznik: 3, spz: "4GH 3344", vozidlo: "Ford Focus", typ: "zimni", rozmer: "215/55 R16", dezen: "Dunlop Winter Sport", hloubky: [29, 31, 28, 30], pozice: "B1-03", pred: 18, cena: 800, zaplaceno: 0 },
  { zakaznik: 4, spz: "5IJ 5566", vozidlo: "Toyota Yaris", typ: "letni", rozmer: "175/65 R15", dezen: "Kleber Dynaxer", hloubky: [58, 57, 60, 59], pozice: "B2-01", pred: 142, cena: 650, zaplaceno: 1 },
  { zakaznik: 4, spz: "5IJ 5566", vozidlo: "Toyota Yaris", typ: "zimni", rozmer: "175/65 R15", dezen: "Matador Sibir Snow", hloubky: [36, 34, 37, 38], pozice: "B2-02", pred: 22, cena: 650, zaplaceno: 0 },
  { zakaznik: 5, spz: "6KL 7788", vozidlo: "Renault Master", typ: "letni", rozmer: "225/65 R16C", dezen: "Hankook Vantra", hloubky: [51, 50, 49, 52], pozice: "C1-01", pred: 145, cena: 1200, zaplaceno: 1 },
  { zakaznik: 5, spz: "6KL 7788", vozidlo: "Renault Master", typ: "zimni", rozmer: "225/65 R16C", dezen: "Continental VanContact", hloubky: [64, 63, 66, 65], pozice: "C1-02", pred: 30, cena: 1200, zaplaceno: 0 },
  { zakaznik: 1, spz: "2CD 6789", vozidlo: "VW Golf VII", typ: "zimni", rozmer: "205/55 R16", dezen: "Nokian Snowproof", hloubky: [72, 71, 70, 73], pozice: "A2-02", pred: 27, cena: 900, zaplaceno: 1 },
];

// posun = days from today (1 = tomorrow), sada = index into SADY.
const OBJEDNAVKY = [
  { posun: 0, cas: "09:00", sada: 1, ukon: "prezuti", delka: 45, poznamka: "" },
  { posun: 0, cas: "13:30", sada: null, zakaznik: null, jmeno: "Průjezd — oprava defektu", ukon: "oprava", delka: 30, poznamka: "" },
  { posun: 1, cas: "08:00", sada: 6, ukon: "prezuti", delka: 45, poznamka: "Chce doměřit tlaky." },
  { posun: 1, cas: "10:15", sada: 8, ukon: "prezuti", delka: 45, poznamka: "" },
  { posun: 2, cas: "11:00", sada: 4, ukon: "vydej", delka: 20, poznamka: "Ruší uskladnění." },
];

// Returns how many example customers had to stay behind.
//
// The order matters and so does the last WHERE clause. sady.zakaznik_id
// cascades, so deleting an example customer would take with it any REAL set
// the shop wrote against that customer while trying the app out — the exact
// records the subscription is paid for, and the opposite of what the button
// promises. So: example sets first, then only those example customers that
// nothing real points at any more. A customer with a real set or a real
// booking survives, same as /api/zakaznici refuses to delete one.
async function smazUkazku(env, uzivatelId) {
  await env.DB.batch([
    // Bookings made against an example set go with the set; on their own they
    // would survive as nameless rows (sada_id is ON DELETE SET NULL).
    env.DB.prepare(
      "DELETE FROM objednavky WHERE uzivatel_id = ? AND (ukazka = 1 OR sada_id IN " +
      "(SELECT id FROM sady WHERE uzivatel_id = ? AND ukazka = 1))"
    ).bind(uzivatelId, uzivatelId),
    env.DB.prepare(
      "DELETE FROM pohyby WHERE uzivatel_id = ? AND sada_id IN " +
      "(SELECT id FROM sady WHERE uzivatel_id = ? AND ukazka = 1)"
    ).bind(uzivatelId, uzivatelId),
    env.DB.prepare("DELETE FROM sady WHERE uzivatel_id = ? AND ukazka = 1").bind(uzivatelId),
  ]);

  // Every set left at this point is a real one, hence the plain subquery.
  // objednavky.zakaznik_id is nullable and a NULL inside NOT IN would make the
  // whole predicate never true, which is why it is filtered out explicitly.
  await env.DB.prepare(
    "DELETE FROM zakaznici WHERE uzivatel_id = ? AND ukazka = 1 " +
    "AND id NOT IN (SELECT zakaznik_id FROM sady WHERE uzivatel_id = ?) " +
    "AND id NOT IN (SELECT zakaznik_id FROM objednavky WHERE uzivatel_id = ? " +
    "AND zakaznik_id IS NOT NULL)"
  ).bind(uzivatelId, uzivatelId, uzivatelId).run();

  const ponechani = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM zakaznici WHERE uzivatel_id = ? AND ukazka = 1"
  ).bind(uzivatelId).first();
  return ponechani.n;
}

export async function onRequestPost(context) {
  const { request, env, data } = context;
  if (!data.uzivatel) return json({ chyba: "Nejste přihlášeni." }, 401);
  if (!smiSpravovat(data.servis)) return odepriSpravu();

  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Tělo požadavku musí být JSON." }, 400);
  }

  const uzivatelId = data.servis.id;

  if (telo.akce === "smazat") {
    const ponechani = await smazUkazku(env, uzivatelId);
    return json({ stav: "smazano", ponechani });
  }
  if (telo.akce !== "naplnit") return json({ chyba: "Neznámá akce." }, 422);

  // Idempotent: filling twice must not leave two racks of the same wheels.
  await smazUkazku(env, uzivatelId);

  const nastaveni = await nactiNastaveni(env, uzivatelId);
  if (!nastaveni.nazev) {
    await env.DB.prepare(
      "UPDATE nastaveni_servisu SET nazev = ?, telefon = ?, adresa = ? WHERE uzivatel_id = ?"
    ).bind("Pneuservis Ukázka", "601 000 100", "Dílenská 1, Brno", uzivatelId).run();
  }

  const zakaznikIdy = [];
  for (const z of ZAKAZNICI) {
    // An example customer can survive deletion because the shop hung a real
    // set on them. Reuse that row rather than adding a twin with the same name.
    const existujici = await env.DB.prepare(
      "SELECT id FROM zakaznici WHERE uzivatel_id = ? AND ukazka = 1 AND jmeno = ?"
    ).bind(uzivatelId, z.jmeno).first();
    if (existujici) {
      zakaznikIdy.push(existujici.id);
      continue;
    }
    const radek = await env.DB.prepare(
      "INSERT INTO zakaznici (uzivatel_id, jmeno, telefon, email, ukazka) " +
      "VALUES (?, ?, ?, ?, 1) RETURNING id"
    ).bind(uzivatelId, z.jmeno, z.telefon, z.email).first();
    zakaznikIdy.push(radek.id);
  }

  const nyni = ted();
  const rok = denACas(nyni).den.slice(2, 4);
  const sadaIdy = [];
  let cislovani = cislo(nastaveni.posledni_cislo, 0);

  for (const s of SADY) {
    cislovani += 1;
    const kod = `${rok}-${String(cislovani).padStart(4, "0")}`;
    const prijem = nyni - s.pred * DEN;
    const radek = await env.DB.prepare(
      "INSERT INTO sady (uzivatel_id, zakaznik_id, kod, spz, vozidlo, typ, rozmer, " +
      "pocet_kusu, dezen, na_discich, hloubka_lp, hloubka_pp, hloubka_lz, hloubka_pz, " +
      "pozice, datum_prijmu, cena_skladovani, zaplaceno, ukazka) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, 4, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 1) RETURNING id"
    ).bind(
      uzivatelId, zakaznikIdy[s.zakaznik], kod, s.spz, s.vozidlo, s.typ, s.rozmer,
      s.dezen, s.hloubky[0], s.hloubky[1], s.hloubky[2], s.hloubky[3],
      s.pozice, prijem, s.cena, s.zaplaceno,
    ).first();
    sadaIdy.push(radek.id);
    await env.DB.prepare(
      "INSERT INTO pohyby (uzivatel_id, sada_id, typ, datum, poznamka) VALUES (?, ?, ?, ?, ?)"
    ).bind(uzivatelId, radek.id, "prijem", prijem, s.pozice).run();
  }

  await env.DB.prepare(
    "UPDATE nastaveni_servisu SET posledni_cislo = ? WHERE uzivatel_id = ?"
  ).bind(cislovani, uzivatelId).run();

  const dnesniPolnoc = zacatekDne(nyni);
  for (const o of OBJEDNAVKY) {
    const [hodina, minuta] = o.cas.split(":").map(Number);
    // Day boundary from the Prague clock, time-of-day added on top: an example
    // booking must read 08:00 in the shop, not 07:00 after the clocks change.
    const datum = dnesniPolnoc + o.posun * DEN + hodina * 3600 + minuta * 60;
    const sadaId = o.sada == null ? null : sadaIdy[o.sada];
    const zakaznikId = o.sada == null ? null : zakaznikIdy[SADY[o.sada].zakaznik];
    await env.DB.prepare(
      "INSERT INTO objednavky (uzivatel_id, zakaznik_id, sada_id, jmeno_bez_zakaznika, " +
      "datum, delka_min, ukon, poznamka, ukazka) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
    ).bind(
      uzivatelId, zakaznikId, sadaId, zakaznikId ? "" : (o.jmeno || ""),
      datum, o.delka, o.ukon, o.poznamka,
    ).run();
  }

  return json({
    stav: "naplneno",
    zakazniku: ZAKAZNICI.length,
    sad: SADY.length,
    objednavek: OBJEDNAVKY.length,
  });
}

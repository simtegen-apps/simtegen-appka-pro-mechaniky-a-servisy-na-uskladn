// Subscription state, read-only from the app's point of view.
//
// Money never flows through a product: the owner invoices the customer,
// sees the payment in the bank and marks it with the "Predplatne" workflow,
// which writes plati_do into the predplatne table. This module only answers
// "is this account paid up?" — three states, nothing else to get wrong:
//
//   zkusebni  — no paid period yet, the trial has not run out
//   aktivni   — plati_do lies in the future
//   vyprselo  — neither
//
// Lives OUTSIDE functions/ like spolecne.js: everything under functions/ is
// a route candidate.
//
// Two deliberate differences from the template module:
//
// 1. It is keyed on the SHOP, not on the person. One account is one shop,
//    but a colleague invited through Tým signs in with their own e-mail
//    (see nactiKontext in spolecne.js). Keying on the signed-in user would
//    hand a 402 to the mechanic of a shop whose správce has paid.
// 2. The trial end comes from nastaveni_servisu.zkusebni_do when that row
//    exists. Shops that started under the old 60-day trial keep the date
//    they were promised; everyone else gets ZKUSEBNI_DNI from the day the
//    account was created.

import { json, ted } from "./spolecne.js";

export const ZKUSEBNI_DNI = 14;

const DEN = 24 * 3600;

function dni(sekundy) {
  return Math.max(0, Math.ceil(sekundy / DEN));
}

export async function stavPredplatneho(env, servis) {
  if (!servis) return null;
  // One indexed read per request, and deliberately no write: nactiNastaveni()
  // creates the settings row on first read, and a middleware that quietly
  // INSERTs on every call is a surprise nobody goes looking for.
  const radek = await env.DB.prepare(
    "SELECT u.vytvoreno, p.plati_do, p.poznamka, n.zkusebni_do " +
    "FROM uzivatele u " +
    "LEFT JOIN predplatne p ON p.uzivatel_id = u.id " +
    "LEFT JOIN nastaveni_servisu n ON n.uzivatel_id = u.id " +
    "WHERE u.id = ?"
  ).bind(servis.id).first();
  if (!radek) return { stav: "vyprselo", plati_do: null, zkusebni_do: null, dni_zbyva: 0 };

  const nyni = ted();
  const zkusebniDo = radek.zkusebni_do || (radek.vytvoreno + ZKUSEBNI_DNI * DEN);

  if (radek.plati_do && radek.plati_do > nyni) {
    return {
      stav: "aktivni",
      plati_do: radek.plati_do,
      zkusebni_do: zkusebniDo,
      dni_zbyva: dni(radek.plati_do - nyni),
      poznamka: radek.poznamka || "",
    };
  }
  if (zkusebniDo > nyni) {
    return {
      stav: "zkusebni",
      plati_do: radek.plati_do || null,
      zkusebni_do: zkusebniDo,
      dni_zbyva: dni(zkusebniDo - nyni),
      poznamka: "",
    };
  }
  return {
    stav: "vyprselo",
    plati_do: radek.plati_do || null,
    zkusebni_do: zkusebniDo,
    dni_zbyva: 0,
    poznamka: radek.poznamka || "",
  };
}

// For PRODUCT routes only — never for account, export, deletion or login:
// the customer's rights do not expire with the subscription. Returns the
// Response to send (402) or null to carry on. Usage at the top of a handler:
//
//   const stop = vyzadujPredplatne(context); if (stop) return stop;
//
// Reads stay open on purpose. The shop is physically holding other people's
// wheels; an evidence it cannot open is an evidence that cannot hand a set
// back to its owner. Expiry stops writing, not looking.
export function vyzadujPredplatne(context) {
  const p = context.data.predplatne;
  if (p && p.stav !== "vyprselo") return null;
  return json({
    chyba: "Předplatné skončilo. Evidenci máte dál k nahlédnutí, "
      + "zapisovat půjde po obnovení předplatného.",
    predplatne: p || null,
  }, 402);
}

// POST /api/navsteva {stranka} — one anonymous page view.
//
// Counts only. No cookie, no IP, no account: the row is (day, page, count),
// so the review can see how many people reached the landing screen versus
// how many created an account, and the privacy policy stays true — this
// is not tracking, it is a tally mark. Unauthenticated on purpose: the
// visitors we care about are the ones without an account yet. Bots
// inflate it; a product with real customers does not decide on this
// number alone.

import { hrubyLimit, json, zeStejneStranky } from "../../spolecne.js";
import { adresaKlienta, vLimitu } from "../../ochrana.js";

const STRANKY = new Set(["uvod", "cenik", "prihlaseni"]);
// Counted in D1 (ochrana.js), not only in the worker's memory: a script
// spread over many addresses and isolates still hits the product-wide cap.
const ZA_HODINU_Z_ADRESY = 20;
const ZA_HODINU_CELKEM = 1000;

export async function onRequestPost(context) {
  const { env, request } = context;
  // Only our own page counts, and one address a few times an hour: a script
  // must not be able to inflate the numbers or burn the D1 write quota
  // (spolecne.zeStejneStranky, hrubyLimit). Nothing about the visitor stored.
  if (!zeStejneStranky(request)) return json({ chyba: "Počítají se jen návštěvy z aplikace." }, 403);
  // 429, not 200: the template middleware counts the visit's source only on
  // a successful answer.
  if (!hrubyLimit(request, "navsteva", 20, 3600)) return json({ chyba: "Příliš mnoho požadavků." }, 429);
  if (!(await vLimitu(env, "navsteva_vse", "vse", ZA_HODINU_CELKEM, 3600))
      || !(await vLimitu(env, "navsteva_ip", adresaKlienta(request, env), ZA_HODINU_Z_ADRESY, 3600))) {
    return json({ chyba: "Příliš mnoho požadavků." }, 429);
  }
  let telo;
  try {
    telo = await request.json();
  } catch {
    return json({ chyba: "Neplatný požadavek." }, 400);
  }
  const stranka = String((telo && telo.stranka) || "uvod");
  if (!STRANKY.has(stranka)) return json({ chyba: "Neznámá stránka." }, 422);
  const den = new Date().toISOString().slice(0, 10);
  await env.DB.prepare(
    "INSERT INTO navstevy (den, stranka, pocet) VALUES (?, ?, 1) " +
    "ON CONFLICT(den, stranka) DO UPDATE SET pocet = pocet + 1"
  ).bind(den, stranka).run();
  return json({ ok: true });
}

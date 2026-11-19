/* Google Play v aplikaci: nákup předplatného a „Vyzkoušet ukázku“.
 *
 * Infrastruktura šablony (NEUPRAVOVAT V PRODUKTU). Načítá ho simtegen.js jen
 * v produktech s modulem aplikace (<html data-aplikace>, vkládá
 * vykresli_aplikaci.py).
 *
 * Proč takhle (Google Play Payments policy): aplikace z Google Play smí
 * digitální předplatné prodávat JEN přes Play Billing a nesmí uživatele
 * posílat k jinému způsobu platby. Web dál prodává fakturou. Fakturační
 * objednávka ([data-objednavka]) je proto v produktech s aplikací skrytá
 * stylem (styl.css), dokud tenhle skript nepotvrdí, že stránka běží
 * v prohlížeči (třída sg-web na <html>). Každá chyba tu tedy objednávku
 * spíš schová v prohlížeči (neškodné), než aby ji ukázala v aplikaci
 * (porušení pravidel).
 *
 * Aplikaci poznáme podle čehokoli z: odkazující android-app:// (spuštění
 * z telefonu), ?aplikace=play (startovní adresa aplikace), režim zobrazení
 * standalone/fullscreen/minimal-ui, nebo cookie, kterou si /api/play
 * zapamatuje při prvním z nich — po přechodu na zásady a zpět by se jinak
 * signál ztratil. Nic se neukládá v prohlížeči skriptem.
 *
 * Předplatné: produkty predplatne_mesic / predplatne_rok založené v Google
 * Play podle schválené ceny (workflow Vydání). Podmínky nákupu (cena, obdobi,
 * automatické obnovení, kde zrušit) jsou vidět před tlačítkem — Subscriptions
 * policy. Ověření a potvrzení nákupu dělá server (/api/play).
 */
(function () {
  "use strict";
  var doc = document;
  var koren = doc.documentElement;
  var BILLING = "https://play.google.com/billing";
  var PRODUKTY = ["predplatne_mesic", "predplatne_rok"];

  // The module's own words, in every language the template speaks. They
  // live here, not in the template dictionary: play.js reaches a product
  // only with a build, and a template update must not carry words for a
  // module the product does not have. Whole sentences per period, never
  // glued from pieces — word order differs between languages (DESIGN.md).
  // An app from Google Play is sold worldwide (#232): an English customer
  // must read the price, the auto-renewal and how to cancel in English —
  // that is what the Subscriptions policy means by "clear terms".
  var TEXTY = {
    cs: {
      "play.ukazka.pripravuji": "Připravuji ukázku…",
      "play.ukazka.nejde": "Ukázku teď nejde založit.",
      "play.ukazka.moc": "Ukázek je teď moc najednou. Zkuste to prosím za chvíli.",
      "play.ukazka.pruh": "Prohlížíte ukázku s vymyšlenými daty. Za 24 hodin zmizí.",
      "play.ukazka.odejit": "Odejít z ukázky",
      "play.ukazka.nekupuje": "V ukázce se nic nekupuje — předplatné si koupíte ve vlastním účtu.",
      "play.sprava": "Spravovat nebo zrušit předplatné v Google Play",
      "play.chrome": "Nákup tu teď nejde spustit — aktualizujte prosím aplikaci Google Chrome.",
      "play.celkem": "Celkem",
      "play.overuji": "Ověřuji nákup…",
      "play.neovereno": "Nákup se nepodařilo ověřit.",
      "play.hotovo": "Hotovo, předplatné je aktivní.",
      "play.nepodarilo": "Nákup se nepodařil.",
      "play.aktivni": "Předplatné máte aktivní.",
      "play.nelze": "Předplatné teď v aplikaci koupit nejde.",
      "play.objednavka": "Předplatné už máte objednané jinou cestou — až se vyřídí, poběží i tady.",
      "play.uz_mate": "Předplatné v Google Play už máte, nebo na něm Google ještě čeká na platbu. "
        + "Druhé kupovat nemusíte — spravujete ho v Google Play.",
      "play.cizi": "Předplatné tohoto účtu Google patří k jinému účtu aplikace. Přihlaste se tím účtem, "
        + "nebo nám napište přes Nahlásit chybu.",
      "play.zkusebni": "Zkušební doba vám běží do {datum}. Nákupem začne placené období hned.",
      "play.cena.mesic": "{cena} měsíčně",
      "play.cena.rok": "{cena} ročně",
      "play.podminky.mesic": "Platí se přes Google Play a obnovuje se automaticky každý měsíc za {cena}, "
        + "dokud předplatné nezrušíte. Zrušit ho můžete kdykoli v Google Play; zaplacené období doběhne.",
      "play.podminky.rok": "Platí se přes Google Play a obnovuje se automaticky každý rok za {cena}, "
        + "dokud předplatné nezrušíte. Zrušit ho můžete kdykoli v Google Play; zaplacené období doběhne.",
      "play.koupit.mesic": "Předplatit za {cena} měsíčně",
      "play.koupit.rok": "Předplatit za {cena} ročně",
      "play.recenze.nazev": "Hodnocení v Google Play",
      "play.recenze.text": "Pomůže nám, když aplikaci ohodnotíte v Google Play. Hodnocení je veřejné "
        + "a co do něj napíšete, je jen na vás.",
      "play.recenze.ohodnotit": "Ohodnotit v Google Play",
      "play.recenze.ted_ne": "Teď ne",
    },
    en: {
      "play.ukazka.pripravuji": "Preparing the demo…",
      "play.ukazka.nejde": "The demo can't be started right now.",
      "play.ukazka.moc": "Too many demos at once right now. Please try again in a little while.",
      "play.ukazka.pruh": "You're looking at a demo with made-up data. It disappears in 24 hours.",
      "play.ukazka.odejit": "Leave the demo",
      "play.ukazka.nekupuje": "Nothing is bought in the demo — you subscribe in your own account.",
      "play.sprava": "Manage or cancel the subscription in Google Play",
      "play.chrome": "The purchase can't start here — please update the Google Chrome app.",
      "play.celkem": "Total",
      "play.overuji": "Verifying the purchase…",
      "play.neovereno": "The purchase couldn't be verified.",
      "play.hotovo": "Done, your subscription is active.",
      "play.nepodarilo": "The purchase didn't go through.",
      "play.aktivni": "Your subscription is active.",
      "play.nelze": "The subscription can't be bought in the app right now.",
      "play.objednavka": "You've already ordered the subscription another way — once it's settled, it applies here too.",
      "play.uz_mate": "You already have a Google Play subscription, or Google is still waiting for its payment. "
        + "No need to buy a second one — you manage it in Google Play.",
      "play.cizi": "This Google account's subscription belongs to another account in the app. Sign in with "
        + "that account, or write to us through Report a problem.",
      "play.zkusebni": "Your trial runs until {datum}. Buying starts the paid period right away.",
      "play.cena.mesic": "{cena} a month",
      "play.cena.rok": "{cena} a year",
      "play.podminky.mesic": "Paid through Google Play and renewed automatically every month for {cena} "
        + "until you cancel. You can cancel any time in Google Play; the paid period runs to its end.",
      "play.podminky.rok": "Paid through Google Play and renewed automatically every year for {cena} "
        + "until you cancel. You can cancel any time in Google Play; the paid period runs to its end.",
      "play.koupit.mesic": "Subscribe for {cena} a month",
      "play.koupit.rok": "Subscribe for {cena} a year",
      "play.recenze.nazev": "Rating in Google Play",
      "play.recenze.text": "It helps us if you rate the app in Google Play. Ratings are public "
        + "and what you write is entirely up to you.",
      "play.recenze.ohodnotit": "Rate in Google Play",
      "play.recenze.ted_ne": "Not now",
    },
  };
  var SG = window.SimteGen;
  if (SG && SG.slovnik) SG.slovnik(TEXTY);

  // Through the template's translator (the visitor's language, Czech for a
  // missing word); without simtegen.js — never in a product, but a broken
  // page must still sell honestly — Czech straight from the table above.
  function t(klic, promenne) {
    if (SG && SG.t) return SG.t(klic, promenne);
    return String(TEXTY.cs[klic] || klic).replace(/\{(\w+)\}/g, function (cele, jmeno) {
      return promenne && jmeno in promenne ? String(promenne[jmeno]) : cele;
    });
  }

  // The server still answers in Czech (its errors are not translated yet):
  // a Czech visitor reads its exact reason, anyone else our own sentence.
  function duvod(r, klic) {
    var jaz = SG && SG.jazyk ? SG.jazyk() : "cs";
    return jaz === "cs" && r && r.data && r.data.chyba ? r.data.chyba : t(klic);
  }

  function prvek(tag, trida, text) {
    var e = doc.createElement(tag);
    if (trida) e.className = trida;
    if (text) e.textContent = text;
    return e;
  }

  function api(cesta, metoda, telo) {
    var nastaveni = { method: metoda || "GET", credentials: "same-origin", headers: {} };
    if (telo !== undefined) {
      nastaveni.headers["Content-Type"] = "application/json";
      nastaveni.body = JSON.stringify(telo);
    }
    return fetch(cesta, nastaveni).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        return { ok: r.ok, status: r.status, data: data };
      });
    });
  }

  function signalAplikace() {
    if ((doc.referrer || "").indexOf("android-app://") === 0) return true;
    if (/[?&]aplikace=play\b/.test(location.search)) return true;
    return ["standalone", "fullscreen", "minimal-ui"].some(function (rezim) {
      return window.matchMedia && window.matchMedia("(display-mode: " + rezim + ")").matches;
    });
  }

  // ── Ukázka ───────────────────────────────────────────────────────────

  function dosad(hodnota, ulozene) {
    if (typeof hodnota === "string") {
      return hodnota.replace(/\{(\w+)\}/g, function (cele, jmeno) {
        return Object.prototype.hasOwnProperty.call(ulozene, jmeno) ? String(ulozene[jmeno]) : cele;
      });
    }
    if (Array.isArray(hodnota)) return hodnota.map(function (h) { return dosad(h, ulozene); });
    if (hodnota && typeof hodnota === "object") {
      var vysledek = {};
      Object.keys(hodnota).forEach(function (k) { vysledek[k] = dosad(hodnota[k], ulozene); });
      return vysledek;
    }
    return hodnota;
  }

  function vyber(data, cesta) {
    return String(cesta).split(".").reduce(function (d, klic) {
      if (d === null || d === undefined) return undefined;
      return d[/^\d+$/.test(klic) ? Number(klic) : klic];
    }, data);
  }

  // Same rules as uat_kontrola.spust_ukazku: the data the screenshots show.
  function prehrajUkazku(kroky) {
    var ulozene = {};
    return kroky.reduce(function (cesta, krok) {
      return cesta.then(function () {
        var casti = String(krok.pozadavek || "").split(" ");
        return api(dosad(casti.slice(1).join(" "), ulozene), casti[0], dosad(krok.telo, ulozene))
          .then(function (r) {
            Object.keys(krok.uloz || {}).forEach(function (jmeno) {
              var hodnota = vyber(r.data, krok.uloz[jmeno]);
              if (hodnota !== undefined) ulozene[jmeno] = hodnota;
            });
          });
      });
    }, Promise.resolve());
  }

  function napojUkazku() {
    var tlacitka = doc.querySelectorAll("[data-ukazka]");
    if (!tlacitka.length) return;
    fetch("/ukazka.json", { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) return;
      koren.classList.add("sg-ukazka");
      Array.prototype.forEach.call(tlacitka, function (b) {
        b.addEventListener("click", function () {
          b.disabled = true;
          b.textContent = t("play.ukazka.pripravuji");
          api("/api/ukazka", "POST").then(function (r) {
            // 429: busy, not broken — "try again in a while" in every language.
            if (r.status === 429) throw new Error(duvod(r, "play.ukazka.moc"));
            if (!r.ok) throw new Error(duvod(r, "play.ukazka.nejde"));
            return prehrajUkazku(r.data.kroky || []);
          }).then(function () {
            location.replace("/");
          }).catch(function (e) {
            b.disabled = false;
            b.textContent = e.message || t("play.ukazka.nejde");
          });
        });
      });
    }).catch(function () { /* bez ukázky zůstane tlačítko skryté */ });
  }

  function pruhUkazky() {
    var pruh = prvek("div", "sg-ukazka-pruh");
    pruh.setAttribute("role", "status");
    pruh.appendChild(prvek("span", "", t("play.ukazka.pruh")));
    var odejit = prvek("button", "tlacitko", t("play.ukazka.odejit"));
    odejit.type = "button";
    odejit.addEventListener("click", function () {
      api("/api/odhlaseni", "POST").then(function () { location.replace("/"); });
    });
    pruh.appendChild(odejit);
    doc.body.insertBefore(pruh, doc.body.firstChild);
  }

  // ── Nákup v Google Play ──────────────────────────────────────────────

  // Google's price in the currency Google charges, written the way the
  // template writes money in the visitor's language (SimteGen.cena).
  function cena(polozka) {
    if (SG && SG.cena) return SG.cena(polozka.price.value, polozka.price.currency);
    return polozka.price.value + " " + polozka.price.currency;
  }

  function obdobi(polozka) {
    return /Y/.test(polozka.subscriptionPeriod || "") || /_rok$/.test(polozka.itemId) ? "rok" : "mesic";
  }

  function sprava(balicek) {
    var odkaz = prvek("a", "", t("play.sprava"));
    odkaz.href = "https://play.google.com/store/account/subscriptions" +
      (balicek ? "?package=" + encodeURIComponent(balicek) : "");
    odkaz.rel = "noopener";
    return odkaz;
  }

  // A failure from Chrome or Google, not from our server: our sentence, and
  // under it the browser's own code and words. Before (19. 11. 2026) the
  // first test purchase said only "didn't go through" — no order reached
  // Google and nobody could tell why without a cable to the phone. The
  // code is what the owner (or support) needs; the customer can ignore it.
  // Our server's refusals are plain Errors with our own sentence: shown as
  // they are, no code.
  function selhani(zprava, e, kde) {
    var jmeno = e && e.name ? String(e.name) : "?";
    if (jmeno === "Error" && e.message) {
      zprava.textContent = e.message;
      return;
    }
    var slova = e && e.message ? String(e.message).slice(0, 200) : "";
    try { console.warn("SimteGen purchase (" + kde + "):", jmeno, slova); } catch (x) { /* no console */ }
    var kod = prvek("small", "sg-play-kod", "[" + kde + ": " + jmeno + (slova ? " — " + slova : "") + "]");
    // Inline, not in styl.css: the module carries its own look, and a long
    // English browser message must wrap instead of widening the phone page.
    kod.style.display = "block";
    kod.style.overflowWrap = "anywhere";
    kod.style.opacity = "0.75";
    zprava.replaceChildren(doc.createTextNode(t("play.nepodarilo")), kod);
  }

  function kup(sluzba, polozka, zprava) {
    if (!window.PaymentRequest) {
      zprava.textContent = t("play.chrome");
      return Promise.resolve();
    }
    var pozadavek;
    try {
      pozadavek = new PaymentRequest(
        [{ supportedMethods: BILLING, data: { sku: polozka.itemId } }],
        { total: { label: t("play.celkem"), amount: { currency: polozka.price.currency, value: "0" } } });
    } catch (e) {
      // Thrown, not rejected: a page that forbids payments (Permissions-
      // Policy) or an old Chrome. Without this the button stayed grey and
      // silent (audit 18. 11. 2026).
      selhani(zprava, e, "vytvoreni");
      return Promise.resolve();
    }
    return pozadavek.show().then(function (odpoved) {
      zprava.textContent = t("play.overuji");
      return api("/api/play", "POST", { token: odpoved.details.purchaseToken }).then(function (r) {
        return odpoved.complete(r.ok ? "success" : "fail").then(function () {
          if (!r.ok) throw new Error(duvod(r, "play.neovereno"));
          zprava.textContent = t("play.hotovo");
          setTimeout(function () { location.reload(); }, 1200);
        });
      });
    }).catch(function (e) {
      // AbortError = the customer closed Google's sheet; nothing happened.
      if (e && e.name === "AbortError") {
        zprava.textContent = "";
        return;
      }
      selhani(zprava, e, "platba");
    });
  }

  function panel(misto, sluzba, polozky, stav, info, cizi) {
    var obal = prvek("div", "sg-play");
    var zprava = prvek("p", "zprava");
    zprava.setAttribute("aria-live", "polite");
    // The demo's paid features are a loan, not a purchase: it shows the
    // offer and its terms (what Google's reviewer looks for) instead.
    if (stav && stav.stav === "aktivni" && !info.ukazka) {
      obal.appendChild(prvek("p", "", t("play.aktivni")));
      obal.appendChild(sprava(info.balicek));
      misto.replaceChildren(obal);
      return;
    }
    // Ordered the other way and not settled yet: selling it here again is
    // paying twice. No word about how it was ordered — in the app that is
    // the Payments policy's business.
    if (info.objednavka && !info.ukazka) {
      obal.appendChild(prvek("p", "", t("play.objednavka")));
      misto.replaceChildren(obal);
      return;
    }
    // A Play purchase that is live but not (yet) access here — on hold, paused,
    // waiting for cash at a shop, or a monthly while the page offers a yearly:
    // a second button would be a second charge (audit 19. 11. 2026).
    if (info.nakup && !info.ukazka) {
      obal.appendChild(prvek("p", "", t("play.uz_mate")));
      obal.appendChild(sprava(info.balicek));
      misto.replaceChildren(obal);
      return;
    }
    if (!polozky.length) {
      obal.appendChild(prvek("p", "", t("play.nelze")));
      misto.replaceChildren(obal);
      return;
    }
    // Google gives no free trial on its side: buying now ends ours. Said
    // before the button, not discovered on the receipt.
    if (stav && stav.stav === "zkusebni" && stav.plati_do && !info.ukazka) {
      var dat = SG && SG.datum ? SG.datum(stav.plati_do) : new Date(stav.plati_do * 1000).toLocaleDateString();
      obal.appendChild(prvek("p", "popisek", t("play.zkusebni", { datum: dat })));
    }
    if (cizi) obal.appendChild(prvek("p", "popisek", t("play.cizi")));
    polozky.forEach(function (p) {
      var o = obdobi(p);
      var radek = prvek("div", "sg-play-nabidka");
      var c = { cena: cena(p) };
      radek.appendChild(prvek("p", "sg-play-cena", t("play.cena." + o, c)));
      // Subscriptions policy: price, period, auto-renewal and how to cancel,
      // in plain sight before the button.
      radek.appendChild(prvek("p", "popisek", t("play.podminky." + o, c)));
      var tlacitko = prvek("button", "tlacitko plne", t("play.koupit." + o, c));
      tlacitko.type = "button";
      if (info.ukazka) {
        tlacitko.disabled = true;
        radek.appendChild(tlacitko);
        radek.appendChild(prvek("p", "popisek", t("play.ukazka.nekupuje")));
      } else {
        tlacitko.addEventListener("click", function () {
          tlacitko.disabled = true;
          kup(sluzba, p, zprava).then(function () { tlacitko.disabled = false; });
        });
        radek.appendChild(tlacitko);
      }
      obal.appendChild(radek);
    });
    obal.appendChild(sprava(info.balicek));
    obal.appendChild(zprava);
    misto.replaceChildren(obal);
  }

  function sluzbaPlay() {
    if (!("getDigitalGoodsService" in window)) return Promise.resolve(null);
    return window.getDigitalGoodsService(BILLING).catch(function () { return null; });
  }

  // Purchases Google still reports for this phone: the one just paid for
  // if the answer got lost, renewals, a purchase from before reinstalling.
  // Resolves to the server's answers (409 = the purchase is another
  // account's), [] when Google would not say.
  function dorovnej(sluzba) {
    return sluzba.listPurchases().then(function (nakupy) {
      return Promise.all((nakupy || []).map(function (n) {
        return api("/api/play", "POST", { token: n.purchaseToken }).catch(function () { return null; });
      }));
    }).catch(function () { return []; });
  }

  // ── Hodnocení v Google Play ──────────────────────────────────────────

  // The server decides who and when (play_nakupy.zadostORecenzi); this
  // only draws the card. Neutral wording and no question before it: the
  // ratings policy forbids steering who rates and how. Not a dialog —
  // the customer opened the app to work, the card waits at the top.
  function zadostORecenzi(balicek) {
    if (doc.querySelector(".sg-recenze")) return;
    var karta = prvek("section", "sg-recenze");
    karta.setAttribute("aria-label", t("play.recenze.nazev"));
    karta.appendChild(prvek("p", "", t("play.recenze.text")));
    var akce = prvek("div", "sg-recenze-akce");
    var odkaz = prvek("a", "tlacitko vedlejsi", t("play.recenze.ohodnotit"));
    // Android hands this address to the Play Store app (its detail page
    // carries the rating stars).
    odkaz.href = "https://play.google.com/store/apps/details?id=" + encodeURIComponent(balicek);
    odkaz.target = "_blank";
    odkaz.rel = "noopener";
    var pozdeji = prvek("button", "tlacitko vedlejsi", t("play.recenze.ted_ne"));
    pozdeji.type = "button";
    function odpovez(odpoved) {
      // keepalive: the tap on the link leaves for the Play Store at once.
      fetch("/api/play", {
        method: "POST", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recenze: odpoved }),
      }).catch(function () { /* not recorded: asked again next time — harmless */ });
      // After the click's own default action (following the link).
      setTimeout(function () { karta.remove(); }, 0);
    }
    odkaz.addEventListener("click", function () { odpovez("hotovo"); });
    pozdeji.addEventListener("click", function () { odpovez("pozdeji"); });
    akce.appendChild(odkaz);
    akce.appendChild(pozdeji);
    karta.appendChild(akce);
    var kam = doc.querySelector(".obsah") || doc.querySelector("main") || doc.body;
    kam.insertBefore(karta, kam.firstChild);
  }

  function predplatne(vAplikaci) {
    var mista = doc.querySelectorAll("[data-predplatne-play]");
    // /api/play exists only with the subscription module; /api/ja always.
    Promise.all([
      api("/api/play" + (vAplikaci ? "?aplikace=play" : "")),
      api("/api/ja"),
    ]).then(function (odpovedi) {
      var r = odpovedi[0];
      var ja = odpovedi[1].data || {};
      var info = r.data || {};
      if (vAplikaci || info.v_aplikaci) koren.classList.add("sg-v-aplikaci");
      else koren.classList.add("sg-web");
      if (ja.prihlasen && /@ukazka\.invalid$/.test(ja.email || "")) pruhUkazky();
      if (!r.ok) return;
      if (!koren.classList.contains("sg-v-aplikaci")) {
        // On the web, renewals bought in the app still need to land here —
        // and the page drawn as expired must learn it, like in the app below:
        // once, only towards paid (audit 19. 11. 2026).
        var predtimWeb = (ja.predplatne || {}).stav;
        api("/api/play", "POST", { obnov: true }).then(function (o) {
          if (!o.ok || !o.data || !o.data.obnoveno || predtimWeb === "aktivni") return null;
          return api("/api/ja").then(function (r2) {
            var stav = (r2.data || {}).predplatne;
            if (stav && stav.stav === "aktivni" && predtimWeb) location.reload();
          });
        }).catch(function () { return null; });
        return;
      }
      if (info.recenze && info.balicek) zadostORecenzi(info.balicek);
      // In the app, on EVERY page — not only the one with the offer: Google
      // renews on its own and the server learns it only when asked. Before
      // (audit 18. 11. 2026) a paying customer opening any other screen saw
      // "subscription expired" after each renewal, and a refund was never
      // seen by a customer who only used the app. One Google call per live
      // purchase and page; the refund recheck (obnov) at most weekly.
      var predtim = (ja.predplatne || {}).stav;
      sluzbaPlay().then(function (sluzba) {
        return Promise.all([
          sluzba && info.dostupne ? dorovnej(sluzba) : Promise.resolve([]),
          info.dostupne ? api("/api/play", "POST", { obnov: true }).catch(function () { return null; }) : null,
        ]).then(function (vysledky) {
          var cizi = (vysledky[0] || []).some(function (r) { return r && r.status === 409; });
          return api("/api/ja").then(function (r2) {
            var stav = (r2.data || {}).predplatne;
            // Paid up just now (a renewal, a lost answer): the page was drawn
            // as unpaid — bars, the "why are you leaving" question, 402s.
            // Once, and only towards paid: the next load starts paid.
            if (stav && stav.stav === "aktivni" && predtim && predtim !== "aktivni") {
              location.reload();
              return null;
            }
            if (!mista.length) return null;
            // The demo shows the offer with its terms (the reviewer checks
            // them) but cannot buy; elsewhere no key means nothing to offer.
            if (!sluzba || !(info.dostupne || info.ukazka)) {
              Array.prototype.forEach.call(mista, function (m) { panel(m, null, [], null, info, cizi); });
              return null;
            }
            return sluzba.getDetails(PRODUKTY).then(function (detaily) {
              var polozky = (detaily || []).filter(function (p) { return PRODUKTY.indexOf(p.itemId) >= 0; });
              Array.prototype.forEach.call(mista, function (m) { panel(m, sluzba, polozky, stav, info, cizi); });
            });
          });
        });
      }).catch(function () {
        Array.prototype.forEach.call(mista, function (m) { panel(m, null, [], null, info); });
      });
    }).catch(function () {
      // No answer: stay in the safe state — the invoice order stays hidden.
      if (vAplikaci) koren.classList.add("sg-v-aplikaci");
    });
  }

  function start() {
    var vAplikaci = signalAplikace();
    if (vAplikaci) koren.classList.add("sg-v-aplikaci");
    napojUkazku();
    predplatne(vAplikaci);
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start);
  else start();
})();

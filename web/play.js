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

  function kup(sluzba, polozka, zprava) {
    if (!window.PaymentRequest) {
      zprava.textContent = t("play.chrome");
      return Promise.resolve();
    }
    var pozadavek = new PaymentRequest(
      [{ supportedMethods: BILLING, data: { sku: polozka.itemId } }],
      { total: { label: t("play.celkem"), amount: { currency: polozka.price.currency, value: "0" } } });
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
      zprava.textContent = e && e.name === "AbortError" ? "" : (e.message || t("play.nepodarilo"));
    });
  }

  function panel(misto, sluzba, polozky, stav, info) {
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
    if (!polozky.length) {
      obal.appendChild(prvek("p", "", t("play.nelze")));
      misto.replaceChildren(obal);
      return;
    }
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
  function dorovnej(sluzba) {
    return sluzba.listPurchases().then(function (nakupy) {
      return Promise.all((nakupy || []).map(function (n) {
        return api("/api/play", "POST", { token: n.purchaseToken }).catch(function () { return null; });
      }));
    }).catch(function () { return null; });
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
        // On the web, renewals bought in the app still need to land here.
        api("/api/play", "POST", { obnov: true }).catch(function () { return null; });
        return;
      }
      if (info.recenze && info.balicek) zadostORecenzi(info.balicek);
      if (!mista.length) return;
      sluzbaPlay().then(function (sluzba) {
        // The demo shows the offer with its terms (the reviewer checks them)
        // but cannot buy; elsewhere no key means nothing to offer.
        if (!sluzba || !(info.dostupne || info.ukazka)) {
          Array.prototype.forEach.call(mista, function (m) { panel(m, null, [], null, info); });
          return null;
        }
        return dorovnej(sluzba).then(function () {
          return Promise.all([sluzba.getDetails(PRODUKTY), api("/api/ja")]);
        }).then(function (vysledky) {
          var polozky = (vysledky[0] || []).filter(function (p) { return PRODUKTY.indexOf(p.itemId) >= 0; });
          // Fresh state: dorovnej() may have just extended it.
          var stav = (vysledky[1].data || {}).predplatne;
          Array.prototype.forEach.call(mista, function (m) { panel(m, sluzba, polozky, stav, info); });
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

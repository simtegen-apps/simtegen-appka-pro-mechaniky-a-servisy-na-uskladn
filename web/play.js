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
      Array.prototype.forEach.call(tlacitka, function (t) {
        t.addEventListener("click", function () {
          t.disabled = true;
          t.textContent = "Připravuji ukázku…";
          api("/api/ukazka", "POST").then(function (r) {
            if (!r.ok) throw new Error(r.data.chyba || "Ukázku teď nejde založit.");
            return prehrajUkazku(r.data.kroky || []);
          }).then(function () {
            location.replace("/");
          }).catch(function (e) {
            t.disabled = false;
            t.textContent = e.message || "Ukázku teď nejde založit.";
          });
        });
      });
    }).catch(function () { /* bez ukázky zůstane tlačítko skryté */ });
  }

  function pruhUkazky() {
    var pruh = prvek("div", "sg-ukazka-pruh");
    pruh.setAttribute("role", "status");
    pruh.appendChild(prvek("span", "", "Prohlížíte ukázku s vymyšlenými daty. Za 24 hodin zmizí."));
    var odejit = prvek("button", "tlacitko", "Odejít z ukázky");
    odejit.type = "button";
    odejit.addEventListener("click", function () {
      api("/api/odhlaseni", "POST").then(function () { location.replace("/"); });
    });
    pruh.appendChild(odejit);
    doc.body.insertBefore(pruh, doc.body.firstChild);
  }

  // ── Nákup v Google Play ──────────────────────────────────────────────

  function cena(polozka) {
    try {
      return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: polozka.price.currency })
        .format(Number(polozka.price.value));
    } catch (e) {
      return polozka.price.value + " " + polozka.price.currency;
    }
  }

  function obdobi(polozka) {
    var rok = /Y/.test(polozka.subscriptionPeriod || "") || /_rok$/.test(polozka.itemId);
    return rok ? { slovo: "ročně", kazdy: "každý rok" } : { slovo: "měsíčně", kazdy: "každý měsíc" };
  }

  function sprava(balicek) {
    var odkaz = prvek("a", "", "Spravovat nebo zrušit předplatné v Google Play");
    odkaz.href = "https://play.google.com/store/account/subscriptions" +
      (balicek ? "?package=" + encodeURIComponent(balicek) : "");
    odkaz.rel = "noopener";
    return odkaz;
  }

  function kup(sluzba, polozka, zprava) {
    if (!window.PaymentRequest) {
      zprava.textContent = "Nákup tu teď nejde spustit — aktualizujte prosím aplikaci Google Chrome.";
      return Promise.resolve();
    }
    var pozadavek = new PaymentRequest(
      [{ supportedMethods: BILLING, data: { sku: polozka.itemId } }],
      { total: { label: "Celkem", amount: { currency: polozka.price.currency, value: "0" } } });
    return pozadavek.show().then(function (odpoved) {
      zprava.textContent = "Ověřuji nákup…";
      return api("/api/play", "POST", { token: odpoved.details.purchaseToken }).then(function (r) {
        return odpoved.complete(r.ok ? "success" : "fail").then(function () {
          if (!r.ok) throw new Error(r.data.chyba || "Nákup se nepodařilo ověřit.");
          zprava.textContent = "Hotovo, předplatné je aktivní.";
          setTimeout(function () { location.reload(); }, 1200);
        });
      });
    }).catch(function (e) {
      // AbortError = the customer closed Google's sheet; nothing happened.
      zprava.textContent = e && e.name === "AbortError" ? "" : (e.message || "Nákup se nepodařil.");
    });
  }

  function panel(misto, sluzba, polozky, stav, info) {
    var obal = prvek("div", "sg-play");
    var zprava = prvek("p", "zprava");
    zprava.setAttribute("aria-live", "polite");
    // The demo's paid features are a loan, not a purchase: it shows the
    // offer and its terms (what Google's reviewer looks for) instead.
    if (stav && stav.stav === "aktivni" && !info.ukazka) {
      obal.appendChild(prvek("p", "", "Předplatné máte aktivní."));
      obal.appendChild(sprava(info.balicek));
      misto.replaceChildren(obal);
      return;
    }
    if (!polozky.length) {
      obal.appendChild(prvek("p", "", "Předplatné teď v aplikaci koupit nejde."));
      misto.replaceChildren(obal);
      return;
    }
    polozky.forEach(function (p) {
      var o = obdobi(p);
      var radek = prvek("div", "sg-play-nabidka");
      radek.appendChild(prvek("p", "sg-play-cena", cena(p) + " " + o.slovo));
      // Subscriptions policy: price, period, auto-renewal and how to cancel,
      // in plain sight before the button.
      radek.appendChild(prvek("p", "popisek",
        "Platí se přes Google Play a obnovuje se automaticky " + o.kazdy + " za " + cena(p) +
        ", dokud předplatné nezrušíte. Zrušit ho můžete kdykoli v Google Play; " +
        "zaplacené období doběhne."));
      var tlacitko = prvek("button", "tlacitko plne", "Předplatit za " + cena(p) + " " + o.slovo);
      tlacitko.type = "button";
      if (info.ukazka) {
        tlacitko.disabled = true;
        radek.appendChild(tlacitko);
        radek.appendChild(prvek("p", "popisek", "V ukázce se nic nekupuje — předplatné si koupíte ve vlastním účtu."));
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

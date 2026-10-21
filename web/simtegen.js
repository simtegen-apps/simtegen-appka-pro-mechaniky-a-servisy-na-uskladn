/* simtegen-navrh v2 — úvodní obrazovka s logem SimteGen. NEUPRAVOVAT V PRODUKTU.
 *
 * Proč skript a ne kus HTML v každé appce: logo firmy musí být při startu
 * vidět VŽDY a všude stejně — v prohlížeči i v Android aplikaci — a nesmí
 * záviset na tom, jestli si ho stavitel vzpomene napsat. Stavitel ho při
 * každé stavbě přepíše aktuální verzí ze šablony; CI hlídá, že ho každá
 * stránka aplikace načítá.
 *
 * Vkládá se hned za <body> (synchronně, je malý), aby se logo ukázalo dřív
 * než obsah. Když člověk do aplikace přichází zvenku, logo se poskládá
 * animací (1,75 s); mezi stránkami produktu už jen hotová značka. Zmizí po
 * načtení stránky, nejdřív po animaci, jinak za 700 ms (aby nebliklo),
 * a nejpozději za 2,5 s (pojistka, kdyby se něco zaseklo). Nic neukládá;
 * posílá jen hlášení chyby, které zákazník sám odešle (níž), a to jen na
 * vlastní /api/ produktu. Název produktu a verze se čtou z <meta>:
 *   <meta name="application-name" content="Pneusklad">
 *   <meta name="simtegen-verze" content="1.4">
 * Stránka, která úvod nechce (zásady, formulář pro odstoupení), skript
 * prostě nenačítá.
 */
(function () {
  "use strict";
  var doc = document;
  if (!doc.body || doc.querySelector(".sg-start")) return;

  function meta(jmeno) {
    var el = doc.querySelector('meta[name="' + jmeno + '"]');
    return el ? el.getAttribute("content") || "" : "";
  }
  function prvek(tag, trida, text) {
    var el = doc.createElement(tag);
    if (trida) el.className = trida;
    if (text) el.textContent = text;
    return el;
  }

  /* ── Logo „Díl“ a jeho animace ─────────────────────────────────────
   * Mřížka 5 × 5 modulů po 10: blok 4 × 4 s vykousnutým čtvrtkruhem
   * (střed 40,10, poloměr 10) a kulatý díl v barvě produktu (42,8; r 8).
   * Animace (1,75 s): moduly přiletí šikmo a zacvaknou do bloku, rohový
   * dílek se zbarví a vyjede ven, od výkusu se rozběhnou vlny, probleskne
   * mřížka spár, naběhne „simtegen“. Poslední políčko je statická značka.
   * Každé políčko se počítá z času, takže běží stejně v každém prohlížeči.
   */
  var NS = "http://www.w3.org/2000/svg";
  var BLOK = "M0 10H30A10 10 0 0 0 40 20V50H0Z";
  var ANIMACE_DELKA = 1.75;
  var SKLADANI = 0.6;

  function svgPrvek(tag, atributy, rodic) {
    var el = doc.createElementNS(NS, tag);
    for (var k in atributy) el.setAttribute(k, atributy[k]);
    if (rodic) rodic.appendChild(el);
    return el;
  }

  function znackaSvg() {
    var svg = svgPrvek("svg", { viewBox: "0 0 50 50", "class": "sg-start-znacka", "aria-hidden": "true" });
    var defs = svgPrvek("defs", {}, svg);
    var klipDil = svgPrvek("clipPath", { id: "sg-klip-dil" }, defs);
    var klipRect = svgPrvek("rect", { x: 0, y: 10, width: 40, height: 40 }, klipDil);
    var klipBlok = svgPrvek("clipPath", { id: "sg-klip-blok" }, defs);
    svgPrvek("path", { d: BLOK }, klipBlok);
    var blok = svgPrvek("path", { d: BLOK }, svg);
    var detail = svgPrvek("g", { "clip-path": "url(#sg-klip-blok)", fill: "none" }, svg);
    var spary = svgPrvek("path", { d: "M10 10V50M20 10V50M30 20V50M0 20H40M0 30H40M0 40H40", "stroke-width": 0.45 }, detail);
    var oblouky = svgPrvek("g", { "stroke-width": 0.7 }, detail);
    [[14, 0.32], [18.5, 0.18], [23, 0.08]].forEach(function (o) {
      svgPrvek("circle", { cx: 40, cy: 10, r: o[0], "stroke-opacity": o[1] }, oblouky);
    });
    var vlnyG = svgPrvek("g", { fill: "none", "stroke-width": 0.9 }, svg);
    var vlny = [0, 1, 2].map(function () { return svgPrvek("circle", { cx: 40, cy: 10, r: 10 }, vlnyG); });
    var dil = svgPrvek("circle", { cx: 40, cy: 10, r: 10, "clip-path": "url(#sg-klip-dil)" }, svg);
    var modulyG = svgPrvek("g", {}, svg);
    var moduly = [];
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
      moduly.push({ el: svgPrvek("rect", {}, modulyG), cx: 5 + 10 * c, cy: 15 + 10 * r, poradi: (3 - r) + c });
    }
    return { svg: svg, klip: klipRect, blok: blok, spary: spary, oblouky: oblouky, vlny: vlny,
             dil: dil, modulyG: modulyG, moduly: moduly };
  }

  function omez(x) { return Math.max(0, Math.min(1, x)); }
  function usek(t, a, b) { return omez((t - a) / (b - a)); }
  function ven(x) { return 1 - Math.pow(1 - x, 3); }
  function odraz(x) { return 1 + 2.9 * Math.pow(x - 1, 3) + 1.9 * Math.pow(x - 1, 2); }
  function barva(jmeno, zaloha) {
    return (getComputedStyle(doc.documentElement).getPropertyValue(jmeno) || "").trim() || zaloha;
  }
  // Tokens are #rrggbb (the design check enforces it); anything else just
  // switches half-way instead of blending.
  function smichej(a, b, t) {
    var hex = /^#[0-9a-f]{6}$/i;
    if (!hex.test(a) || !hex.test(b)) return t < 0.5 ? a : b;
    var vysledek = "#";
    for (var i = 1; i < 7; i += 2) {
      var x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16);
      vysledek += ("0" + Math.round(x + (y - x) * t).toString(16)).slice(-2);
    }
    return vysledek;
  }

  function snimek(z, pismena, t) {
    var ink = barva("--barva-inkoust", "#141414");
    var papir = barva("--barva-papir", "#f6f4ef");
    var akcent = barva("--barva-produktu", ink);
    var slozeno = t >= SKLADANI;
    z.modulyG.setAttribute("display", slozeno ? "none" : "inline");
    z.blok.setAttribute("display", slozeno ? "inline" : "none");
    z.dil.setAttribute("display", slozeno ? "inline" : "none");
    var zacvak = ven(usek(t, 0.46, SKLADANI));
    z.moduly.forEach(function (m) {
      var u = usek(t, 0.05 * m.poradi, 0.05 * m.poradi + 0.2);
      var strana = Math.max(0, (8.6 + 1.6 * zacvak) * (u > 0 ? odraz(u) : 0));
      var prilet = (1 - ven(u)) * 6;
      m.el.setAttribute("x", (m.cx - strana / 2 - prilet).toFixed(3));
      m.el.setAttribute("y", (m.cy - strana / 2 + prilet).toFixed(3));
      m.el.setAttribute("width", strana.toFixed(3));
      m.el.setAttribute("height", strana.toFixed(3));
      m.el.setAttribute("fill", ink);
      m.el.setAttribute("opacity", ven(u).toFixed(3));
    });
    z.blok.setAttribute("fill", ink);
    // The corner takes the product colour, then the piece comes out.
    z.dil.setAttribute("fill", smichej(ink, akcent, usek(t, 0.6, 0.75)));
    var otevreni = ven(usek(t, 0.75, 0.86));
    z.klip.setAttribute("x", (0 - 14 * otevreni).toFixed(2));
    z.klip.setAttribute("y", (10 - 24 * otevreni).toFixed(2));
    z.klip.setAttribute("width", (40 + 38 * otevreni).toFixed(2));
    z.klip.setAttribute("height", (40 + 38 * otevreni).toFixed(2));
    var pohyb = usek(t, 0.75, 1.15);
    var m = odraz(pohyb);
    z.dil.setAttribute("cx", (40 + 2 * m).toFixed(3));
    z.dil.setAttribute("cy", (10 - 2 * m).toFixed(3));
    z.dil.setAttribute("r", (10 - 2 * ven(pohyb)).toFixed(3));
    z.vlny.forEach(function (v, i) {
      var u = usek(t, 0.85 + 0.09 * i, 1.45 + 0.09 * i);
      v.setAttribute("r", (10 + (18 + 7 * i) * ven(u)).toFixed(2));
      v.setAttribute("stroke", akcent);
      v.setAttribute("stroke-opacity", (u > 0 && u < 1 ? 0.6 * (1 - u) : 0).toFixed(3));
    });
    z.spary.setAttribute("stroke", papir);
    z.spary.setAttribute("stroke-opacity",
      (0.16 * ven(usek(t, 1.1, 1.5)) + 0.32 * Math.sin(Math.PI * usek(t, 0.9, 1.3))).toFixed(3));
    z.oblouky.setAttribute("stroke", papir);
    z.oblouky.setAttribute("opacity", ven(usek(t, 1.15, 1.55)).toFixed(3));
    pismena.forEach(function (p, i) {
      var u = ven(usek(t, 1.15 + 0.035 * i, 1.45 + 0.035 * i));
      p.style.opacity = u.toFixed(3);
      p.style.transform = "translateX(" + ((1 - u) * -10).toFixed(2) + "px)";
    });
  }

  function prehraj(z, pismena) {
    var zacatekAnimace = null;
    snimek(z, pismena, 0);
    function krok(cas) {
      if (zacatekAnimace === null) zacatekAnimace = cas;
      var t = (cas - zacatekAnimace) / 1000;
      snimek(z, pismena, Math.min(t, ANIMACE_DELKA));
      if (t < ANIMACE_DELKA) requestAnimationFrame(krok);
    }
    requestAnimationFrame(krok);
  }

  var nazev = meta("application-name") || doc.title || "";
  var verze = meta("simtegen-verze");

  var start = prvek("div", "sg-start");
  start.setAttribute("role", "status");
  start.setAttribute("aria-label", "Načítám " + nazev);

  start.appendChild(prvek("div", "sg-start-horni", nazev));

  var stred = prvek("div", "sg-start-stred");
  var znacka = znackaSvg();
  stred.appendChild(znacka.svg);
  var slovo = prvek("span", "znacka-slovo");
  slovo.setAttribute("aria-hidden", "true");
  var pismena = "simtegen".split("").map(function (p) {
    var s = prvek("span", "", p);
    slovo.appendChild(s);
    return s;
  });
  stred.appendChild(slovo);
  var pravitko = prvek("div", "sg-start-pravitko");
  pravitko.appendChild(prvek("span"));
  pravitko.appendChild(prvek("i"));
  stred.appendChild(pravitko);
  start.appendChild(stred);

  var dolni = prvek("div", "sg-start-dolni");
  dolni.appendChild(prvek("span", "", "Načítám"));
  dolni.appendChild(prvek("span", "", verze ? "V " + verze : ""));
  start.appendChild(dolni);

  doc.body.insertBefore(start, doc.body.firstChild);

  // The full animation only when someone comes in from outside (the app
  // launched, a link from an e-mail); moving between pages of the same
  // product, a reload or going back shows the finished mark — a craftsman
  // opening screens all day must not wait 1.8 s each time. Decided from
  // what the browser already knows (referrer, navigation type), so nothing
  // is stored: browser storage would have to be declared in every
  // product's privacy policy. Reduced motion: always the finished mark.
  var animovat = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  try {
    var navigace = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (navigace && (navigace.type === "reload" || navigace.type === "back_forward")) animovat = false;
    if (doc.referrer && new URL(doc.referrer).origin === location.origin) animovat = false;
  } catch (e) { /* an odd referrer: animate, it is only the logo */ }
  var minimum = animovat ? Math.round(ANIMACE_DELKA * 1000) + 150 : 700;
  if (animovat) prehraj(znacka, pismena);
  else snimek(znacka, pismena, ANIMACE_DELKA);

  var zacatek = Date.now();
  var hotovo = false;
  function skryj() {
    if (hotovo) return;
    hotovo = true;
    var zbyva = Math.max(0, minimum - (Date.now() - zacatek));
    setTimeout(function () {
      start.classList.add("sg-start--pryc");
      setTimeout(function () { if (start.parentNode) start.parentNode.removeChild(start); }, 400);
    }, zbyva);
  }
  if (doc.readyState === "complete") skryj();
  else window.addEventListener("load", skryj);
  setTimeout(skryj, 2500);

  /* ── Nahlásit chybu ────────────────────────────────────────────────
   * Každé tlačítko .nahlasit-chybu v appce otevře tenhle formulář — skript
   * ho řídí sám (zachytí klik dřív než kód produktu), aby hlášení fungovalo
   * v každé appce stejně a nezáviselo na staviteli. Přihlášený zákazník jde
   * na /api/hlaseni (uloží se a dostane odpověď v aplikaci); bez přihlášení
   * nebo na statické stránce na /api/nahlasit. Text firma dostane šifrovaně.
   * Přikládá se jen technika: verze, obrazovka, velikost okna, prohlížeč
   * a posledních pět chyb skriptu na stránce — nic o člověku, nic se
   * neukládá do prohlížeče.
   */
  var chyby = [];
  function zapisChybu(text) {
    chyby.push(String(text).slice(0, 200));
    if (chyby.length > 5) chyby.shift();
  }
  window.addEventListener("error", function (e) {
    zapisChybu((e.message || "chyba") + (e.filename ? " @ " + e.filename.split("/").pop() + ":" + e.lineno : ""));
  });
  window.addEventListener("unhandledrejection", function (e) {
    zapisChybu("promise: " + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });

  function kontext() {
    var aktivni = doc.querySelector(".obrazovka.aktivni") ||
      Array.prototype.filter.call(doc.querySelectorAll(".obrazovka"), function (o) { return !o.hidden; })[0];
    return {
      verze: verze,
      obrazovka: aktivni && aktivni.id ? aktivni.id : location.pathname,
      okno: window.innerWidth + "×" + window.innerHeight,
      prohlizec: navigator.userAgent.slice(0, 200),
      chyby: chyby.slice(),
    };
  }

  var panel = null;
  var pozadi = null;
  var posledniFokus = null;

  function zavri() {
    if (!panel) return;
    panel.hidden = true;
    pozadi.hidden = true;
    if (posledniFokus && posledniFokus.focus) posledniFokus.focus();
  }

  function postav() {
    pozadi = prvek("div", "panel-pozadi");
    pozadi.addEventListener("click", zavri);
    panel = prvek("div", "panel sg-hlaseni");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "sg-hlaseni-nadpis");

    var nadpis = prvek("h2", "", "Nahlásit chybu");
    nadpis.id = "sg-hlaseni-nadpis";
    panel.appendChild(prvek("p", "stitek", "Zpráva pro " + (nazev || "nás")));
    panel.appendChild(nadpis);
    panel.appendChild(prvek("p", "", "Napište, co jste dělali a co se stalo. Přiložíme jen technické údaje " +
      "(verze, obrazovka, chyby stránky), nic o vás. Chcete-li odpověď a nejste přihlášeni, uveďte kontakt."));

    var pole = prvek("div", "pole");
    var popisek = prvek("label", "", "Co se stalo");
    popisek.setAttribute("for", "sg-hlaseni-text");
    var text = doc.createElement("textarea");
    text.id = "sg-hlaseni-text";
    text.rows = 5;
    text.maxLength = 2000;
    pole.appendChild(popisek);
    pole.appendChild(text);
    panel.appendChild(pole);

    var hlaska = prvek("p", "hlaska");
    hlaska.setAttribute("role", "status");
    hlaska.hidden = true;
    panel.appendChild(hlaska);

    var akce = prvek("div", "dva-sloupce sg-hlaseni-akce");
    var odeslat = prvek("button", "tlacitko", "Odeslat hlášení");
    odeslat.type = "button";
    var zrusit = prvek("button", "tlacitko tiche", "Zavřít");
    zrusit.type = "button";
    zrusit.addEventListener("click", zavri);
    akce.appendChild(odeslat);
    akce.appendChild(zrusit);
    panel.appendChild(akce);

    function ukazHlasku(trida, zprava) {
      hlaska.className = "hlaska " + trida;
      hlaska.textContent = zprava;
      hlaska.hidden = false;
    }

    function posli(cesta, data) {
      return fetch(cesta, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "same-origin",
      });
    }

    odeslat.addEventListener("click", function () {
      var obsah = text.value.trim();
      if (obsah.length < 3) {
        ukazHlasku("chyba", "Napište nám prosím, o co jde.");
        text.focus();
        return;
      }
      odeslat.disabled = true;
      var data = { text: obsah, kontext: kontext() };
      posli("/api/hlaseni", data).then(function (r) {
        // Not signed in, or a page without accounts: the anonymous door.
        return (r.status === 401 || r.status === 404 || r.status === 405) ? posli("/api/nahlasit", data) : r;
      }).then(function (r) {
        if (r.ok) {
          text.value = "";
          ukazHlasku("uspech", "Děkujeme, hlášení jsme přijali.");
        } else if (r.status === 429) {
          ukazHlasku("chyba", "Teď nemůžeme přijmout další zprávu — zkuste to prosím za chvíli.");
        } else {
          ukazHlasku("chyba", "Hlášení se nepodařilo odeslat. Zkuste to prosím znovu.");
        }
      }).catch(function () {
        ukazHlasku("chyba", "Hlášení se nepodařilo odeslat — jste připojeni k internetu?");
      }).then(function () { odeslat.disabled = false; });
    });

    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") zavri(); });
    doc.body.appendChild(pozadi);
    doc.body.appendChild(panel);
  }

  function otevri() {
    posledniFokus = doc.activeElement;
    if (!panel) postav();
    var hlaska = panel.querySelector(".hlaska");
    if (hlaska) hlaska.hidden = true;
    pozadi.hidden = false;
    panel.hidden = false;
    doc.getElementById("sg-hlaseni-text").focus();
  }

  // Capture phase: runs before any handler the product attached to the same
  // button, and stops it — one behaviour in every app.
  doc.addEventListener("click", function (e) {
    var cil = e.target && e.target.closest ? e.target.closest(".nahlasit-chybu") : null;
    if (!cil) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    otevri();
  }, true);

  /* Google Play v aplikaci — nákup předplatného a „Vyzkoušet ukázku“ —
   * žije v play.js: jen v produktu s modulem aplikace (<html data-aplikace>)
   * a jen když stránka má co obsloužit, ať statické stránky nic nenačítají. */
  doc.addEventListener("DOMContentLoaded", function () {
    if (!doc.documentElement.hasAttribute("data-aplikace")) return;
    if (!doc.querySelector("[data-objednavka], [data-predplatne-play], [data-ukazka]")) return;
    var skript = doc.createElement("script");
    skript.src = "play.js";
    doc.body.appendChild(skript);
  });
})();

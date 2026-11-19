/* GENEROVANÝ SOUBOR — neupravuj ručně. Zdroj: data-manifest.json, generátor: vykresli_zasady.py. */
// Is this page inside the Google Play app? Only an explicit "no" shows the
// invoice-order paragraph ([data-objednavka]) — why: vykresli_zasady.py.
(function () {
  "use strict";
  var koren = document.documentElement;
  function signalAplikace() {
    if ((document.referrer || "").indexOf("android-app://") === 0) return true;
    if (/[?&]aplikace=play\b/.test(location.search)) return true;
    return ["standalone", "fullscreen", "minimal-ui"].some(function (rezim) {
      return window.matchMedia && window.matchMedia("(display-mode: " + rezim + ")").matches;
    });
  }
  if (signalAplikace()) {
    koren.classList.add("sg-v-aplikaci");
    return;
  }
  fetch("/api/play", { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (d) { koren.classList.add(d && d.v_aplikaci === false ? "sg-web" : "sg-v-aplikaci"); })
    .catch(function () { /* no answer: the paragraph stays hidden */ });
})();

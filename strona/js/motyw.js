// Przełącznik motywu: jak w systemie → jasny → ciemny. Wybór pamiętany w localStorage (tylko w tej przeglądarce).
(function () {
  var przycisk = document.getElementById('motyw');
  if (!przycisk) return;
  var kolejne = { auto: 'light', light: 'dark', dark: 'auto' };
  var nazwy = { auto: 'jak w systemie', light: 'jasny', dark: 'ciemny' };
  function biezacy() {
    var m = document.documentElement.getAttribute('data-theme');
    return m === 'light' || m === 'dark' ? m : 'auto';
  }
  function opisz(m) {
    var tekst = 'Motyw: ' + nazwy[m];
    przycisk.setAttribute('aria-label', tekst);
    przycisk.setAttribute('title', tekst);
  }
  opisz(biezacy());
  przycisk.addEventListener('click', function () {
    var m = kolejne[biezacy()];
    if (m === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', m);
    try { localStorage.setItem('notestudio-motyw', m); } catch (e) {}
    opisz(m);
  });
})();

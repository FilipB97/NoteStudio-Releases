// Ładowany blokująco w <head>: ustawia motyw przed pierwszym renderem, żeby strona nie migała.
(function () {
  var m = 'auto';
  try { m = localStorage.getItem('notestudio-motyw') || 'auto'; } catch (e) {}
  if (m === 'light' || m === 'dark') document.documentElement.setAttribute('data-theme', m);
})();

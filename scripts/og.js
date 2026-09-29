// Obrazek do udostępniania (og:image, 1200×630) z scripts/og.html. Uruchom po zmianie hasła albo kolorów:
//   node scripts/og.js   → strona/img/og.png
'use strict';
const path = require('path');
const { execSync } = require('child_process');
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto('file://' + path.join(__dirname, 'og.html'));
  // słupki dwóch ścieżek: indygo (Ty) i mosiądz (uczestnicy), deterministycznie
  await p.evaluate(() => {
    let s = 7; const los = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const f = document.getElementById('f');
    for (let i = 0; i < 110; i++) {
      const ja = Math.floor(i / 14) % 2 === 0;
      const el = document.createElement('i');
      el.style.height = (10 + los() * 60) + 'px';
      el.style.background = ja ? '#6fa8ff' : '#e0954a';
      f.appendChild(el);
    }
  });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(__dirname, '..', 'strona', 'img', 'og.png') });
  await b.close();
})();

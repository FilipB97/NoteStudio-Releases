// Kontrola strony wydań w Chromium, na wzór scripts/sprawdz-strone.js z BetterWebsite, plus reguły z tamtejszego
// bezpłatnego audytu (formularz/audyt.js), które da się sprawdzić bez publikacji.
// Buduje stronę z przykładowego wydania, serwuje ją pod tą samą ścieżką co GitHub Pages i sprawdza:
//   • 6 szerokości × 2 motywy: brak przewijania w poziomie, brakujących plików, błędów JS i naruszeń CSP,
//   • zero żądań poza własną domenę (fonty, obrazy i skrypty wyłącznie lokalne),
//   • tytuł 15–70 znaków, opis 50–170, jeden H1, viewport, canonical, dane strukturalne zgodne z treścią,
//   • brak skryptów inline i atrybutów on*, alt przy każdym <img>, aktualny rok w stopce, llms.txt w formacie llmstxt.org.
// Uruchom: node scripts/sprawdz-strone.js [--zrzuty katalog]   (kod wyjścia 1 = są błędy)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }

const KORZEN = path.resolve(__dirname, '..');
const SCIEZKA = '/NoteStudio-Releases/';
const SZEROKOSCI = [360, 390, 768, 1024, 1280, 1440];
const MOTYWY = ['light', 'dark'];
const TYPY = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const i = process.argv.indexOf('--zrzuty');
const ZRZUTY = i > 0 ? path.resolve(process.argv[i + 1]) : null;

const SITE = fs.mkdtempSync(path.join(require('os').tmpdir(), 'notestudio-strona-'));
execFileSync(process.execPath, [path.join(__dirname, 'zbuduj.js'), '--wydanie', path.join(__dirname, 'wydanie-przyklad.json'), '--wyjscie', SITE],
  { stdio: 'inherit', env: { ...process.env, STRONA_ADRES: 'https://filipb97.github.io' + SCIEZKA } });

// jak GitHub Pages: /katalog/ → index.html, brak pliku → 404.html ze statusem 404
const serwer = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.startsWith(SCIEZKA)) {
    const wzgl = p.slice(SCIEZKA.length);
    for (const k of [wzgl, path.join(wzgl, 'index.html'), wzgl + '.html']) {
      const plik = path.join(SITE, k);
      if (plik.startsWith(SITE) && fs.existsSync(plik) && fs.statSync(plik).isFile()) {
        res.writeHead(200, { 'Content-Type': TYPY[path.extname(plik)] ?? 'application/octet-stream' });
        return fs.createReadStream(plik).pipe(res);
      }
    }
  }
  res.writeHead(404, { 'Content-Type': TYPY['.html'] });
  fs.createReadStream(path.join(SITE, '404.html')).pipe(res);
});

const bledy = [];
const blad = t => bledy.push(t);

// ─── kontrole statyczne (HTML po zbudowaniu) ───
function statyczne() {
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const tytul = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  if (tytul.length < 15 || tytul.length > 70) blad(`tytuł ma ${tytul.length} znaków (audyt: 15–70): ${tytul}`);
  const opis = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (opis.length < 50 || opis.length > 170) blad(`opis ma ${opis.length} znaków (audyt: 50–170)`);
  if ((html.match(/<h1[\s>]/g) ?? []).length !== 1) blad('strona powinna mieć dokładnie jeden H1');
  if (!/<meta name="viewport"/.test(html)) blad('brak meta viewport');
  if (!/<link rel="canonical" href="https:\/\//.test(html)) blad('brak canonical');
  for (const [, atrybuty, tresc] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type="application\/ld\+json"/.test(atrybuty)) continue;
    if (!/\bsrc="/.test(atrybuty) || tresc.trim()) blad('skrypt inline (CSP script-src \'self\'): ' + atrybuty.trim());
  }
  if (/\son[a-z]+\s*=/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) blad('atrybut on* w HTML');
  for (const img of html.match(/<img\b[^>]*>/g) ?? []) if (!/\balt=/.test(img)) blad('obrazek bez alt: ' + img);
  const rok = new Date().getUTCFullYear();
  if (!html.includes(`© ${rok}`)) blad(`w stopce nie ma roku ${rok}`);
  // dane strukturalne opisują to, co widać: wersja, rozmiar i pytania muszą być w treści
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const app = ld['@graph'].find(o => o['@type'] === 'SoftwareApplication');
  const widoczne = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  if (!app) blad('brak SoftwareApplication w danych strukturalnych');
  else {
    if (!widoczne.includes('NoteStudio ' + app.softwareVersion)) blad('wersja z JSON-LD nie jest widoczna na stronie');
    if (!widoczne.includes(app.fileSize.replace(' ', ' '))) blad('rozmiar z JSON-LD nie jest widoczny na stronie');
    if (!widoczne.includes(app.downloadUrl)) blad('downloadUrl z JSON-LD nie jest linkiem na stronie');
  }
  const faq = ld['@graph'].find(o => o['@type'] === 'FAQPage');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  for (const q of faq?.mainEntity ?? []) {
    if (!widoczne.includes(`<summary>${esc(q.name)}</summary>`)) blad('pytanie z FAQPage nie jest widoczne: ' + q.name);
    if (!widoczne.includes(`<p>${esc(q.acceptedAnswer.text)}</p>`)) blad('odpowiedź z FAQPage różni się od widocznej: ' + q.name);
  }
  // llms.txt (llmstxt.org): H1, cytat, sekcje z listami linków „- [nazwa](url): opis”
  const llms = fs.readFileSync(path.join(SITE, 'llms.txt'), 'utf8');
  if (!/^# .+\n\n> .+/.test(llms)) blad('llms.txt: brak nagłówka H1 i cytatu na początku');
  const linki = llms.split('\n').filter(l => l.startsWith('- '));
  if (!linki.length || linki.some(l => !/^- \[[^\]]+\]\(https:\/\/[^)]+\): .+/.test(l))) blad('llms.txt: linki w złym formacie');
  if (/\{\{[A-Z0-9_]+\}\}/.test(llms + html)) blad('niepodstawione placeholdery');
}

(async () => {
  statyczne();
  await new Promise(r => serwer.listen(0, '127.0.0.1', r));
  const baza = `http://127.0.0.1:${serwer.address().port}`;
  const przegladarka = await pw.chromium.launch();
  const strony = [SCIEZKA, SCIEZKA + 'nie-ma-takiej'];
  if (ZRZUTY) fs.mkdirSync(ZRZUTY, { recursive: true });
  for (const strona of strony) {
    for (const motyw of MOTYWY) {
      for (const w of SZEROKOSCI) {
        const kontekst = await przegladarka.newContext({ viewport: { width: w, height: 900 }, colorScheme: motyw });
        const p = await kontekst.newPage();
        const gdzie = `${strona} @${w} ${motyw}`;
        p.on('pageerror', e => blad(`${gdzie}: błąd JS: ${e.message}`));
        // „Failed to load resource” dubluje kontrolę odpowiedzi niżej (a dla strony 404 jest oczekiwane)
        p.on('console', m => { if ((m.type() === 'error' && !/^Failed to load resource/.test(m.text())) || /Content Security Policy/i.test(m.text())) blad(`${gdzie}: konsola: ${m.text()}`); });
        p.on('request', r => { if (!r.url().startsWith(baza) && !r.url().startsWith('data:')) blad(`${gdzie}: żądanie poza domenę: ${r.url()}`); });
        p.on('response', r => {
          const oczekiwany404 = strona.endsWith('nie-ma-takiej') && r.url() === baza + strona;
          if (r.status() >= 400 && !oczekiwany404) blad(`${gdzie}: ${r.status()} ${r.url().slice(baza.length)}`);
        });
        await p.goto(baza + strona, { waitUntil: 'load' });
        await p.evaluate(() => document.fonts.ready);
        const szer = await p.evaluate(() => document.documentElement.scrollWidth);
        if (szer > w) blad(`${gdzie}: przewijanie w poziomie (szerokość ${szer} px)`);
        const szerokie = await p.evaluate(v => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > v + 1 && getComputedStyle(e).position !== 'fixed')
          .slice(0, 3).map(e => e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '')), w);
        if (szer > w && szerokie.length) blad(`${gdzie}: wystaje ${szerokie.join(', ')}`);
        if (ZRZUTY && (w === 390 || w === 1440)) await p.screenshot({ path: path.join(ZRZUTY, `${strona === SCIEZKA ? 'glowna' : '404'}-${w}-${motyw}.png`), fullPage: true });
        await kontekst.close();
      }
    }
  }
  // przełącznik motywu: jak w systemie → jasny → ciemny → jak w systemie, zapamiętany po przeładowaniu
  {
    const kontekst = await przegladarka.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
    const p = await kontekst.newPage();
    await p.goto(baza + SCIEZKA, { waitUntil: 'load' });
    const tlo = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const ciemne = await tlo();
    await p.click('#motyw');
    const jasne = await tlo();
    if (jasne === ciemne) blad('przełącznik motywu nie zmienia tła');
    await p.reload({ waitUntil: 'load' });
    if (await tlo() !== jasne) blad('wybrany motyw nie przetrwał przeładowania');
    await p.click('#motyw'); await p.click('#motyw');
    if (await p.evaluate(() => document.documentElement.hasAttribute('data-theme'))) blad('trzecie kliknięcie nie wraca do motywu systemowego');
    await kontekst.close();
  }
  await przegladarka.close();
  serwer.close();
  fs.rmSync(SITE, { recursive: true, force: true });
  const unikalne = [...new Set(bledy)];
  for (const b of unikalne) console.log('✕ ' + b);
  console.log(`2 strony × ${SZEROKOSCI.length} szerokości × 2 motywy + kontrole statyczne: ${unikalne.length ? unikalne.length + ' błędów' : 'ok'}`);
  process.exitCode = unikalne.length ? 1 : 0;
})();

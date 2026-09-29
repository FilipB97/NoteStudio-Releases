// Buduje stronę wydań (GitHub Pages) ze strona/ do _site/, z danymi najnowszego wydania wstawionymi W CZASIE BUDOWANIA.
// Strona nie odpytuje GitHuba z przeglądarki: zero żądań do stron trzecich, zero JavaScriptu potrzebnego do treści.
//
//   node scripts/zbuduj.js                         # pobiera najnowsze wydanie z API GitHuba (GITHUB_TOKEN opcjonalny)
//   node scripts/zbuduj.js --wydanie plik.json     # z pliku (odpowiedź /releases/latest), np. w testach
//   node scripts/zbuduj.js --wyjscie /tmp/strona   # inny katalog wyjściowy
//
// Zmienne: GITHUB_REPOSITORY (domyślnie FilipB97/NoteStudio-Releases), STRONA_ADRES (adres publiczny strony, z ukośnikiem na końcu).
'use strict';
const fs = require('fs');
const path = require('path');

const KORZEN = path.resolve(__dirname, '..');
const ZRODLO = path.join(KORZEN, 'strona');
const REPO = process.env.GITHUB_REPOSITORY || 'FilipB97/NoteStudio-Releases';
const ADRES = (process.env.STRONA_ADRES || `https://${REPO.split('/')[0].toLowerCase()}.github.io/${REPO.split('/')[1]}/`).replace(/\/?$/, '/');

const arg = nazwa => { const i = process.argv.indexOf(nazwa); return i > 0 ? process.argv[i + 1] : null; };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON w <script type="application/ld+json">: <, > i & jako \u003c itd., żeby treść nie zamknęła znacznika
const jsonHtml = o => JSON.stringify(o, null, 1).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

const MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const dataPl = iso => { const d = new Date(iso); return `${d.getUTCDate()} ${MIESIACE[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
// GitHub podaje rozmiar w bajtach, a na stronie wydania pokazuje MiB; tu tak samo, z polskim przecinkiem
const rozmiar = b => (b / 1048576).toFixed(1).replace('.', ',') + '\u00a0MB';

// Nagłówki z notatek wydania (## i ###) jako lista nowości; „Zmiany od v…” to tytuł całości, nie nowość
function nowosci(body) {
  const zwykly = s => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
  const lista = String(body ?? '').split(/\r?\n/).map(l => l.match(/^#{2,3}\s+(.+)$/)?.[1]).filter(Boolean)
    .map(zwykly).filter(t => t && !/^zmiany od/i.test(t)).slice(0, 7);
  return lista.length ? lista : ['Poprawki i ulepszenia, szczegóły w notatkach wydania'];
}

// Torowisko w makiecie: deterministyczne słupki „mowy” (bez losowości przy każdym budowaniu, więc diff strony jest stabilny)
function fala(ziarno, wypowiedzi) {
  let s = ziarno >>> 0;
  const los = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const N = 96, W = 4, P = 2;
  const rect = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const mowi = wypowiedzi.some(([a, b]) => t >= a && t < b);
    const h = mowi ? 8 + los() * 22 : 1.5 + los() * 2;
    rect.push(`<rect x="${i * (W + P)}" y="${((30 - h) / 2).toFixed(1)}" width="${W}" height="${h.toFixed(1)}" rx="1.5"/>`);
  }
  return `<svg viewBox="0 0 ${N * (W + P) - P} 30" preserveAspectRatio="none" aria-hidden="true">${rect.join('')}</svg>`;
}

const PYTANIA = [
  ['Czy NoteStudio działa bez internetu?', 'Tak. Nagrywanie, transkrypcja, podsumowanie i wyszukiwanie działają offline. Internet jest potrzebny tylko raz, żeby pobrać model transkrypcji przy pierwszym użyciu, oraz do integracji, które sam włączysz.'],
  ['Czy działa tylko z Teams?', 'Samo wykrywanie rozmów jest nastawione na Teams. Nagrać można jednak dowolną rozmowę przyciskiem „Nagrywaj”: NoteStudio zapisuje Twój mikrofon i dźwięk, który słyszysz w komputerze.'],
  ['Czy muszę mieć mocny komputer albo kartę graficzną?', 'Nie. Transkrypcja idzie na procesorze, dlatego zaczyna się dopiero po spotkaniu, a nie w trakcie. Na zwykłym laptopie godzinne nagranie liczy się dłużej niż kilka minut, więc NoteStudio robi to w tle i wysyła powiadomienie, gdy notatka jest gotowa.'],
  ['Czy powinienem uprzedzić uczestników o nagrywaniu?', 'Tak. NoteStudio nagrywa lokalnie i nie wysyła nagrań nikomu, ale o tym, że rozmowa jest nagrywana, uczestnicy powinni wiedzieć od Ciebie.'],
  ['Dlaczego Windows ostrzega przy instalacji?', 'Instalator nie jest podpisany certyfikatem wydawcy, więc SmartScreen pokazuje ostrzeżenie przy pierwszym uruchomieniu. Sumę SHA-256 pobranego pliku możesz porównać z tą na stronie poleceniem Get-FileHash w PowerShellu.'],
  ['Jak dostanę nową wersję?', 'W Ustawieniach → O aplikacji jest przycisk sprawdzania aktualizacji. NoteStudio nie sprawdza niczego samo w tle; nową wersję instalujesz, pobierając instalator z tej strony.'],
  ['Czy kod źródłowy jest dostępny?', 'Nie. Kod jest w prywatnym repozytorium, a publiczne repozytorium zawiera tylko instalatory i notatki wydań.'],
];

async function pobierzWydanie() {
  const plik = arg('--wydanie');
  if (plik) return JSON.parse(fs.readFileSync(plik, 'utf8'));
  const naglowki = { Accept: 'application/vnd.github+json', 'User-Agent': 'notestudio-strona' };
  if (process.env.GITHUB_TOKEN) naglowki.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: naglowki });
  if (!r.ok) throw new Error(`API GitHuba: ${r.status} ${await r.text()}`);
  return r.json();
}

function kopiuj(z, do_, pomin) {
  fs.mkdirSync(do_, { recursive: true });
  for (const w of fs.readdirSync(z, { withFileTypes: true })) {
    if (pomin.has(w.name)) continue;
    const a = path.join(z, w.name), b = path.join(do_, w.name);
    if (w.isDirectory()) kopiuj(a, b, new Set()); else fs.copyFileSync(a, b);
  }
}

(async () => {
  const w = await pobierzWydanie();
  const instalator = (w.assets ?? []).find(a => /setup\.exe$/i.test(a.name));
  if (!instalator) throw new Error(`Wydanie ${w.tag_name} nie ma pliku *-setup.exe`);
  const wersja = String(w.tag_name).replace(/^v/, '');
  const sha = String(instalator.digest ?? '').replace(/^sha256:/, '');
  const rok = String(new Date().getUTCFullYear());

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': ADRES + '#aplikacja',
        name: 'NoteStudio',
        description: 'Lokalny asystent spotkań na Windows: wykrywa rozmowy w Teams, nagrywa dwie osobne ścieżki audio, transkrybuje Whisperem i podsumowuje lokalnym modelem językowym, bez chmury i bez telemetrii.',
        url: ADRES,
        image: ADRES + 'img/og.png',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Windows 10, Windows 11 (x64)',
        inLanguage: 'pl',
        softwareVersion: wersja,
        datePublished: w.published_at.slice(0, 10),
        downloadUrl: instalator.browser_download_url,
        fileSize: rozmiar(instalator.size).replace('\u00a0', ' '),
        releaseNotes: w.html_url,
        softwareRequirements: 'Microsoft Visual C++ 2015–2022 Redistributable (x64); LM Studio z serwerem lokalnym do podsumowań',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'PLN' },
        author: { '@type': 'Person', name: 'Filip Benklewski', url: 'https://github.com/FilipB97' },
      },
      {
        '@type': 'FAQPage',
        '@id': ADRES + '#pytania',
        mainEntity: PYTANIA.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  };

  const wartosci = {
    ADRES: esc(ADRES),
    SCIEZKA: esc(new URL(ADRES).pathname),
    WERSJA: esc(wersja),
    DATA: esc(dataPl(w.published_at)),
    DATA_ISO: esc(w.published_at.slice(0, 10)),
    ROZMIAR: esc(rozmiar(instalator.size)),
    PLIK: esc(instalator.name),
    POBIERZ_URL: esc(instalator.browser_download_url),
    NOTATKI_URL: esc(w.html_url),
    WYDANIA_URL: esc(`https://github.com/${REPO}/releases`),
    SHA256: sha ? esc(sha) : 'podana przy pliku na stronie wydania',
    ROK: rok,
    NOWOSCI_HTML: nowosci(w.body).map(t => `<li>${esc(t)}</li>`).join(''),
    PYTANIA_HTML: PYTANIA.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join(''),
    FALA_JA: fala(7, [[0.02, 0.07], [0.19, 0.24], [0.37, 0.41], [0.55, 0.63], [0.83, 0.9]]),
    FALA_ONI: fala(11, [[0.07, 0.19], [0.24, 0.37], [0.41, 0.55], [0.63, 0.83], [0.9, 0.98]]),
    JSONLD: `<script type="application/ld+json">\n${jsonHtml(jsonld)}\n</script>`,
  };
  const podstaw = (tekst, nazwa) => {
    const wynik = tekst.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => (k in wartosci ? wartosci[k] : m));
    const zostalo = wynik.match(/\{\{[A-Z0-9_]+\}\}/g);
    if (zostalo) throw new Error(`${nazwa}: niepodstawione ${[...new Set(zostalo)].join(', ')}`);
    return wynik;
  };

  const WYJSCIE = path.resolve(arg('--wyjscie') || path.join(KORZEN, '_site'));
  fs.rmSync(WYJSCIE, { recursive: true, force: true });
  const SZABLONY = ['index.html', '404.html', 'llms.txt', 'sitemap.xml'];
  kopiuj(ZRODLO, WYJSCIE, new Set(SZABLONY));
  for (const plik of SZABLONY) fs.writeFileSync(path.join(WYJSCIE, plik), podstaw(fs.readFileSync(path.join(ZRODLO, plik), 'utf8'), plik));
  // GitHub Pages bez Jekylla: pliki i katalogi zaczynające się od _ albo . też są serwowane
  fs.writeFileSync(path.join(WYJSCIE, '.nojekyll'), '');
  console.log(`Strona NoteStudio ${wersja} → ${path.relative(process.cwd(), WYJSCIE) || '.'} (${ADRES})`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });

# NoteStudio — wydania

Instalatory NoteStudio. **Kod źródłowy jest w prywatnym repozytorium** — tutaj leżą
wyłącznie gotowe pliki instalacyjne i notatki wydania.

Repozytorium jest publiczne po to, żeby aplikacja mogła sprawdzić dostępność nowej
wersji **bez żadnego tokenu i bez wysyłania czegokolwiek o instalacji**. Sprawdzenie
uruchamia się wyłącznie przyciskiem w Ustawieniach → O aplikacji; NoteStudio nie odpytuje
niczego w tle.

## Czym jest NoteStudio

Lokalny asystent spotkań na Windows: wykrywa rozmowy w Teams, nagrywa dwie osobne
ścieżki audio, transkrybuje Whisperem i podsumowuje lokalnym modelem językowym. Nagrania,
transkrypcje i notatki **nie opuszczają komputera** — jedyne połączenia wychodzące to
świadomie włączone integracje (Notion, webhook) i to sprawdzenie wersji.

## Instalacja

Pobierz `NoteStudio-<wersja>-setup.exe` z [najnowszego wydania](../../releases/latest).

Instalator **nie jest podpisany**, więc SmartScreen ostrzeże przy pierwszym uruchomieniu
— „Więcej informacji" → „Uruchom mimo to". Potrzebny jest też pakiet
**Microsoft Visual C++ 2015–2022 Redistributable (x64)**, jeśli nie ma go w systemie.

Do podsumowań wymagane jest [LM Studio](https://lmstudio.ai/) z uruchomionym serwerem
lokalnym. Model transkrypcji pobiera się sam przy pierwszym użyciu.

## Strona wydań

[filipb97.github.io/NoteStudio-Releases](https://filipb97.github.io/NoteStudio-Releases/) — publikowana przez GitHub Pages
z `strona/` workflowem `.github/workflows/strona.yml`. Wersję, rozmiar, sumę SHA-256 i listę nowości wstawia
`scripts/zbuduj.js` w czasie budowania, z najnowszego wydania. Strona przebudowuje się sama po każdym opublikowanym
wydaniu, więc **przy nowej wersji nie trzeba jej ruszać**. W przeglądarce nie odpytuje GitHuba i nie ładuje niczego
z zewnątrz (CSP w `<meta>`), JavaScript służy wyłącznie do przełącznika motywu.

Nowości to nagłówki `##`/`###` z notatek wydania, więc warto je tam pisać tak, żeby czytały się jako lista zmian.

```bash
node scripts/zbuduj.js                                        # _site/ z najnowszego wydania (API GitHuba)
node scripts/zbuduj.js --wydanie scripts/wydanie-przyklad.json  # bez sieci
node scripts/sprawdz-strone.js [--zrzuty /tmp/zrzuty]         # te same kontrole co w CI
node scripts/og.js                                            # strona/img/og.png po zmianie hasła
```

`sprawdz-strone.js` robi to samo co `scripts/sprawdz-strone.js` w BetterWebsite (6 szerokości, brak przewijania
w poziomie, brakujących plików i błędów JS), w obu motywach, plus reguły tamtejszego audytu: długość tytułu i opisu,
jeden H1, dane strukturalne zgodne z widoczną treścią, brak skryptów inline i żądań do stron trzecich, llms.txt.

Jednorazowo w ustawieniach repozytorium: **Settings → Pages → Source: GitHub Actions**.

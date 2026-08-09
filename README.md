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

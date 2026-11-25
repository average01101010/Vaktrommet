# Vaktrommet

Et nettleserbasert idle- og managementspill (PWA) for norsk helse- og omsorgssektor.
Du er avdelingsleder på et sykehjem og bygger avdelingen fra «sliten» til kompetansesenter:
sett opp vaktlag med riktig faglig sammensetning, invester i utstyr og metodikk, og løs
Post-it-dilemmaene som dukker opp på korktavla.

## Kom i gang

```bash
npm install
npm run dev        # utviklingsserver på http://localhost:5173
npm test           # enhetstester for motoren (vitest)
npm run build      # typesjekk + produksjonsbygg med service worker
npm run preview    # forhåndsvis produksjonsbygget
```

Spillet lagres i `localStorage` (`vaktrommet-save`). Slett nøkkelen for å starte på nytt.

## Struktur

```
src/
├─ types/       Datamodell: ansatte, turnus, beboere/avdelingstyper, oppgraderinger, dilemmaer, GameState
├─ data/        Innhold og balanse: balance.ts er eneste kilde til tall motoren bruker
│   ├─ residents.ts    Kliniske beboerprofiler (behov per vakt og egenskap)
│   └─ wards.ts        Avdelingstyper med beboermiks, modifikatorer og fagbok
├─ engine/      Ren, deterministisk spillmotor (ingen nettleser-API-er)
│   ├─ residents.ts    Innkomst/utskrivning og computeDemand(): behov summert fra beboerne
│   ├─ synergy.ts      evaluateShift(): dekning uten krysskompensasjon, synergier, rater
│   ├─ simulation.ts   step / simulate / catchUp: én fast steglengde for alt
│   ├─ migrate.ts      migrateGameState(): løfter eldre lagringer uten å nullstille
│   ├─ scoring.ts      Driftsligaen og Kvalitetsindeksen
│   └─ actions.ts      Alle spillerhandlinger som rene funksjoner, inkl. avdelingsrotasjon
├─ store/       Zustand-store med debouncet lagring + spill-loop
├─ services/    Supabase-klient, toppliste, kroker for betaling og rewarded video
└─ components/  layout/ · ward/ (isometrisk canvas, beboere, rotasjon) · staff/ · upgrades/ · league/
                · profile/ (Profil & Innstillinger: identitet, karriere, sikkerhetskopi, preferanser)
supabase/migrations/   Databaseskjema (ikke kjørt automatisk)
```

## Slik henger spillet sammen

- **Tid:** 1 sekund = 4 spillminutter. En vakt (8 t) varer 2 minutter, et døgn 6 minutter.
  Motoren går bare i faste steg på 15 spillminutter (`BALANCE.stepMin`) – i sanntid, ved
  offline-innhenting og ved tidshopp. UI-et interpolerer klokke og tellere mellom stegene.
- **Determinisme:** `catchUp(state, nå)` avhenger kun av tilstanden og tidspunktet, og
  `catchUp(catchUp(s, t1), t2)` er lik `catchUp(s, t2)`. En server kan derfor regne ut nøyaktig
  det samme som klienten. Seedet RNG ligger i `GameState`.
- **Beboere:** Hver seng har en beboer med klinisk profil og pleietyngde. Behovet på en vakt er
  summen av profilene. Beboere skrives ut etter liggetiden og erstattes, så behovet endrer seg.
- **Dekning:** Hver egenskap regnes for seg og kappes på 100 % – overskudd i Stell veier ikke opp
  for manglende Medisin. Udekket Medisin og Sår gir direkte avvik og lavere trivsel, og uten
  sykepleier på vakt kan bare deler av Medisin-/Sår-kapasiteten brukes.
- **Kompetanse:** Sjeldenhet setter egenskapstaket (3/4/5/5). Videreutdanning løfter det.
- **Økonomi:** Kr (grunnbevilgning + kvalitetstilskudd − lønn) og Fagpoeng tjenes passivt.
  Kaffekopper er hard valuta.
- **Offline:** Fraværet simuleres med de samme stegene, begrenset til 8 timer (24 med Pluss).
- **Tilsyn:** Hver fullførte vakt får 0–100 poeng; ukens resultat er snittet, så flere vakter
  (tidshopp, lengre buffer) gir ikke høyere resultat.
- **Poeng:** Driftsligaen måler volum over hele karrieren. Kvalitetsindeksen bygger på forholdstall,
  der 30 % er ressursbruk (dekning per lønnskrone og kompetanseutnyttelse).
- **Endgame:** På nivå 6 kan avdelingen overleveres. Du velger ny avdelingstype, tar med renommé,
  fagbøker, Kaffekopper og inntil tre ansatte, og bygger opp neste enhet med høyere terskler.
  Alle fem avdelingstyper kan velges – også sykehjemsavdelingen på nytt, for å løfte fagboka videre.

## Avdelingsvisningen

Scenen i `src/components/ward/scene/` er et rent 2D-canvas som speiler spilltilstanden:

- **Døgnrytme:** På natt er lenestolen tom, og pleierne patruljerer mellom dørene og sitter én om gangen
  ved PC-en. De siste 20 spillminuttene av en vakt, og de første 20 av den neste, samles begge vaktlag
  rundt rapportbordet.
- **Tempo:** Dekning og stress gir et «hastverk» fra 0 til 1 som styrer ganghastighet og holdning. Når
  avdelingen er presset, blinker varsellamper over pasientdørene til nærmeste pleier har vært der.
- **Rekvisitter:** Aktive dilemmaer henger som fargede lapper på korktavla, et aktivt takkekort gir
  blomster og konfekt på bordet, og Stille rapport bytter papirbunkene med nettbrett.
- **Progresjon:** Antall dører følger sengetallet (`doorCountFor` i `scene/layout.ts`), og hver
  avdelingstype har eget interiør og egen palett (`WARD_LOOKS`).

## Balanse og gjenbesøk

- **Belønninger som skalerer:** Kr og Fagpoeng i Tilsynspasset og Morgenkaffe er oppgitt i spilltimer
  (`budgetHours` / `fagpoengHours`) og regnes om med `resolveReward()` ut fra dagens inntjening.
- **Dilemma-oppfølging:** Valg med `followUp` utsetter saken. Et strengere oppfølgingsdilemma
  (`followUpOnly`) henges opp 24–48 spilltimer senere.
- **Oppdagelsesbok:** Åtte av elleve bonus-synergier starter skjult med faglig hint. De virker uansett,
  og låses opp med en Kaffekopp første gang kombinasjonen treffes.
- **Takkekort:** Skrives en beboer ut mens trivselen er over 75 %, løftes trivselsmålet 10 % i 4 spilltimer.
- **Morgenkaffe:** Daglig innsjekk etter norsk dato, med én automatisk avspaseringsdag per ISO-uke.
- **Rival:** Nærmeste konkurrent foran spilleren, først blant egen yrkesgruppe i eget fylke.

## Lagring

Spillet lagres i `localStorage`, høyst hvert femte sekund og med en gang etter spillerhandlinger
og når fanen skjules. Ved innlasting går lagringen alltid gjennom `migrateGameState`, som fyller
nye felter med standardverdier. Når `GameState` endrer form: øk `STATE_VERSION`, legg
versjonsspesifikke grep i `engine/migrate.ts`, og utvid migreringstesten.

## Profil, sikkerhetskopi og innstillinger

Trykk på avdelingsnavnet i toppfeltet for **Profil & Innstillinger**:

- **Profil:** avdelingsnavn (3–32 tegn), fylke og yrkesgruppe, renommé og fagbøker, og tall for hele karrieren.
- **Konto:** eksport og import av lagringen som JSON (`exportSave` / `parseSave` / `importSave` i
  `engine/actions.ts`). Import godtar eksportfila, rå `localStorage`-verdi og eldre versjoner, og viser
  et sammendrag før noe erstattes. Nullstilling krever to bekreftelser og beholder innstillinger og medlemskap.
- **Innstillinger:** lyd, haptikk og varsler ligger i `GameState.settings`. Varsler er lokale og virker
  bare mens nettleseren holder appen i live i bakgrunnen – push fra server er ikke bygget.

Personvern og brukervilkår ligger i `src/data/legal.ts`. Utgiver og kontaktadresse settes i
`src/lib/contact.ts`; adressen kan overstyres med `VITE_FEEDBACK_EMAIL`.

## Supabase (valgfritt)

Uten konfigurasjon kjører alt lokalt med en demo-toppliste. For å koble til:

1. Kopier `.env.example` til `.env` og fyll inn `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY`.
2. Kjør `supabase/migrations/0001_init.sql` mot prosjektet.

Poeng skal bare skrives av server-side validering (Edge Function med service role) – se
kommentarene i migrasjonen. Innlogging og selve valideringsfunksjonen er ikke bygget ennå.

## Betaling og reklame

`src/services/monetization.ts` definerer `PurchaseProvider` og `RewardedAdProvider`.
MVP-en bruker demo-leverandører (ingen betaling trekkes, reklamen er en plassholder).

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
├─ types/       Datamodell: ansatte, turnus, oppgraderinger, dilemmaer, økonomi, GameState
├─ data/        Innhold og balanse: balance.ts er eneste kilde til tall motoren bruker
├─ engine/      Ren, deterministisk spillmotor (ingen nettleser-API-er)
│   ├─ synergy.ts      evaluateShift(): dekning, synergier og rater for én vakt
│   ├─ simulation.ts   simulate() / catchUp(): tick, vaktskifte, offline-beregning
│   ├─ scoring.ts      Driftsligaen og Kvalitetsindeksen
│   └─ actions.ts      Alle spillerhandlinger som rene funksjoner (state → state)
├─ store/       Zustand-store med lagring + spill-loop
├─ services/    Supabase-klient, toppliste, kroker for betaling og rewarded video
└─ components/  layout/ · ward/ (isometrisk canvas) · staff/ (ID-kort, turnus) · upgrades/ · league/
supabase/migrations/   Databaseskjema (ikke kjørt automatisk)
```

## Slik henger spillet sammen

- **Tid:** 1 sekund = 4 spillminutter. En vakt (8 t) varer 2 minutter, et døgn 6 minutter.
- **Vaktevaluering:** Hver vakt har et faglig behov per egenskap (skalert med antall senger).
  Ansattes egenskaper × energi × nivå gir dekning; kombinasjoner utløser synergier eller problemer.
- **Økonomi:** Kr (grunnbevilgning + kvalitetstilskudd − lønn) og Fagpoeng tjenes passivt.
  Kaffekopper er hard valuta.
- **Slitasje:** Underdekning gir høy arbeidsbelastning → stress → sykmelding. Dobbeltvakter tapper energi.
- **Offline:** `catchUp()` simulerer fraværet, begrenset til 8 timer (24 timer med Avdelingsleder Pluss).
- **Poeng:** Driftsligaen måler volum. Kvalitetsindeksen bygger kun på forholdstall
  (trivsel, avvik per seng, nærvær, belastning, dekning per lønnskrone), så kjøp gir ingen fordel.

Motoren er deterministisk (seedet RNG ligger i `GameState`), slik at en server kan kjøre
samme kode og validere resultatet før topplistene oppdateres.

## Supabase (valgfritt)

Uten konfigurasjon kjører alt lokalt med en demo-toppliste. For å koble til:

1. Kopier `.env.example` til `.env` og fyll inn `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY`.
2. Kjør `supabase/migrations/0001_init.sql` mot prosjektet.

Poeng skal bare skrives av server-side validering (Edge Function med service role) – se
kommentarene i migrasjonen. Innlogging og selve valideringsfunksjonen er ikke bygget ennå.

## Betaling og reklame

`src/services/monetization.ts` definerer `PurchaseProvider` og `RewardedAdProvider`.
MVP-en bruker demo-leverandører (ingen betaling trekkes, reklamen er en plassholder).

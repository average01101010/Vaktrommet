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
│   ├─ wards.ts        Avdelingstyper med beboermiks, modifikatorer og fagbok
│   └─ dilemmas/       Dilemmabanken, én fil per tema, og historiekjedene
├─ engine/      Ren, deterministisk spillmotor (ingen nettleser-API-er)
│   ├─ residents.ts    Innkomst/utskrivning og computeDemand(): behov summert fra beboerne
│   ├─ synergy.ts      evaluateShift(): dekning uten krysskompensasjon, synergier, rater
│   ├─ simulation.ts   step / simulate / catchUp: én fast steglengde for alt
│   ├─ dilemmas.ts     Kontekstuell utvelgelse, beboer-injeksjon i tekstene og historiekjeder
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
- **Beboere:** To til fire beboere er oppe på dag og aften (etter sengetallet), i cardigan og tøfler,
  noen med rullator, prekestol eller rullestol. De har egne plasser og rusleturer i fellesarealet,
  og går til rommene sine når natta kommer (`Residents` i `scene/agents.ts`).
- **Mikro-hendelser:** `scene/sceneEvents.ts` har 27 små scener fordelt på avdelingstypene, valgt etter
  vakt, dekning og trivsel: alt fra potteplante-uhell og nattvandrer på demensavdelingen til
  legevisitt og ringesnor-rush på sykehjemmet. En hendelse låner beboere og nærmeste ledige pleier,
  setter ut rekvisitter og gir alt tilbake etterpå. De er ren pynt og rører aldri spilltilstanden.
  I utviklingsmodus kan en hendelse startes fra konsollen:
  `__vaktrommetScene.events.force('potteplante')`.

## Ukedag, helg og hviletid

- **Ukedag:** Døgn 1 er en mandag, og ukedagen følger vaktdøgnet (07:00–07:00). `getTimeInfo()` i
  `engine/time.ts` gir ukedag, vakt, helg og klokkeslett.
- **Helgevakter** er vaktene der flest timer faller mellom lørdag 00:00 og søndag 24:00: fredagsnatt,
  hele lørdagen og søndag dag og aften. De gir +25 % lønn (også for vikar og ekstravakt), mindre
  dokumentasjon og mer miljøarbeid og ro. Er dag og aften fullt bemannet, med sykepleier og uten
  hviletidsbrudd, slår synergien «Trygg helgebemanning» inn.
- **Hviletid (AML § 10-8):** Turnusen gjentas hvert døgn. Aften og dag gir kort hviletid (8 t fri fra
  23:00 til 07:00); natt sammen med en annen vakt gir dobbeltvakt (16 t i strekk gjennom natta).
  Begge gir personlig stress og dårligere restitusjon, og en negativ synergi på vakta (`engine/rest.ts`).
  Turnusplanleggeren viser gule AML-varsler på ID-kortene og under vaktplanen.

## Avvik og pårørende

- **Ulukkede avvik:** Hvert nytt avvik (fra simuleringen eller et dilemmavalg) øker både `ward.avvik` og
  `ward.openAvvik`. Over fem ulukkede gir trekk på Ukens tilsyn (2,5 poeng per vakt per avvik, maks 25)
  og i trivselsmålet (0,6 per avvik, maks 6).
- **`resolveAvvik`** lukker ett eller alle mot Fagpoeng (15 per avvik på første nivå, billigere med
  Stille rapport og med noen på vakt som har Dok. 3+). Hvert lukket avvik gir +1 trivsel og +3 tilsynspoeng
  på vakta.
- **`holdNextOfKinMeeting`** (én gang per spilldøgn): koster Fagpoeng og +6 stress på vakta, gir +6
  trivsel, og +8 tilsynspoeng når trivselen er under 80 %. Bonusene på tilsynet er til sammen maks 20 per vakt.
- Avvikskortet på Avdelingen åpner et handlingsark for begge. På Tilsyn er sjekkpunktet «Avvik meldes og
  lukkes» med hver uke, og er grønt, gult eller rødt etter antall ulukkede.
- Lagringsformatet er versjon 8; eldre avvik regnes som behandlet.

## Fravær og bemanning

`src/engine/absence.ts` og `src/data/absence.ts` erstatter den gamle `sickUntil` med et `absence`-objekt
(type, start og slutt) på hver ansatt.

- **Typer:** egenmelding (1–3 døgn, meldes én time før vaktstart), sykt barn (1–2 døgn, dag og aften),
  sykmelding (7–21 døgn etter stress over tid), gradert sykmelding (7–14 døgn, 50 % og bare dagvakt),
  studiepermisjon (2–4 døgn, gir erfaring og Fagpoeng) og velferdspermisjon (1–3 døgn, varslet et døgn før).
- **Hull i turnusen:** Er en oppsatt ansatt borte på vakta som går eller den neste, blir det et hull
  (`GameState.gaps`). Plassen står i den ansattes navn; for den ene vakta velger lederen tilkallingsvikar,
  ekstravakt til en fast ansatt (overtid) eller underbemanning (`resolveGap`).
- **Studiepermisjon** kan innvilges fra ansattdetaljene (`grantStudyLeave`).
- Lagringsformatet er versjon 7; eldre sykmeldinger føres over i `migrateGameState`.

## Lyd

All lyd lages i sanntid med Web Audio i `src/services/sound.ts` – det finnes ingen lydfiler.

- **Musikk:** En generativ ambient-synth (filtpiano, akkordteppe, stereo-ekko og romklang gjennom en
  kompressor) som aldri gjentar seg. Skala, tempo og tetthet følger vakta (`MOODS`), klangfargen følger
  avdelingstypen (`TIMBRES`), og en dempet basspuls kommer inn når dekningen er lav eller stresset høyt.
- **Atmosfære:** Et lavt vaktroms-sus, og en veggklokke som tikker svakt om natta og før vaktskifte.
- **Lydeffekter:** Papir og stempel for dilemmaer, plastklikk for ID-kort, ringesnor når en varsellampe
  tennes, kaffekopp ved Morgenkaffe og kjøp, og en akkordfanfare for synergi, takkekort og nytt nivå.
- **Styring:** Egne brytere for lydeffekter og for musikk og atmosfære. Lyden starter ved første
  berøring og settes på vent når fanen skjules. `useSoundscape` holder lydbildet i takt med spillet.
  I utviklingsmodus viser `__vaktrommetSound.debug()` tilstanden.

## Dilemmaene

Banken i `src/data/dilemmas/` har 105 dilemmaer. Hele lista, med valg, effekter, faglig begrunnelse og
kilde, står i [`docs/dilemma-gjennomgang.md`](docs/dilemma-gjennomgang.md). Fila genereres med
`npm run docs:dilemmas`, og en test feiler hvis den er utdatert.

- **Kontekst:** `triggers` på et dilemma avgjør når det kan dukke opp: avdelingstype, vakt, beboerprofil,
  snittstress og trivsel. Kontekstuelle dilemmaer veier tyngre i trekningen enn de generelle.
- **Beboeren i teksten:** `{beboer}` og `{rom}` fylles ut med en av beboerne på avdelingen når lappen
  henges opp. `{han}`, `{hans}`, `{ham}` og `{forelder}` følger kjønnet til navnet.
- **Historiekjeder:** Et dilemma med `chain` er et steg i en historie over to eller tre steg. Valget
  planlegger neste steg, og samme beboer følger saken hele veien.
- **Variasjon:** De 30 siste dilemmaene gjentas ikke (`BALANCE.dilemmaRecent`).

## Balanse og gjenbesøk

- **Belønninger som skalerer:** Kr og Fagpoeng i Tilsynspasset og Morgenkaffe er oppgitt i spilltimer
  (`budgetHours` / `fagpoengHours`) og regnes om med `resolveReward()` ut fra dagens inntjening.
- **Dilemma-oppfølging:** Valg med `followUp` utsetter saken. Et strengere oppfølgingsdilemma
  (`triggers.isFollowUpOnly`) henges opp 24–48 spilltimer senere.
- **Oppdagelsesbok:** Ni av tolv bonus-synergier starter skjult med faglig hint. De virker uansett,
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

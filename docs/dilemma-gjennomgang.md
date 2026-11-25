# Dilemmagjennomgang

Hele dilemmabanken i Vaktrommet, til faglig gjennomgang. Fila er generert fra `src/data/dilemmas/` med
`npm run docs:dilemmas` – rett i datafilene, ikke her.

## Oversikt

- **105 dilemmaer** i alt: 88 kan dukke opp av seg selv, og 17 kommer bare som oppfølging eller neste steg i en kjede.
- **7 historiekjeder** over to eller tre steg.
- Egne situasjoner for spesialavdelingene: Skjermet demensenhet 5, Korttid og rehabilitering 6, Bofellesskap 5, Lindrende enhet 5.
- 15 er knyttet til en bestemt vakt, og 27 krever en beboer med en bestemt klinisk profil.

| Tema | Antall |
| --- | ---: |
| Hverdag på avdelingen | 29 |
| Klinisk observasjon og akutt forverring | 7 |
| Lovverk, etikk og tvang | 7 |
| Legemiddelhåndtering og pasientsikkerhet | 7 |
| Spesialavdelinger | 20 |
| Natt, dag og aften | 8 |
| Arbeidsmiljø, ledelse og vaktromshumor | 8 |
| Historiekjeder | 19 |

### Slik leses lista

- `{beboer}` og `{rom}` byttes ut med en av beboerne på avdelingen når lappen henges opp. `{han}`, `{hans}`, `{ham}`
  og `{forelder}` følger beboerens kjønn (han/hun, hans/hennes, ham/henne, far/mor).
- Linja under tittelen viser når dilemmaet kan dukke opp. Alle vilkår må være oppfylt samtidig.
- Beløp i kroner og Fagpoeng er grunnverdier. De skaleres opp med avdelingsnivået i spillet.
- Stress og energi gjelder enten de som er på vakt, eller hele staben.

### Historiekjedene

- **Utbruddet** (3 steg): 1. Tre med feber → 2. Besøksstans? eller Halve gangen hoster → 3. Etter utbruddet
- **Den nyansatte** (3 steg): 1. Ny på mandag → 2. Gråter på medisinrommet → 3. Prøvetida går ut
- **Søsken i strid** (3 steg): 1. Søsken i strid → 2. Filmer stellet → 3. Lokalavisa ringer
- **Smerten ingen fant** (3 steg): 1. Verger seg i stellet → 2. Vil ikke stå på beinet → 3. Det var et brudd
- **Varselet** (2 steg): 1. Hardhendt kollega? → 2. Frosset ut
- **Den siste samtalen** (2 steg): 1. Vil snakke om døden → 2. «Ring 113 nå!»
- **Svingdøra** (2 steg): 1. Kom uten papirer → 2. Ingen vil ha ansvaret

## Hverdag på avdelingen (29)

### Syk nattevakt

`syk_nattevakt` · aftenvakt

> Nattevakta ringte 21:40 – feber og omgangssyke. Ingen har svart på vikar-SMS-en.
> — *Aftenvakta*

1. **Ring vikarbyrået** – Dyrt, men vakta blir dekket
   - Effekt: −900 kr, +1 trivsel
   - Utfall: Vikaren kom 23:15 og fant verken nøkler eller pasientliste, men natta gikk rolig.
2. **Be aftenvakta gå dobbelt** – Sparer penger, sliter på folk
   - Effekt: −250 kr, +14 stress (på vakt), −18 energi (på vakt)
   - Utfall: Hun sa ja – igjen. Overtidsmaten ble en tørr baguett fra automaten.
3. **Omrokér med naboavdelingen** *(krever sykepleier på vakt)* – Krever sykepleier på vakt som kan ta ansvarsvakt
   - Effekt: +25 Fagpoeng, +4 stress (på vakt)
   - Utfall: Sykepleieren tok ansvarsvakt for begge avdelinger. Godt løst, og godt dokumentert.

**Faglig begrunnelse:** Tjenesten skal være forsvarlig bemannet hele døgnet. Samtidig setter arbeidsmiljøloven grenser for overtid og krever minst 11 timers daglig hvile. En dobbeltvakt løser natta, men øker risikoen for feil.

**Kilde:** Helse- og omsorgstjenesteloven § 4-1 · Arbeidsmiljøloven § 10-8

### Pårørende vil ha samtale

`paaroerende_klage` · alle avdelinger, hele døgnet

> Datteren til {beboer} (rom {rom}) er opprørt. Mener {forelder} ikke får nok hjelp ved måltidene. Vil snakke med «en som bestemmer».
> — *Primærkontakten*

1. **Ta samtalen selv i dag** – Tar tid, bygger tillit
   - Effekt: +15 Fagpoeng, +5 trivsel, −6 energi (på vakt)
   - Utfall: Dere ble enige om ønskekost og at datteren kan komme til middag på onsdager.
2. **Kall inn til tverrfaglig møte** *(krever Ernæring 3+ på vakt)* – Krever noen med Ernæring 3+
   - Effekt: +30 Fagpoeng, +7 trivsel, +10 pass-XP
   - Utfall: Ernæringsscreening, tiltaksplan og en fornøyd datter. Hun sendte kake uka etter.
3. **Be henne sende det skriftlig** – Du slipper samtalen. Foreløpig.
   - Effekt: −2 trivsel
   - Utfall: Hun sa at hun skulle skrive. Tonefallet tydet på at dette ikke er siste ord.
   - Utsatt – kommer tilbake som «Klagen har kommet» (`klage_statsforvalter`) etter 24–48 spilltimer

**Faglig begrunnelse:** Pårørende har rett til informasjon når pasienten samtykker, og er en viktig kilde i kartleggingen. Tidlig dialog og et dokumentert tiltak løser som regel mer enn en formell klagebehandling. En klage går først til tjenesten, deretter til Statsforvalteren.

**Kilde:** Pasient- og brukerrettighetsloven § 3-3 og kap. 7 · Pårørendeveilederen

### Vekttap på rom {rom}

`ernaering_vekttap` · alle avdelinger, hele døgnet

> {beboer} har gått ned 3 kg på en måned. Spiser to skjeer og skyver tallerkenen unna.
> — *Dagvakta*

1. **Bestill næringsdrikker** – Raskt og enkelt
   - Effekt: −400 kr, +2 trivsel
   - Utfall: {Han} liker den med sjokoladesmak. De andre står urørt i kjøleskapet.
2. **Ernæringskartlegging og ønskekost** *(krever Ernæring 2+ på vakt)* – Krever Ernæring 2+ på vakt
   - Effekt: +28 Fagpoeng, +5 trivsel
   - Utfall: Det viste seg at {beboer} savnet sild og kokt potet. Kjøkkenet ordnet det.
3. **Avvent og observer** – Kanskje det går over?
   - Effekt: −2 trivsel
   - Utfall: Dere avventer. Tallerkenen går fortsatt halvfull tilbake til kjøkkenet.
   - Utsatt – kommer tilbake som «{beboer} orker ikke mer» (`vekttap_forverret`) etter 24–48 spilltimer

**Faglig begrunnelse:** Beboere i sykehjem skal vurderes for ernæringsmessig risiko ved innkomst og deretter månedlig. Ufrivillig vekttap skal utløse kartlegging og en individuell ernæringsplan – næringsdrikk alene er sjelden nok.

**Kilde:** Nasjonal faglig retningslinje for forebygging og behandling av underernæring

### Uro i korridoren

`utagering_korridor` · krever beboer med profilen «Kognitiv svikt og uro»

> {beboer} (rom {rom}) er sint og redd, vil hjem til mor. Har slått etter to ansatte. De andre beboerne blir urolige.
> — *Aftenvakta*

1. **Skjerming og rolig samtale** *(krever Ro 3+ på vakt)* – Krever Ro 3+ på vakt
   - Effekt: +25 Fagpoeng, +6 trivsel, −4 stress (på vakt)
   - Utfall: En kopp kakao, et fotoalbum og tjue minutter. {beboer} sovnet i godstolen.
2. **Gi behovsmedisin** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: −1 trivsel, −2 stress (på vakt)
   - Utfall: Det ble rolig. Men legen vil ha en gjennomgang av hvor ofte dette skjer.
3. **Tilkall alle ledige hender** – Mange stemmer på én gang
   - Effekt: −3 trivsel, +8 stress (på vakt), +1 avvik
   - Utfall: Fem personer i en trang korridor gjorde ikke saken bedre. Avvik er skrevet.

**Faglig begrunnelse:** Uro ved demens er ofte uttrykk for et udekket behov: smerte, redsel, sult eller for mange inntrykk. Miljøtiltak og skjerming skal prøves først. Beroligende legemidler er ikke førstevalg, og bruken skal evalueres.

**Kilde:** Nasjonal faglig retningslinje om demens · TID-modellen

### Feil i dosetten

`medisinavvik` · alle avdelinger, hele døgnet

> Fant to Marevan for mye i dosetten til rom 3. Ikke gitt. Hvem la opp i går?
> — *Nattevakta*

1. **Skriv avvik og ta det som læring** – Åpenhet koster litt nå, lønner seg siden
   - Effekt: +35 Fagpoeng, +1 trivsel, +1 avvik
   - Utfall: Dere fant årsaken: forstyrrelser under istandgjøring. Ny regel: lukket dør og «ikke forstyrr»-vest.
2. **Rett opp og gå videre** – Ingen skade skjedd … denne gangen
   - Effekt: +3 stress (alle)
   - Utfall: Dosetten ble riktig. Men ingen fant ut hvorfor feilen oppsto.
   - Utsatt – kommer tilbake som «Feil dose ble gitt» (`medisinfeil_gitt`) etter 24–48 spilltimer
3. **Innfør dobbeltkontroll fra i dag** *(krever Medisin 3+ på vakt)* – Krever noen med Medisin 3+
   - Effekt: +45 Fagpoeng, +2 stress (på vakt), −1 avvik, +10 pass-XP
   - Utfall: Mer jobb per runde, men to signaturer gir ro i magen. Tilsynet kommer til å like det.

**Faglig begrunnelse:** Dobbeltkontroll er hovedregelen ved istandgjøring av legemidler, og virksomheten skal ha et system for å melde, rette opp og lære av avvik. En åpen meldekultur uten syndebukker er det som hindrer neste feil.

**Kilde:** Legemiddelhåndteringsforskriften (rundskriv IS-7/2015) · Forskrift om ledelse og kvalitetsforbedring

### Kaffekassa er tom

`kaffekasse` · alle avdelinger, hele døgnet

> Det er IKKE gratis kaffe! 10 kr koppen. Noen (dere vet hvem dere er) skylder for hele oktober.
> — *Tillitsvalgt*

1. **Ta det over driftsbudsjettet** – Liten kostnad, stor glede
   - Effekt: −300 kr, −6 stress (alle)
   - Utfall: Stemningen på vaktrommet steg merkbart. Økonomikonsulenten hevet et øyenbryn.
2. **Heng opp Vipps-plakat** – Rettferdig og kjedelig
   - Effekt: +2 Kaffekopper
   - Utfall: Kassa går i pluss. Du fikk to kopper på huset for innsatsen.
3. **Kakelotteri på fredag** – Sosialt lim
   - Effekt: +8 Fagpoeng, +150 kr, −4 stress (alle)
   - Utfall: Sjokoladekaka til Hanne innbrakte 640 kroner og tre nye oppskriftsforespørsler.

**Faglig begrunnelse:** Det psykososiale arbeidsmiljøet er lederens ansvar. Små, rettferdige ordninger for fellesskapet på vaktrommet betyr mer for trivsel og nærvær enn man skulle tro.

**Kilde:** Arbeidsmiljøloven § 4-3

### Student i praksis

`student_praksis` · alle avdelinger, hele døgnet

> Høgskolen spør om vi kan ta imot to sykepleierstudenter i åtte uker. Fra mandag.
> — *Fagutviklingssykepleier*

1. **Ja – med fast veileder** *(krever Dok. 3+ på vakt)* – Krever noen med Dok. 3+ på vakt
   - Effekt: +50 Fagpoeng, +3 stress (alle), +15 pass-XP
   - Utfall: Studentene stilte spørsmål ingen hadde tenkt på. Én av dem vil ha sommerjobb.
2. **Ja – de får gå «på topp»** – Ekstra hender uten plan
   - Effekt: +15 Fagpoeng, +2 trivsel, +5 stress (alle)
   - Utfall: Ekstra hender i stellet, men lite læring. Praksisveilederen var lunken i evalueringen.
3. **Nei, ikke kapasitet nå** – Ærlig, men kortsiktig
   - Effekt: −10 Fagpoeng, −2 stress (alle)
   - Utfall: Høgskolen forsto det. De spurte naboavdelingen i stedet.

**Faglig begrunnelse:** Kommunen plikter å medvirke til undervisning og praktisk opplæring av helsepersonell. God praksis krever en navngitt veileder og avsatt tid – studenter skal ikke telle som bemanning.

**Kilde:** Helse- og omsorgstjenesteloven § 8-1

### Fall på natta

`fall_natt` · nattevakt

> {beboer} (rom {rom}) funnet på gulvet 03:20. Våken, klar, vondt i hofta. Sengehesten var nede.
> — *Nattevakta*

1. **Sykepleiefaglig vurdering og legevakt** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +30 Fagpoeng, +2 trivsel, +1 avvik
   - Utfall: Røntgen viste ingen brudd. Fallrisikovurdering oppdatert og pårørende informert før frokost.
2. **Ring 113 for sikkerhets skyld** – Trygt, men ressurskrevende
   - Effekt: −500 kr, +4 stress (på vakt), +1 avvik
   - Utfall: Fire timer på akuttmottaket, så retur. {beboer} var sliten, men hel.
3. **Bestill fallsensor til rommet** – Forebygger neste gang
   - Effekt: +15 Fagpoeng, −1200 kr, +4 trivsel, +1 avvik
   - Utfall: Sensoren varsler når {beboer} setter seg opp. Nattevakta rekker inn før {han} står.

**Faglig begrunnelse:** Etter et fall skal beboeren undersøkes før forflytning, vitale mål tas og hendelsen dokumenteres. Fallet skal føre til ny fallrisikovurdering og tiltak, og pårørende skal informeres.

**Kilde:** Tiltakspakke for forebygging av fall (I trygge hender 24-7)

### Turnusønsker

`turnus_onsker` · alle avdelinger, hele døgnet

> Ønskelista til jul er full. Alle vil ha fri julaften. Ingen vil ha nyttårsnatt.
> — *Deg selv*

1. **Følg fjorårets rullering** – Rettferdig, upopulært hos noen
   - Effekt: +10 Fagpoeng, +2 stress (alle)
   - Utfall: Noen sukket, men ingen kunne si det var urettferdig.
2. **Tilby ekstra betalt for helligdagene** – Koster, men løser kabalen
   - Effekt: −1500 kr, −8 stress (alle)
   - Utfall: Nyttårsnatta ble besatt på fem minutter. Budsjettet merket det.
3. **Loddtrekning på personalmøtet** – Flaks for noen
   - Effekt: +1 Kaffekopper, +4 stress (alle)
   - Utfall: Han som trakk julaften for tredje år på rad tok det … ikke pent. Du trenger en kaffe.

**Faglig begrunnelse:** Arbeidsplanen skal drøftes med de tillitsvalgte og være kjent senest to uker før den gjelder. Forutsigbar og rettferdig fordeling av helligdager forebygger både konflikter og fravær.

**Kilde:** Arbeidsmiljøloven § 10-3

### Rød hæl

`trykksaar` · alle avdelinger, hele døgnet

> Rød, varm hæl hos {beboer} (rom {rom}). Blekner ikke ved trykk. {Han} har ligget mye siste uka.
> — *Dagvakta*

1. **Sårvurdering og avlastning nå** *(krever Sår 3+ på vakt)* – Krever Sår 3+ på vakt
   - Effekt: +32 Fagpoeng, +4 trivsel
   - Utfall: Hælavlastning, snuplan og bilde i journalen. Rødheten ga seg på fire dager.
2. **Lei trykkavlastende madrass** – Utstyr løser mye
   - Effekt: −700 kr, +3 trivsel
   - Utfall: Madrassen surrer svakt hele natta. {beboer} synes det er som å ligge i en båt.
3. **Se det an til legevisitten torsdag** – Det er jo bare rødt
   - Effekt: −2 trivsel
   - Utfall: Dere ser det an. Hælen er fortsatt rød på kveldsstellet.
   - Utsatt – kommer tilbake som «Såret har åpnet seg» (`trykksaar_aapent`) etter 24–48 spilltimer

**Faglig begrunnelse:** Rødhet som ikke blekner ved trykk, er et trykksår i kategori 1. Da skal trykket fjernes med en gang, huden vurderes daglig og risikoen kartlegges, for eksempel med Braden-skalaen.

**Kilde:** Tiltakspakke for forebygging av trykksår (I trygge hender 24-7)

### Alarmtretthet

`velferdstek_alarm` · fra avdelingsnivå 2

> Trygghetsalarmene piper konstant. 48 varsler i natt, 3 reelle. Folk begynner å overse dem.
> — *Nattevakta*

1. **Gå gjennom og tilpass hver sensor** *(krever Dok. 2+ på vakt)* – Krever Dok. 2+ på vakt
   - Effekt: +40 Fagpoeng, −5 stress (alle), +10 pass-XP
   - Utfall: Individuelle innstillinger ga 70 % færre varsler. Og nå reagerer folk når det piper.
2. **Bestill leverandøren til opplæring** – Koster, men alle lærer
   - Effekt: +25 Fagpoeng, −1100 kr, −3 stress (alle)
   - Utfall: To timer med en entusiastisk mann i fleece. Overraskende nyttig.
3. **Skru av de verste** – Stillhet er også noe
   - Effekt: −4 stress (alle)
   - Utfall: Det ble stille på vaktrommet. Deilig – enn så lenge.
   - Utsatt – kommer tilbake som «Alarmen ingen hørte» (`alarm_oversett`) etter 24–48 spilltimer

**Faglig begrunnelse:** Alarmtretthet er en kjent pasientsikkerhetsrisiko. Varslingsteknologi skal tilpasses den enkelte og evalueres jevnlig. For beboere uten samtykkekompetanse kreves det vedtak.

**Kilde:** Pasient- og brukerrettighetsloven § 4-6 a

### Innsparingskrav

`budsjettmote` · fra avdelingsnivå 2

> Kommunalsjefen vil ha 2 % kutt innen kvartalet. «Dere finner sikkert noe.»
> — *Enhetsleder*

1. **Legg fram kvalitetstallene** *(krever Dok. 3+ på vakt)* – Krever at dere har noe å vise til
   - Effekt: +20 Fagpoeng, +1200 kr
   - Utfall: Færre avvik og lavere sykefravær talte for seg. Dere fikk heller en liten styrking.
2. **Kutt i vikarbruken** – Sparer penger, sliter på de faste
   - Effekt: +800 kr, +7 stress (alle)
   - Utfall: Tallene ble grønne. Ansiktene på vaktrommet ble litt gråere.
3. **Kutt aktivitetsbudsjettet** – Bingo er vel ikke lovpålagt?
   - Effekt: +600 kr, −6 trivsel
   - Utfall: Ingen trekkspillmann i november. Beboerne la merke til det.

**Faglig begrunnelse:** Kommunen skal sørge for forsvarlige tjenester uavhengig av budsjettsituasjonen. Lederen må kunne dokumentere kvalitet og risiko – tall på avvik, trivsel og fravær er de beste argumentene.

**Kilde:** Helse- og omsorgstjenesteloven § 4-1 · Forskrift om ledelse og kvalitetsforbedring

### Omgangssyke på vei

`smittevern` · alle avdelinger, hele døgnet

> Tre beboere med oppkast siden i går. Naboavdelingen har stengt for besøk.
> — *Smittevernkontakt*

1. **Isoler og innfør besøksrestriksjoner** – Strengt, men effektivt
   - Effekt: +25 Fagpoeng, −300 kr, −3 trivsel
   - Utfall: Utbruddet stoppet på fem. Pårørende forsto det da de fikk god informasjon.
2. **Ekstra renhold og håndhygiene-runde** *(krever Stell 3+ på vakt)* – Krever noen med Stell 3+
   - Effekt: +30 Fagpoeng, +1 trivsel, −8 energi (på vakt)
   - Utfall: Alle kontaktpunkter vasket to ganger daglig. Bare én ansatt ble syk.
3. **Kjør som vanlig** – Det går sikkert over
   - Effekt: −5 trivsel, +10 stress (alle), +1 avvik
   - Utfall: Halve avdelingen og fire ansatte lå nede innen helga.

**Faglig begrunnelse:** Ved mistenkt norovirusutbrudd isoleres de syke, og hendene vaskes med såpe og vann – hånddesinfeksjon alene er ikke nok. Syke ansatte holder seg hjemme til 48 timer etter at symptomene er over.

**Kilde:** FHIs råd ved norovirusutbrudd · Forskrift om smittevern i helse- og omsorgstjenesten

### Lang søndag

`aktivitet` · alle avdelinger, hele døgnet

> Regn, ingen besøk, og TV-en i stua viser sport ingen bryr seg om. Flere vandrer.
> — *Helgevakta*

1. **Sangstund og vaffelsteking** *(krever Miljø 3+ på vakt)* – Krever noen med Miljø 3+
   - Effekt: +20 Fagpoeng, +7 trivsel, −3 stress (på vakt)
   - Utfall: «Kjerringa med staven» ljomet gjennom korridoren. Lukta av vafler roet hele avdelingen.
2. **Ring besøksvennen** – Frivilligsentralen stiller opp
   - Effekt: +4 trivsel
   - Utfall: Besøksvennen kom med hunden Balder. {beboer} snakket mer enn {han} har gjort på uker.
3. **Det er søndag for de ansatte også** – Rolig vakt
   - Effekt: −3 trivsel, +5 energi (på vakt)
   - Utfall: En stille dag. Kanskje litt for stille.

**Faglig begrunnelse:** Meningsfull aktivitet er en del av tjenesten, ikke pynt. Beboere skal få tilbud om varierte og tilpassede aktiviteter, og musikk og fellesskap demper uro og vandring.

**Kilde:** Kvalitetsforskriften for pleie- og omsorgstjenestene § 3

### Noe er galt med {beboer}

`news2_forverring` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) er slapp og klam, puster fort og svarer ikke helt adekvat. «{Han} er ikke seg selv», sier helsefagarbeideren.
> — *Aftenvakta*

1. **Ta NEWS2 og ring legevakta med ISBAR** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +40 Fagpoeng, +3 trivsel, +10 pass-XP
   - Utfall: NEWS 7: rask pust, lav metning og nyoppstått forvirring. Legevakta fikk en ryddig rapport og sendte ambulanse. Lungebetennelse – fanget opp i tide.
2. **Ring 113 med en gang** – Trygt, men uten målinger å melde
   - Effekt: −400 kr, +1 trivsel, +5 stress (på vakt)
   - Utfall: Ambulansen kom, men AMK måtte spørre tre ganger etter puls og pustefrekvens. Det gikk bra – denne gangen.
3. **Se an til morgenvisitten** – {Han} er jo ofte trøtt om kvelden
   - Effekt: −6 trivsel, +6 stress (alle), +2 avvik
   - Utfall: Klokka fem var {han} ikke kontaktbar. Innlagt med sepsis. Statsforvalteren ber om en redegjørelse.

**Faglig begrunnelse:** NEWS2 gir en samlet skår av respirasjonsfrekvens, oksygenmetning, blodtrykk, puls, bevissthet og temperatur, og fanger opp forverring før den blir åpenbar. ISBAR (Identifikasjon, Situasjon, Bakgrunn, Aktuell tilstand, Råd) sikrer at den som tar imot, får det som trengs for å handle.

**Kilde:** NEWS2 · ISBAR

### Vil ikke dusje

`motsetter_seg_stell` · krever beboer med profilen «Kognitiv svikt og uro»

> {beboer} (rom {rom}) har demens og har ikke dusjet på ni dager. {Han} slår og roper når vi prøver. To vikarer foreslo å «bare holde {ham}».
> — *Dagvakta*

1. **Prøv tillitsskapende tiltak** *(krever Miljø 3+ på vakt)* – Krever noen med Miljø 3+
   - Effekt: +30 Fagpoeng, +5 trivsel, −3 stress (på vakt)
   - Utfall: Kjent pleier, varmt bad med musikk etter frokost – og et håndkle over skuldrene hele veien. {beboer} nynnet med.
2. **Dokumentér forsøkene og drøft vedtak med legen** *(krever Dok. 3+ på vakt)* – Krever noen med Dok. 3+
   - Effekt: +40 Fagpoeng, −5 energi (på vakt), +10 pass-XP
   - Utfall: Samtykkekompetansen ble vurdert, tiltakene journalført, og det ble fattet vedtak om nødvendig stell. Pårørende fikk kopi og informasjon om klageretten.
3. **Hold {ham} og få det gjort** – Raskt og effektivt
   - Effekt: −6 trivsel, +5 stress (på vakt), +2 avvik
   - Utfall: {beboer} ble ren. {Han} ble også redd for dusjrommet – og for dere. Tvang uten vedtak er lovbrudd, og avviket er meldt.

**Faglig begrunnelse:** Helsehjelp til en pasient uten samtykkekompetanse som motsetter seg hjelpen, krever at tillitsskapende tiltak er forsøkt først, at unnlatelse kan gi vesentlig helseskade, og at det fattes skriftlig vedtak. Tvang uten vedtak er ulovlig.

**Kilde:** Pasient- og brukerrettighetsloven kap. 4A (§ 4A-3)

### Plutselig forvirret

`delirium_natt` · nattevakt

> {beboer} (rom {rom}) var klar i går. I natt drar {han} i lakenet, ser «folk i gardina» og vil ut. Datteren er skremt.
> — *Nattevakta*

1. **Let etter årsaken: infeksjon, smerte, full blære** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +40 Fagpoeng, +4 trivsel
   - Utfall: Blæra inneholdt 700 ml. Etter tømming og smertelindring roet {han} seg, og legen fulgte opp urinveisinfeksjonen neste morgen.
2. **Skjerm, demp lyset og sitt hos {ham}** *(krever Ro 3+ på vakt)* – Krever noen med Ro 3+
   - Effekt: +20 Fagpoeng, +3 trivsel, −6 energi (på vakt)
   - Utfall: En fast person, nattlampe og rolig stemme hjalp gjennom natta. Men årsaken er fortsatt ikke funnet.
3. **Gi noe å sove på** – Så får alle ro
   - Effekt: −4 trivsel, +1 avvik
   - Utfall: {Han} sov. Dagen etter var {han} mer forvirret, ustø – og falt på vei til badet.

**Faglig begrunnelse:** Akutt forvirring (delirium) er en medisinsk akuttilstand med en utløsende årsak – ofte infeksjon, smerte, urinretensjon, dehydrering eller legemidler. Finn og behandle årsaken; beroligende legemidler kan forverre tilstanden hos eldre.

**Kilde:** 4AT (screening for delirium)

### Hoster ved måltid

`dysfagi_hoste` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) hoster og får våt stemme når {han} drikker. {Han} har hatt feber to ganger denne måneden.
> — *Dagvakta*

1. **Tilpass konsistens og sittestilling, be om svelgvurdering** *(krever Ernæring 3+ på vakt)* – Krever noen med Ernæring 3+
   - Effekt: +35 Fagpoeng, +4 trivsel
   - Utfall: Fortykket drikke, oppreist stilling og små slurker. Logopeden kom uka etter, og feberen har ikke kommet tilbake.
2. **Gi bare moset mat fra nå** – Enkelt og trygt?
   - Effekt: +5 Fagpoeng, −3 trivsel
   - Utfall: Hostingen avtok, men {beboer} mistet matlysten. Tre uker senere var {han} gått ned to kilo.
3. **Minn {ham} på å drikke mer** – {Han} trenger jo væske
   - Effekt: −400 kr, −4 trivsel, +1 avvik
   - Utfall: Lungebetennelse etter aspirasjon og ti dager på sykehus. Tegnene var der.

**Faglig begrunnelse:** Hoste, våt stemme og gjentatt feber er klassiske tegn på svelgvansker med aspirasjon. Tiltaket er tilpasset konsistens og spisestilling og en svelgvurdering – samtidig som ernæringen følges, fordi konsistenstilpasset kost øker risikoen for underernæring.

**Kilde:** Nasjonal faglig retningslinje for forebygging og behandling av underernæring · IDDSI

### Urolig mot slutten

`palliasjon_uro` · krever beboer med profilen «Palliasjon og trygghet»

> {beboer} (rom {rom}) er døende. {Han} er urolig, surkler og grimaserer. Sønnen spør om {han} har vondt, og om {han} burde på sykehus.
> — *Nattevakta*

1. **Lindre etter plan og bli hos familien** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +45 Fagpoeng, +6 trivsel, −6 energi (på vakt), +10 pass-XP
   - Utfall: Smerte og uro ble kartlagt, behovsmedisin gitt og effekten fulgt. {beboer} døde rolig i grålysningen med sønnen ved senga.
2. **Send {ham} til sykehus** – Der har de mer utstyr
   - Effekt: −600 kr, −5 trivsel, +4 stress (på vakt)
   - Utfall: {beboer} døde på en båre i akuttmottaket. Det var ikke det {han} og familien hadde ønsket i forhåndssamtalen.
3. **Vent på legevisitten i morgen** – Det er jo midt på natta
   - Effekt: −6 trivsel, +6 stress (på vakt), +1 avvik
   - Utfall: Det ble en lang og vond natt for {beboer}, for sønnen og for nattevakta.

**Faglig begrunnelse:** Når døden er nær, er målet lindring der pasienten er. Smerte, uro, kvalme og surkling skal kartlegges og behandles fortløpende, med behovsmedisin forordnet på forhånd. Forhåndssamtaler avklarer hva pasienten ønsker før det haster.

**Kilde:** Nasjonale faglige råd for lindrende behandling i livets sluttfase

### Naboen ringer

`taushetsplikt_nabo` · alle avdelinger, hele døgnet

> «Jeg er bare en gammel nabo av {beboer}. Hvordan går det egentlig med {ham}? Er det kreft?» Hun har ringt tre ganger.
> — *Dagvakta*

1. **Spør {beboer} om hva hun kan få vite** – Det er {hans} opplysninger
   - Effekt: +20 Fagpoeng, +3 trivsel
   - Utfall: {beboer} ville gjerne ha besøk, men ikke at diagnosen ble nevnt. Naboen kom på torsdag med wienerbrød.
2. **Si litt – hun mener det jo godt** – Bare det viktigste
   - Effekt: −3 trivsel, +1 avvik
   - Utfall: Innen helga visste hele borettslaget det. {beboer}s datter ringte, og hun var ikke blid.
3. **Avvis henne: «Vi kan ikke si noe»** – Korrekt, men kaldt
   - Effekt: +8 Fagpoeng, −1 trivsel
   - Utfall: Taushetsplikten ble overholdt. {beboer} fikk aldri vite at noen spurte etter {ham}.

**Faglig begrunnelse:** Helsepersonell har taushetsplikt om helse og personlige forhold – også overfor venner og naboer. Opplysninger kan gis når pasienten samtykker, så det enkleste er som regel å spørre pasienten selv.

**Kilde:** Helsepersonelloven §§ 21 og 22

### GPS til {beboer}?

`gps_vandring` · krever beboer med profilen «Kognitiv svikt og uro» · fra avdelingsnivå 2

> {beboer} (rom {rom}) gikk ut i tøflene i natt og ble funnet ved busstoppet. Sønnen vil ha GPS på {ham}. {beboer} skjønner ikke spørsmålet.
> — *Primærkontakten*

1. **Vurder samtykkekompetansen og fatt vedtak** *(krever Dok. 3+ på vakt)* – Krever noen med Dok. 3+
   - Effekt: +40 Fagpoeng, −500 kr, +4 trivsel, +10 pass-XP
   - Utfall: Vurderingen ble journalført, vedtaket fattet og pårørende informert. {beboer} går tur igjen – og dere vet hvor {han} er.
2. **Bare sett på GPS-en** – Sønnen har jo sagt ja
   - Effekt: −500 kr, +2 trivsel, +1 avvik
   - Utfall: Det virket, helt til tilsynet spurte etter vedtaket. Pårørende kan ikke samtykke til dette på {hans} vegne.
3. **Lås avdelingsdøra om natta** – Da kommer {han} ingen vei
   - Effekt: −5 trivsel, +2 avvik
   - Utfall: {beboer} sto og rev i døra i to timer. Innlåsing er tvang og krever et helt annet vedtak.

**Faglig begrunnelse:** Varslings- og lokaliseringsteknologi kan brukes for pasienter uten samtykkekompetanse når det er nødvendig for å hindre skade og er i pasientens interesse. Det krever en dokumentert vurdering og vedtak – pårørendes ønske er ikke nok.

**Kilde:** Pasient- og brukerrettighetsloven § 4-6 a

### Urinen lukter

`uvi_stix` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) har sterk lukt av urinen. Ingen feber, ingen svie, {han} er som vanlig. Vikaren har stixet: utslag på alt. «{Han} må ha antibiotika!»
> — *Aftenvakta*

1. **Observer symptomer og gi rikelig drikke** *(krever Medisin 3+ på vakt)* – Krever noen med Medisin 3+
   - Effekt: +30 Fagpoeng, +2 trivsel
   - Utfall: Ingen symptomer, ingen behandling. Mer drikke ga lysere urin, og {beboer} slapp en kur {han} ikke trengte.
2. **Ring legen og be om antibiotika** – For sikkerhets skyld
   - Effekt: −300 kr, −3 trivsel, +1 avvik
   - Utfall: {beboer} fikk kur, diaré og soppinfeksjon. Urinen lukter fortsatt.
3. **Send urinprøve til dyrkning** – Så vet vi i hvert fall
   - Effekt: +5 Fagpoeng, −200 kr
   - Utfall: Prøven viste bakterier – som hos mange på {beboer}s alder. Legen ville ikke behandle uten symptomer.

**Faglig begrunnelse:** Bakterier i urinen uten symptomer er vanlig hos eldre og skal ikke behandles. Lukt og utslag på stix alene er ikke grunn til antibiotika; unødvendige kurer gir bivirkninger og resistens.

**Kilde:** Nasjonal faglig retningslinje for antibiotika i primærhelsetjenesten

### Sen–tidlig

`hviletid` · alle avdelinger, hele døgnet

> Kan aftenvakta gå tidligvakt i morgen? Hun går av 22:30 i kveld. Det er bare henne som ikke har sagt nei ennå.
> — *Deg selv*

1. **Nei – finn en annen løsning** – Koster en vikartime eller to
   - Effekt: +10 Fagpoeng, −500 kr, −3 stress (alle)
   - Utfall: Vikaren kostet litt, men ingen gikk på jobb med seks timers søvn.
2. **Avklar med tillitsvalgt og kompensér** – Kortere hvile kan avtales
   - Effekt: +15 Fagpoeng, −200 kr, +3 stress (på vakt)
   - Utfall: Avtalen ga åtte timers hvile og kompenserende fri dagen etter. Ryddig – men bør ikke bli en vane.
3. **«Du stiller vel opp for kollegene?»** – Gratis og effektivt
   - Effekt: +9 stress (alle), −15 energi (alle), +1 avvik
   - Utfall: Hun kom. Litt over åtte ga hun morgenmedisinen til feil rom.

**Faglig begrunnelse:** Arbeidstaker skal ha minst 11 timers sammenhengende hvile i døgnet. Kortere hvile, ned til 8 timer, krever avtale med tillitsvalgte og kompenserende hvile. Trøtte folk gjør flere feil.

**Kilde:** Arbeidsmiljøloven § 10-8

### Journalen henger etter

`journal_etterslep` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) falt på lørdag. I dag er det tirsdag, og det står ingenting i journalen. «Vi sa det jo i rapporten», sier helgevakta.
> — *Fagutviklingssykepleier*

1. **Få det journalført nå, og skjerm tid til dokumentasjon** *(krever Dok. 2+ på vakt)* – Krever noen med Dok. 2+
   - Effekt: +30 Fagpoeng, −4 energi (på vakt), +1 avvik
   - Utfall: Fallet ble etterregistrert som det var – med dato for når notatet ble skrevet. Ti minutter før vaktslutt er nå skjermet tid.
2. **Muntlig rapport får holde** – Alle vet det jo
   - Effekt: −2 trivsel, +1 avvik
   - Utfall: Fysioterapeuten visste det ikke. {beboer} ble tatt med på gangtrening med et brukket håndledd ingen hadde oppdaget.
3. **Skriv notatet og sett lørdagens dato** – Så ser det ryddig ut
   - Effekt: +3 stress (alle), +2 avvik
   - Utfall: Tidsstempelet avslørte det med en gang. Tilbakedatering er verre enn et sent notat.

**Faglig begrunnelse:** Den som yter helsehjelp, skal føre relevante og nødvendige opplysninger i journalen uten ugrunnet opphold. Sene notater føres med riktig tidspunkt for nedtegnelsen – journalen skal aldri tilbakedateres.

**Kilde:** Helsepersonelloven §§ 39 og 40 · Pasientjournalforskriften

### Klagen har kommet

`klage_statsforvalter` · kommer bare som oppfølging av en utsatt sak

> Datteren til {beboer} har klaget skriftlig – med kopi til Statsforvalteren. De ber om redegjørelse, journalutskrift og ernæringsplan innen tre uker.
> — *Enhetsleder*

1. **Skriv en ærlig redegjørelse og rett opp** *(krever Dok. 3+ på vakt)* – Krever noen med Dok. 3+
   - Effekt: +20 Fagpoeng, +2 trivsel, −8 energi (på vakt), +1 avvik
   - Utfall: Dere beklaget, la fram ny ernæringsplan og inviterte til møte. Statsforvalteren avsluttet saken uten merknad.
2. **Be om et møte med datteren først** – Sent, men bedre enn aldri
   - Effekt: −400 kr, +1 trivsel, +5 stress (alle), +1 avvik
   - Utfall: Møtet ble vanskelig. Hun trakk ikke klagen, men satte pris på at dere endelig lyttet.
3. **Forsvar praksisen i svarbrevet** – Vi har jo gjort jobben vår
   - Effekt: −1500 kr, −6 trivsel, +8 stress (alle), +2 avvik
   - Utfall: Statsforvalteren konkluderte med brudd på kravet til forsvarlighet. Avdelingen fikk pålegg om retting, og saken havnet i lokalavisa.

**Faglig begrunnelse:** En klage behandles først av tjenesten selv. Blir den ikke imøtekommet, går den videre til Statsforvalteren, som kan be om redegjørelse og journal. Åpenhet, beklagelse og konkrete tiltak tidlig er både rett og klokt.

**Kilde:** Pasient- og brukerrettighetsloven kap. 7

### {beboer} orker ikke mer

`vekttap_forverret` · kommer bare som oppfølging av en utsatt sak

> {beboer} (rom {rom}) har gått ned to kilo til. {Han} er slapp, svimmel og blir liggende i senga. Buksa henger på {ham}.
> — *Primærkontakten*

1. **Lege, ernæringsplan og tett oppfølging nå** *(krever Ernæring 3+ på vakt)* – Krever noen med Ernæring 3+
   - Effekt: +15 Fagpoeng, +2 trivsel, −6 energi (på vakt), +1 avvik
   - Utfall: Blodprøver, beriket kost og små måltider seks ganger om dagen. Det snur sakte – men det tar måneder å hente inn det som er tapt.
2. **Næringsdrikk til alle måltider** – Det vi burde gjort for lenge siden
   - Effekt: −900 kr, −1 trivsel, +1 avvik
   - Utfall: Vekta stabiliserte seg. Kreftene kom ikke tilbake like fort.
3. **Legg {ham} inn på sykehus** – Nå er det for sent å løse her
   - Effekt: −1800 kr, −5 trivsel, +5 stress (alle), +2 avvik
   - Utfall: Innlagt med alvorlig underernæring og dehydrering. Epikrisen spør hvorfor vekttapet ikke ble fulgt opp.

**Faglig begrunnelse:** Underernæring svekker muskelkraft, immunforsvar og sårtilheling, og øker risikoen for fall og infeksjoner. Jo senere tiltak settes inn, desto lengre tid tar det å snu. Ved fortsatt vekttap skal lege kobles inn og planen evalueres.

**Kilde:** Nasjonal faglig retningslinje for forebygging og behandling av underernæring

### Såret har åpnet seg

`trykksaar_aapent` · kommer bare som oppfølging av en utsatt sak

> Blemma på hælen til {beboer} har sprukket. Såret er to centimeter, væsker og lukter. {Han} vil ikke stå på foten.
> — *Dagvakta*

1. **Sårvurdering, avlastning og plan med legen** *(krever Sår 3+ på vakt)* – Krever Sår 3+ på vakt
   - Effekt: +15 Fagpoeng, −600 kr, +1 trivsel, +1 avvik
   - Utfall: Såret ble klassifisert, fotografert og avlastet. Det gror – men regn med åtte uker.
2. **Lei inn sårsykepleier** – Kompetansen finnes utenfor huset
   - Effekt: −1600 kr, +1 trivsel, +1 avvik
   - Utfall: Sårsykepleieren la en plan og lærte opp to på hver vakt. Dyrt, men nødvendig.
3. **Legg på en bandasje og følg med** – Det går vel over
   - Effekt: −2500 kr, −6 trivsel, +6 stress (alle), +2 avvik
   - Utfall: Infeksjon, antibiotika og innleggelse. Et trykksår som kunne vært forebygget med en pute under leggen.

**Faglig begrunnelse:** De fleste trykksår kan forebygges. Når huden først er brutt, tar tilhelingen uker til måneder og krever avlastning, riktig sårbehandling og god ernæring. Åpne trykksår skal klassifiseres, dokumenteres og følges opp med plan.

**Kilde:** Tiltakspakke for forebygging av trykksår (I trygge hender 24-7)

### Feil dose ble gitt

`medisinfeil_gitt` · kommer bare som oppfølging av en utsatt sak

> Samme feil i dosetten igjen – og denne gangen ble den gitt. {beboer} (rom {rom}) har fått dobbel dose blodfortynnende i to dager.
> — *Nattevakta*

1. **Kontakt lege, observer og meld avvik** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +20 Fagpoeng, +4 stress (på vakt), +1 avvik
   - Utfall: Legen ordinerte blodprøve og pause i behandlingen. Ingen blødning. Pårørende ble informert, og rutinen for istandgjøring legges om.
2. **Ring legevakta og følg rådene** – Ingen sykepleier å spørre
   - Effekt: −500 kr, +6 stress (på vakt), +2 avvik
   - Utfall: {beboer} ble sendt inn til observasjon over natta. Det gikk bra, men det var nære på.
3. **Juster dosetten og si ingenting** – {Han} merker det vel ikke
   - Effekt: −8 trivsel, +10 stress (alle), +3 avvik
   - Utfall: Neseblødningen på kvelden lot seg ikke stoppe. Nå er det både en alvorlig hendelse og et forsøk på å skjule den.

**Faglig begrunnelse:** Pasienten har rett til informasjon når hen er påført skade eller alvorlige komplikasjoner. Feil skal meldes og brukes til å forbedre rutinene – en feil som gjentar seg, er en systemsvikt, ikke en enkeltpersons uhell.

**Kilde:** Pasient- og brukerrettighetsloven § 3-2 · Forskrift om ledelse og kvalitetsforbedring

### Alarmen ingen hørte

`alarm_oversett` · kommer bare som oppfølging av en utsatt sak

> {beboer} (rom {rom}) lå på badegulvet i to timer i natt. Sengealarmen {hans} var en av dem som ble skrudd av.
> — *Nattevakta*

1. **Skru på alt, og tilpass hver sensor individuelt** *(krever Dok. 2+ på vakt)* – Krever noen med Dok. 2+
   - Effekt: +20 Fagpoeng, −8 energi (på vakt), +1 avvik
   - Utfall: Alle alarmer er på igjen, nå med innstillinger per beboer. {beboer} er forslått, men uten brudd.
2. **Sett inn ekstra tilsynsrunder på natt** – Folk i stedet for teknologi
   - Effekt: −700 kr, +7 stress (alle), +1 avvik
   - Utfall: Tryggere netter, slitnere nattevakter. Det holder ikke i lengden.
3. **Skriv det av som et uhell** – Fall skjer jo
   - Effekt: −1200 kr, −7 trivsel, +3 avvik
   - Utfall: Pårørende ba om innsyn i alarmloggen. Den viste at varslingen var slått av med vilje.

**Faglig begrunnelse:** Varslingsteknologi er en del av helsehjelpen når den først er tatt i bruk. Å slå av varsler uten en individuell vurdering fjerner et sikkerhetsnett beboeren er avhengig av. Riktig tiltak mot alarmtretthet er tilpasning, ikke utkobling.

**Kilde:** Helse- og omsorgstjenesteloven § 4-1 · Pasient- og brukerrettighetsloven § 4-6 a

## Klinisk observasjon og akutt forverring (7)

### Slo hodet i fallet

`fall_blodfortynnende` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) snublet i teppekanten og slo bakhodet i dørkarmen. Sier {han} har det fint. Står på blodfortynnende.
> — *Dagvakta*

1. **Nevrologiske observasjoner og ring legen** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +28 Fagpoeng, +2 trivsel, −6 energi (på vakt)
   - Utfall: Legen ville ha CT. Den viste en liten blødning som ble fanget i tide. {beboer} er tilbake etter tre døgn.
2. **Observer selv hver time utover dagen** – Skjema for bevissthet og pupiller
   - Effekt: +10 Fagpoeng, +5 stress (på vakt), −8 energi (på vakt)
   - Utfall: Skjemaet ble fylt ut til punkt og prikke. Ingen visste helt hva de så etter, men det gikk bra denne gangen.
3. **«{Han} sier jo selv at det går fint»** – Kaffe og et plaster
   - Effekt: −5 trivsel, +2 avvik
   - Utfall: Utpå kvelden ble {han} trøtt og uklar. Nattevakta ringte 113. Spørsmålet i etterkant var hvorfor ingen ringte før.

**Faglig begrunnelse:** Eldre som bruker blodfortynnende kan få hjerneblødning etter et lett slag mot hodet, og symptomene kan komme timer senere. Hodeskade hos antikoagulerte skal vurderes av lege, og bevissthet, pupiller og kraft følges tett det første døgnet.

**Kilde:** Skandinaviske retningslinjer for hodeskader · Helsedirektoratet: fallforebygging

### Skjelven før frokost

`hypoglykemi` · dagvakt

> {beboer} (rom {rom}) er klam, skjelven og svarer rart. Blodsukker 2,9. Insulinet ligger klart på trallen.
> — *Dagvakta*

1. **Juice nå, ny måling og be legen se på dosen** *(krever Medisin 2+ på vakt)* – Krever Medisin 2+ på vakt
   - Effekt: +25 Fagpoeng, +3 trivsel
   - Utfall: Etter et glass juice og en brødskive var blodsukkeret 5,8. Legen reduserte kveldsdosen og satte et romsligere mål.
2. **Gi juice og fortsett morgenrunden** – Det går over
   - Effekt: +1 trivsel, +1 avvik
   - Utfall: Det gikk over. To dager senere skjedde det igjen, like før frokost.
3. **Gi insulinet som står på lista** – Det er jo ordinert
   - Effekt: −6 trivsel, +8 stress (på vakt), +3 avvik
   - Utfall: {beboer} ble bevisstløs ved frokostbordet. Ambulansen kom fort. En ordinasjon fritar ingen fra å tenke.

**Faglig begrunnelse:** Lavt blodsukker behandles straks med raske karbohydrater, og måles på nytt etter et kvarter. Hos skrøpelige eldre er føling farligere enn litt høyt blodsukker, så behandlingsmålet bør være romslig og insulindosen vurderes på nytt av lege.

**Kilde:** Nasjonal faglig retningslinje for diabetes · kapittelet om eldre og sykehjem

### Seks dager uten

`obstipasjon` · krever beboer med profilen «Skrøpelig og multisyk»

> {beboer} (rom {rom}) er kvalm, urolig og vil ikke spise. Avføringslista er blank siden forrige tirsdag. Står fast på morfinplaster.
> — *Aftenvakta*

1. **Undersøk magen, kontakt lege og start tiltak** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +24 Fagpoeng, +4 trivsel, −5 energi (på vakt)
   - Utfall: Klyster i kveld, fast avføringsmiddel fra i morgen – og en avføringsliste som faktisk blir ført. Appetitten kom tilbake.
2. **Sviskesaft og mer drikke** – Det gamle husrådet
   - Effekt: −1 trivsel
   - Utfall: Godt ment, men altfor lite etter seks dager. Kvalmen ble ikke bedre av saften.
3. **Be om noe kvalmestillende** – Behandler symptomet
   - Effekt: −4 trivsel, +2 avvik
   - Utfall: Kvalmen dempet seg. To dager senere ble {beboer} lagt inn med oppkast og stinn mage.

**Faglig begrunnelse:** Opioider gir forstoppelse hos nesten alle, og avføringsmiddel skal følge med fra første dose. Obstipasjon hos eldre kan gi kvalme, forvirring, urinretensjon og i verste fall tarmslyng. Avføringsmønsteret må observeres og dokumenteres daglig.

**Kilde:** Norsk legemiddelhåndbok: opioidindusert obstipasjon · Nasjonalt handlingsprogram for palliasjon

### 29 grader på stua

`dehydrering_varme` · alle avdelinger, hele døgnet

> Tredje dag med hetebølge. Flere er slappe, to har mørk urin, og drikkelistene er blanke siden mandag.
> — *Helgevakta*

1. **Faste drikkerunder, saftis og legemiddelsjekk** *(krever Ernæring 2+ på vakt)* – Krever Ernæring 2+ på vakt
   - Effekt: +22 Fagpoeng, −300 kr, +5 trivsel
   - Utfall: Saftis klokka to ble dagens høydepunkt. Legen pauset vanndrivende hos tre beboere til varmen ga seg.
2. **Kjøp inn vifter til alle rom** – Synlig og raskt
   - Effekt: −900 kr, +3 trivsel
   - Utfall: Det suste behagelig i hele korridoren. Ingen drakk mer av den grunn.
3. **Drikke står jo framme på bordene** – De får ta selv
   - Effekt: −5 trivsel, +4 stress (på vakt), +2 avvik
   - Utfall: Torsdag ble to beboere forvirret, og én falt. Mugga på bordet var like full som om morgenen.

**Faglig begrunnelse:** Eldre kjenner mindre tørste og tåler væsketap dårlig, særlig de som bruker vanndrivende. Systematisk tilbud om drikke, kjølige rom og vurdering av legemidler forebygger dehydrering, forvirring, fall og nyresvikt.

**Kilde:** FHI: råd ved hetebølge · Nasjonale faglige råd om ernæring i helse- og omsorgstjenesten

### Mistet kaffekoppen

`hjerneslag_fast` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) mistet koppen kl. 14:10. Munnviken henger, og ordene kommer feil. {Han} smiler og sier at det sikkert går over.
> — *Dagvakta*

1. **Ring 113 nå og noter klokkeslettet** – Prate, smile, løfte
   - Effekt: +26 Fagpoeng, +3 trivsel, +4 stress (på vakt)
   - Utfall: Ambulansen var der på elleve minutter. {beboer} fikk behandling innen tidsvinduet og snakker nesten som før.
2. **Ring tilsynslegen og avvent** – Legen kjenner pasienten
   - Effekt: −3 trivsel, +1 avvik
   - Utfall: Legen ringte tilbake etter førti minutter og sa det dere egentlig visste: Ring 113. Da var mye av tidsvinduet brukt.
3. **Hjelp {ham} til sengs for å hvile** – {Han} er sikkert bare sliten
   - Effekt: −7 trivsel, +3 avvik
   - Utfall: Neste morgen var høyre side lam. Pårørende spør når symptomene startet, og hva som ble gjort da.

**Faglig begrunnelse:** Plutselig skjevhet i ansiktet, lammelse i en arm eller talevansker er hjerneslag til det motsatte er bevist. Ring 113 straks og noter tidspunktet symptomene startet – behandlingen virker bare de første timene, og hvert minutt teller.

**Kilde:** Nasjonal faglig retningslinje for hjerneslag · «Prate, smile, løfte»

### Såret lukter

`saar_infeksjon` · krever beboer med profilen «Komplekst sårstell»

> Leggsåret til {beboer} (rom {rom}) væsker gjennom bandasjen og lukter søtt. Rødmen har krøpet to fingerbredder oppover siden fredag.
> — *Dagvakta*

1. **Tegn rundt rødmen, ta bilde og mål NEWS2** *(krever Sår 3+ på vakt)* – Krever Sår 3+ på vakt
   - Effekt: +28 Fagpoeng, +3 trivsel, −5 energi (på vakt)
   - Utfall: Tusjstreken og bildene gjorde legens vurdering enkel. Behandling startet samme kveld, og rødmen trakk seg tilbake.
2. **Bytt til sølvbandasje** – Den dyre fra øverste hylle
   - Effekt: −450 kr, −1 trivsel
   - Utfall: Lukten ble borte. Rødmen fortsatte oppover under den fine bandasjen.
3. **Vent til sårsykepleieren kommer på torsdag** – Hun kan dette best
   - Effekt: −5 trivsel, +2 avvik
   - Utfall: Onsdag kveld hadde {beboer} frostanfall og 39,2. Innlagt med rosen og begynnende blodforgiftning.

**Faglig begrunnelse:** Økende rødme, varme, lukt, sekresjon og smerte tyder på sårinfeksjon. Tegn rundt rødmen, mål temperatur og NEWS2, og kontakt lege. Bandasjevalg er ikke nok når infeksjonen sprer seg i vevet – da trengs medisinsk vurdering.

**Kilde:** NIFS: sårbehandling i kommunehelsetjenesten · NEWS2

### Tungpustet

`kols_oksygen` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) har kols og strever med pusten. Metning 86 %. Vikaren vil skru oksygenet opp til fem liter «så {han} får luft».
> — *Aftenvakta*

1. **Leiring, forstøver og forsiktig oksygen** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +26 Fagpoeng, +3 trivsel
   - Utfall: Sittende med armene på et bord, forstøver og én liter oksygen. Metningen la seg på 90. Vikaren lærte noe nytt.
2. **Ring legevakta og gjør som de sier** – Trygt, men det tar tid
   - Effekt: +8 Fagpoeng, +5 stress (på vakt)
   - Utfall: Tjue minutter i telefonkø mens {beboer} strevde. Rådet var det samme som står i tiltaksplanen {hans}.
3. **Skru opp til fem liter** – Mer luft må jo hjelpe
   - Effekt: −5 trivsel, +3 avvik
   - Utfall: Metningen ble 98 %. {beboer} ble rolig. Så ble {han} sløv, og så svarte {han} ikke. Innlagt med CO₂-narkose.

**Faglig begrunnelse:** Ved kols kan for mye oksygen dempe pustedriven og gi farlig opphopning av karbondioksid. Målet er som regel en metning på 88–92 %, med forsiktig titrering. Leiring, leppepust, ro og ordinerte inhalasjoner hjelper – og NEWS2 skal skåres på riktig oksygenskala.

**Kilde:** Nasjonal faglig retningslinje for kols · NEWS2 (skala 2)

## Lovverk, etikk og tvang (7)

### Nekter sprøyta

`tvang_4a_insulin` · krever beboer med profilen «Kognitiv svikt og uro»

> {beboer} (rom {rom}) dytter bort insulinpennen for fjerde dag. Forstår ikke hvorfor {han} skal stikkes. Blodsukkeret er 24.
> — *Dagvakta*

1. **Tillitsskapende tiltak – og be legen vurdere vedtak** *(krever Dok. 3+ på vakt)* – Krever noen med Dok. 3+
   - Effekt: +30 Fagpoeng, +3 trivsel, +10 pass-XP
   - Utfall: Kjent pleier etter frokost, med radioen på, gikk bra tre av fire dager. For den fjerde finnes det nå et vedtak.
2. **Respekter nei-et og dropp insulinet** – Ingen skal tvinges
   - Effekt: −4 trivsel, +2 avvik
   - Utfall: Etter en uke var {beboer} tørst, sløv og forvirret. Å la være kan også være uforsvarlig.
3. **To holder armen, én setter sprøyta** – Fort gjort
   - Effekt: −6 trivsel, +6 stress (på vakt), +3 avvik
   - Utfall: Insulinet ble satt. Nå gjemmer {beboer} seg når de hvite uniformene kommer. Tvang uten vedtak er lovbrudd.

**Faglig begrunnelse:** Motstand skal først møtes med tillitsskapende tiltak. Mangler pasienten samtykkekompetanse og unnlatelse kan gi vesentlig helseskade, kan nødvendig helsehjelp gis med tvang – men bare etter skriftlig vedtak fra den som er ansvarlig for helsehjelpen, med kopi til Statsforvalteren.

**Kilde:** Pasient- og brukerrettighetsloven §§ 4A-3 og 4A-5

### Hvem bestemmer?

`samtykke_sykehus` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) har lungebetennelse og sier klart nei til sykehus. Datteren krever innleggelse: «{Han} forstår ikke sitt eget beste.»
> — *Aftenvakta*

1. **Vurder samtykkekompetansen sammen med legen** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +28 Fagpoeng, +4 trivsel, −6 energi (på vakt)
   - Utfall: {beboer} forklarte selv hva {han} valgte bort, og hvorfor. Behandlingen ble gitt på sykehjemmet. Datteren gråt, men forsto.
2. **Gjør som datteren sier** – Hun er nærmeste pårørende
   - Effekt: −5 trivsel, +2 avvik
   - Utfall: {beboer} ble kjørt inn mot sin vilje og lå to døgn på korridor. {Han} har ikke snakket til datteren siden.
3. **Ta nei-et til følge uten videre** – Pasientens ord er lov
   - Effekt: +8 Fagpoeng, −1 trivsel, +1 avvik
   - Utfall: Riktig utfall, svakt grunnlag. Ingen hadde vurdert eller journalført om {han} faktisk forsto valget.

**Faglig begrunnelse:** Samtykkekompetansen vurderes konkret for hver avgjørelse, og den faller bare bort når pasienten åpenbart ikke forstår hva samtykket omfatter. En samtykkekompetent pasient har rett til å takke nei. Pårørende skal høres, men kan ikke bestemme på pasientens vegne.

**Kilde:** Pasient- og brukerrettighetsloven §§ 4-1 og 4-3

### I syltetøyet

`skjult_medisinering` · krever beboer med profilen «Kognitiv svikt og uro»

> Nattevakta knuser tablettene til {beboer} (rom {rom}) og rører dem i syltetøyet. «Ellers spytter {han} dem ut.» Det har visst pågått siden jul.
> — *Fagutviklingssykepleier*

1. **Stans praksisen og be om legemiddelgjennomgang** *(krever Medisin 3+ på vakt)* – Krever Medisin 3+ på vakt
   - Effekt: +30 Fagpoeng, +2 trivsel, +1 avvik
   - Utfall: Fire av ni tabletter kunne seponeres. To fantes som mikstur. For de tre siste finnes det nå et vedtak.
2. **Meld avvik og ta det opp på personalmøtet** – Ingen har visst bedre
   - Effekt: +12 Fagpoeng, +4 stress (alle), +1 avvik
   - Utfall: Stille i rommet da paragrafen ble lest høyt. Praksisen er stanset – og nå spytter {beboer} ut tablettene igjen.
3. **La det gå – {han} får jo medisinen sin** – Det fungerer
   - Effekt: −3 trivsel, +3 avvik
   - Utfall: Farmasøyten på tilsyn fant en knust depottablett i syltetøyglasset. Rapporten ble ikke hyggelig lesning.

**Faglig begrunnelse:** Å skjule legemidler i mat for en pasient som motsetter seg, er tvang. Det krever vedtak etter kapittel 4A, og legen må ha vurdert både nødvendigheten og om tablettene tåler å knuses. Uten vedtak er praksisen ulovlig, uansett hvor godt den er ment.

**Kilde:** Pasient- og brukerrettighetsloven kap. 4A · Rundskriv IS-8/2015

### Sengehest opp?

`sengehest` · alle avdelinger, hele døgnet

> Sønnen til {beboer} (rom {rom}) krever sengehest: «{Han} falt jo ut i forrige uke!» {beboer} rister i grinda og prøver å klatre over.
> — *Aftenvakta*

1. **Lav seng, fallmatte og sengesensor** *(krever Stell 3+ på vakt)* – Krever Stell 3+ på vakt
   - Effekt: +24 Fagpoeng, −350 kr, +4 trivsel
   - Utfall: Sønnen fikk se oppsettet og roet seg. {beboer} står fortsatt opp om natta – men nå varsler sensoren.
2. **Sett opp sengehesten som sønnen vil** – Da er han fornøyd
   - Effekt: −4 trivsel, +2 avvik
   - Utfall: Natt til søndag klatret {beboer} over grinda og falt fra dobbel høyde. Lårhalsbrudd.
3. **Forklar sønnen hvorfor det ikke er lov** – Riktig, men løser lite
   - Effekt: +10 Fagpoeng, −2 trivsel
   - Utfall: Han forsto paragrafen, men ikke hva dere hadde tenkt å gjøre i stedet. Det spørsmålet står fortsatt åpent.

**Faglig begrunnelse:** Sengehest som hindrer en pasient som vil ut av senga, er et bevegelseshindrende tiltak og dermed tvang. Den øker dessuten fallhøyden for den som klatrer. Lav seng, fallmatte og sensor er mindre inngripende og skal prøves først.

**Kilde:** Pasient- og brukerrettighetsloven § 4A-4 · Helsedirektoratet: fallforebygging

### HLR minus?

`hlr_status` · fra avdelingsnivå 2

> Det står ingenting om gjenoppliving i journalen til {beboer} (rom {rom}). {Han} er 94 år og svært skrøpelig. Vikaren spør hva hun gjør hvis hjertet stopper i natt.
> — *Aftenvakta*

1. **Be tilsynslegen om en forhåndssamtale denne uka** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +28 Fagpoeng, +4 trivsel, +10 pass-XP
   - Utfall: {beboer} hadde tenkt mye på det, og var lettet over endelig å bli spurt. Avklaringen står nå øverst i journalen.
2. **Ring datteren og spør hva hun vil** – Rask avklaring
   - Effekt: −2 trivsel, +1 avvik
   - Utfall: Datteren ble satt ut. Dette er ikke pårørendes avgjørelse – og {beboer} sitter i naborommet og kan svare selv.
3. **Bli enige på vaktrommet: «Vi starter ikke»** – Alle tenker jo det samme
   - Effekt: +5 stress (alle), +3 avvik
   - Utfall: En uformell beslutning uten lege og uten journalnotat. Vikaren sov dårlig, og det med god grunn.

**Faglig begrunnelse:** Beslutningen om å avstå fra hjerte-lunge-redning tas av behandlingsansvarlig lege, etter samtale med pasienten og med pårørende hvis pasienten ønsker det. Den skal journalføres tydelig og være kjent for alle på vakt. Uten avklaring er utgangspunktet full innsats.

**Kilde:** Helsedirektoratet: Beslutningsprosesser ved begrensning av livsforlengende behandling

### En konvolutt

`gave_ansatt` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) stakk til favorittpleieren en konvolutt: 5000 kroner «til sommerferien». Hun spør deg om hun kan beholde den.
> — *Deg selv*

1. **Lever tilbake sammen, med en god forklaring** – Og foreslå et kort i stedet
   - Effekt: +18 Fagpoeng, +2 trivsel
   - Utfall: {beboer} ble litt lei seg, men skrev et kort til hele avdelingen. Det henger på vaktrommet nå.
2. **Sett pengene i kaffekassa** – Da kommer det alle til gode
   - Effekt: +2 Kaffekopper, +1 avvik
   - Utfall: God stemning – helt til sønnen spurte hvor det ble av uttaket på 5000. Gaveforbudet gjelder også kaffekassa.
3. **La henne beholde dem** – Hun fortjener det virkelig
   - Effekt: −4 trivsel, +5 stress (alle), +3 avvik
   - Utfall: Det tok to uker før alle visste det. Pårørende klaget, og kommunen opprettet personalsak.

**Faglig begrunnelse:** Helsepersonell kan ikke ta imot gaver som er egnet til å påvirke tjenesten, og heller ikke gaver av mer enn ubetydelig verdi fra pasienter. Blomster og konfekt er greit. Penger er det aldri. Takk varmt, og lever gaven tilbake på en måte som ikke sårer.

**Kilde:** Helsepersonelloven § 9 · Forskrift om gaver til helsepersonell

### Kamera i bokhylla

`kamera_rom` · fra avdelingsnivå 2

> Renholderen fant et lite kamera mellom bøkene på rom {rom}. Datteren til {beboer} satte det opp «for å se at {forelder} har det bra».
> — *Dagvakta*

1. **Inviter datteren til samtale om hva hun er redd for** *(krever Miljø 2+ på vakt)* – Krever Miljø 2+ på vakt
   - Effekt: +24 Fagpoeng, +5 trivsel
   - Utfall: Det handlet om blåmerker hun ikke hadde fått forklart. Hun fikk se fallregistreringen, og tok selv ned kameraet.
2. **Fjern kameraet og gi skriftlig beskjed** – Ryddig og formelt
   - Effekt: +8 Fagpoeng, −3 trivsel, +3 stress (alle)
   - Utfall: Kameraet er borte. Mistilliten er der fortsatt, og nå går datteren rundt med notatblokk.
3. **La det stå – vi har ingenting å skjule** – Åpenhet er vel bra?
   - Effekt: +8 stress (alle), +2 avvik
   - Utfall: To ansatte nekter å gå inn på rommet, og verneombudet er koblet inn. Morgenstellet til {beboer} er filmet i tre uker.

**Faglig begrunnelse:** Rommet er beboerens private hjem, men også et sted der det gis helsehjelp og der ansatte arbeider. Filming av stell er et alvorlig inngrep i både beboerens og de ansattes personvern, og pårørende kan ikke samtykke på vegne av en voksen. Ta bekymringen bak kameraet på alvor.

**Kilde:** Personopplysningsloven og Datatilsynets veiledning · Pasient- og brukerrettighetsloven § 3-6

## Legemiddelhåndtering og pasientsikkerhet (7)

### Knuse depottabletten?

`depot_knusing` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) klarer ikke å svelge den store smertetabletten. Vikaren står klar med morteren: «Det går sikkert fint å knuse den.»
> — *Aftenvakta*

1. **Slå opp i knuselista og be legen bytte form** *(krever Medisin 3+ på vakt)* – Krever Medisin 3+ på vakt
   - Effekt: +28 Fagpoeng, +3 trivsel, +10 pass-XP
   - Utfall: «Skal ikke knuses», sto det med store bokstaver. Legen byttet til plaster. Knuselista henger nå på medisinrommet.
2. **Hopp over kveldsdosen og spør legen i morgen** – Trygt, men vondt
   - Effekt: −4 trivsel, +1 avvik
   - Utfall: Ingen overdose, men heller ingen smertelindring. {beboer} lå våken og hadde vondt til klokka fem.
3. **Knus den og gi den i yoghurt** – {Han} må jo ha smertestillende
   - Effekt: −6 trivsel, +6 stress (på vakt), +3 avvik
   - Utfall: En time senere pustet {beboer} seks ganger i minuttet. Motgift, ambulanse og en natt ingen glemmer.

**Faglig begrunnelse:** Depottabletter er laget for å frigi virkestoffet over mange timer. Knuses de, kommer hele døgndosen på én gang, med fare for overdosering – for opioider kan det gi pustestans. Sjekk alltid knuselista, og be legen om en annen legemiddelform.

**Kilde:** Legemiddelhåndteringsforskriften § 7 · Knuse- og delelista (Oslo universitetssykehus)

### Ingen å kontrollere med

`dobbeltkontroll_alene` · aftenvakt / nattevakt

> Insulin og morfin skal dobbeltkontrolleres, men du er eneste sykepleier i kveld. Naboavdelingen har sin på sykebesøk i en time.
> — *Aftenvakta*

1. **Følg rutinen for egenkontroll, og dokumenter** *(krever Medisin 3+ på vakt)* – Krever Medisin 3+ på vakt
   - Effekt: +24 Fagpoeng, −4 energi (på vakt)
   - Utfall: Trekk opp, gå ut av rommet, kom tilbake og kontroller på nytt mot ordinasjonen. Tungvint – og akkurat slik det skal gjøres.
2. **Vent til sykepleieren ved siden av er tilbake** – Forsinket, men kontrollert
   - Effekt: +10 Fagpoeng, −2 trivsel, +4 stress (på vakt)
   - Utfall: Insulinet ble gitt en time etter kveldsmat. Kontrollen var i orden, timingen dårligere.
3. **Gi det og la en kollega signere i morgen** – Slik har det alltid vært gjort
   - Effekt: +3 stress (alle), +2 avvik
   - Utfall: En signatur fra en som ikke var der, er ingen kontroll. Det er et falskt notat i et rettslig dokument.

**Faglig begrunnelse:** Virksomheten skal ha rutiner som sikrer forsvarlig istandgjøring, og dobbeltkontroll er hovedregelen for legemidler med høy risiko. Er det umulig, må kontrollen erstattes av en annen kvalitetssikring – og lederen har ansvar for at det finnes en rutine for nettopp det.

**Kilde:** Legemiddelhåndteringsforskriften §§ 4 og 7 · Rundskriv IS-7/2015

### To tabletter mangler

`a_preparat_svinn` · fra avdelingsnivå 2

> Narkotikaregnskapet stemmer ikke: to morfintabletter for lite siden forrige telling. Tre personer har hatt nøkkelen.
> — *Nattevakta*

1. **Gå gjennom regnskap, kassasjon og nøkkellogg i dag** *(krever Dok. 3+ på vakt)* – Krever noen med Dok. 3+
   - Effekt: +26 Fagpoeng, −6 energi (på vakt), +1 avvik
   - Utfall: To tabletter var kassert etter et dødsfall uten å bli ført ut. Rutinen for kassasjon har nå to signaturer.
2. **Innfør telling ved hvert vaktskifte** – Strammere fra nå av
   - Effekt: +12 Fagpoeng, +4 stress (alle), +1 avvik
   - Utfall: Det som skjer framover, er under kontroll. Hva som skjedde med de to tablettene, vet fortsatt ingen.
3. **Rett opp tallet – det er sikkert en tellefeil** – To tabletter er ikke mye
   - Effekt: +5 stress (alle), +3 avvik
   - Utfall: Måneden etter manglet det seks. Nå spør kommuneoverlegen hvorfor det første avviket aldri ble meldt.

**Faglig begrunnelse:** Legemidler i gruppe A skal ha eget regnskap med kontrolltelling, og avvik skal meldes og undersøkes straks. Svinn kan skyldes tellefeil, kassasjon som ikke er ført – eller at noen tar dem. Lederen har plikt til å finne ut hva, uten å forhåndsdømme.

**Kilde:** Legemiddelhåndteringsforskriften § 4 · Rundskriv IS-7/2015 om narkotikaregnskap

### Hjem uten liste

`plo_legemiddelliste` · alle avdelinger, hele døgnet

> {beboer} (rom {rom}) kom tilbake fra sykehuset kl. 17 fredag. Ingen epikrise, ingen legemiddelliste. I posen ligger tre esker dere aldri har sett før.
> — *Aftenvakta*

1. **Ring sengeposten, få lista og samstem i kveld** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +28 Fagpoeng, +2 trivsel, −7 energi (på vakt)
   - Utfall: Blodfortynnende var doblet og vanndrivende seponert. Ingen av delene sto på den gamle lista. Godt du ringte.
2. **Send PLO-melding og bruk gammel liste til mandag** – Skriftlig spor
   - Effekt: +8 Fagpoeng, +1 avvik
   - Utfall: Meldingen ble lest mandag klokka ni. I mellomtiden fikk {beboer} et legemiddel sykehuset hadde stanset.
3. **Gi det som står på eskene fra sykehuset** – De vet vel hva de driver med
   - Effekt: −4 trivsel, +3 avvik
   - Utfall: To av eskene var samme virkestoff med ulike navn. {beboer} fikk dobbel dose hele helga.

**Faglig begrunnelse:** Overganger mellom sykehus og kommune er der flest legemiddelfeil oppstår. Lista skal samstemmes: det pasienten faktisk skal bruke, avklares mot epikrise og tidligere liste før noe gis. Mangler opplysningene, skal de etterspørres med PLO-melding eller telefon samme dag.

**Kilde:** Forskrift om legemiddelhåndtering § 5 · Pasientsikkerhetsprogrammet: samstemming av legemiddellister

### «Bare gi ti milligram»

`telefonordinasjon` · aftenvakt / nattevakt

> Legevakta ordinerte en ny dose på telefon klokka 22. Det står ingenting i journalen, og dosen er det dobbelte av det du er vant til.
> — *Aftenvakta*

1. **Ring tilbake, les opp og dokumenter ordinasjonen** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +24 Fagpoeng, +2 stress (på vakt)
   - Utfall: Legen hadde forvekslet to pasienter. Riktig dose var det halve. Han takket for at du spurte.
2. **Gi den dosen du er vant til** – Trygt for pasienten?
   - Effekt: −1 trivsel, +1 avvik
   - Utfall: Det gikk bra, men nå stemmer verken ordinasjonen eller journalen med det som faktisk ble gitt.
3. **Gi det legen sa** – Legen har ansvaret
   - Effekt: −5 trivsel, +3 avvik
   - Utfall: Pasienten ble sløv og fikk blodtrykksfall. «Legen sa det» står ikke i journalen – og fritar deg uansett ikke.

**Faglig begrunnelse:** Muntlige ordinasjoner skal gjentas tilbake til legen, føres i journalen straks med navn og klokkeslett, og signeres av legen i etterkant. Er du i tvil om en dose, har du både rett og plikt til å spørre på nytt. Forsvarlighetskravet gjelder deg personlig.

**Kilde:** Legemiddelhåndteringsforskriften § 7 · Helsepersonelloven § 4 · ISBAR

### Elleve grader

`kjoleskap_medisinrom` · alle avdelinger, hele døgnet

> Medisinkjøleskapet viser 11 °C. Loggen ble sist ført torsdag. Der inne står insulin, øyedråper og influensavaksiner for hele huset.
> — *Dagvakta*

1. **Sett alt i karantene og ring apoteket** *(krever Medisin 2+ på vakt)* – Krever Medisin 2+ på vakt
   - Effekt: +22 Fagpoeng, −500 kr, +1 avvik
   - Utfall: Farmasøyten reddet vaksinene på holdbarhetsdata. Insulinet måtte byttes. Kjøleskapet har fått alarm.
2. **Kast alt og bestill nytt** – Føre var
   - Effekt: −1400 kr, +1 avvik
   - Utfall: Trygt og dyrt. Halvparten kunne vært brukt, og vaksineringen ble utsatt en uke.
3. **Skru ned termostaten og før «6 °C» i loggen** – Det har sikkert ikke vart lenge
   - Effekt: −3 trivsel, +3 avvik
   - Utfall: Tre beboere fikk ustabilt blodsukker uten at noen skjønte hvorfor. Insulinet var ødelagt.

**Faglig begrunnelse:** Kjølevarer skal oppbevares ved 2–8 °C, og temperaturen skal kontrolleres og loggføres. Ved brudd på kjølekjeden må det avklares med apotek eller produsent hva som fortsatt kan brukes. Insulin og vaksiner kan miste effekt uten at det synes på dem.

**Kilde:** Legemiddelhåndteringsforskriften § 6 · FHI: oppbevaring av vaksiner

### «Jeg tør ikke melde»

`avvikskultur` · alle avdelinger, hele døgnet

> En helsefagarbeider kommer inn og lukker døra. Hun ga morgenmedisin til feil beboer i går. Det gikk bra. Ingen andre vet det.
> — *Deg selv*

1. **Takk henne, meld avviket sammen og let etter årsaken** – Systemfeil, ikke personfeil
   - Effekt: +26 Fagpoeng, −4 stress (alle), +1 avvik, +10 pass-XP
   - Utfall: To beboere med nesten like navn satt ved samme bord. Nå har dosettene bilde. Tre gamle avvik ble meldt samme uke.
2. **Be henne skrive avviket selv innen vaktslutt** – Rutinen sier det
   - Effekt: +8 Fagpoeng, +5 stress (på vakt), +1 avvik
   - Utfall: Avviket ble skrevet, med skjelvende hender. Hun kommer neppe frivillig inn på kontoret ditt en gang til.
3. **«Det gikk jo bra – vi lar det ligge»** – Hun har lært nå
   - Effekt: +3 stress (alle), +2 avvik
   - Utfall: Måneden etter skjedde det samme på aftenvakt. Da gikk det ikke bra, og ingen hadde lært noe av første gang.

**Faglig begrunnelse:** Avvik meldes for at systemet skal lære, ikke for å finne syndebukker. En kultur der folk tør å melde egne feil, er det sterkeste pasientsikkerhetstiltaket som finnes. Beboeren og pårørende har dessuten rett til informasjon når noe har gått galt.

**Kilde:** Forskrift om ledelse og kvalitetsforbedring §§ 6–9 · Pasient- og brukerrettighetsloven § 3-2

## Spesialavdelinger (20)

### Barna står ute

`demens_solnedgang` · Skjermet demensenhet · aftenvakt · krever beboer med profilen «Kognitiv svikt og uro»

> Hver ettermiddag i femtiden leter {beboer} (rom {rom}) etter barna som «står ute og fryser». {Han} rister i døra og gråter.
> — *Aftenvakta*

1. **Legg om ettermiddagen: lys, mat og en oppgave** *(krever Miljø 3+ på vakt)* – Krever Miljø 3+ på vakt
   - Effekt: +28 Fagpoeng, +6 trivsel, −3 stress (på vakt)
   - Utfall: Smørbrød klokka fire, lampene på før det skumrer, og {beboer} bretter håndklær til «barna». Døra får stå i fred.
2. **Sett en pleier hos {ham} hver ettermiddag** – Hjelper, men binder en hel person
   - Effekt: −300 kr, +3 trivsel, +5 stress (på vakt)
   - Utfall: Roligere for {beboer}. Travlere for alle andre. Løsningen varer akkurat så lenge bemanningen gjør det.
3. **Forklar at barna er voksne og har det bra** – Sannheten bør vel hjelpe?
   - Effekt: −4 trivsel, +4 stress (på vakt)
   - Utfall: For {beboer} er barna fem og sju år. Nå er {han} redd, og i tillegg sikker på at dere lyver.

**Faglig begrunnelse:** Uro sent på dagen er vanlig ved demens, og forsterkes av tretthet, skumring, sult og mange inntrykk. Lys, et mellommåltid, hvile etter middag og en meningsfull oppgave forebygger bedre enn medisiner. Følelsen bak – omsorgen for barna – skal møtes, ikke rettes.

**Kilde:** Nasjonal faglig retningslinje om demens · TID-modellen

### I feil seng

`demens_feil_seng` · Skjermet demensenhet · krever beboer med profilen «Kognitiv svikt og uro»

> {beboer} (rom {rom}) har lagt seg i senga til naboen for tredje gang i dag. Naboen skriker «tyv!» og slår etter {ham} med stokken.
> — *Dagvakta*

1. **Bilde, farge og egen dyne ved riktig dør** *(krever Miljø 2+ på vakt)* – Krever Miljø 2+ på vakt
   - Effekt: +22 Fagpoeng, −200 kr, +5 trivsel
   - Utfall: Et ungdomsbilde og den røde dynen hjemmefra gjorde susen. {beboer} finner «sin» dør fire av fem ganger.
2. **Flytt naboen til et rom lenger unna** – Skiller de to
   - Effekt: −2 trivsel, +4 stress (på vakt)
   - Utfall: Naboen ble forvirret av flyttingen. {beboer} fant bare en ny seng å legge seg i.
3. **Lås døra til naboen** – Da får hun fred
   - Effekt: −4 trivsel, +2 avvik
   - Utfall: Naboen kom seg ikke ut da hun måtte på do. Innelåsing er tvang, og renholderen meldte avvik.

**Faglig begrunnelse:** Personer med demens finner fram ved hjelp av gjenkjenning, ikke romnummer. Tydelige kjennetegn på døra, kontrastfarger og personlige gjenstander hjelper dem å finne sitt eget rom. Å låse dører begrenser bevegelsesfriheten til alle og er ikke en lovlig løsning.

**Kilde:** Demensplan 2025 · Helsedirektoratet: tilrettelegging av fysiske omgivelser

### Hånd i hånd

`demens_kjaerester` · Skjermet demensenhet · krever beboer med profilen «Kognitiv svikt og uro»

> {beboer} (rom {rom}) og en medbeboer går hånd i hånd og sover middag sammen. Begge virker lykkelige. I morgen kommer ektefellen til {beboer} på besøk.
> — *Primærkontakten*

1. **Ring ektefellen i dag og forbered det skånsomt** *(krever Miljø 3+ på vakt)* – Krever Miljø 3+ på vakt
   - Effekt: +26 Fagpoeng, +4 trivsel, −5 energi (på vakt)
   - Utfall: Det ble stille lenge i telefonen. Så: «{Han} har det i hvert fall godt.» Dere tok en kaffe sammen dagen etter.
2. **Hold dem fra hverandre når ektefellen er her** – Skåner alle
   - Effekt: −2 trivsel, +4 stress (på vakt)
   - Utfall: Det gikk i to besøk. Det tredje kom uanmeldt, og ektefellen fikk se det på verst tenkelige måte.
3. **Sett en stopper for det** – {Han} er jo gift
   - Effekt: −6 trivsel, +2 avvik
   - Utfall: To beboere som leter etter hverandre i korridoren hele dagen. Ingen ble lykkeligere, og ingen hadde bedt om det.

**Faglig begrunnelse:** Behovet for nærhet forsvinner ikke med en demensdiagnose. Personalet skal verne om verdighet og trygghet, og vurdere om begge deltar frivillig – ikke opptre som moralpoliti. Pårørende trenger ærlig og skånsom informasjon, og støtte til å forstå sykdommen.

**Kilde:** Verdighetsgarantiforskriften § 3 · Nasjonal faglig retningslinje om demens

### Noe beroligende?

`demens_antipsykotika` · Skjermet demensenhet · krever beboer med profilen «Kognitiv svikt og uro»

> {beboer} (rom {rom}) roper og slår i stellet. Tre fra personalet ber legen om «noe som roer {ham}». Legevisitten er i morgen.
> — *Dagvakta*

1. **Kartlegg døgnet og hold TID-møte før visitten** *(krever Ro 3+ på vakt)* – Krever Ro 3+ på vakt
   - Effekt: +30 Fagpoeng, +5 trivsel, +10 pass-XP
   - Utfall: Mønsteret var tydelig: alltid ved stell på venstre side. Legen fant en betent skulder. Smertelindring, ikke nervemedisin.
2. **Be legen prøve smertestillende først** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +16 Fagpoeng, +2 trivsel
   - Utfall: Litt bedre, men ingen vet helt hvorfor. Uten kartlegging er det vanskelig å si hva som faktisk virket.
3. **Støtt personalet: be om beroligende** – De er slitne
   - Effekt: −4 trivsel, −4 stress (alle), +1 avvik
   - Utfall: Det ble roligere i stellet. {beboer} sitter nå og halvsover ved frokostbordet, og falt to ganger forrige uke.

**Faglig begrunnelse:** Antipsykotika har beskjeden effekt på uro ved demens, og øker risikoen for fall, hjerneslag og død. Årsaken skal kartlegges tverrfaglig først: smerte, infeksjon, forstoppelse, omgivelser og samhandling. Brukes legemidler likevel, skal det være kortvarig og evalueres.

**Kilde:** Nasjonal faglig retningslinje om demens · TID – tverrfaglig intervensjonsmodell ved utfordrende atferd

### Katten som maler

`demens_robotkatt` · Skjermet demensenhet · krever beboer med profilen «Kognitiv svikt og uro»

> {beboer} (rom {rom}) steller robotkatten hele dagen og er roligere enn på måneder. Datteren er opprørt: «Dere lurer {forelder}. Det er uverdig.»
> — *Primærkontakten*

1. **Inviter datteren til å være med en formiddag** – La henne se det selv
   - Effekt: +22 Fagpoeng, +5 trivsel, −4 energi (på vakt)
   - Utfall: Hun så {forelder} synge for katten. Hun gråt litt. Uka etter kom hun med et lite teppe til den.
2. **Ta bort katten slik datteren ønsker** – Pårørende kjenner {ham} best
   - Effekt: −5 trivsel, +5 stress (på vakt)
   - Utfall: {beboer} leter i alle skap og roper på pus. Uroen er tilbake, og datteren er ikke blitt mer fornøyd.
3. **Si til datteren at {beboer} vet det er en leke** – En hvit løgn for husfreden
   - Effekt: −2 trivsel, +1 avvik
   - Utfall: Hun spurte {forelder} selv. «Den er to år og heter Mons.» Nå stoler hun verken på katten eller på dere.

**Faglig begrunnelse:** Sansestimulering med dukke eller robotdyr kan dempe uro og gi mening, så lenge det tilbys og ikke påtvinges. Etikken ligger i måten det gjøres på: Følg beboerens egen opplevelse, ikke lyv aktivt, og ta pårørendes ubehag på alvor.

**Kilde:** Nasjonal faglig retningslinje om demens · Verdighetsgarantiforskriften § 3

### Utskrivningsklar kl. 15

`korttid_fredag_kl15` · Korttid og rehabilitering

> PLO-melding fredag 14:55: pasient med hoftebrudd er utskrivningsklar og kommer i kveld. Alle sengene er opptatt. Kommunen betaler døgnbot fra i morgen.
> — *Tildelingskontoret*

1. **Ring sengeposten og avklar før du sier ja** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +26 Fagpoeng, −300 kr, +4 stress (på vakt)
   - Utfall: En pasient som var klar for hjemreise, dro en dag tidligere med hjemmetjeneste. Den nye kom lørdag formiddag, med resepter og epikrise.
2. **Ta imot i kveld på ekstraseng i dagligstua** – Unngår døgnbot
   - Effekt: −4 trivsel, +8 stress (alle), +1 avvik
   - Utfall: Boten ble spart. Pasienten lå bak et skjermbrett ved TV-en med nyoperert hofte i tre døgn.
3. **Avvis: «Vi har ikke plass»** – Sant nok
   - Effekt: −1500 kr, −1 trivsel
   - Utfall: Tre døgn med bot. Kommunalsjefen vil ha en redegjørelse, og pasienten lå på sykehuset uten å trenge det.

**Faglig begrunnelse:** Kommunen har ansvar for utskrivningsklare pasienter fra den dagen sykehuset melder dem klare. Mottaket må likevel være forsvarlig: Det forutsetter seng, kompetanse, legemidler og oppdaterte opplysninger. Overbelegg er et avvik som skal meldes, ikke en skjult vane.

**Kilde:** Forskrift om kommunal betaling for utskrivningsklare pasienter · Helse- og omsorgstjenesteloven § 4-1

### Vil hjem i dag

`korttid_vil_hjem` · Korttid og rehabilitering · krever beboer med profilen «Postoperativ rehabilitering»

> {beboer} (rom {rom}) har pakket kofferten. Klarer så vidt trappa, og hjemmebesøket fra ergoterapeuten er først på torsdag. «Jeg bestemmer selv.»
> — *Dagvakta*

1. **Respekter valget og rigg en trygg hjemreise** *(krever Dok. 2+ på vakt)* – Krever noen med Dok. 2+
   - Effekt: +26 Fagpoeng, +4 trivsel, −6 energi (på vakt)
   - Utfall: Hjemmetjenesten kom samme kveld, trygghetsalarm og rullator ble med i taxien. Ergoterapeuten dro hjem til {ham} torsdag.
2. **Overtal {ham} til å bli til torsdag** – Bare tre dager til
   - Effekt: −2 trivsel, +3 stress (på vakt)
   - Utfall: {beboer} ble, sur og motvillig, og nektet å trene. Tre dager uten framgang.
3. **«Du er ikke utskrevet ennå»** – Legen må bestemme
   - Effekt: −5 trivsel, +2 avvik
   - Utfall: {beboer} ringte sønnen, som ringte pasientombudet. Ingen kan holdes tilbake uten hjemmel i lov.

**Faglig begrunnelse:** En samtykkekompetent pasient kan når som helst avslutte oppholdet. Tjenestens oppgave er å gi god informasjon om risikoen, og å gjøre hjemreisen så trygg som mulig: varsle hjemmetjenesten, sikre hjelpemidler og legemidler, og avtale oppfølging.

**Kilde:** Pasient- og brukerrettighetsloven §§ 3-2 og 4-1 · Veileder om rehabilitering, habilitering, individuell plan og koordinator

### Blir i senga

`korttid_nekter_trening` · Korttid og rehabilitering · krever beboer med profilen «Postoperativ rehabilitering»

> {beboer} (rom {rom}) ble operert for lårhalsbrudd for seks dager siden og nekter å stå opp. «Det gjør for vondt.» Fysioterapeuten er her to ganger i uka.
> — *Dagvakta*

1. **Smertestillende en halvtime før, og små mål hver vakt** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +28 Fagpoeng, +5 trivsel
   - Utfall: Først til sengekanten. Så til stolen. Fredag gikk {beboer} til spisestua med prekestol, og ble klappet inn.
2. **Vent til fysioterapeuten kommer på torsdag** – Trening er hennes fag
   - Effekt: −2 trivsel, +1 avvik
   - Utfall: Tre dager til i seng. Torsdag var {beboer} svakere, mer redd og rød på begge hælene.
3. **Opp med {ham} – ingen blir bedre av å ligge** – Litt bestemthet må til
   - Effekt: −5 trivsel, +5 stress (på vakt)
   - Utfall: {beboer} skrek av smerte og har ikke villet opp siden. Treningen er nå noe {han} gruer seg til.

**Faglig begrunnelse:** Tidlig mobilisering etter hoftebrudd forebygger lungebetennelse, blodpropp, trykksår og varig funksjonstap. Smerte er den vanligste årsaken til at det stopper opp. Smertelindring gitt i forkant av trening, og små mål gjennom hele døgnet, er pleiernes ansvar.

**Kilde:** Norske retningslinjer for tverrfaglig behandling av hoftebrudd

### Hjelper for mye

`korttid_gjor_for_mye` · Korttid og rehabilitering

> Fysioterapeuten er oppgitt: Pleierne kler på, mater og triller pasienter som skal øve på nettopp det. «Det går jo fortere», sier morgenlaget.
> — *Fysioterapeuten*

1. **Heng pasientens egne mål ved senga, for alle vaktlag** *(krever Miljø 2+ på vakt)* – Krever Miljø 2+ på vakt
   - Effekt: +26 Fagpoeng, +4 trivsel, +3 stress (på vakt), +10 pass-XP
   - Utfall: «Jeg øver på å kneppe skjorta selv.» Morgenstellet tar ti minutter lenger. Liggetiden gikk ned med tre døgn.
2. **La fysioterapeuten holde internundervisning** – Kunnskap til alle
   - Effekt: +14 Fagpoeng, −400 kr, −4 energi (alle)
   - Utfall: God undervisning. Mandag morgen var det travelt igjen, og hendene var raskt framme.
3. **«Vi rekker ikke stå og se på»** – Morgenen er som den er
   - Effekt: −3 trivsel, −3 stress (på vakt), +1 avvik
   - Utfall: Morgenstellet går unna. Pasientene reiser hjem like hjelpetrengende som da de kom.

**Faglig begrunnelse:** Rehabilitering skjer hele døgnet, ikke bare i treningstimen. Pleie som tar over det pasienten kan klare selv, gir lært hjelpeløshet og forsinker hjemreisen. «Hendene på ryggen» krever tid, tålmodighet og felles mål som alle vaktlag kjenner.

**Kilde:** Veileder om rehabilitering, habilitering, individuell plan og koordinator · Hverdagsrehabilitering

### Vedtaket går ut

`korttid_vil_bli` · Korttid og rehabilitering

> Korttidsvedtaket til {beboer} (rom {rom}) går ut fredag. Sønnen nekter å hente: «{Han} kan ikke bo alene. Dere får beholde {ham}.»
> — *Tildelingskontoret*

1. **Be om ny funksjonsvurdering og et møte med alle** *(krever Dok. 3+ på vakt)* – Krever noen med Dok. 3+
   - Effekt: +28 Fagpoeng, +3 trivsel, −5 energi (på vakt)
   - Utfall: Kartleggingen viste at {beboer} klarer seg hjemme med hjelp fire ganger daglig og dagsenter. Sønnen fikk klageskjema – og trengte det ikke.
2. **Forleng oppholdet med to uker** – Kjøper tid
   - Effekt: −700 kr, +1 trivsel
   - Utfall: Alle pustet ut. Om to uker står dere på nøyaktig samme sted, med en seng mindre til dem som venter.
3. **Bestill taxi til fredag klokka tolv** – Vedtak er vedtak
   - Effekt: −6 trivsel, +2 avvik
   - Utfall: {beboer} ble funnet på kjøkkengulvet søndag. Statsforvalteren spør hva som var vurdert før utreise.

**Faglig begrunnelse:** Kommunen skal tilby nødvendige og forsvarlige tjenester, men velger selv tjenesteform etter en individuell vurdering. Pårørende har ingen plikt til å gi omsorg. Uenighet løses med ny kartlegging, et skriftlig vedtak og tydelig informasjon om klageretten.

**Kilde:** Helse- og omsorgstjenesteloven § 3-2 a · Pasient- og brukerrettighetsloven §§ 2-1 a og 7-2

### Pizza hver dag

`bo_pizza` · Bofellesskap · krever beboer med profilen «Hverdagsmestring»

> {beboer} (leilighet {rom}) bestiller pizza og brus hver kveld. Har gått opp tolv kilo og har fått diabetes. Vikaren har begynt å gjemme mobilen {hans}.
> — *Primærkontakten*

1. **Lag ukemeny og handleliste sammen med {ham}** *(krever vernepleier på vakt)* – Krever vernepleier på vakt
   - Effekt: +28 Fagpoeng, +4 trivsel, +10 pass-XP
   - Utfall: Pizza på fredager og lørdager, hjemmelaget taco på onsdager. {beboer} valgte selv, og henger menyen på kjøleskapet.
2. **Bestill time hos fastlegen og la henne ta det** – Legen har autoritet
   - Effekt: +10 Fagpoeng, −1 trivsel
   - Utfall: Legen forklarte godt. {beboer} nikket høflig, og bestilte pizza på vei hjem.
3. **Ta hånd om mobilen etter klokka seks** – For {hans} eget beste
   - Effekt: −6 trivsel, +3 avvik
   - Utfall: {beboer} knuste et vindu i raseri. Å ta fra noen eiendelene deres uten vedtak er ulovlig tvang.

**Faglig begrunnelse:** Voksne med utviklingshemming har samme rett som andre til å ta egne valg, også dårlige. Å ta fra noen telefonen eller låse inn mat er tvang, og krever vedtak etter kapittel 9. Først skal frivillige løsninger prøves: informasjon, motivasjon og tilrettelegging.

**Kilde:** Helse- og omsorgstjenesteloven kap. 9 · Rundskriv IS-10/2015

### Holdt fast

`bo_holding` · Bofellesskap · krever beboer med profilen «Hverdagsmestring»

> {beboer} (leilighet {rom}) kastet en stol mot en medbeboer i går. To ansatte holdt {ham} fast i fire minutter. Det står ingenting i journalen.
> — *Fagansvarlig*

1. **Skriv meldingen i dag, og gå gjennom hva som utløste det** *(krever vernepleier på vakt)* – Krever vernepleier på vakt
   - Effekt: +30 Fagpoeng, +2 trivsel, +1 avvik
   - Utfall: Meldingen gikk til Statsforvalteren og vergen. Gjennomgangen viste at støy fra fellesstua utløste det. Det kan dere gjøre noe med.
2. **Send meldingen og legg saken bort** – Papirene i orden
   - Effekt: +10 Fagpoeng, +1 avvik
   - Utfall: Formelt riktig. Tre uker senere skjedde det igjen, i samme rom og til samme tid på dagen.
3. **La det ligge – det gikk jo bra** – Alle gjorde sitt beste
   - Effekt: +5 stress (alle), +3 avvik
   - Utfall: Vergen fikk høre det fra {beboer} selv. Bruk av makt som ikke er meldt, er en alvorlig sak for tilsynet.

**Faglig begrunnelse:** Skadeavvergende tiltak i en nødssituasjon er lov når det er nødvendig for å hindre vesentlig skade, men det skal dokumenteres og meldes straks til fagansvarlig, verge, pårørende og Statsforvalteren. Gjentar situasjonen seg, kreves et vedtak og en plan for å forebygge.

**Kilde:** Helse- og omsorgstjenesteloven §§ 9-5 og 9-7

### Overnattingsbesøk

`bo_kjaereste` · Bofellesskap · krever beboer med profilen «Hverdagsmestring»

> {beboer} (leilighet {rom}) har fått kjæreste og vil ha overnattingsbesøk i helga. Moren ringer: «Det må dere stoppe. {Han} forstår ikke hva det innebærer.»
> — *Primærkontakten*

1. **Si ja, og tilby veiledning om grenser og prevensjon** *(krever vernepleier på vakt)* – Krever vernepleier på vakt
   - Effekt: +26 Fagpoeng, +6 trivsel
   - Utfall: Samtalen ble både flau og fin. Kjæresten kom lørdag med blomster og egen tannbørste.
2. **Be moren være med på en samtale først** – Hvis {beboer} selv vil det
   - Effekt: +12 Fagpoeng, +2 trivsel, −4 energi (på vakt)
   - Utfall: {beboer} sa ja til at moren fikk være med. Hun er fortsatt bekymret, men nå har hun i det minste møtt kjæresten.
3. **Si nei til overnatting** – Moren kjenner {ham} best
   - Effekt: −6 trivsel, +2 avvik
   - Utfall: {beboer} flyttet inn hos kjæresten i ei uke uten å si fra. Dere har ingen rett til å nekte besøk i noens hjem.

**Faglig begrunnelse:** Leiligheten er beboerens eget hjem, og voksne bestemmer selv hvem de får besøk av. Personalets oppgave er å gi tilpasset veiledning om kropp, grenser og prevensjon, og å følge med på om forholdet er frivillig og likeverdig – ikke å nekte.

**Kilde:** FN-konvensjonen om rettighetene til mennesker med nedsatt funksjonsevne art. 23 · Helse- og omsorgstjenesteloven kap. 9

### 14 000 til en «venn»

`bo_penger` · Bofellesskap · krever beboer med profilen «Hverdagsmestring»

> {beboer} (leilighet {rom}) har vippset 14 000 kroner til en ny «venn» fra nettet denne måneden. Husleia er ikke betalt. {Han} blir sint når du spør.
> — *Primærkontakten*

1. **Snakk med {ham}, og varsle vergen sammen** *(krever Miljø 3+ på vakt)* – Krever Miljø 3+ på vakt
   - Effekt: +26 Fagpoeng, +3 trivsel
   - Utfall: Vergen fikk satt beløpsgrense på kontoen med {hans} samtykke. «Vennen» sluttet å svare da pengene tok slutt.
2. **Anmeld forholdet til politiet** – Det er jo svindel
   - Effekt: +10 Fagpoeng, −2 trivsel, +3 stress (på vakt)
   - Utfall: Politiet tok imot. {beboer} føler seg overkjørt og har sluttet å fortelle dere ting.
3. **Ta hånd om bankkortet og BankID-brikken** – Stopper blødningen
   - Effekt: −5 trivsel, +3 avvik
   - Utfall: Pengene er trygge. Nå er det dere som har begått noe ulovlig. Statsforvalteren har fått en bekymringsmelding.

**Faglig begrunnelse:** Personalet kan ikke ta kontroll over en beboers økonomi. Ved mistanke om utnyttelse skal verge og statsforvalter varsles, og beboeren få hjelp til å forstå hva som skjer. Økonomisk utnyttelse av sårbare voksne kan være straffbart og kan anmeldes.

**Kilde:** Vergemålsloven §§ 20 og 33 · Helsedirektoratet: vold og overgrep mot risikoutsatte voksne (TryggEst)

### Vil ikke på jobb

`bo_jobb` · Bofellesskap · krever beboer med profilen «Hverdagsmestring»

> {beboer} (leilighet {rom}) har ligget i senga i ni dager og nekter å dra på dagsenteret. «Det er kjedelig. Jeg er ikke et barn.»
> — *Dagvakta*

1. **Finn ut hva {han} drømmer om å jobbe med** *(krever Miljø 3+ på vakt)* – Krever Miljø 3+ på vakt
   - Effekt: +26 Fagpoeng, +6 trivsel, +10 pass-XP
   - Utfall: Biler, viste det seg. Tre dager i uka på bilverkstedet til vekstbedriften. {beboer} står opp før vekkerklokka.
2. **Lag en avtale: kino etter fem dager på dagsenteret** – Litt gulrot
   - Effekt: −200 kr, +1 trivsel
   - Utfall: Det virket i to uker. Dagsenteret er fortsatt kjedelig, og kinoprogrammet er snart brukt opp.
3. **Hent {ham} opp av senga og kjør {ham} dit** – Struktur er viktig
   - Effekt: −5 trivsel, +4 stress (på vakt), +2 avvik
   - Utfall: {beboer} satt i bilen og nektet å gå ut. Sjåføren ventet i førti minutter. Ingen lærte noe.

**Faglig begrunnelse:** Meningsfull aktivitet er en del av et verdig tjenestetilbud, men den må oppleves meningsfull for personen selv. Når noen trekker seg unna, skal det kartlegges hvorfor: innholdet i tilbudet, mobbing, helse eller nedstemthet. Løsningen finnes sammen med brukeren.

**Kilde:** Helse- og omsorgstjenesteloven § 3-2 · Veileder: Gode helse- og omsorgstjenester til personer med utviklingshemming

### Pumpa strekker ikke til

`lind_gjennombrudd` · Lindrende enhet · krever beboer med profilen «Palliasjon og trygghet»

> {beboer} (rom {rom}) har smertepumpe, men stønner ved hvert snu. Tre ekstradoser siden midnatt. Ektefellen spør om det ikke finnes mer å gi.
> — *Nattevakta*

1. **Kartlegg med ESAS og be legen justere pumpa** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +30 Fagpoeng, +6 trivsel
   - Utfall: Grunndosen ble økt, med en ekstra dose før stell. Neste natt sov {beboer} fire timer i strekk. Ektefellen også.
2. **Gi ekstradoser så ofte som ordinasjonen tillater** – Innenfor rammene
   - Effekt: +8 Fagpoeng, +1 trivsel, −6 energi (på vakt)
   - Utfall: Lindring i tjue minutter om gangen. Du løp mellom rommene hele natta, og grunnproblemet er der fortsatt.
3. **Vær forsiktig – {han} får allerede mye** – Hva med pusten?
   - Effekt: −7 trivsel, +2 avvik
   - Utfall: En unødig vond natt. Frykten for morfin i livets sluttfase har ikke støtte i faget. Ektefellen glemmer det aldri.

**Faglig begrunnelse:** Trenger pasienten flere enn tre–fire ekstradoser i døgnet, er grunndosen for lav og skal justeres av lege. Smerten kartlegges systematisk, og gjennombruddssmerte ved stell forebygges med en dose i forkant. Målet er lindring, og riktig dosert er det trygt.

**Kilde:** Nasjonalt handlingsprogram for palliasjon i kreftomsorgen · ESAS-r

### «Dere lar {ham} tørste»

`lind_vaeske` · Lindrende enhet · krever beboer med profilen «Palliasjon og trygghet»

> {beboer} (rom {rom}) har sluttet å drikke og sover nesten hele døgnet. Datteren krever væske intravenøst: «Dere kan ikke la {forelder} tørste i hjel!»
> — *Aftenvakta*

1. **Sett deg ned, forklar – og lær henne munnstell** *(krever Stell 3+ på vakt)* – Krever Stell 3+ på vakt
   - Effekt: +26 Fagpoeng, +6 trivsel, −5 energi (på vakt)
   - Utfall: Datteren fukter leppene til {forelder} med en svamp hver halvtime. Hun har fått noe å gjøre med hendene, og med redselen.
2. **Be legen ta en samtale i morgen** – Legen kan forklare best
   - Effekt: +10 Fagpoeng, −1 trivsel
   - Utfall: Legen forklarte godt neste formiddag. Natta i mellom ble lang og full av mistro.
3. **Heng opp en liter for å roe familien** – Skader vel ikke?
   - Effekt: −4 trivsel, +1 avvik
   - Utfall: {beboer} fikk hovne armer og surklete pust. Datteren ble sittende og se på noe hun selv hadde bedt om.

**Faglig begrunnelse:** I livets siste dager avtar behovet for væske naturlig. Væskebehandling forlenger sjelden livet, og kan gi ødemer, mer slim i luftveiene og tyngre pust. Munntørrhet lindres best med godt munnstell. Pårørende trenger forklaringen – gjerne flere ganger.

**Kilde:** Nasjonale faglige råd for lindrende behandling i livets sluttfase

### Skal barna få komme?

`lind_barnebarn` · Lindrende enhet · krever beboer med profilen «Palliasjon og trygghet»

> {beboer} (rom {rom}) har få dager igjen. Barnebarna på seks og ni vil si ha det. Moren deres nøler: «Skal de huske {ham} slik?»
> — *Primærkontakten*

1. **Forbered barna, og vær med inn** *(krever Miljø 2+ på vakt)* – Krever Miljø 2+ på vakt
   - Effekt: +26 Fagpoeng, +6 trivsel, −4 energi (på vakt)
   - Utfall: De fikk vite om pusten og om søvnen. Seksåringen la en tegning på dyna. Niåringen holdt hånda {hans} lenge.
2. **La moren avgjøre det alene** – Hun kjenner barna
   - Effekt: −1 trivsel
   - Utfall: Hun turte ikke. I begravelsen spurte niåringen hvorfor ingen ville la ham si ha det.
3. **Fraråd det: «Det blir for sterkt for dem»** – Skåne barna
   - Effekt: −4 trivsel, +1 avvik
   - Utfall: Barna ble holdt hjemme. Det de forestiller seg, er verre enn det som faktisk var: et menneske som sov.

**Faglig begrunnelse:** Barn tåler sannheten bedre enn fantasiene de lager seg når de holdes utenfor. Barn som er pårørende, har rett til informasjon og oppfølging tilpasset alderen. Forbered dem på hva de får se, la dem velge selv, og gi dem noe konkret å gjøre.

**Kilde:** Helsepersonelloven § 10 a · Helsedirektoratet: Pårørendeveileder

### En øl og en røyk

`lind_siste_onske` · Lindrende enhet · krever beboer med profilen «Palliasjon og trygghet»

> {beboer} (rom {rom}) har ett ønske: en kald pils og en sigarett på terrassen. {Han} har oksygen på nesa og orker ikke stå. Reglementet sier røykfritt.
> — *Dagvakta*

1. **Ordne det: rullestol, pledd og oksygenet igjen inne** *(krever Stell 2+ på vakt)* – Krever Stell 2+ på vakt
   - Effekt: +24 Fagpoeng, −100 kr, +7 trivsel
   - Utfall: Ti minutter i ettermiddagssola med en halv pils og to trekk. {beboer} smilte hele veien inn igjen.
2. **Tilby alkoholfri øl på rommet** – Et kompromiss
   - Effekt: −1 trivsel
   - Utfall: {beboer} takket høflig og lot flaska stå. Det var ikke ølet det handlet om.
3. **Vis til reglementet** – Regler er regler
   - Effekt: −6 trivsel, +3 stress (på vakt)
   - Utfall: {beboer} døde fire dager senere. Sønnen spurte stille hvem regelen egentlig var til for.

**Faglig begrunnelse:** Lindrende behandling handler om livskvalitet, på pasientens premisser. Husregler kan ikke overstyre et gjennomførbart siste ønske – men sikkerheten må ivaretas: Oksygen og åpen ild er livsfarlig sammen, så oksygenet må av og vekk før det tennes.

**Kilde:** Verdighetsgarantiforskriften § 3 · DSB: brannsikkerhet ved bruk av medisinsk oksygen

### Tre på en uke

`lind_tre_dodsfall` · Lindrende enhet · snittstress minst 22

> Tre dødsfall på seks dager, ett av dem vondt og urolig. Ingen snakker om det. To har gått gråtende hjem, og sykmeldingene tikker inn.
> — *Verneombudet*

1. **Sett av en time til refleksjon, med vikar på post** – Koster en vikartime
   - Effekt: +22 Fagpoeng, −500 kr, −10 stress (alle), +10 pass-XP
   - Utfall: Det ble sagt ting som trengte å bli sagt. Noen gråt, noen lo. Dere tente et lys og gikk tilbake til jobben.
2. **Heng opp nummeret til bedriftshelsetjenesten** – De som trenger det, kan ringe
   - Effekt: −2 stress (alle)
   - Utfall: Lappen henger ved kaffemaskinen. Én har ringt. De som trengte det mest, gjorde det ikke.
3. **«Dette er jobben vår»** – Sånn er det på lindrende
   - Effekt: +8 stress (alle), +1 avvik
   - Utfall: Det er jobben. Det er også grunnen til at to av de mest erfarne nå søker seg bort.

**Faglig begrunnelse:** Arbeid nær døden er en kjent psykisk belastning som arbeidsgiver har plikt til å forebygge og følge opp. Strukturert refleksjon etter krevende dødsfall, kollegastøtte og veiledning reduserer utbrenthet – og gjør personalet bedre i stand til å stå i neste forløp.

**Kilde:** Arbeidsmiljøloven § 4-3 · Nasjonalt handlingsprogram for palliasjon: ivaretakelse av personalet

## Natt, dag og aften (8)

### To klokker på en gang

`natt_to_klokker` · nattevakt

> Rom 2 ringer: brystsmerter. Sengealarmen på rom {rom} går samtidig – {beboer} er på vei ut av senga. Du er alene på denne fløyen.
> — *Nattevakta*

1. **Tilkall nabofløyen, gå til brystsmertene** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +26 Fagpoeng, +5 stress (på vakt), +1 avvik
   - Utfall: Kollegaen tok rom {rom} mens du målte, ga nitro og ringte 113. Begge beboerne ble ivaretatt. Bemanningsavviket er meldt.
2. **Løp til sengealarmen først – det går fortest** – Ett minutt, så brystsmertene
   - Effekt: −2 trivsel, +8 stress (på vakt), +1 avvik
   - Utfall: {beboer} ble lagt trygt tilbake. Det tok sju minutter før du var på rom 2. Du tenker fortsatt på de sju minuttene.
3. **Gå til brystsmertene og håp at alarmen er falsk** – Den feiler jo ofte
   - Effekt: −4 trivsel, +10 stress (på vakt), +2 avvik
   - Utfall: Alarmen var ikke falsk. {beboer} ble funnet på gulvet en halvtime senere, kald og forslått.

**Faglig begrunnelse:** Når to ting skjer samtidig, prioriteres det som truer liv først – men fallrisikoen forsvinner ikke av den grunn. Tilkall hjelp tidlig. At en nattevakt står alene med to akutte hendelser, er et bemanningsavvik som skal meldes, uansett hvordan det gikk.

**Kilde:** Helse- og omsorgstjenesteloven § 4-1 · Helsepersonelloven § 7 · NEWS2

### På badegulvet

`natt_fall_bad` · nattevakt

> {beboer} (rom {rom}) ligger på badegulvet kl. 04:10. Våken, kald og flau. {Han} veier 96 kilo, og du er alene til klokka sju.
> — *Nattevakta*

1. **Undersøk, legg teppe over og tilkall hjelp** *(krever Stell 2+ på vakt)* – Krever Stell 2+ på vakt
   - Effekt: +22 Fagpoeng, +3 trivsel, −5 energi (på vakt)
   - Utfall: Ingen feilstilling, ingen hodeskade. Med løfteputa og en kollega fra andre etasje var {han} oppe på ti minutter.
2. **Ring 113 for løftehjelp** – De har folk og utstyr
   - Effekt: −1 trivsel, +4 stress (på vakt)
   - Utfall: Ambulansen kom etter femti minutter. {beboer} lå på flisene hele tiden. Hjelpen var god, men ventetiden kald.
3. **Løft {ham} opp selv** – Det må jo bare gjøres
   - Effekt: +10 stress (på vakt), −20 energi (på vakt), +2 avvik
   - Utfall: Det sa knekk i ryggen din. {beboer} kom opp. Du er sykmeldt i tre uker, og ingen undersøkte hofta {hans}.

**Faglig begrunnelse:** Etter et fall undersøkes pasienten for smerter, feilstilling og hodeskade før noen flytter på vedkommende. Tunge løft alene skader både pasient og pleier. Bruk løftepute eller seil, eller tilkall hjelp. Fallet registreres og utløser en ny vurdering av fallrisiko.

**Kilde:** Helsedirektoratet: fallforebygging · Forskrift om utførelse av arbeid kap. 23

### Strømmen gikk

`natt_strombrudd` · nattevakt

> Strømbrudd kl. 02:40. Nødlyset virker, men trykkmadrassene synker sammen, oksygenkonsentratoren er stille og varslingsanlegget er dødt.
> — *Nattevakta*

1. **Finn beredskapspermen og følg lista** *(krever Dok. 2+ på vakt)* – Krever noen med Dok. 2+
   - Effekt: +24 Fagpoeng, +4 stress (på vakt)
   - Utfall: Oksygenflaska sto der permen sa. Snuliste hver time og runder med hodelykt. Strømmen kom tilbake klokka fem.
2. **Ta det viktigste først, og improviser** – Permen er sikkert utdatert
   - Effekt: +8 Fagpoeng, +9 stress (på vakt), −10 energi (på vakt)
   - Utfall: Oksygenflaska ble funnet etter tjue minutters leting. Alle klarte seg, men ingen visste hvem som trengte hva.
3. **Vent – strømmen er sikkert snart tilbake** – Det pleier å gå fort
   - Effekt: −5 trivsel, +3 avvik
   - Utfall: Det tok to og en halv time. Én beboer fikk pustebesvær, og to har røde hæler etter natta på flat madrass.

**Faglig begrunnelse:** Virksomheten skal ha beredskapsplan for bortfall av strøm, med oversikt over hvem som er avhengige av strømdrevet utstyr. Pasienter på oksygen trenger flaske, luftmadrasser må erstattes av hyppigere snuing, og tilsynsrunder må erstatte varslingsanlegget.

**Kilde:** Helseberedskapsloven § 2-2 · Forskrift om håndtering av medisinsk utstyr

### Påkledd klokka tre

`natt_paa_jobb` · nattevakt · krever beboer med profilen «Kognitiv svikt og uro»

> {beboer} (rom {rom}) står i gangen med frakk, hatt og veske. Skal rekke toget til jobben. Blir sint når du sier at det er natt.
> — *Nattevakta*

1. **Spør om jobben over en kopp te** *(krever Miljø 3+ på vakt)* – Krever Miljø 3+ på vakt
   - Effekt: +24 Fagpoeng, +5 trivsel, −3 stress (på vakt)
   - Utfall: Førti år på jernbanen, viste det seg. Etter te og en brødskive var «skiftet» over, og {han} la seg selv.
2. **Vis klokka og forklar at {han} er pensjonist** – Sannheten må fram
   - Effekt: −3 trivsel, +6 stress (på vakt)
   - Utfall: Det ble en time med krangel i gangen. To andre beboere våknet. Sannheten var riktig, men den hjalp ingen.
3. **Gi en sovetablett ved behov** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: −2 trivsel, +1 avvik
   - Utfall: {beboer} sov til langt på dag og var ustø hele ettermiddagen. Neste natt sto {han} der igjen, like påkledd.

**Faglig begrunnelse:** Ved demens hjelper det sjelden å korrigere. Å møte følelsen bak – plikt, uro, behovet for å være til nytte – virker bedre enn å vinne diskusjonen. Se også etter utløsende årsaker: smerte, full blære, sult eller for lite aktivitet på dagtid.

**Kilde:** Nasjonal faglig retningslinje om demens · Personsentrert omsorg (VIPS)

### Legevakta nøler

`natt_legevakt` · nattevakt

> {beboer} (rom {rom}) har 39,1 i feber, puls 118 og er nyoppstått forvirret. Legevakta sier: «Gi paracet og se det an til morgenen.»
> — *Nattevakta*

1. **Mål NEWS2 og ring tilbake med ISBAR** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +28 Fagpoeng, +3 trivsel, +3 stress (på vakt)
   - Utfall: «NEWS 8, nyoppstått forvirring, jeg er bekymret og ber om tilsyn.» Legen kom innen en time. Det var sepsis.
2. **Ring 113 direkte** – Hopp over legevakta
   - Effekt: +10 Fagpoeng, +5 stress (på vakt), +1 avvik
   - Utfall: {beboer} ble hentet og behandlet. AMK lurte på hvorfor ingen hadde målt blodtrykk og respirasjon først.
3. **Gi paracet og se det an** – Legen har jo vurdert
   - Effekt: −6 trivsel, +3 avvik
   - Utfall: Klokka seks var blodtrykket 78 over 40. Dagvakta ringte 113 mens du skrev rapporten.

**Faglig begrunnelse:** En strukturert melding med målte verdier gir legen grunnlag for riktig beslutning. NEWS2 på 5 eller mer, eller 3 i én enkelt parameter, skal utløse rask legevurdering. Er du uenig i vurderingen, har du plikt til å si det tydelig – og til å ringe på nytt.

**Kilde:** ISBAR · NEWS2 · Helsepersonelloven § 4

### Sover på vakt

`natt_sover` · nattevakt

> Du stakk innom kl. 04 for å hente laderen. Nattevakta sitter i godstolen på stua og sover tungt, med ringeklokka på lydløs.
> — *Deg selv*

1. **Vekk henne, ta samtalen i morgen og se på turnusen** – Alvorlig, men ikke bare hennes feil
   - Effekt: +20 Fagpoeng, −2 stress (alle), +1 avvik
   - Utfall: Sjuende nattevakt på ni døgn, viste det seg. Hun fikk en skriftlig påminnelse. Du fikk en turnus å rydde i.
2. **Skriftlig advarsel i morgen tidlig** – Dette er tjenesteforsømmelse
   - Effekt: +7 stress (alle), +1 avvik
   - Utfall: Advarselen var på sin plass. Men nå er det ingen som vil ta ekstra nattevakter lenger.
3. **List deg ut igjen** – Hun trengte sikkert søvnen
   - Effekt: −3 trivsel, +2 avvik
   - Utfall: Uka etter lå en beboer på gulvet i tre timer. Ringeklokka hadde stått på lydløs den natta også.

**Faglig begrunnelse:** Våken nattevakt er våken. Samtidig er nattarbeid en dokumentert helsebelastning, og arbeidsgiver har plikt til å organisere arbeidet slik at det er mulig å holde seg våken – med pauser, avløsning og en forsvarlig turnus. Reager på hendelsen, og let etter årsaken.

**Kilde:** Arbeidsmiljøloven §§ 4-1 og 10-11 · Helsepersonelloven § 4

### Fire på lista, tid til tre

`dag_legevisitt` · dagvakt

> Tilsynslegen har en halvtime igjen. På lista står blodtrykk, et sår, en henvisning og datteren som har ventet siden ni. Én må vente til neste uke.
> — *Dagvakta*

1. **Prioriter etter hastegrad, med målinger klare** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +24 Fagpoeng, +3 trivsel
   - Utfall: Såret og blodtrykket ble tatt på ti minutter. Datteren fikk et kvarter. Henvisningen ordnet legen fra kontoret.
2. **Ta datteren først – hun har ventet lengst** – Rettferdig kø
   - Effekt: +2 trivsel, +1 avvik
   - Utfall: Samtalen tok tjuefem minutter. Såret må vente til tirsdag, og det ser ikke ut som det har tenkt å vente.
3. **Legg journalene på bordet og la legen velge** – Hun er jo legen
   - Effekt: −2 trivsel, +4 stress (på vakt)
   - Utfall: Legen brukte ti minutter på å finne ut hva dere egentlig lurte på. To av fire ble sett.

**Faglig begrunnelse:** Legevisitten er en knapp ressurs. Den blir best når sykepleieren har forberedt den: prioritert etter hastegrad, med målinger, observasjoner og en tydelig problemstilling klar. Det som kan løses uten lege, bør være løst på forhånd.

**Kilde:** Sykehjemsforskriften § 2-1 · ISBAR som struktur for legevisitt

### Fjorten timer uten mat

`aften_nattfaste` · aftenvakt

> Kveldsmaten serveres kl. 18 og frokosten kl. 08:30. Kjøkkenet stenger kl. 18:30. Tre beboere våkner sultne og urolige i firetiden hver natt.
> — *Aftenvakta*

1. **Innfør senkvelds kl. 21 for dem som trenger det** *(krever Ernæring 2+ på vakt)* – Krever Ernæring 2+ på vakt
   - Effekt: +22 Fagpoeng, −250 kr, +5 trivsel
   - Utfall: Havregrøt, brødskive og kakao klokka ni. Nattevakta melder om de roligste nettene på lenge.
2. **Be kjøkkenet flytte kveldsmaten til kl. 19:30** – Krever en turnusendring
   - Effekt: −600 kr, +3 trivsel, +4 stress (alle)
   - Utfall: Kjøkkenet sa ja etter tre møter. Aftenvakta fikk en travlere kveld, men fasten er kortere.
3. **Sett fram kjeks på nattbordet** – Så har de noe
   - Effekt: −1 trivsel, +1 avvik
   - Utfall: To av tre fant ikke kjeksen i mørket. Den tredje satte den fast i halsen.

**Faglig begrunnelse:** Nattfasten bør ikke være lengre enn elleve timer. Lang faste gir uro, dårlig søvn, fall og vekttap hos skrøpelige eldre. Et lite, energitett senkveldsmåltid er et av de enkleste og best dokumenterte ernæringstiltakene i sykehjem.

**Kilde:** Nasjonale faglige råd om ernæring, kosthold og måltider i helse- og omsorgstjenesten

## Arbeidsmiljø, ledelse og vaktromshumor (8)

### Verneombudet banker på

`verneombud_varsel` · snittstress minst 30

> Tre har grått på skyllerommet denne uka. Pausene ryker, og folk går hjem med vondt i magen. «Jeg må melde dette videre hvis ingenting skjer.»
> — *Verneombudet*

1. **Kartlegg belastningen og lag tiltaksplan sammen** *(krever Dok. 2+ på vakt)* – Krever noen med Dok. 2+
   - Effekt: +24 Fagpoeng, −600 kr, −9 stress (alle), +10 pass-XP
   - Utfall: Faste pauser med avløsning, og to tunge stell fordelt på flere. Planen henger på vaktrommet med datoer og navn.
2. **Lei inn en ekstravakt de to neste ukene** – Rask lindring
   - Effekt: −1300 kr, −6 stress (alle)
   - Utfall: To lettere uker. Så var ekstravakta borte, og alt var som før – bare med et dårligere budsjett.
3. **«Alle er slitne nå om dagen»** – Det går over etter ferien
   - Effekt: +8 stress (alle), +1 avvik
   - Utfall: Verneombudet meldte saken til Arbeidstilsynet. Tilsynsbesøket er berammet til neste måned.

**Faglig begrunnelse:** Verneombudet skal ivareta arbeidstakernes interesser i saker om arbeidsmiljø, og kan ved umiddelbar fare stanse arbeidet. Arbeidsgiver har plikt til å kartlegge, vurdere risiko og lage en plan med tiltak. Et tidlig varsel er en gave til en leder, ikke et angrep.

**Kilde:** Arbeidsmiljøloven §§ 3-1, 6-2 og 6-3

### Krav om drøfting

`tillitsvalgt_bemanning` · snittstress minst 38 · fra avdelingsnivå 2

> Brev fra tillitsvalgt: seksten brudd på hviletiden siste måned og dobbeltvakter annenhver helg. Hun krever drøftingsmøte innen fredag.
> — *Tillitsvalgt*

1. **Ta møtet, legg tallene på bordet og lag ny turnus** *(krever Dok. 3+ på vakt)* – Krever noen med Dok. 3+
   - Effekt: +28 Fagpoeng, −700 kr, −8 stress (alle)
   - Utfall: Åpne tall ga et saklig møte. Ny turnus med faste helgestillinger er ute til gjennomsyn, og hun signerte unntaksavtalen.
2. **Lov bedring, uten å endre turnusen** – Kjøper tid
   - Effekt: −1 stress (alle)
   - Utfall: Hun noterte ordrett hva du lovet. Du har en følelse av at notatet dukker opp igjen.
3. **Vis til styringsretten** – Turnusen er lederens ansvar
   - Effekt: +9 stress (alle), +2 avvik
   - Utfall: Styringsretten gjelder innenfor loven. Fagforbundet har varslet Arbeidstilsynet, og kommunalsjefen vil ha en prat.

**Faglig begrunnelse:** Arbeidstakere har krav på elleve timers daglig hvile, og unntak må avtales skriftlig med tillitsvalgte. Gjentatte brudd er et arbeidsmiljøproblem og en risiko for pasientsikkerheten. Tillitsvalgte har rett til å drøfte arbeidstidsordninger – og er en nyttig medspiller.

**Kilde:** Arbeidsmiljøloven §§ 10-3, 10-8 og 10-12 · Hovedavtalen i KS-området

### Pårørendemøtet koker

`paaroerende_misnoye` · trivsel høyst 35

> Tjue pårørende i spisesalen. De snakker om kald mat, ukjente vikarer og klokker ingen svarer på. En av dem har med seg lokalavisa fra forrige uke.
> — *Enhetsleder*

1. **Lytt, erkjenn og lov tre tiltak med dato** – Og nytt møte om seks uker
   - Effekt: +22 Fagpoeng, +5 trivsel, +4 stress (alle)
   - Utfall: Varm mat i varmeskap, faste vikarer og svartid på klokkene som måles. Stemningen snudde da du sa: «Dere har rett.»
2. **Forklar bemanning og budsjett** – De må forstå rammene
   - Effekt: −2 trivsel, +3 stress (alle)
   - Utfall: Alt du sa, var sant. Ingen kom for å høre om budsjettet. Tre gikk før kaffen.
3. **«Enkeltsaker tar vi på tomannshånd»** – Rydd møtet
   - Effekt: −5 trivsel, +1 avvik
   - Utfall: Møtet ble kort. Leserinnlegget i lokalavisa uka etter ble langt.

**Faglig begrunnelse:** Virksomheten skal bruke erfaringer fra pasienter og pårørende til å forbedre tjenestene. Kritikk i plenum håndteres best ved å lytte, erkjenne det som er riktig, og love få, konkrete tiltak med dato – og så komme tilbake og vise hva som ble gjort.

**Kilde:** Forskrift om ledelse og kvalitetsforbedring §§ 6 og 8 · Pasient- og brukerrettighetsloven § 3-1

### Matpakketyven

`matpakketyven` · alle avdelinger, hele døgnet

> Tredje matpakke forsvunnet fra kjøleskapet på vaktrommet denne uka. Noen har hengt opp en lapp: «JEG VET HVEM DU ER». Stemningen er iskald.
> — *Nattevakta*

1. **Ta det på morgenmøtet med et smil, og kjøp navnebokser** – Ufarliggjør uten å bagatellisere
   - Effekt: −150 kr, +1 Kaffekopper, −5 stress (alle)
   - Utfall: Det viste seg at en vikar trodde hylla var «felles». Hun kom med boller til alle dagen etter. Lappen er tatt ned.
2. **La dem ordne opp selv** – Voksne folk
   - Effekt: +5 stress (alle)
   - Utfall: Nå henger det fire lapper. Én av dem er signert «Sherlock». To kolleger har sluttet å hilse.
3. **Send streng e-post til alle om tyveri** – Tydelig beskjed
   - Effekt: +7 stress (alle), +1 avvik
   - Utfall: Tretten ansatte føler seg mistenkt. Matpakkene er trygge, men pauserommet er tomt.

**Faglig begrunnelse:** Små konflikter som får ligge, vokser. Lederen har ansvar for et fullt forsvarlig psykososialt arbeidsmiljø, og det innebærer å ta tak i det som skaper mistenksomhet – saklig, med humor der det passer, og uten å henge ut noen.

**Kilde:** Arbeidsmiljøloven § 4-3 · Arbeidstilsynet: konflikter på arbeidsplassen

### Snakker ikke sammen

`kollegakonflikt` · alle avdelinger, hele døgnet

> To av de faste på dagvakt har ikke vekslet et ord på tre uker. Rapporten går via gule lapper. I går ble en beskjed om blodsukker borte på veien.
> — *Dagvakta*

1. **Snakk med hver av dem, så begge sammen** *(krever Ro 2+ på vakt)* – Krever Ro 2+ på vakt
   - Effekt: +22 Fagpoeng, −7 stress (alle)
   - Utfall: Det begynte med en vaktbytte-misforståelse i mars. De blir neppe bestevenner, men rapporten går muntlig igjen.
2. **Sett dem på hver sin vakt** – Fjerner gnisningen
   - Effekt: −300 kr, −2 stress (alle)
   - Utfall: Fred i gangene. Turnusen ble et puslespill, og resten av personalet vet nøyaktig hvorfor.
3. **«Dere får oppføre dere profesjonelt»** – En kort beskjed i gangen
   - Effekt: +5 stress (alle), +1 avvik
   - Utfall: De nikket begge to. Dagen etter gikk en beskjed om allergi tapt på en gul lapp.

**Faglig begrunnelse:** En konflikt mellom kolleger blir en pasientsikkerhetsrisiko den dagen informasjon slutter å flyte. Arbeidsgiver har plikt til å gripe inn tidlig, snakke med hver av partene og legge en plan. Jo lenger det går, jo flere velger side.

**Kilde:** Arbeidsmiljøloven §§ 4-1 og 4-3 · Helsepersonelloven § 4

### Forsto ikke beskjeden

`vikar_spraak` · alle avdelinger, hele døgnet

> Den nye vikaren er varm, flink i stell og elsket av beboerne. Men hun forsto ikke «faste fra midnatt», og ga frokost til en som skulle til operasjon.
> — *Dagvakta*

1. **Tilpass oppgavene, bruk skriftlige beskjeder og fadder** *(krever Dok. 2+ på vakt)* – Krever noen med Dok. 2+
   - Effekt: +24 Fagpoeng, +2 trivsel, +1 avvik
   - Utfall: Kritiske beskjeder står nå på et eget ark ved senga, og hun gjentar dem tilbake. Kommunens norskkurs har hun allerede meldt seg på.
2. **La henne bare gjøre stell og kjøkkenoppgaver** – Trygt, men trangt
   - Effekt: +4 stress (på vakt), +1 avvik
   - Utfall: Feilene opphørte. De andre på vakta tar alt det andre, og hun spør hvorfor hun aldri får lære noe nytt.
3. **Slutt å ringe henne** – Enklest for alle
   - Effekt: −3 trivsel, +5 stress (alle), +1 avvik
   - Utfall: Dere mistet en av de beste i stell. Neste vikar snakket flytende norsk og glemte tre beboere i dusjen.

**Faglig begrunnelse:** Arbeidsgiver skal sørge for at alle har nødvendig opplæring og tilstrekkelige språkferdigheter for oppgavene de får. Oppgaver må fordeles etter reell kompetanse, og kritiske beskjeder gis skriftlig og bekreftes. Løsningen er tilrettelegging, ikke utestenging.

**Kilde:** Helse- og omsorgstjenesteloven § 4-1 · Helsepersonelloven § 16 · Arbeidsmiljøloven § 4-2

### Gravid i uke 22

`gravid_tilrettelegging` · alle avdelinger, hele døgnet

> En av helsefagarbeiderne er gravid og har vondt i bekkenet. Hun står på tre tunge stell og to nattevakter i uka, og vil ikke «være til bry».
> — *Deg selv*

1. **Ta samtalen nå og legg om oppgaver og vakter** – Krever en ledig hånd i turnusen
   - Effekt: +22 Fagpoeng, −400 kr, −3 stress (alle)
   - Utfall: Ingen nattevakter, takheis på alle forflytninger, og hun tar opplæringen av de nye. Hun jobbet til uke 36.
2. **«Si fra hvis det blir for tungt»** – Hun er voksen
   - Effekt: +3 stress (på vakt)
   - Utfall: Hun sa aldri fra. I uke 26 ble hun sykmeldt ut svangerskapet med bekkenløsning.
3. **Foreslå at hun ber legen om sykmelding** – Løser turnusen raskt
   - Effekt: −900 kr, +4 stress (alle), +1 avvik
   - Utfall: Du mistet en erfaren fagarbeider i fire måneder, og brøt tilretteleggingsplikten på veien.

**Faglig begrunnelse:** Arbeidsgiver har plikt til å risikovurdere og tilrettelegge arbeidet for gravide. Tunge løft, nattarbeid og smitterisiko skal vurderes særskilt. Først når tilrettelegging eller omplassering ikke er mulig, er svangerskapspenger aktuelt – sykmelding er ikke første svar.

**Kilde:** Arbeidsmiljøloven § 4-6 · Forskrift om utførelse av arbeid kap. 7

### Bløtkake med valnøtter

`hjemmebakst` · alle avdelinger, hele døgnet

> Datteren til {beboer} (rom {rom}) kommer med hjemmelaget bløtkake til hele avdelingen. Krem, egg og valnøtter. To beboere har nøtteallergi, og fire har svelgvansker.
> — *Helgevakta*

1. **Takk varmt, spør om innholdet og server tilpasset** *(krever Ernæring 2+ på vakt)* – Krever Ernæring 2+ på vakt
   - Effekt: +14 Fagpoeng, +1 Kaffekopper, +5 trivsel
   - Utfall: Kake til kaffen for de fleste, moset med krem for fire, og fruktsalat til de to med allergi. Datteren fikk æren.
2. **Sett kaka på vaktrommet** – Tryggest slik
   - Effekt: −2 trivsel, −3 stress (på vakt)
   - Utfall: Personalet koste seg. Datteren spurte {forelder} dagen etter om kaka smakte. «Hvilken kake?»
3. **Sett den fram på stua til alle** – Kake er kake
   - Effekt: −3 trivsel, +6 stress (på vakt), +2 avvik
   - Utfall: Én med hovne lepper og én med kake i luftrøret. Det ble ikke den hyggelige kaffestunden datteren hadde sett for seg.

**Faglig begrunnelse:** Gaver i form av mat er hyggelig og helt greit å ta imot, men institusjonen har ansvar for at det som serveres, er trygt. Allergener må være kjent, kremkaker må holdes kalde, og konsistensen må tilpasses dem som har svelgvansker.

**Kilde:** Matinformasjonsforskriften (allergenmerking) · Mattilsynet: internkontroll for mat i institusjon

## Historiekjeder (19)

### Tre med feber

`utbrudd_start` · kjeden «Utbruddet», steg 1 av 3

> Feber og hoste på tre rom siden i går. En pleier gikk hjem med vondt i halsen. Det er januar, og influensaen herjer i byen.
> — *Smittevernkontakt*

1. **Isoler på rommene, dråpesmitte og prøver nå** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +26 Fagpoeng, −400 kr, +5 stress (på vakt)
   - Utfall: Smittefrakker ved tre dører, måltider på rommet og prøver sendt med taxi. Tungvint – men smitten ble der den var.
   - Fortsetter med «Besøksstans?» (`utbrudd_besok`) etter 16–30 spilltimer
2. **Ta prøver, og vent på svar før dere gjør mer** – Det kan jo være forkjølelse
   - Effekt: +8 Fagpoeng, +1 avvik
   - Utfall: Svaret kom etter to døgn: influensa A. Da hadde de tre spist middag i fellesstua seks ganger til.
   - Fortsetter med «Halve gangen hoster» (`utbrudd_sprer`) etter 16–30 spilltimer
3. **Ekstra håndsprit og god lufting** – Ikke lag panikk
   - Effekt: −2 trivsel, +2 avvik
   - Utfall: Det luktet friskt av sprit i gangen. Hosten spredte seg fra bord til bord.
   - Fortsetter med «Halve gangen hoster» (`utbrudd_sprer`) etter 16–30 spilltimer

**Faglig begrunnelse:** To eller flere tilfeller med samme symptomer i løpet av få dager er et mulig utbrudd. Da skal tiltakene komme før prøvesvaret: isolering på rommet, dråpesmitteregime, prøvetaking og varsling. Hver time uten tiltak gir nye smittede blant skrøpelige beboere.

**Kilde:** FHI: håndtering av utbrudd av luftveisinfeksjoner i helseinstitusjoner · Forskrift om smittevern i helse- og omsorgstjenesten

### Besøksstans?

`utbrudd_besok` · kjeden «Utbruddet», steg 2 av 3 · kommer bare som neste steg

> Influensa A er bekreftet, men holder seg på tre rom. I gangen står pårørende: Én vil inn til sin døende mor. To andre krever at avdelingen stenges helt.
> — *Aftenvakta*

1. **Tilrettelagt besøk: munnbind, veiledning og egen inngang** *(krever Stell 3+ på vakt)* – Krever Stell 3+ på vakt
   - Effekt: +24 Fagpoeng, −300 kr, +4 trivsel
   - Utfall: Datteren satt ved senga i smittefrakk til det siste. De to andre fikk en god forklaring og kom tilbake på lørdag.
   - Fortsetter med «Etter utbruddet» (`utbrudd_evaluering`) etter 20–36 spilltimer
2. **Steng avdelingen for alle besøk** – Tryggest for flest
   - Effekt: −5 trivsel, +1 avvik
   - Utfall: Moren døde natt til torsdag. Datteren sto utenfor glassdøra. Dette vil hun fortelle om, lenge og til mange.
   - Fortsetter med «Etter utbruddet» (`utbrudd_evaluering`) etter 20–36 spilltimer
3. **La alle komme og gå som vanlig** – Smitten er jo under kontroll
   - Effekt: −2 trivsel, +2 avvik
   - Utfall: Et barnebarn med snue hilste på i fire rom. Smitten var under kontroll helt til den ikke var det.
   - Fortsetter med «Etter utbruddet» (`utbrudd_evaluering`) etter 20–36 spilltimer

**Faglig begrunnelse:** Smitteverntiltak skal være nødvendige og stå i forhold til risikoen. Beboere har rett til besøk, og generell besøksstans krever klart rettslig grunnlag. Besøk kan nesten alltid gjennomføres trygt med veiledning og utstyr – og døende skal aldri være alene mot sin vilje.

**Kilde:** Smittevernloven § 1-5 · Helsedirektoratet: besøk i helse- og omsorgsinstitusjoner

### Halve gangen hoster

`utbrudd_sprer` · kjeden «Utbruddet», steg 2 av 3 · kommer bare som neste steg

> Sju beboere og tre ansatte er syke. Vikarbyrået har ingen å sende. Kommuneoverlegen har ikke hørt et ord fra dere.
> — *Dagvakta*

1. **Varsle kommuneoverlegen og del personalet i to lag** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +22 Fagpoeng, −900 kr, +8 stress (alle), +1 avvik
   - Utfall: Kommuneoverlegen skaffet folk fra hjemmetjenesten. Ett lag til de syke, ett til de friske. Etter fem dager kom ingen nye tilfeller.
   - Fortsetter med «Etter utbruddet» (`utbrudd_evaluering`) etter 20–36 spilltimer
2. **Alle på rommene, og steng fellesstua** – Hardt, men enkelt
   - Effekt: −6 trivsel, +6 stress (alle), +1 avvik
   - Utfall: Smitten bremset. Det gjorde også matlysten, humøret og beina til dem som satt alene på rommet i ti dager.
   - Fortsetter med «Etter utbruddet» (`utbrudd_evaluering`) etter 20–36 spilltimer
3. **Be dem med «bare litt hoste» komme på jobb** – Noen må jo være her
   - Effekt: −400 kr, −5 trivsel, +3 avvik
   - Utfall: Vaktene ble dekket. Dagen etter hadde fire nye beboere feber, og to pleiere til lå hjemme.
   - Fortsetter med «Etter utbruddet» (`utbrudd_evaluering`) etter 20–36 spilltimer

**Faglig begrunnelse:** Utbrudd i helseinstitusjon skal varsles til kommuneoverlegen og Folkehelseinstituttet. Kohortpleie – eget personale til de syke – begrenser spredningen. Ansatte med symptomer skal holde seg hjemme, også når bemanningen er sprengt: De smitter flere enn de hjelper.

**Kilde:** MSIS-forskriften § 3-3 · FHI: utbruddsveilederen for helseinstitusjoner

### Etter utbruddet

`utbrudd_evaluering` · kjeden «Utbruddet», steg 3 av 3 · kommer bare som neste steg

> Tolv dager, to innleggelser og en avdeling som er på felgen. Bare fire av ti ansatte var vaksinert. Smittevernlegen ber om en evaluering.
> — *Smittevernkontakt*

1. **Evaluer med hele personalet og oppdater planen** *(krever Dok. 2+ på vakt)* – Krever noen med Dok. 2+
   - Effekt: +30 Fagpoeng, −4 stress (alle), +15 pass-XP
   - Utfall: Tidslinja på veggen viste hvor timene gikk tapt. Utbruddskassa står nå klar på lageret, med liste over hvem som skal ringes.
2. **Tilby vaksine i arbeidstida, med kake** – Neste sesong kommer
   - Effekt: +14 Fagpoeng, −500 kr, +2 trivsel
   - Utfall: Ni av ti tok stikket. Kaka hjalp. Rutinene for neste utbrudd er fortsatt de samme som sist.
3. **Send en kort rapport og se framover** – Alle er slitne
   - Effekt: +2 stress (alle), +1 avvik
   - Utfall: Rapporten ble på åtte linjer. Smittevernlegen svarte med tolv spørsmål.

**Faglig begrunnelse:** Et utbrudd er ikke over før det er evaluert. Infeksjonskontrollprogrammet skal oppdateres med det dere lærte: Hvor raskt kom tiltakene, hvem ble varslet, og hva manglet? Vaksinasjon av personalet beskytter beboerne, og dekningen bør følges opp av lederen.

**Kilde:** Forskrift om smittevern i helse- og omsorgstjenesten § 2-1 · FHI: influensavaksine til helsepersonell

### Ny på mandag

`nyansatt_start` · kjeden «Den nyansatte», steg 1 av 3

> En nyutdannet sykepleier starter mandag. Turnusen har hull, og hun står oppført alene på kveldsvakt allerede onsdag.
> — *Deg selv*

1. **Tre opplæringsvakter med fadder og sjekkliste** – Koster vikar for onsdagen
   - Effekt: +20 Fagpoeng, −800 kr, +3 stress (alle)
   - Utfall: Hun gikk i hælene på en erfaren kollega i tre dager og krysset av på lista. Onsdagen ble dekket av en sur, men snill ringevikar.
   - Fortsetter med «Gråter på medisinrommet» (`nyansatt_usikker`) etter 30–54 spilltimer
2. **Én dag sammen med en erfaren, så rett i turnus** – Et kompromiss
   - Effekt: +6 Fagpoeng, −250 kr
   - Utfall: Hun fikk omvisning, koden til medisinrommet og en klapp på skuldra. Onsdag kveld sto hun der alene.
   - Fortsetter med «Gråter på medisinrommet» (`nyansatt_usikker`) etter 30–54 spilltimer
3. **Rett i turnus – hun har jo autorisasjon** – Learning by doing
   - Effekt: +4 stress (på vakt), +1 avvik
   - Utfall: Hun brukte førti minutter på å finne nøkkelen til narkotikaskapet. Ingen hadde fortalt henne hvor den hang.
   - Fortsetter med «Gråter på medisinrommet» (`nyansatt_usikker`) etter 30–54 spilltimer

**Faglig begrunnelse:** Arbeidsgiver skal sørge for at nyansatte får den opplæringen som trengs for å utføre arbeidet forsvarlig. Autorisasjon er ikke det samme som å kjenne avdelingen, rutinene og beboerne. God mottakelse er den billigste rekrutteringen som finnes.

**Kilde:** Helse- og omsorgstjenesteloven § 8-1 · Helsepersonelloven § 16 · Forskrift om ledelse og kvalitetsforbedring § 7

### Gråter på medisinrommet

`nyansatt_usikker` · kjeden «Den nyansatte», steg 2 av 3 · kommer bare som neste steg

> Den nye sykepleieren sitter på medisinrommet med røde øyne. Hun glemte en kveldsdose i går, og tør ikke ha ansvarsvakt alene mer.
> — *Aftenvakta*

1. **Fast veileder og en halvtime refleksjon hver uke** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +24 Fagpoeng, −400 kr, −4 stress (alle)
   - Utfall: Avviket meldte dere sammen. Veilederen forteller om sin egen første glemte dose, i 1998. Hun lo for første gang på en uke.
   - Fortsetter med «Prøvetida går ut» (`nyansatt_proevetid`) etter 36–60 spilltimer
2. **Ta henne ut av medisinansvaret en stund** – Gir henne ro
   - Effekt: +5 stress (på vakt), +1 avvik
   - Utfall: Hun ble lettet først. Så begynte hun å lure på om hun egentlig er sykepleier. De andre tar medisinrundene hennes.
   - Fortsetter med «Prøvetida går ut» (`nyansatt_proevetid`) etter 36–60 spilltimer
3. **«Sånn er det å være ny»** – Alle har vært der
   - Effekt: −1000 kr, +6 stress (alle), +2 avvik
   - Utfall: Hun leverte oppsigelsen på fredag. Vikarbyrået sender en sykepleier på mandag, og en regning på tirsdag.

**Faglig begrunnelse:** Det første året i yrket avgjør om en nyutdannet blir værende. Strukturert veiledning, en fast kontaktperson og tid til refleksjon gir tryggere sykepleiere og færre feil. Én glemt dose er et avvik å lære av – ikke et bevis på at hun er uegnet.

**Kilde:** Arbeidsmiljøloven § 4-2 · Helsepersonelloven § 16 · Forskrift om ledelse og kvalitetsforbedring § 7

### Prøvetida går ut

`nyansatt_proevetid` · kjeden «Den nyansatte», steg 3 av 3 · kommer bare som neste steg

> Seks måneder er snart gått. Hun er blitt trygg på medisin og sår, men dokumenterer tynt og kommer ofte fem minutter for sent. Enhetsleder vil ha din anbefaling.
> — *Enhetsleder*

1. **Anbefal fast ansettelse, med en tydelig utviklingsplan** – Si klart fra om det som må bli bedre
   - Effekt: +28 Fagpoeng, +2 trivsel, −5 stress (alle), +15 pass-XP
   - Utfall: Hun fikk beskjeden rett fram: flink klinisk, slurvete i journalen. Tre måneder senere holdt hun internundervisning om dokumentasjon.
2. **Be om forlenget prøvetid** – Se det an litt til
   - Effekt: +3 stress (alle), +1 avvik
   - Utfall: Personalkontoret sa nei: Det må være avtalt skriftlig fra start. Nå er hun fast ansatt – uten at noen har snakket med henne om journalen.
3. **Avslutt arbeidsforholdet i prøvetida** – Det finnes sikkert bedre søkere
   - Effekt: −1200 kr, −2 trivsel, +6 stress (alle)
   - Utfall: Fagforeningen spurte etter de skriftlige tilbakemeldingene. Det fantes ingen. Stillingen har stått ubesatt i fire måneder.

**Faglig begrunnelse:** Prøvetiden kan være på inntil seks måneder, og kan bare forlenges ved fravær og når det er avtalt skriftlig på forhånd. Oppsigelse i prøvetiden må begrunnes i tilpasning, faglig dyktighet eller pålitelighet – og forutsetter at arbeidsgiver har gitt opplæring og tydelige tilbakemeldinger underveis.

**Kilde:** Arbeidsmiljøloven § 15-6

### Søsken i strid

`soesken_start` · kjeden «Søsken i strid», steg 1 av 3

> Datteren til {beboer} (rom {rom}) krever full behandling. Sønnen vil ha ro og ingen sykehus. De ringer vaktrommet hver sin gang, med hver sin beskjed.
> — *Primærkontakten*

1. **Kall inn begge, tilsynslegen og {beboer} selv** *(krever Dok. 2+ på vakt)* – Krever noen med Dok. 2+
   - Effekt: +24 Fagpoeng, +3 trivsel, −5 energi (på vakt)
   - Utfall: {beboer} fikk sagt hva {han} selv ville. Datteren nikket. Sønnen satt med armene i kors og sa at dette ikke var siste ord.
   - Fortsetter med «Filmer stellet» (`soesken_filmer`) etter 20–40 spilltimer
2. **Be dem bli enige om én kontaktperson** – Rydder i telefonene
   - Effekt: +8 Fagpoeng, −1 trivsel
   - Utfall: De ble enige om datteren. Sønnen sluttet å ringe. I stedet begynte han å komme innom, til alle døgnets tider.
   - Fortsetter med «Filmer stellet» (`soesken_filmer`) etter 20–40 spilltimer
3. **Forhold deg til den som er oftest på besøk** – Hun kjenner hverdagen
   - Effekt: −3 trivsel, +1 avvik
   - Utfall: Datteren fikk alle beskjedene. Sønnen fikk vite om legetimen i etterkant, og tok det ikke pent.
   - Fortsetter med «Filmer stellet» (`soesken_filmer`) etter 20–40 spilltimer

**Faglig begrunnelse:** Det er pasienten selv som oppgir hvem som er nærmeste pårørende, og det er pasientens vilje som gjelder. Når pårørende er uenige, må tjenesten samle alle til én felles samtale – med lege, og med pasienten til stede så langt det lar seg gjøre.

**Kilde:** Pasient- og brukerrettighetsloven §§ 1-3 bokstav b og 3-3 · Helsedirektoratet: Pårørendeveileder

### Filmer stellet

`soesken_filmer` · kjeden «Søsken i strid», steg 2 av 3 · kommer bare som neste steg

> Sønnen til {beboer} står i døra med mobilen og filmer morgenstellet. «Så alle får se hvordan dere behandler {forelder}.» To pleiere nekter å gå inn igjen.
> — *Dagvakta*

1. **Stopp filmingen rolig, og tilby et møte i dag** *(krever Ro 3+ på vakt)* – Krever Ro 3+ på vakt
   - Effekt: +26 Fagpoeng, +3 trivsel, −3 stress (alle), +10 pass-XP
   - Utfall: På kontoret, uten telefon, kom det fram: Han var redd for å miste {forelder} uten å ha gjort nok. Videoen slettet han selv.
2. **Nekt ham adgang til avdelingen** – Personalet må vernes
   - Effekt: −4 trivsel, +2 avvik
   - Utfall: Besøksnekt uten vedtak og uten klagerett holdt i to dager, til advokaten hans ringte. Videoen har han fortsatt.
   - Fortsetter med «Lokalavisa ringer» (`soesken_avis`) etter 18–36 spilltimer
3. **La ham filme – vi har ingenting å skjule** – Åpenhet avvæpner
   - Effekt: +8 stress (alle), +1 avvik
   - Utfall: Han filmet i tjue minutter. {beboer} lå halvnaken i bildet hele tiden, og ingen spurte hva {han} syntes.
   - Fortsetter med «Lokalavisa ringer» (`soesken_avis`) etter 18–36 spilltimer

**Faglig begrunnelse:** Filming av stell krenker beboerens verdighet og de ansattes personvern, og arbeidsgiver skal verne personalet mot trakassering fra tredjepersoner. Grensen settes rolig og tydelig. Samtidig er sinne nesten alltid uttrykk for avmakt, og må møtes med en reell samtale.

**Kilde:** Arbeidsmiljøloven § 4-3 · Verdighetsgarantiforskriften § 3 · Personopplysningsloven

### Lokalavisa ringer

`soesken_avis` · kjeden «Søsken i strid», steg 3 av 3 · kommer bare som neste steg

> «Vi har fått en video og en alvorlig historie fra familien til en av beboerne deres. Har dere en kommentar? Vi publiserer i morgen tidlig.»
> — *Journalisten*

1. **Svar generelt, og inviter familien til møte med ombudet** – Ingenting om enkeltpersoner
   - Effekt: +26 Fagpoeng, +2 trivsel, +3 stress (alle), +15 pass-XP
   - Utfall: Avisa trykket historien, med et ryddig tilsvar. Familien takket ja til møtet. Det ble første gang søsknene satt i samme rom.
2. **«Ingen kommentar», og legg på** – Si minst mulig
   - Effekt: −3 trivsel, +5 stress (alle)
   - Utfall: «Sykehjemmet nekter å svare» sto det i ingressen. Det var sant, og det så ikke pent ut.
3. **Forklar hva som egentlig skjedde med {beboer}** – Sannheten må fram
   - Effekt: −1000 kr, −5 trivsel, +3 avvik
   - Utfall: Du fikk fortalt din versjon. Du brøt også taushetsplikten, på trykk. Statsforvalteren har opprettet tilsynssak.

**Faglig begrunnelse:** Taushetsplikten gjelder også når pårørende selv har gått til pressen: Du kan ikke bekrefte at en person er beboer, og langt mindre forklare hva som skjedde. Svar generelt om rutiner, vis til kommunens kommunikasjonsansvarlige, og tilby familien en ny samtale med pasient- og brukerombudet til stede.

**Kilde:** Helsepersonelloven § 21 · Pasient- og brukerrettighetsloven kap. 8

### Verger seg i stellet

`smerte_start` · kjeden «Smerten ingen fant», steg 1 av 3 · krever beboer med profilen «Kognitiv svikt og uro»

> {beboer} (rom {rom}) stønner og slår når vi snur {ham}. Spiser mindre og sover dårlig. {Han} har ikke språk til å fortelle hva som er galt.
> — *Dagvakta*

1. **Kartlegg med MOBID-2 under morgenstellet** *(krever Stell 3+ på vakt)* – Krever Stell 3+ på vakt
   - Effekt: +26 Fagpoeng, +2 trivsel
   - Utfall: Skår 7 når venstre bein beveges, 0 i ro. Legen satte {ham} på fast paracetamol og vil ha ny skåring om tre dager.
   - Fortsetter med «Vil ikke stå på beinet» (`smerte_ingen_effekt`) etter 20–40 spilltimer
2. **Be om paracetamol ved behov** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +8 Fagpoeng
   - Utfall: «Ved behov» ble gitt to ganger på tre døgn. Ingen var helt sikre på når behovet var der.
   - Fortsetter med «Vil ikke stå på beinet» (`smerte_ingen_effekt`) etter 20–40 spilltimer
3. **Skjerm mer – det er sykdommen som utvikler seg** – Demens blir jo verre
   - Effekt: −3 trivsel, +1 avvik
   - Utfall: {beboer} ble skjermet på rommet. Stønningen fortsatte der inne, bare med færre som hørte den.
   - Fortsetter med «Vil ikke stå på beinet» (`smerte_ingen_effekt`) etter 20–40 spilltimer

**Faglig begrunnelse:** Personer med langtkommen demens kan ikke si fra om smerte. Endret atferd, grimaser og avverging ved bevegelse må tolkes som smerte til noe annet er vist. MOBID-2 er laget for nettopp dette: Smerten vurderes mens pasienten beveges under stell.

**Kilde:** MOBID-2 smerteskala · Nasjonal faglig retningslinje om demens

### Vil ikke stå på beinet

`smerte_ingen_effekt` · kjeden «Smerten ingen fant», steg 2 av 3 · kommer bare som neste steg

> {beboer} verger seg fortsatt, og vil ikke stå på venstre bein. Det dere har prøvd, har ikke hjulpet. Tilsynslegen kommer ikke før torsdag.
> — *Aftenvakta*

1. **Ring legen i dag, med observasjonene klare** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +26 Fagpoeng, +3 trivsel
   - Utfall: «Smerter ved belastning av venstre hofte i minst en uke, beinet virker kortere.» Legen bestilte røntgen samme ettermiddag.
   - Fortsetter med «Det var et brudd» (`smerte_funn`) etter 14–26 spilltimer
2. **Vent til torsdag, men før smerteskjema hver vakt** – Da har legen noe å se på
   - Effekt: +8 Fagpoeng, −3 trivsel
   - Utfall: Skjemaet viste det samme i fire døgn til. Torsdag bestilte legen røntgen etter to minutter.
   - Fortsetter med «Det var et brudd» (`smerte_funn`) etter 30–48 spilltimer
3. **Be om noe beroligende til stellet** – Så går det lettere
   - Effekt: −5 trivsel, +2 avvik
   - Utfall: Stellet ble stille. {beboer} sluttet å protestere, og sluttet omtrent samtidig å spise.
   - Fortsetter med «Det var et brudd» (`smerte_funn`) etter 30–48 spilltimer

**Faglig begrunnelse:** Når et tiltak ikke virker, skal det evalueres og problemet løftes videre – ikke bare gjentas. Smerte som øker ved belastning, og et bein pasienten ikke vil stå på, er et funn som krever legeundersøkelse nå. Meld det strukturert, med det dere har observert og målt.

**Kilde:** Helsepersonelloven § 4 · ISBAR · MOBID-2

### Det var et brudd

`smerte_funn` · kjeden «Smerten ingen fant», steg 3 av 3 · kommer bare som neste steg

> Røntgen viser et lårhalsbrudd som er minst en uke gammelt. Ingen har registrert noe fall. Datteren til {beboer} spør: «Hvordan kan ingen ha merket det?»
> — *Tilsynslegen*

1. **Vær åpen, beklag, og gå gjennom hele forløpet** *(krever Dok. 3+ på vakt)* – Krever noen med Dok. 3+
   - Effekt: +30 Fagpoeng, +2 trivsel, +1 avvik, +15 pass-XP
   - Utfall: Gjennomgangen viste et fall ingen skrev ned, og sju dager med tegn ingen samlet. Datteren fikk alt, og skjemaet til pasientskadeerstatningen.
2. **Beklag til datteren og meld avviket** – Det minste dere skylder henne
   - Effekt: +12 Fagpoeng, −1 trivsel, +1 avvik
   - Utfall: Hun tok imot beklagelsen. Spørsmålet hennes – hvordan? – står fortsatt ubesvart, også for dere.
3. **«{Han} kan jo ikke si fra selv»** – Ingen kunne vite
   - Effekt: −6 trivsel, +3 avvik
   - Utfall: Det er nettopp derfor det er deres jobb å se. Datteren har klaget til Statsforvalteren, og hun har en god sak.

**Faglig begrunnelse:** Når en pasient er påført skade, har pasient og pårørende krav på informasjon om hva som skjedde og om retten til å søke erstatning. Hendelsen skal meldes som avvik og gjennomgås for læring, og alvorlige hendelser skal varsles til Helsetilsynet. Åpenhet er en plikt.

**Kilde:** Pasient- og brukerrettighetsloven § 3-2 · Helse- og omsorgstjenesteloven § 12-3 a

### Hardhendt kollega?

`varsling_start` · kjeden «Varselet», steg 1 av 2

> En assistent ber om en prat. Hun har to ganger sett en erfaren kollega dra hardt i armen til en beboer og kalle henne «vanskelig». Hun vil helst være anonym.
> — *Deg selv*

1. **Følg varslingsrutinen og undersøk denne uka** *(krever Dok. 2+ på vakt)* – Krever noen med Dok. 2+
   - Effekt: +24 Fagpoeng, +4 stress (alle)
   - Utfall: Du snakket med begge, og med to andre på vakta. Kollegaen ble satt på vakter med makker og fikk skriftlig tilbakemelding. Ryktet om hvem som «sladret», gikk fortere enn du rakk.
   - Fortsetter med «Frosset ut» (`varsling_gjengjeld`) etter 24–48 spilltimer
2. **Følg med selv noen uker først** – Du må jo se det med egne øyne
   - Effekt: +1 avvik
   - Utfall: Når lederen er til stede, er alle på sitt beste. Du så ingenting. Assistenten ser det fortsatt, og nå vet flere hva hun har sagt.
   - Fortsetter med «Frosset ut» (`varsling_gjengjeld`) etter 24–48 spilltimer
3. **Be henne ta det opp med kollegaen selv** – Voksne folk snakker sammen
   - Effekt: +5 stress (på vakt), +2 avvik
   - Utfall: Hun prøvde. Svaret var en latter og et «hvem tror du at du er?». Du sendte en assistent alene inn i en sak som var din.
   - Fortsetter med «Frosset ut» (`varsling_gjengjeld`) etter 24–48 spilltimer

**Faglig begrunnelse:** Arbeidstakere har rett til å varsle om kritikkverdige forhold, og arbeidsgiver har plikt til å undersøke varselet innen rimelig tid. Krenkelser av beboere er aldri en privatsak mellom kolleger. Varsleren skal vernes – og den det varsles om, har krav på å få forklare seg.

**Kilde:** Arbeidsmiljøloven §§ 2 A-1 og 2 A-3 · Helsepersonelloven § 17

### Frosset ut

`varsling_gjengjeld` · kjeden «Varselet», steg 2 av 2 · kommer bare som neste steg

> Assistenten som varslet, får ikke lenger hjelp til tunge stell. I skapet hennes lå en lapp: «Sladrehank». Kollegaen hun varslet om, har mange venner på huset.
> — *Verneombudet*

1. **Ta det opp i personalmøtet, og følg henne tett opp** *(krever Ro 2+ på vakt)* – Krever Ro 2+ på vakt
   - Effekt: +28 Fagpoeng, +3 trivsel, −3 stress (alle), +15 pass-XP
   - Utfall: Du sa det rett ut: Den som melder fra om en beboer som blir krenket, gjør jobben sin. Lappen ble aldri nevnt igjen. Hjelpen til stellene kom tilbake.
2. **Tilby henne plass på en annen avdeling** – Så får hun fred
   - Effekt: +4 stress (alle), +1 avvik
   - Utfall: Hun tok imot, og sluttet etter to måneder. Alle på avdelingen lærte hva som skjer med den som sier fra.
3. **La det gå seg til** – Sånt legger seg
   - Effekt: −4 trivsel, +8 stress (alle), +3 avvik
   - Utfall: Det la seg ikke. Hun ble sykmeldt, og varselet gikk videre til Arbeidstilsynet – nå med ditt navn i.

**Faglig begrunnelse:** Gjengjeldelse mot en som har varslet, er forbudt, og det gjelder også utfrysing og baksnakking fra kolleger. Arbeidsgiver har plikt til å sørge for at varsleren har et fullt forsvarlig arbeidsmiljø, og om nødvendig sette inn tiltak. Å flytte varsleren kan i seg selv være gjengjeldelse.

**Kilde:** Arbeidsmiljøloven §§ 2 A-3 og 2 A-4

### Vil snakke om døden

`forhaand_start` · kjeden «Den siste samtalen», steg 1 av 2 · krever beboer med profilen «Palliasjon og trygghet»

> {beboer} (rom {rom}) sa i natt: «Jeg vil ikke på sykehus mer. Jeg vil dø her.» Sønnen blir sint når temaet kommer opp: «{Han} skal ikke gi opp!»
> — *Nattevakta*

1. **Avtal forhåndssamtale med legen, {beboer} og sønnen** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +28 Fagpoeng, +4 trivsel
   - Utfall: {beboer} sa det én gang til, med legen til stede. Sønnen gikk ut i gangen og kom inn igjen. Ønsket står nå øverst i journalen.
   - Fortsetter med ««Ring 113 nå!»» (`forhaand_forverring`) etter 24–48 spilltimer
2. **Skriv ønsket i rapporten, og la det ligge** – Det er i hvert fall notert
   - Effekt: +8 Fagpoeng
   - Utfall: Notatet står på side fire i nattrapporten fra tirsdag. Legen har ikke sett det. Sønnen vet ikke at det finnes.
   - Fortsetter med ««Ring 113 nå!»» (`forhaand_forverring`) etter 24–48 spilltimer
3. **Bytt tema – {han} var sikkert bare nedfor** – Natta gjør alt mørkere
   - Effekt: −3 trivsel, +1 avvik
   - Utfall: {beboer} prøvde å si det én gang til, til dagvakta. Så sluttet {han} å prøve.
   - Fortsetter med ««Ring 113 nå!»» (`forhaand_forverring`) etter 24–48 spilltimer

**Faglig begrunnelse:** En forhåndssamtale gir pasienten mulighet til å si hva som er viktig i livets sluttfase, mens det ennå er mulig. Den bør tilbys alle i sykehjem, ledes av lege eller sykepleier, og dokumenteres slik at alle vaktlag og legevakta finner den. Pårørende inviteres hvis pasienten vil.

**Kilde:** Veileder: Forhåndssamtaler i sykehjem (Senter for medisinsk etikk, UiO) · Pasient- og brukerrettighetsloven § 4-9

### «Ring 113 nå!»

`forhaand_forverring` · kjeden «Den siste samtalen», steg 2 av 2 · kommer bare som neste steg

> {beboer} har fått lungebetennelse, puster tungt og er knapt kontaktbar. Sønnen står i gangen med telefonen: «Ring ambulanse nå, ellers gjør jeg det selv!»
> — *Aftenvakta*

1. **Tilkall legen, vis til ønsket til {beboer} og lindre her** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +30 Fagpoeng, +5 trivsel, +4 stress (på vakt), +15 pass-XP
   - Utfall: Legen kom, satt lenge med sønnen og startet lindrende behandling. {beboer} døde to døgn senere i sin egen seng, med sønnen ved siden av.
2. **Sett deg ned med sønnen og fortell hva {forelder} sa** – Og bli sittende
   - Effekt: +12 Fagpoeng, +1 trivsel, +6 stress (på vakt)
   - Utfall: Han ringte ikke. Men beslutningen ble hengende i lufta mellom dere to hele natta, uten lege og uten plan for lindringen.
3. **Ring 113 – sønnen er nærmeste pårørende** – Da har dere gjort alt
   - Effekt: −6 trivsel, +2 avvik
   - Utfall: {beboer} døde på akuttmottaket klokka fire om natta, bak et forheng. Det var det ene {han} hadde bedt om å slippe.

**Faglig begrunnelse:** Beslutninger om livsforlengende behandling tas av legen, med utgangspunkt i hva pasienten selv har ønsket. En døende pasient har rett til å motsette seg behandling, og pårørende kan ikke overprøve det. De skal likevel tas vare på: Informer, vær til stede og gi dem tid.

**Kilde:** Helsedirektoratet: Beslutningsprosesser ved begrensning av livsforlengende behandling · Pasient- og brukerrettighetsloven § 4-9

### Kom uten papirer

`svingdor_start` · kjeden «Svingdøra», steg 1 av 2 · Korttid og rehabilitering

> {beboer} (rom {rom}) kom fra sykehuset i går kveld: forvirret, med et kateter ingen visste om og et sår på setet. Epikrisen er på fire linjer.
> — *Nattevakta*

1. **Full innkomstvurdering, og avvik til sykehuset** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +26 Fagpoeng, −6 energi (på vakt), +1 avvik
   - Utfall: NEWS 3, trykksår grad 2 og et kateter uten plan for fjerning. Alt står i journalen, og avviket er sendt. Dere har et utgangspunkt.
   - Fortsetter med «Ingen vil ha ansvaret» (`svingdor_retur`) etter 18–36 spilltimer
2. **Ring sengeposten og spør om det viktigste** – Raskest
   - Effekt: +10 Fagpoeng
   - Utfall: Sykepleieren som svarte, hadde ikke hatt pasienten. «Det står sikkert i epikrisen.» Det gjorde det ikke.
   - Fortsetter med «Ingen vil ha ansvaret» (`svingdor_retur`) etter 18–36 spilltimer
3. **Start vanlig korttidsopplegg** – Papirene kommer vel etter
   - Effekt: −3 trivsel, +2 avvik
   - Utfall: Kateteret ble oppdaget på nytt av tre ulike vaktlag. Ingen visste hvorfor det lå der, eller hvor lenge.
   - Fortsetter med «Ingen vil ha ansvaret» (`svingdor_retur`) etter 18–36 spilltimer

**Faglig begrunnelse:** Mottak av en pasient fra sykehus krever en egen innkomstvurdering: NEWS2, hud, ernæring, fallrisiko, legemidler og kognisjon. Mangelfulle opplysninger ved utskrivning skal meldes som avvik til helseforetaket etter samarbeidsavtalen. Det er slik overgangene blir bedre.

**Kilde:** Helse- og omsorgstjenesteloven § 6-2 · Forskrift om kommunal betaling for utskrivningsklare pasienter

### Ingen vil ha ansvaret

`svingdor_retur` · kjeden «Svingdøra», steg 2 av 2 · kommer bare som neste steg

> {beboer} har 38,7 i feber, grumsete urin i posen og er mer forvirret. Sykehuset sier «ferdigbehandlet hos oss». Legevakta mener dere bør klare dette selv.
> — *Aftenvakta*

1. **Mål NEWS2 og ring legevakta på nytt, med ISBAR** *(krever sykepleier på vakt)* – Krever sykepleier på vakt
   - Effekt: +28 Fagpoeng, +3 trivsel, +15 pass-XP
   - Utfall: «NEWS 6, kateterbærer, nyoppstått forverring av forvirring – jeg ber om tilsyn i kveld.» Legen kom. Behandlingen startet her, og {beboer} slapp flyttingen.
2. **Gi drikke og febernedsettende, og se det an** – Legevakta sa jo det
   - Effekt: +6 Fagpoeng, +5 stress (på vakt), +1 avvik
   - Utfall: Feberen gikk ned til morgenen. Så gikk den opp igjen. Dagvakta fikk inn lege etter et halvt døgn uten behandling.
3. **Send {ham} til akuttmottaket i taxi** – Så får de ta det derfra
   - Effekt: −500 kr, −4 trivsel, +2 avvik
   - Utfall: {beboer} satt sju timer i en stol på akuttmottaket og ble sendt tilbake klokka tre om natta. Med enda en epikrise på fire linjer.

**Faglig begrunnelse:** Pasienten skal ikke bli kasteball mellom nivåene. Det er pasientens tilstand, ikke hvem som sist skrev ut, som avgjør hvor behandlingen skal skje. Målte verdier og en strukturert melding gir legen grunnlag for å vurdere tilsyn, behandling på stedet eller ny innleggelse.

**Kilde:** NEWS2 · ISBAR · Helsepersonelloven § 7

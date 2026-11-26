import type { DilemmaDef } from '@/types'

/** Fravær, vikarbruk og arbeidstid – det som fyller en leders uke. */
export const FRAVAER: DilemmaDef[] = [
  {
    id: 'egenmelding_monster',
    title: 'Mandag igjen',
    body: 'Fjerde egenmelding i år for den samme helsefagarbeideren – tre av dem på mandager etter arbeidshelg. Kollegene har begynt å himle med øynene.',
    from: 'Deg selv',
    color: 'gul',
    triggers: { absence: ['egenmelding'] },
    fagligBegrunnelse:
      'Egenmelding er en rettighet, og arbeidsgiver kan ikke kreve å få vite diagnosen. Gjentatt korttidsfravær skal likevel følges opp med en samtale om hva som ligger bak – ofte er det belastning i turnusen. Retten til egenmelding kan bare tas bort etter en ryddig prosess der den ansatte har fått uttale seg.',
    kilde: 'Folketrygdloven §§ 8-24 og 8-27 · IA-avtalen',
    options: [
      {
        id: 'oppfolgingssamtale',
        label: 'Ta en oppfølgingssamtale om arbeidshelgene',
        hint: 'Spør om turnusen, ikke om diagnosen',
        effect: { fagpoeng: 20, stress: -5, scope: 'alle', energy: -4 },
        outcome: 'Tre helger på rad med sen–tidlig, viste det seg. Dere flyttet én vakt. Mandagene har hun stått på siden.',
      },
      {
        id: 'krev_legeerklaering',
        label: 'Krev legeerklæring fra første dag',
        hint: 'Krever noen med Dok. 3+',
        requires: { skill: { id: 'dokumentasjon', min: 3 } },
        effect: { stress: 6, scope: 'alle', avvik: 1 },
        outcome: 'Formelt gjennomført, med varsel og drøfting. Fraværet gikk ned. Det gjorde også viljen til å ta ekstravakter.',
      },
      {
        id: 'la_ligge',
        label: 'La det ligge – hun har jo rett til det',
        hint: 'Ingen konflikt i dag',
        effect: { stress: 4, scope: 'alle' },
        outcome: 'Ingen samtale, ingen endring. Nå er det kollegene som har begynt å bli borte på mandager.',
      },
    ],
  },
  {
    id: 'vikarbudsjett',
    title: 'Vikarposten er tom',
    body: 'Oktober, og vikarbudsjettet er brukt opp. Byrået tilbyr en fast avtale. To av dine egne står i 60 % stilling og tar ekstravakter hver eneste uke.',
    from: 'Enhetsleder',
    color: 'bla',
    minTier: 1,
    fagligBegrunnelse:
      'Deltidsansatte har fortrinnsrett til utvidet stilling framfor nyansettelser og innleie, og den som jevnlig har jobbet utover avtalt stilling, kan ha krav på tilsvarende stillingsprosent. Fast ansatte som kjenner beboerne, gir bedre kontinuitet enn skiftende vikarer – og er som regel billigere.',
    kilde: 'Arbeidsmiljøloven §§ 14-3, 14-4 a og 14-12',
    options: [
      {
        id: 'oek_stilling',
        label: 'Tilby de to deltidsansatte høyere stilling',
        hint: 'Krever noen med Dok. 2+',
        requires: { skill: { id: 'dokumentasjon', min: 2 } },
        effect: { fagpoeng: 26, trivsel: 4, budget: -400, stress: -4, scope: 'alle', passXp: 10 },
        outcome: 'Begge sa ja til 80 %. Færre ukjente fjes i gangen, og vikarregningen ble halvert på to måneder.',
      },
      {
        id: 'byraaavtale',
        label: 'Skriv fast avtale med byrået',
        hint: 'Forutsigbart, men dyrt',
        effect: { budget: -1100, trivsel: -2 },
        outcome: 'Vaktene blir dekket. Beboerne spør hver morgen hvem den nye er, og hva de heter.',
      },
      {
        id: 'ring_de_samme',
        label: 'Fortsett å ringe de samme på fritida',
        hint: 'Det har jo gått til nå',
        effect: { stress: 8, scope: 'alle', avvik: 1 },
        outcome: 'De tok telefonen i oktober. I november sluttet den ene å svare, og den andre krevde stillingen sin via fagforeningen.',
      },
    ],
  },
  {
    id: 'overtid_grense',
    title: 'Tolv timer overtid',
    body: 'Den som alltid sier ja, har tatt tre ekstravakter på sju dager. I kveld mangler dere folk igjen, og hun står allerede med jakka på og spør om hun skal bli.',
    from: 'Aftenvakta',
    color: 'rosa',
    triggers: { minStress: 26 },
    fagligBegrunnelse:
      'Overtid skal ikke overstige ti timer på sju dager, og den som har jobbet, har krav på elleve timers hvile før neste vakt. Grensene kan bare utvides gjennom avtale med tillitsvalgte. De finnes fordi trøtte pleiere gjør flere feil – det er pasientsikkerhet like mye som arbeidervern.',
    kilde: 'Arbeidsmiljøloven §§ 10-6 og 10-8',
    options: [
      {
        id: 'annen_dekning',
        label: 'Takk nei, og finn en annen løsning for kvelden',
        hint: 'Vikar eller omfordeling',
        effect: { fagpoeng: 18, budget: -600, stress: -3, scope: 'alle' },
        outcome: 'Hun så nesten lettet ut. Vikaren kostet, men ingen gikk hjem etter seksten timer på jobb.',
      },
      {
        id: 'avtale_tillitsvalgt',
        label: 'Ring tillitsvalgt og avtal utvidet overtid',
        hint: 'Krever noen med Dok. 2+',
        requires: { skill: { id: 'dokumentasjon', min: 2 } },
        effect: { fagpoeng: 14, stress: 4, scope: 'paaVakt', energy: -8 },
        outcome: 'Avtalen kom på plass på ti minutter, med krav om fri dagen etter. Lovlig, og akkurat så slitsomt som det høres ut.',
      },
      {
        id: 'bare_bli',
        label: '«Supert, tusen takk!»',
        hint: 'Hun tilbød seg jo selv',
        effect: { avvik: 2, stress: 10, energy: -16, scope: 'paaVakt' },
        outcome: 'Klokka 21:40 ga hun kveldsmedisinen på rom 4 til beboeren på rom 5. Det er arbeidsgiver som har ansvaret for arbeidstida.',
      },
    ],
  },
  {
    id: 'gradert_tilrettelegging',
    title: 'Tilbake på 50 %',
    body: 'En sykepleier er tilbake gradert etter lang sykmelding. Hun skal skånes for tunge stell. I pausen mumles det om at «noen slipper unna».',
    from: 'Verneombudet',
    color: 'mint',
    triggers: { absence: ['gradert_syk'] },
    fagligBegrunnelse:
      'Arbeidsgiver har plikt til å tilrettelegge så langt det er mulig, og skal lage en oppfølgingsplan sammen med den ansatte innen fire uker. Gradert sykmelding virker best når oppgavene er konkrete og kollegene vet hva som er avtalt – ikke hvorfor, men hva. Uklarhet gir både tilbakefall og murring.',
    kilde: 'Arbeidsmiljøloven § 4-6 · Folketrygdloven §§ 8-6 og 8-7',
    options: [
      {
        id: 'plan_og_informasjon',
        label: 'Lag oppfølgingsplan, og si til laget hva som er avtalt',
        hint: 'Krever noen med Dok. 2+',
        requires: { skill: { id: 'dokumentasjon', min: 2 } },
        effect: { fagpoeng: 26, stress: -6, scope: 'alle', passXp: 10 },
        outcome: 'Legemidler, dokumentasjon og veiledning av lærlingen – ingen forflytninger. Da alle visste det, sluttet mumlingen.',
      },
      {
        id: 'vanlig_liste',
        label: 'Sett henne på vanlig arbeidsliste, «så det blir rettferdig»',
        hint: 'Likt for alle',
        effect: { avvik: 1, stress: 8, scope: 'alle' },
        outcome: 'Etter fire dager med tunge stell var hun helt sykmeldt igjen. Rettferdig ble det ikke, bare dyrt.',
      },
      {
        id: 'bli_hjemme',
        label: 'Be henne vente til hun er helt frisk',
        hint: 'Enklere for turnusen',
        effect: { trivsel: -2, stress: 3, scope: 'alle', budget: -500 },
        outcome: 'Hun ble hjemme. Jo lenger noen er borte, jo vanskeligere er veien tilbake – og dere hadde plikt til å prøve.',
      },
    ],
  },
  {
    id: 'sykt_barn_kvote',
    title: 'Dag elleve',
    body: 'En alenefar på aftenvakt har brukt opp sykt barn-dagene sine. Seksåringen har feber igjen. «Jeg kan ta ham med på vaktrommet, han sitter stille med nettbrettet.»',
    from: 'Aftenvakta',
    color: 'gul',
    triggers: { absence: ['sykt_barn'] },
    fagligBegrunnelse:
      'Arbeidstakere har rett til fri når barn under tolv år er syke – som hovedregel ti dager i året, flere for aleneforsørgere og ved kronisk sykdom. Er dagene brukt opp, finnes det løsninger i vaktbytte og ulønnet permisjon. Et sykt barn hører ikke hjemme på en avdeling med skrøpelige beboere.',
    kilde: 'Arbeidsmiljøloven § 12-9 · Folketrygdloven §§ 9-5 og 9-6',
    options: [
      {
        id: 'sjekk_og_bytt',
        label: 'Sjekk kvoten for aleneforsørgere, og hjelp ham å bytte vakt',
        hint: 'Han har trolig tjue dager, ikke ti',
        effect: { fagpoeng: 18, stress: -4, scope: 'alle', energy: -4 },
        outcome: 'Aleneforsørgere har dobbelt kvote. Han hadde ni dager igjen uten å vite det – og en kollega byttet gjerne kveldsvakta.',
      },
      {
        id: 'ulonnet',
        label: 'Innvilg ulønnet permisjon i dag',
        hint: 'Løser kvelden, ikke måneden',
        effect: { stress: 3, scope: 'paaVakt', trivsel: -1 },
        outcome: 'Han ble hjemme, uten lønn han egentlig hadde krav på. Ingen hadde sjekket hva reglene faktisk sa.',
      },
      {
        id: 'ta_med_barnet',
        label: 'La ham ta med gutten på vaktrommet',
        hint: 'Bare denne ene gangen',
        effect: { avvik: 2, trivsel: -4, stress: 5, scope: 'paaVakt' },
        outcome: 'Torsdag hadde tre beboere feber. Smittevernlegen spurte høflig hvem som hadde hatt med seg et sykt barn på jobb.',
      },
    ],
  },
]

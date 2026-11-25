import { CONTACT_EMAIL, PUBLISHER } from '@/lib/contact'

/** Personvern og brukervilkår. Teksten beskriver hva appen gjør i dag og oppdateres når det endrer seg. */
export const LEGAL_UPDATED = '25. november 2026'

export interface LegalSection {
  heading: string
  body: string[]
}

export const PRIVACY: LegalSection[] = [
  {
    heading: 'Behandlingsansvarlig',
    body: [
      `${PUBLISHER} er utgiver av Vaktrommet og behandlingsansvarlig for opplysningene som behandles i spillet.`,
      `Spørsmål om personvern, innsyn eller sletting kan sendes til ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: 'Hva som lagres',
    body: [
      'Spillet lagrer framdriften din lokalt i nettleseren på enheten du spiller på: avdelingsnavn, fylke, yrkesgruppe, spilltilstand og innstillinger.',
      'I denne versjonen sendes ingen opplysninger til en server. Vi bruker ikke analyseverktøy, sporingsteknologi eller reklamenettverk.',
    ],
  },
  {
    heading: 'Fylke og yrkesgruppe',
    body: [
      'Fylke og yrkesgruppe brukes bare til å filtrere topplistene. Topplistene i denne versjonen er en demonstrasjon med fiktive avdelinger og regnes ut på enheten din.',
    ],
  },
  {
    heading: 'Eksport og tilbakemelding',
    body: [
      'Når du eksporterer lagringen eller lager en feilrapport, lages teksten på enheten din. Den deles først når du selv sender den videre.',
      'En lagringsfil inneholder avdelingsnavnet ditt, fylke og yrkesgruppe. Den inneholder ikke navn, e-post eller annen kontaktinformasjon.',
    ],
  },
  {
    heading: 'Konto, betaling og varsler',
    body: [
      'Kontotilkobling og synkronisering er ikke aktivert ennå. Når det kommer, vil e-postadressen din og lagringen bli behandlet av vår databaseleverandør, og denne erklæringen blir oppdatert før det tas i bruk.',
      'Kjøp i denne versjonen er testkjøp uten betaling. Varsler vises av nettleseren din og krever at du selv gir tillatelse.',
    ],
  },
  {
    heading: 'Slette opplysningene',
    body: ['Du sletter alt ved å velge «Nullstill spill» under Konto & lagring, eller ved å slette nettstedsdata i nettleseren.'],
  },
]

export const TERMS: LegalSection[] = [
  {
    heading: 'Om spillet',
    body: [
      `Vaktrommet utgis av ${PUBLISHER}. Ved å spille godtar du disse vilkårene.`,
      'Vaktrommet er et underholdningsspill. Personer, beboere og hendelser er oppdiktet, og enhver likhet med virkelige personer er tilfeldig.',
    ],
  },
  {
    heading: 'Ikke faglig veiledning',
    body: [
      'De faglige begrunnelsene er forenklet og skrevet for et spill. De erstatter ikke lover, nasjonale retningslinjer, lokale prosedyrer eller faglig skjønn, og skal ikke brukes som grunnlag for helsehjelp.',
    ],
  },
  {
    heading: 'Kjøp og medlemskap',
    body: [
      'I denne versjonen gjennomføres ingen betaling. Vilkår for kjøp, abonnement, angrerett og refusjon legges til før ekte betaling tas i bruk.',
    ],
  },
  {
    heading: 'Lagring og ansvar',
    body: [
      'Framdriften ligger på enheten din og kan gå tapt hvis nettleserdata slettes. Bruk eksport for å ta en kopi.',
      'Spillet leveres som det er, uten garanti for at framdrift, topplister eller innhold forblir uendret mens det er under utvikling.',
    ],
  },
  {
    heading: 'Kontakt',
    body: [`Har du spørsmål om vilkårene eller vil melde en feil, når du ${PUBLISHER} på ${CONTACT_EMAIL}.`],
  },
]

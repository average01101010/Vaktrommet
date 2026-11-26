import { ABSENCES } from '@/data/absence'
import { SHIFTS } from '@/data/balance'
import { PROFESSIONS, SKILLS } from '@/data/professions'
import { RESIDENT_PROFILES } from '@/data/residents'
import { WARD_TYPES } from '@/data/wards'
import type { DilemmaDef, DilemmaOption, Effect } from '@/types'
import { DILEMMA_BY_ID, DILEMMA_CHAINS, DILEMMA_GROUPS, DILEMMAS, RANDOM_DILEMMAS } from './index'

/**
 * Lager `docs/dilemma-gjennomgang.md`: hele dilemmabanken i lesbar form, til
 * faglig gjennomgang. Kjør `npm run docs:dilemmas` etter endringer i banken.
 */

const signed = (n: number, unit: string) => `${n > 0 ? '+' : '−'}${Math.abs(n)} ${unit}`

function effectText(e: Effect): string {
  const who = e.scope === 'paaVakt' ? ' (på vakt)' : ' (alle)'
  return [
    e.fagpoeng && signed(e.fagpoeng, 'Fagpoeng'),
    e.budget && signed(e.budget, 'kr'),
    e.kaffekopper && signed(e.kaffekopper, 'Kaffekopper'),
    e.trivsel && signed(e.trivsel, 'trivsel'),
    e.stress && signed(e.stress, 'stress') + who,
    e.energy && signed(e.energy, 'energi') + who,
    e.avvik && signed(e.avvik, 'avvik'),
    e.passXp && signed(e.passXp, 'pass-XP'),
  ]
    .filter(Boolean)
    .join(', ')
}

function requirementText(o: DilemmaOption): string {
  const r = o.requires
  if (!r) return ''
  const parts = [r.profession && PROFESSIONS[r.profession].name.toLowerCase(), r.skill && `${SKILLS[r.skill.id].short} ${r.skill.min}+`]
  return ` *(krever ${parts.filter(Boolean).join(' og ')} på vakt)*`
}

function contextText(d: DilemmaDef): string {
  const t = d.triggers ?? {}
  const parts: string[] = []
  if (d.chain) parts.push(`kjeden «${DILEMMA_CHAINS[d.chain.id].title}», steg ${d.chain.step} av ${DILEMMA_CHAINS[d.chain.id].steps}`)
  if (t.isFollowUpOnly) parts.push(d.chain ? 'kommer bare som neste steg' : 'kommer bare som oppfølging av en utsatt sak')
  if (t.wardTypes) parts.push(t.wardTypes.map((w) => WARD_TYPES[w].name).join(' / '))
  if (t.shifts) parts.push(t.shifts.map((s) => SHIFTS[s].name.toLowerCase()).join(' / '))
  if (t.residentProfile) parts.push(`krever beboer med profilen «${RESIDENT_PROFILES[t.residentProfile].name}»`)
  if (t.minStress !== undefined) parts.push(`snittstress minst ${t.minStress}`)
  if (t.maxTrivsel !== undefined) parts.push(`trivsel høyst ${t.maxTrivsel}`)
  if (t.absence) parts.push(`når noen har ${t.absence.map((k) => ABSENCES[k].name.toLowerCase()).join(' eller ')}`)
  if (d.minTier) parts.push(`fra avdelingsnivå ${d.minTier + 1}`)
  return parts.length ? parts.join(' · ') : 'alle avdelinger, hele døgnet'
}

function optionText(o: DilemmaOption, index: number): string {
  const next = o.followUp && DILEMMA_BY_ID[o.followUp.id]
  const lines = [
    `${index + 1}. **${o.label}**${requirementText(o)}${o.hint ? ` – ${o.hint}` : ''}`,
    `   - Effekt: ${effectText(o.effect) || 'ingen'}`,
    `   - Utfall: ${o.outcome}`,
  ]
  if (o.followUp && next) {
    const [min, max] = o.followUp.afterHours
    lines.push(`   - ${next.chain ? 'Fortsetter med' : 'Utsatt – kommer tilbake som'} «${next.title}» (\`${next.id}\`) etter ${min}–${max} spilltimer`)
  }
  return lines.join('\n')
}

function dilemmaText(d: DilemmaDef): string {
  return [
    `### ${d.title}`,
    '',
    `\`${d.id}\` · ${contextText(d)}`,
    '',
    `> ${d.body}`,
    `> — *${d.from}*`,
    '',
    d.options.map(optionText).join('\n'),
    '',
    `**Faglig begrunnelse:** ${d.fagligBegrunnelse}`,
    '',
    `**Kilde:** ${d.kilde}`,
  ].join('\n')
}

export function renderDilemmaDoc(): string {
  const followUps = DILEMMAS.length - RANDOM_DILEMMAS.length
  const wardCount = (w: keyof typeof WARD_TYPES) => DILEMMAS.filter((d) => d.triggers?.wardTypes?.includes(w)).length
  const out: string[] = [
    '# Dilemmagjennomgang',
    '',
    'Hele dilemmabanken i Vaktrommet, til faglig gjennomgang. Fila er generert fra `src/data/dilemmas/` med',
    '`npm run docs:dilemmas` – rett i datafilene, ikke her.',
    '',
    '## Oversikt',
    '',
    `- **${DILEMMAS.length} dilemmaer** i alt: ${RANDOM_DILEMMAS.length} kan dukke opp av seg selv, og ${followUps} kommer bare som oppfølging eller neste steg i en kjede.`,
    `- **${Object.keys(DILEMMA_CHAINS).length} historiekjeder** over to eller tre steg.`,
    `- Egne situasjoner for spesialavdelingene: ${(['demens', 'korttid', 'bofellesskap', 'lindrende'] as const)
      .map((w) => `${WARD_TYPES[w].name} ${wardCount(w)}`)
      .join(', ')}.`,
    `- ${DILEMMAS.filter((d) => d.triggers?.shifts).length} er knyttet til en bestemt vakt, og ${DILEMMAS.filter((d) => d.triggers?.residentProfile).length} krever en beboer med en bestemt klinisk profil.`,
    '',
    '| Tema | Antall |',
    '| --- | ---: |',
    ...DILEMMA_GROUPS.map((g) => `| ${g.title} | ${g.dilemmas.length} |`),
    '',
    '### Slik leses lista',
    '',
    '- `{beboer}` og `{rom}` byttes ut med en av beboerne på avdelingen når lappen henges opp. `{han}`, `{hans}`, `{ham}`',
    '  og `{forelder}` følger beboerens kjønn (han/hun, hans/hennes, ham/henne, far/mor).',
    '- Linja under tittelen viser når dilemmaet kan dukke opp. Alle vilkår må være oppfylt samtidig.',
    '- Beløp i kroner og Fagpoeng er grunnverdier. De skaleres opp med avdelingsnivået i spillet.',
    '- Stress og energi gjelder enten de som er på vakt, eller hele staben.',
    '',
    '### Historiekjedene',
    '',
    ...Object.entries(DILEMMA_CHAINS).map(([id, chain]) => {
      const inChain = DILEMMAS.filter((d) => d.chain?.id === id)
      // Et steg kan ha flere varianter: hvilken som kommer, avhenger av valget på steget før.
      const steps = [1, 2, 3]
        .map((step) => inChain.filter((d) => d.chain!.step === step))
        .filter((variants) => variants.length > 0)
        .map((variants, i) => `${i + 1}. ${variants.map((d) => d.title).join(' eller ')}`)
      return `- **${chain.title}** (${chain.steps} steg): ${steps.join(' → ')}`
    }),
  ]
  for (const group of DILEMMA_GROUPS) {
    out.push('', `## ${group.title} (${group.dilemmas.length})`)
    for (const d of group.dilemmas) out.push('', dilemmaText(d))
  }
  return out.join('\n') + '\n'
}

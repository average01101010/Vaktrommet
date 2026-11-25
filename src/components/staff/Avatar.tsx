import { HAIR_COLORS, HAIR_STYLE, SCARF_COLORS, SCRUBS, SKIN_TONES } from '@/components/ward/scene/palette'
import { PROFESSIONS } from '@/data/professions'
import type { Avatar as AvatarData, Profession } from '@/types'

/** Passfoto til ID-kortet – samme formspråk som figurene i avdelingsvisningen. */
export function Avatar({ avatar, profession, className }: { avatar: AvatarData; profession: Profession; className?: string }) {
  const skin = SKIN_TONES[avatar.skin % SKIN_TONES.length]
  const isHijab = avatar.hairStyle === HAIR_STYLE.hijab
  const hair = (isHijab ? SCARF_COLORS : HAIR_COLORS)[avatar.hair % HAIR_COLORS.length]
  const scrubs = SCRUBS[profession]
  const style = avatar.hairStyle

  return (
    <svg viewBox="0 0 64 72" className={className} aria-hidden="true">
      <rect width="64" height="72" fill={PROFESSIONS[profession].soft} />
      <circle cx="50" cy="12" r="22" fill="#fff" opacity="0.35" />

      {/* Hår bak */}
      {style === HAIR_STYLE.langt && <rect x="13" y="20" width="38" height="40" rx="14" fill={hair} />}
      {style === HAIR_STYLE.knute && <circle cx="32" cy="10" r="7.5" fill={hair} />}
      {isHijab && (
        <>
          <circle cx="32" cy="31" r="20.5" fill={hair} />
          <rect x="13" y="36" width="38" height="26" rx="12" fill={hair} />
        </>
      )}

      {/* Skuldre og arbeidstøy */}
      <path d="M6 72c0-13 9-19 26-19s26 6 26 19z" fill={scrubs.top} />
      <path d="M25 53.5 32 63l7-9.5z" fill={skin} />
      <path d="M25 53.5 32 63l7-9.5" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.2" />
      {/* Nøkkelbånd */}
      <path d="M22 55l8 14M42 55l-8 14" stroke="#D97736" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* Hals og hode */}
      <rect x="27" y="42" width="10" height="12" rx="4" fill={skin} />
      <rect x="27" y="46" width="10" height="5" fill="rgba(0,0,0,0.10)" />
      <circle cx="32" cy="31" r={isHijab ? 15.5 : 16.5} fill={skin} />

      {/* Hår foran */}
      {isHijab ? (
        <path d="M17 27a15.5 15.5 0 0 1 30 0c-5-5-10-6.5-15-6.5S22 22 17 27z" fill={hair} />
      ) : style === HAIR_STYLE.tynt ? (
        <>
          <circle cx="16.5" cy="30" r="4.5" fill={hair} />
          <circle cx="47.5" cy="30" r="4.5" fill={hair} />
        </>
      ) : (
        <>
          <path
            d={
              style === HAIR_STYLE.sideskill
                ? 'M14.5 31C14 19 22 13 32 13s18 6 17.5 18c-3-6-8-9.5-14-10-6 5-13 5.5-21 10z'
                : 'M14.5 31C14 19 22 13 32 13s18 6 17.5 18c-4-6-9-8.5-17.5-8.5S18.5 25 14.5 31z'
            }
            fill={hair}
          />
          {style === HAIR_STYLE.krollet &&
            [16, 21, 27, 33, 39, 45, 49].map((cx, i) => (
              <circle key={cx} cx={cx} cy={i === 0 || i === 6 ? 26 : i === 1 || i === 5 ? 19 : 15.5} r="5.5" fill={hair} />
            ))}
          {style === HAIR_STYLE.langt && (
            <>
              <rect x="13" y="27" width="6" height="24" rx="3" fill={hair} />
              <rect x="45" y="27" width="6" height="24" rx="3" fill={hair} />
            </>
          )}
        </>
      )}

      {/* Ansikt */}
      <circle cx="26" cy="33" r="1.9" fill="#1C2526" />
      <circle cx="38" cy="33" r="1.9" fill="#1C2526" />
      <circle cx="22.5" cy="38" r="3" fill="#D97736" opacity="0.25" />
      <circle cx="41.5" cy="38" r="3" fill="#D97736" opacity="0.25" />
      <path d="M27.5 39.5c2.5 3 6.5 3 9 0" stroke="#1C2526" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      {avatar.accessory === 1 && (
        <g fill="none" stroke="#1C2526" strokeWidth="1.4" opacity="0.8">
          <circle cx="26" cy="33" r="4.6" />
          <circle cx="38" cy="33" r="4.6" />
          <path d="M30.6 33h2.8" />
        </g>
      )}
      {avatar.accessory === 2 && !isHijab && (
        <>
          <circle cx="15.5" cy="38" r="1.6" fill="#E9C46A" />
          <circle cx="48.5" cy="38" r="1.6" fill="#E9C46A" />
        </>
      )}
    </svg>
  )
}

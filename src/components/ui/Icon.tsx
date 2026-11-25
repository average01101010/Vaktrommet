import type { SVGProps } from 'react'

/** Lite, konsistent ikonsett (24×24, strek). */
const PATHS = {
  avdeling: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M9.5 19.5v-5h5v5',
  turnus: 'M4 6.5h16v13H4zM4 10.5h16M8.5 4v4M15.5 4v4M8 14h2.5M13.5 14H16M8 17h2.5',
  utstyr: 'M14.5 5.5a4 4 0 0 0-5.2 5.2L4 16l4 4 5.3-5.3a4 4 0 0 0 5.2-5.2l-2.7 2.7-2.5-.5-.5-2.5z',
  tilsyn: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z',
  kaffe: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1.2 1 1.3 1 2.5M12 3.5c0 1.2 1 1.3 1 2.5',
  kr: 'M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5',
  fag: 'M3 9.5 12 5l9 4.5-9 4.5zM7 12v4.5c1.5 1.5 3.2 2 5 2s3.5-.5 5-2V12M21 9.5v5',
  hjerte: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
  avvik: 'M12 4 21 19.5H3zM12 10v4.5M12 17v.3',
  puls: 'M3 12.5h4l2-5 3.5 10 2.5-7 1.5 2H21',
  batteri: 'M3.5 8h14v8h-14zM17.5 10.5H20v3h-2.5M6.5 10.5v3M9.5 10.5v3',
  pluss: 'M12 5v14M5 12h14',
  kryss: 'M6 6l12 12M18 6 6 18',
  las: 'M6.5 10.5h11V19h-11zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5',
  hake: 'M5 12.5l4.5 4.5L19 7.5',
  klokke: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4.5l3 2',
  spill: 'M8 5.5v13l11-6.5z',
  stjerner: 'M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6zM17.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z',
  pil: 'M9 6l6 6-6 6',
  ned: 'M6 9l6 6 6-6',
  folk: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19c.5-3 2.7-5 5.5-5s5 2 5.5 5M16 11.5a2.6 2.6 0 1 0-.8-5M17 14.3c2 .5 3.2 2.2 3.5 4.7',
  sol: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  kveld: 'M4 17h16M7 20h10M6.5 14a5.5 5.5 0 0 1 11 0M12 5v2.5M5 8l1.6 1.6M19 8l-1.6 1.6',
  mane: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
  tavle: 'M4 5h16v12H4zM9 20l3-3 3 3M8 9h8M8 12.5h5',
  kurs: 'M5 5h11a3 3 0 0 1 3 3v11H8a3 3 0 0 1-3-3zM5 16a3 3 0 0 1 3-3h11M9 8.5h6',
  butikk: 'M5 9h14l-1 10.5H6zM9 9V7a3 3 0 0 1 6 0v2',
  pass: 'M5 5h14v14l-7-3.5L5 19zM9 9.5h6M9 12.5h4',
  pokal: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7',
  info: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 11v5M12 8v.3',
  lyn: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  bytt: 'M5 8h12l-3-3M19 16H7l3 3',
  soppel: 'M5 7h14M9.5 7V5h5v2M7 7l.8 12.5h8.4L17 7M10.5 10.5v6M13.5 10.5v6',
  flytt: 'M9 5.5h.01M15 5.5h.01M9 12h.01M15 12h.01M9 18.5h.01M15 18.5h.01',
  mal: 'M6 4h9l3 3v13H6zM9 12h6M9 15.5h6M9 8.5h3',
  tryllestav: 'M5 19 15.5 8.5M14 7l3 3M17.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6zM7 5l.5 1 1 .5-1 .5L7 8l-.5-1-1-.5 1-.5z',
} as const

export type IconName = keyof typeof PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  filled?: boolean
}

export function Icon({ name, size = 20, filled = false, strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

// Syr produksjonsbygget sammen til én HTML-side med alt innebygd (CSS, JS, fonter).
// Bruk: npm run build:artifact -- <utfil.html>
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'

const out = process.argv[2] ?? 'dist-artifact/vaktrommet.html'
const assets = 'dist-artifact/assets'
const files = readdirSync(assets)
const read = (ext) => readFileSync(join(assets, files.find((f) => f.endsWith(ext))), 'utf8')

// Behold bare latinske fontutsnitt og bygg dem inn som data-URI-er.
const css = read('.css').replace(/@font-face\s*\{[^}]*\}/g, (block) => {
  if (/cyrillic|greek|vietnamese/.test(block)) return ''
  return block.replace(/url\(([^)]+\.woff2)\)/g, (_, url) => {
    const file = join(assets, basename(url.replace(/["']/g, '')))
    return `url(data:font/woff2;base64,${readFileSync(file).toString('base64')})`
  })
})
if (/url\((?!data:)[^)]*\)/.test(css)) throw new Error('CSS-en peker fortsatt på eksterne filer')

const js = read('.js').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')

// Tilpasninger for innebygd visning: siden får topp-/bunnmarg fra verten.
const hostCss = `
.toppfelt{top:env(safe-area-inset-top,0px);padding-top:0}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:45;background:#1e4d40}
`

const html = `<title>Vaktrommet</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#1E4D40">
<style>${css}${hostCss}</style>
<div id="root"></div>
<script>${js}</script>
`
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log(`${out}: ${(html.length / 1024).toFixed(0)} kB`)

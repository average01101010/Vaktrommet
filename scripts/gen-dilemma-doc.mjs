// Skriver docs/dilemma-gjennomgang.md fra dilemmabanken i src/data/dilemmas/.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const server = await createServer({
  root,
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
})
try {
  const { renderDilemmaDoc } = await server.ssrLoadModule('/src/data/dilemmas/doc.ts')
  const text = renderDilemmaDoc()
  mkdirSync(new URL('../docs', import.meta.url), { recursive: true })
  writeFileSync(new URL('../docs/dilemma-gjennomgang.md', import.meta.url), text)
  console.log(`docs/dilemma-gjennomgang.md: ${text.split('\n').length} linjer`)
} finally {
  await server.close()
}

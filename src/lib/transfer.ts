/** Kopierer tekst til utklippstavla. Returnerer false hvis nettleseren nekter. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Starter nedlasting av en tekstfil. Noen innebygde visninger blokkerer
 * nedlastinger uten å si fra – tilby derfor alltid kopiering ved siden av.
 */
export function downloadText(filename: string, text: string): void {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    // Kopiering er reserveløsningen.
  }
}

export const fileSizeText = (chars: number): string =>
  chars < 1024 ? `${chars} B` : chars < 1_048_576 ? `${Math.round(chars / 1024)} kB` : `${(chars / 1_048_576).toFixed(1).replace('.', ',')} MB`

export const readFileText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })

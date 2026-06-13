export type ComuneRecord = {
  n: string
  p: string
  c: string
  t: 'comune' | 'stato'
}

export type CalcolaCodiceFiscaleInput = {
  cognome: string
  nome: string
  sesso: 'M' | 'F'
  dataNascita: Date
  codiceCatastale: string
}

const MONTH_CODES = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T'] as const

const ODD_MAP: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
}

const EVEN_MAP: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12,
  N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
}

let comuniCache: ComuneRecord[] | null = null
let comuniLoadPromise: Promise<ComuneRecord[]> | null = null

/** Caricamento lazy del dataset comuni/stati (solo al primo utilizzo). */
export async function loadComuniDataset(): Promise<ComuneRecord[]> {
  if (comuniCache) return comuniCache
  if (!comuniLoadPromise) {
    comuniLoadPromise = import('../data/comuni.json').then(mod => {
      comuniCache = mod.default as ComuneRecord[]
      return comuniCache
    })
  }
  return comuniLoadPromise
}

function onlyLetters(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, '')
}

function isConsonant(ch: string): boolean {
  return /^[BCDFGHJKLMNPQRSTVWXYZ]$/.test(ch)
}

function codeFromSurname(surname: string): string {
  const s = onlyLetters(surname)
  const consonants = [...s].filter(isConsonant)
  const vowels = [...s].filter(ch => /^[AEIOU]$/.test(ch))
  const code = [...consonants, ...vowels, 'X', 'X', 'X'].join('').slice(0, 3)
  return code
}

function codeFromName(name: string): string {
  const s = onlyLetters(name)
  const consonants = [...s].filter(isConsonant)
  const vowels = [...s].filter(ch => /^[AEIOU]$/.test(ch))

  let code: string
  if (consonants.length >= 4) {
    code = consonants[0] + consonants[2] + consonants[3]
  } else {
    code = [...consonants, ...vowels, 'X', 'X', 'X'].join('').slice(0, 3)
  }
  return code
}

function checkChar(partial: string): string {
  let sum = 0
  for (let i = 0; i < partial.length; i++) {
    const ch = partial[i]
    sum += i % 2 === 0 ? (ODD_MAP[ch] ?? 0) : (EVEN_MAP[ch] ?? 0)
  }
  return String.fromCharCode(65 + (sum % 26))
}

export function calcolaCodiceFiscale(input: CalcolaCodiceFiscaleInput): string {
  const cognome = codeFromSurname(input.cognome)
  const nome = codeFromName(input.nome)
  const year = String(input.dataNascita.getFullYear() % 100).padStart(2, '0')
  const month = MONTH_CODES[input.dataNascita.getMonth()]
  let day = input.dataNascita.getDate()
  if (input.sesso === 'F') day += 40
  const dayStr = String(day).padStart(2, '0')
  const comune = input.codiceCatastale.toUpperCase().padStart(4, 'X').slice(0, 4)
  const partial = `${cognome}${nome}${year}${month}${dayStr}${comune}`
  return `${partial}${checkChar(partial)}`
}

const CF_REGEX = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i

export function validaCodiceFiscale(cf: string): boolean {
  const normalized = cf.trim().toUpperCase()
  if (normalized.length !== 16 || !CF_REGEX.test(normalized)) return false
  const body = normalized.slice(0, 15)
  const expected = checkChar(body)
  return expected === normalized[15]
}

export async function searchComuni(query: string, limit = 50): Promise<ComuneRecord[]> {
  const data = await loadComuniDataset()
  const q = query.trim().toLowerCase()
  if (!q) return data.slice(0, limit)
  const results: ComuneRecord[] = []
  for (const item of data) {
    const label = item.t === 'stato' ? item.n : `${item.n} (${item.p})`
    if (item.n.toLowerCase().includes(q) || label.toLowerCase().includes(q)) {
      results.push(item)
      if (results.length >= limit) break
    }
  }
  return results
}

export function formatComuneLabel(item: ComuneRecord): string {
  return item.t === 'stato' ? `${item.n} (stato estero)` : `${item.n} (${item.p})`
}

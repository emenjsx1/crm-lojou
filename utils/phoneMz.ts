/**
 * Telefones Moçambique / Lojou — normalização e match
 * - API Lojou: muitas vezes 9 dígitos (8XXXXXXXX) sem +258
 * - WhatsApp / Evolution: 258XXXXXXXXX, JID, espaços, ou erros tipo "58..." sem o "2"
 */

/** Só dígitos (remove letras tipo "258BNX" → 258) */
export function digitsOnly(raw: string | null | undefined): string {
  return String(raw ?? '').replace(/\D/g, '')
}

/**
 * Chave única para comparar com phone_number da Lojou (9 dígitos nacionais, ex. 855253617).
 */
export function normalizeLojouPhoneKey(raw: string | null | undefined): string {
  let d = digitsOnly(raw)
  if (!d) return ''

  while (d.startsWith('00')) d = d.slice(2)

  // Remove prefixo país 258 enquanto sobrarem mais de 9 dígitos (permite 258258… duplicado)
  while (d.startsWith('258') && d.length > 9) d = d.slice(3)

  // Falta o "2" do +258 (ex.: 58855253611 → 258855253611)
  if (d.length === 11 && d.startsWith('58') && d[2] === '8') {
    d = '2' + d
    while (d.startsWith('258') && d.length > 9) d = d.slice(3)
  }

  // Zero inicial nacional opcional (084…)
  if (d.length === 10 && d.startsWith('0') && d[1] === '8') d = d.slice(1)

  if (d.length === 9 && d.startsWith('8')) return d

  // Reforço: 12 dígitos 258 + 9
  if (d.length === 12 && d.startsWith('258') && d[3] === '8') return d.slice(3)

  return d
}

/** Mesma chave que normalizeLojouPhoneKey (alias histórico server/contacts) */
export const normalizePhone = normalizeLojouPhoneKey

/** Termos para pesquisar na API admin (vários formatos) */
export function collectLojouPhoneSearchTerms(raw: string | null | undefined): string[] {
  const d = digitsOnly(raw)
  const local = normalizeLojouPhoneKey(raw)
  const terms: string[] = []
  const add = (t: string) => {
    const x = String(t).trim()
    if (x.length >= 7 && !terms.includes(x)) terms.push(x)
  }
  if (d) add(d)
  if (local) {
    add(local)
    if (local.length === 9 && local.startsWith('8')) add(`258${local}`)
  }
  // últimos 9 dígitos (útil se vier lixo à frente/trás)
  if (d.length > 9) {
    const tail = d.slice(-9)
    if (tail.startsWith('8')) add(tail)
  }
  return terms
}

/** Match entre número WhatsApp e número perfil Lojou */
export function phonesMatchLoJou(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = normalizeLojouPhoneKey(a)
  const kb = normalizeLojouPhoneKey(b)
  if (ka && kb && ka === kb) return true
  const da = digitsOnly(a)
  const db = digitsOnly(b)
  if (da.length >= 9 && db.length >= 9) {
    const ta = da.slice(-9)
    const tb = db.slice(-9)
    if (ta.startsWith('8') && tb.startsWith('8') && ta === tb) return true
  }
  return false
}

export type Locale = 'ar' | 'en'

/** Pick `${base}Ar`/`${base}En` for the active locale, falling back to the other. */
export function pickLocale(row: Record<string, any>, base: string, locale: Locale): string {
  const ar = row[`${base}Ar`]
  const en = row[`${base}En`]
  const primary = locale === 'ar' ? ar : en
  const fallback = locale === 'ar' ? en : ar
  return (primary || fallback || '') as string
}

/** Attach resolved localized fields (e.g. `title`, `synopsis`) to a row. */
export function withLocale<T extends Record<string, any>>(row: T, bases: string[], locale: Locale) {
  const out: Record<string, any> = { ...row }
  for (const base of bases) out[base] = pickLocale(row, base, locale)
  return out as T & Record<string, string>
}

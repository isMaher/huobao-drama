import { describe, it, expect } from 'vitest'
import { pickLocale } from '../src/utils/localized.js'

describe('pickLocale', () => {
  const row = { titleAr: 'باب الحارة', titleEn: 'Bab al-Hara' }
  it('picks active locale', () => {
    expect(pickLocale(row, 'title', 'ar')).toBe('باب الحارة')
    expect(pickLocale(row, 'title', 'en')).toBe('Bab al-Hara')
  })
  it('falls back to the other locale', () => {
    expect(pickLocale({ titleAr: 'باب الحارة', titleEn: '' }, 'title', 'en')).toBe('باب الحارة')
  })
})

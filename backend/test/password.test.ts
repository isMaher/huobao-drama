import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../src/utils/password.js'

describe('password', () => {
  it('hashes and verifies', async () => {
    const h = await hashPassword('s3cret!')
    expect(h).not.toBe('s3cret!')
    expect(await verifyPassword(h, 's3cret!')).toBe(true)
    expect(await verifyPassword(h, 'wrong')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import {
  groupKeyIdentitySignature,
  parseGroupKeyParts
} from '@domain/services/groupKeyIdentity'

describe('groupKeyIdentity', () => {
  it('parses standard group keys', () => {
    const parsed = parseGroupKeyParts(
      'group|region=seoul|year=2026|month=04|day=00|slot=1'
    )

    expect(parsed).toMatchObject({
      region: 'seoul',
      year: '2026',
      month: '04',
      day: '00',
      slot: '1'
    })
  })

  it('treats legacy day and monthly day=00 as the same identity', () => {
    const a = 'group|region=seoul|year=2026|month=04|day=03|slot=1'
    const b = 'group|region=seoul|year=2026|month=04|day=00|slot=1'

    expect(groupKeyIdentitySignature(a)).toBe(groupKeyIdentitySignature(b))
  })
})

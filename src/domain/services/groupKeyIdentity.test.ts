import { describe, expect, it } from 'vitest'

import {
  groupKeyIdentitySignature,
  parseGroupKeyParts
} from '@domain/services/groupKeyIdentity'

describe('groupKeyIdentity', () => {
  it('parses standard group keys', () => {
    const parsed = parseGroupKeyParts(
      'group|region=seoul|year=2026|month=04|basis=month|day=00|slot=1'
    )

    expect(parsed).toMatchObject({
      region: 'seoul',
      year: '2026',
      month: '04',
      basis: 'month',
      day: '00',
      slot: '1'
    })
  })

  it('treats legacy day and monthly day=00 as the same identity', () => {
    const a = 'group|region=seoul|year=2026|month=04|day=03|slot=1'
    const b = 'group|region=seoul|year=2026|month=04|basis=month|day=00|slot=1'

    expect(groupKeyIdentitySignature(a)).toBe(groupKeyIdentitySignature(b))
  })

  it('keeps weekly and daily identities distinct within the same month', () => {
    const week = 'group|region=base|year=2026|month=04|basis=week|day=week1|slot=1'
    const day = 'group|region=base|year=2026|month=04|basis=day|day=03|slot=1'

    expect(groupKeyIdentitySignature(week)).not.toBe(groupKeyIdentitySignature(day))
  })
})

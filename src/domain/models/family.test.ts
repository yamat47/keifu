import { describe, expect, it } from 'vitest'

import { familySchema } from './family'

const couple = {
  id: 1,
  partner1Id: 1,
  partner2Id: 2,
} as const

describe('familySchema', () => {
  it('partner が2人揃っていれば通る', () => {
    expect(familySchema.safeParse(couple).success).toBe(true)
  })

  it('片親のみ判明の family は partner2Id が null でよい', () => {
    expect(familySchema.safeParse({ ...couple, partner2Id: null }).success).toBe(true)
  })

  it('partner が1人もいない family は弾く', () => {
    const result = familySchema.safeParse({ ...couple, partner1Id: null, partner2Id: null })

    expect(result.success).toBe(false)
  })

  it('同一人物を両方の partner にすることは弾く', () => {
    expect(familySchema.safeParse({ ...couple, partner2Id: 1 }).success).toBe(false)
  })

  it('省略した種別は婚姻とみなす', () => {
    expect(familySchema.parse(couple).kind).toBe('marriage')
  })

  it('婚姻関係にない親グループを表せる', () => {
    expect(familySchema.safeParse({ ...couple, kind: 'unmarried' }).success).toBe(true)
  })

  it('marriage と unmarried 以外の種別は弾く', () => {
    expect(familySchema.safeParse({ ...couple, kind: 'divorced' }).success).toBe(false)
  })

  it('婚姻順序を省略すると partner の双方が初婚になる', () => {
    const result = familySchema.parse(couple)

    expect(result).toMatchObject({ partner1Order: 1, partner2Order: 1 })
  })

  it('婚姻順序は partner ごとに別々の値を取れる', () => {
    const result = familySchema.parse({ ...couple, partner1Order: 2, partner2Order: 1 })

    expect(result).toMatchObject({ partner1Order: 2, partner2Order: 1 })
  })

  it('婚姻順序が 0 以下なら弾く', () => {
    expect(familySchema.safeParse({ ...couple, partner1Order: 0 }).success).toBe(false)
  })
})

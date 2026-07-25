import { describe, expect, it } from 'vitest'

import { genealogySchema } from './genealogy'

describe('genealogySchema', () => {
  it('人物・family・子の3つが揃った家系を受け取る', () => {
    const result = genealogySchema.safeParse({
      persons: [
        { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
        { id: 2, familyName: '桐生', givenName: '志乃', sex: 'f' },
        { id: 3, familyName: '桐生', givenName: '春彦', sex: 'm' },
      ],
      families: [{ id: 1, partner1Id: 1, partner2Id: 2 }],
      familyChildren: [{ familyId: 1, childId: 3 }],
    })

    expect(result.success).toBe(true)
  })

  it('誰もいない家系も受け取る', () => {
    const result = genealogySchema.parse({
      persons: [],
      families: [],
      familyChildren: [],
    })

    expect(result).toEqual({ persons: [], families: [], familyChildren: [] })
  })

  it('一部の人物が不正なら家系ごと弾く', () => {
    const result = genealogySchema.safeParse({
      persons: [{ id: 1, familyName: '桐生', givenName: '' }],
      families: [],
      familyChildren: [],
    })

    expect(result.success).toBe(false)
  })
})

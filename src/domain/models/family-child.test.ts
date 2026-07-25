import { describe, expect, it } from 'vitest'

import { familyChildSchema } from './family-child'

const child = {
  familyId: 1,
  childId: 3,
} as const

describe('familyChildSchema', () => {
  it('family と子の対応があれば通る', () => {
    expect(familyChildSchema.safeParse(child).success).toBe(true)
  })

  it('省略した続柄の種別は実子とみなす', () => {
    expect(familyChildSchema.parse(child).relationType).toBe('biological')
  })

  it('養子縁組による親子関係を表せる', () => {
    expect(familyChildSchema.safeParse({ ...child, relationType: 'adopted' }).success).toBe(true)
  })

  it('biological と adopted 以外の種別は弾く', () => {
    expect(familyChildSchema.safeParse({ ...child, relationType: 'step' }).success).toBe(false)
  })

  it('省略した兄弟順は 0 になる', () => {
    expect(familyChildSchema.parse(child).siblingOrder).toBe(0)
  })

  it('兄弟順が負なら弾く', () => {
    expect(familyChildSchema.safeParse({ ...child, siblingOrder: -1 }).success).toBe(false)
  })

  it('兄弟順が整数でなければ弾く', () => {
    expect(familyChildSchema.safeParse({ ...child, siblingOrder: 1.5 }).success).toBe(false)
  })
})

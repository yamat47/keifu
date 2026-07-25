import { describe, expect, it } from 'vitest'

import { personSchema } from './person'

const 宗一郎 = {
  id: 1,
  familyName: '桐生',
  givenName: '宗一郎',
} as const

describe('personSchema', () => {
  it('氏名だけあれば通る。それ以外は任意', () => {
    expect(personSchema.safeParse(宗一郎).success).toBe(true)
  })

  it('氏が空文字なら弾く', () => {
    expect(personSchema.safeParse({ ...宗一郎, familyName: '' }).success).toBe(false)
  })

  it('名が空文字なら弾く', () => {
    expect(personSchema.safeParse({ ...宗一郎, givenName: '' }).success).toBe(false)
  })

  it('氏名の前後の空白は落とす', () => {
    const result = personSchema.parse({ ...宗一郎, familyName: ' 桐生 ' })

    expect(result.familyName).toBe('桐生')
  })

  it('空白だけの氏は弾く', () => {
    expect(personSchema.safeParse({ ...宗一郎, familyName: '　' }).success).toBe(false)
  })

  it('省略した任意項目は null になる', () => {
    const result = personSchema.parse(宗一郎)

    expect(result).toMatchObject({
      kana: null,
      sex: null,
      birthYear: null,
      deathYear: null,
      note: null,
      generationOverride: null,
    })
  })

  it('性別は m と f を受け付ける', () => {
    expect(personSchema.safeParse({ ...宗一郎, sex: 'm' }).success).toBe(true)
    expect(personSchema.safeParse({ ...宗一郎, sex: 'f' }).success).toBe(true)
  })

  it('性別が不明なら null を許す', () => {
    expect(personSchema.safeParse({ ...宗一郎, sex: null }).success).toBe(true)
  })

  it('m と f 以外の性別は弾く', () => {
    expect(personSchema.safeParse({ ...宗一郎, sex: 'x' }).success).toBe(false)
  })

  it('生年が没年より後なら弾く', () => {
    const result = personSchema.safeParse({ ...宗一郎, birthYear: 1900, deathYear: 1899 })

    expect(result.success).toBe(false)
  })

  it('同じ年に生まれて没した人物は許す', () => {
    const result = personSchema.safeParse({ ...宗一郎, birthYear: 1900, deathYear: 1900 })

    expect(result.success).toBe(true)
  })

  it('生没年は整数でなければ弾く', () => {
    expect(personSchema.safeParse({ ...宗一郎, birthYear: 1900.5 }).success).toBe(false)
  })

  it('世代の手動指定は 0 以上の整数', () => {
    expect(personSchema.safeParse({ ...宗一郎, generationOverride: 0 }).success).toBe(true)
    expect(personSchema.safeParse({ ...宗一郎, generationOverride: -1 }).success).toBe(false)
  })

  it('id は 1 以上の整数', () => {
    expect(personSchema.safeParse({ ...宗一郎, id: 0 }).success).toBe(false)
  })
})

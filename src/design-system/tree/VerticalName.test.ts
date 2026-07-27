import { describe, expect, it } from 'vitest'

import { charAdvance } from './VerticalName'

describe('字送りの計算', () => {
  it('持ち分に収まる名前は、字送りが文字の大きさと同じになる', () => {
    expect(charAdvance({ length: 3, fontSize: 16, maxHeight: 100 })).toBe(16)
  })

  it('持ち分に収まらない名前は、字送りを詰めて持ち分ちょうどに収める', () => {
    // 6文字を 16px で並べると 96px 要るので、60px には収まらない
    expect(charAdvance({ length: 6, fontSize: 16, maxHeight: 60 })).toBe((60 - 16) / 5)
  })

  it('1文字の名前は、字送りが要らないので文字の大きさをそのまま返す', () => {
    expect(charAdvance({ length: 1, fontSize: 16, maxHeight: 4 })).toBe(16)
  })

  it('文字1つも入らない持ち分でも、字送りが負にならない', () => {
    expect(charAdvance({ length: 4, fontSize: 16, maxHeight: 8 })).toBe(0)
  })
})

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { tokens } from './tokens'

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf-8')

/** `--name: value;` の左辺だけを拾う。値の中の var(--other) は colon が続かないので混ざらない */
const definedNames = css.match(/--[\w-]+(?=\s*:)/g) ?? []

const referencedNames = Object.values(tokens)
  .flatMap((group) => Object.values(group))
  .flatMap((value) => /^var\((--[\w-]+)\)$/.exec(value)?.[1] ?? [])

describe('デザイントークン', () => {
  it('トークンは CSS 変数の参照として得られる', () => {
    expect(tokens.color.ink).toBe('var(--color-ink)')
  })

  it('参照している CSS 変数は tokens.css に定義されている', () => {
    expect(definedNames).toEqual(expect.arrayContaining(referencedNames))
  })

  it('tokens.css の定義に、TS から参照できないものは無い', () => {
    expect(referencedNames).toEqual(expect.arrayContaining(definedNames))
  })
})

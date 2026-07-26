import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const nodeRequire = createRequire(import.meta.url)

const read = (path: string) => readFileSync(path, 'utf-8')
const readSibling = (name: string) => read(fileURLToPath(new URL(name, import.meta.url)))

/** 1つ目のキャプチャを全て集める。flatMap なのはマッチの無い分を型ごと落とすため */
const captures = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].flatMap((match) => match[1] ?? [])

/** `--font-*` が第一候補に挙げている書体名。後ろに続く serif / sans-serif は引用符が無いので混ざらない */
const namedFamilies = captures(readSibling('tokens.css'), /--font-[\w-]+:\s*'([^']+)'/g)

/**
 * ビルドせずに CSS を読んで確かめている。書体が実際に効いているかは目で見るしかないが、
 * 「名前があるのに実体が無い」は文字列の照合で捕まえられる。
 */
const loadedFamilies = [
  ...new Set(
    captures(readSibling('fonts.css'), /@import\s+'([^']+)'/g)
      .map((specifier) => read(nodeRequire.resolve(specifier)))
      .flatMap((css) => captures(css, /font-family:\s*'([^']+)'/g)),
  ),
]

describe('書体の読み込み', () => {
  it('人名の書体はトークンから名指されている', () => {
    expect(namedFamilies).toContain('Shippori Mincho')
  })

  it('トークンが名指す書体には @font-face が読み込まれている', () => {
    expect(loadedFamilies).toEqual(expect.arrayContaining(namedFamilies))
  })

  it('読み込んだ @font-face に、トークンから名指されないものは無い', () => {
    expect(namedFamilies).toEqual(expect.arrayContaining(loadedFamilies))
  })
})

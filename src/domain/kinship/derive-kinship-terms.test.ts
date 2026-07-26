import { describe, expect, it } from 'vitest'

import { unknownChildGenealogy } from '../../fixtures/invalid-genealogies'
import { sampleGenealogy } from '../../fixtures/sample-genealogy'
import { genealogySchema, type FamilyChild, type Person } from '../models'

import { deriveKinshipTerms } from './derive-kinship-terms'

/**
 * 1人の親の family 1 に、渡した子をその順で属させた家系を作る。
 * 子の id は 2 から振られ、`siblingOrder` は渡した順になる。
 */
const familyWithChildren = (
  ...children: { sex: Person['sex']; relationType?: FamilyChild['relationType'] }[]
) =>
  genealogySchema.parse({
    persons: [
      { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
      ...children.map(({ sex }, index) => ({
        id: index + 2,
        familyName: '桐生',
        givenName: `子${index + 1}`,
        sex,
      })),
    ],
    families: [{ id: 1, partner1Id: 1, partner2Id: null }],
    familyChildren: children.map(({ relationType }, index) => ({
      familyId: 1,
      childId: index + 2,
      relationType: relationType ?? 'biological',
      siblingOrder: index,
    })),
  })

describe('deriveKinshipTerms', () => {
  it('実子の男は、兄弟順に 長男 / 二男 / 三男 と採番される', () => {
    const terms = deriveKinshipTerms(familyWithChildren({ sex: 'm' }, { sex: 'm' }, { sex: 'm' }))

    expect(terms.get(1)?.get(2)).toBe('長男')
    expect(terms.get(1)?.get(3)).toBe('二男')
    expect(terms.get(1)?.get(4)).toBe('三男')
  })

  it('実子の女は 長女 / 二女 と採番され、男の番号とは独立する', () => {
    const terms = deriveKinshipTerms(familyWithChildren({ sex: 'f' }, { sex: 'm' }, { sex: 'f' }))

    expect(terms.get(1)?.get(2)).toBe('長女')
    expect(terms.get(1)?.get(3)).toBe('長男')
    expect(terms.get(1)?.get(4)).toBe('二女')
  })

  it('性別が判読できない実子は、番号を持たず「子」になる。男女の採番も進めない', () => {
    const terms = deriveKinshipTerms(familyWithChildren({ sex: 'm' }, { sex: null }, { sex: 'm' }))

    expect(terms.get(1)?.get(3)).toBe('子')
    expect(terms.get(1)?.get(4)).toBe('二男')
  })

  it('養子は番号を持たず、男なら養子・女なら養女・性別が判読できなければ養子になる', () => {
    const terms = deriveKinshipTerms(
      familyWithChildren(
        { sex: 'm', relationType: 'adopted' },
        { sex: 'f', relationType: 'adopted' },
        { sex: null, relationType: 'adopted' },
      ),
    )

    expect(terms.get(1)?.get(2)).toBe('養子')
    expect(terms.get(1)?.get(3)).toBe('養女')
    expect(terms.get(1)?.get(4)).toBe('養子')
  })

  it('養子は、同じ family の実子の採番を進めない', () => {
    const terms = deriveKinshipTerms(
      familyWithChildren({ sex: 'm' }, { sex: 'm', relationType: 'adopted' }, { sex: 'm' }),
    )

    expect(terms.get(1)?.get(4)).toBe('二男')
  })

  it('兄弟が10人を超えても、十男 / 十一男 と採番が続く', () => {
    const terms = deriveKinshipTerms(
      familyWithChildren(...Array.from({ length: 11 }, () => ({ sex: 'm' as const }))),
    )

    expect(terms.get(1)?.get(10)).toBe('九男')
    expect(terms.get(1)?.get(11)).toBe('十男')
    expect(terms.get(1)?.get(12)).toBe('十一男')
  })

  it('複数の family に属する人物は、family ごとに異なる続柄を持つ', () => {
    const terms = deriveKinshipTerms(sampleGenealogy)

    // 12（奥平 実）は宗一郎の family 1 の養子であり、実親 family 4 の長男
    expect(terms.get(1)?.get(12)).toBe('養子')
    expect(terms.get(4)?.get(12)).toBe('長男')
  })

  it('兄弟順が同値のときは、childId の昇順に採番する', () => {
    const genealogy = genealogySchema.parse({
      persons: [
        { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
        { id: 2, familyName: '桐生', givenName: '春彦', sex: 'm' },
        { id: 3, familyName: '桐生', givenName: '夏彦', sex: 'm' },
      ],
      families: [{ id: 1, partner1Id: 1, partner2Id: null }],
      // 兄弟順を入れていない家系。並び順は入力の並びに依存してはいけない
      familyChildren: [
        { familyId: 1, childId: 3 },
        { familyId: 1, childId: 2 },
      ],
    })

    expect(deriveKinshipTerms(genealogy).get(1)?.get(2)).toBe('長男')
  })

  it('実在しない人物を子に指している family は、その子の続柄を持たない', () => {
    expect(deriveKinshipTerms(unknownChildGenealogy).get(1)?.has(99)).toBe(false)
  })
})

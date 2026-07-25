import { describe, expect, it } from 'vitest'

import {
  ancestorLoopGenealogy,
  selfParentGenealogy,
  unknownChildGenealogy,
  unknownFamilyGenealogy,
  unknownPartnerGenealogy,
} from '../../fixtures/invalid-genealogies'
import { sampleGenealogy } from '../../fixtures/sample-genealogy'
import { genealogySchema } from '../models'

import { validateGenealogyGraph } from './validate-genealogy-graph'

/** 1〜3 が血縁で循環している。祖先ループの検出に使う */
const threeGenerationLoop = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '春彦', sex: 'm' },
    { id: 3, familyName: '桐生', givenName: '光一', sex: 'm' },
  ],
  families: [
    { id: 1, partner1Id: 1, partner2Id: null },
    { id: 2, partner1Id: 2, partner2Id: null },
    { id: 3, partner1Id: 3, partner2Id: null },
  ],
  familyChildren: [
    { familyId: 1, childId: 2 },
    { familyId: 2, childId: 3 },
    { familyId: 3, childId: 1 },
  ],
})

// fixtures は1件につき1種類の違反だけを含む。toContainEqual で緩めると
// 余計な違反が出ていても気づけず、fixtures の前提が崩れたまま通ってしまう
describe('validateGenealogyGraph', () => {
  it('family の partner が収録されていない人物を指していたら違反になる', () => {
    const violations = validateGenealogyGraph(unknownPartnerGenealogy)

    expect(violations).toEqual([{ kind: 'unknownPartner', familyId: 1, personId: 99 }])
  })

  it('子が収録されていない family に属していたら違反になる', () => {
    const violations = validateGenealogyGraph(unknownFamilyGenealogy)

    expect(violations).toEqual([{ kind: 'unknownFamily', familyId: 99, childId: 2 }])
  })

  it('収録されていない人物が子として登録されていたら違反になる', () => {
    const violations = validateGenealogyGraph(unknownChildGenealogy)

    expect(violations).toEqual([{ kind: 'unknownChild', familyId: 1, childId: 99 }])
  })

  it('自分が partner である family の子になっていたら違反になる', () => {
    const violations = validateGenealogyGraph(selfParentGenealogy)

    expect(violations).toEqual([{ kind: 'selfParent', familyId: 1, personId: 1 }])
  })

  it('partner2 の側が子になっていても違反になる', () => {
    const genealogy = genealogySchema.parse({
      persons: [
        { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
        { id: 2, familyName: '桐生', givenName: '志乃', sex: 'f' },
      ],
      families: [{ id: 1, partner1Id: 1, partner2Id: 2 }],
      familyChildren: [{ familyId: 1, childId: 2 }],
    })

    const violations = validateGenealogyGraph(genealogy)

    expect(violations).toContainEqual({ kind: 'selfParent', familyId: 1, personId: 2 })
  })

  it('養子縁組であっても自分の子になることは違反になる', () => {
    const genealogy = genealogySchema.parse({
      persons: [{ id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' }],
      families: [{ id: 1, partner1Id: 1, partner2Id: null }],
      familyChildren: [{ familyId: 1, childId: 1, relationType: 'adopted' }],
    })

    const violations = validateGenealogyGraph(genealogy)

    expect(violations).toContainEqual({ kind: 'selfParent', familyId: 1, personId: 1 })
  })

  it('親子が互いの親になっている循環を検出する', () => {
    const violations = validateGenealogyGraph(ancestorLoopGenealogy)

    expect(violations).toEqual([{ kind: 'ancestorLoop', personIds: [1, 2] }])
  })

  it('3世代をまたぐ循環も検出する', () => {
    const violations = validateGenealogyGraph(threeGenerationLoop)

    expect(violations).toContainEqual({ kind: 'ancestorLoop', personIds: [1, 2, 3] })
  })

  it('同じ人物が2つの family の子であっても、循環がなければ違反にしない', () => {
    const genealogy = genealogySchema.parse({
      persons: [
        { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
        { id: 2, familyName: '桐生', givenName: '春彦', sex: 'm' },
        { id: 3, familyName: '桐生', givenName: '秋乃', sex: 'f' },
        { id: 4, familyName: '桐生', givenName: '光一', sex: 'm' },
      ],
      families: [
        { id: 1, partner1Id: 1, partner2Id: null },
        { id: 2, partner1Id: 2, partner2Id: null },
        { id: 3, partner1Id: 3, partner2Id: null },
      ],
      familyChildren: [
        { familyId: 1, childId: 2 },
        { familyId: 1, childId: 3, siblingOrder: 1 },
        { familyId: 2, childId: 4 },
        { familyId: 3, childId: 4 },
      ],
    })

    const violations = validateGenealogyGraph(genealogy)

    expect(violations).toEqual([])
  })

  it('養子リンクだけでできた循環は祖先ループとしない', () => {
    const genealogy = genealogySchema.parse({
      persons: [
        { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
        { id: 2, familyName: '奥平', givenName: '信昌', sex: 'm' },
      ],
      families: [
        { id: 1, partner1Id: 1, partner2Id: null },
        { id: 2, partner1Id: 2, partner2Id: null },
      ],
      familyChildren: [
        { familyId: 1, childId: 2, relationType: 'adopted' },
        { familyId: 2, childId: 1, relationType: 'adopted' },
      ],
    })

    const violations = validateGenealogyGraph(genealogy)

    expect(violations).toEqual([])
  })

  it('自己親子は祖先ループとしては報告しない', () => {
    const violations = validateGenealogyGraph(selfParentGenealogy)

    expect(violations.filter(({ kind }) => kind === 'ancestorLoop')).toEqual([])
  })

  it('違反が複数あれば全て報告する', () => {
    const genealogy = genealogySchema.parse({
      persons: [{ id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' }],
      families: [{ id: 1, partner1Id: 1, partner2Id: null }],
      familyChildren: [
        { familyId: 1, childId: 1 },
        { familyId: 1, childId: 99, siblingOrder: 1 },
      ],
    })

    const violations = validateGenealogyGraph(genealogy)

    expect(violations).toEqual(
      expect.arrayContaining([
        { kind: 'selfParent', familyId: 1, personId: 1 },
        { kind: 'unknownChild', familyId: 1, childId: 99 },
      ]),
    )
  })

  it('人物の並び順が違っても、報告される循環の表記は変わらない', () => {
    const inReverse = {
      ...threeGenerationLoop,
      persons: [...threeGenerationLoop.persons].reverse(),
    }

    const violations = validateGenealogyGraph(inReverse)

    expect(violations).toContainEqual({ kind: 'ancestorLoop', personIds: [1, 2, 3] })
  })

  it('サンプル家系は違反を持たない', () => {
    expect(validateGenealogyGraph(sampleGenealogy)).toEqual([])
  })
})

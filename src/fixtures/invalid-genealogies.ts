import { genealogySchema, type Genealogy } from '../domain/models'

/**
 * グラフ検証で弾かれるべき家系。1件につき1種類の違反だけを含む。
 *
 * どれも genealogySchema は通る。1行だけを見ても判定できず、
 * 家系全体を突き合わせて初めて不正と分かるものを集めてある。
 * → docs/design/data-model.md「アプリ側で担保するバリデーション」
 *
 * 実在の家系ではない。人名は架空。
 */

/** family の partner が、収録されていない人物を指している */
export const unknownPartnerGenealogy: Genealogy = genealogySchema.parse({
  persons: [{ id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' }],
  families: [{ id: 1, partner1Id: 1, partner2Id: 99 }],
  familyChildren: [],
})

/** 子が、収録されていない family に属している */
export const unknownFamilyGenealogy: Genealogy = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '春彦', sex: 'm' },
  ],
  families: [{ id: 1, partner1Id: 1, partner2Id: null }],
  familyChildren: [{ familyId: 99, childId: 2 }],
})

/** family に、収録されていない人物が子として登録されている */
export const unknownChildGenealogy: Genealogy = genealogySchema.parse({
  persons: [{ id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' }],
  families: [{ id: 1, partner1Id: 1, partner2Id: null }],
  familyChildren: [{ familyId: 1, childId: 99 }],
})

/** 宗一郎が、自分が partner である family の子になっている */
export const selfParentGenealogy: Genealogy = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '志乃', sex: 'f' },
  ],
  families: [{ id: 1, partner1Id: 1, partner2Id: 2 }],
  familyChildren: [{ familyId: 1, childId: 1 }],
})

/** 宗一郎の子である春彦が、宗一郎の親としても登録されている */
export const ancestorLoopGenealogy: Genealogy = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '春彦', sex: 'm' },
  ],
  families: [
    { id: 1, partner1Id: 1, partner2Id: null },
    { id: 2, partner1Id: 2, partner2Id: null },
  ],
  familyChildren: [
    { familyId: 1, childId: 2 },
    { familyId: 2, childId: 1 },
  ],
})

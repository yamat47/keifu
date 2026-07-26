import { genealogySchema, type Genealogy } from '../domain/models'

/**
 * 1つの性質だけを取り出した小さな家系。
 *
 * `sampleGenealogy` は多くの性質を1つに詰めてあるぶん、
 * 「何が効いてこの結果になったか」がテストから読み取りにくい。
 * レイアウトエンジンの各工程が同じものを見ている必要があるので、
 * テストファイルごとに書き写さずここに集める。
 *
 * 実在の家系ではない。人名は架空。
 */

/** 1 と 2 の夫婦に、子 3 が1人 */
export const simpleCouple: Genealogy = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '志乃', sex: 'f' },
    { id: 3, familyName: '桐生', givenName: '春彦', sex: 'm' },
  ],
  families: [{ id: 1, partner1Id: 1, partner2Id: 2 }],
  familyChildren: [{ familyId: 1, childId: 3 }],
})

/**
 * 1 の子 4, 2, 3。兄弟順が入力順とも ID 順とも食い違うように並べてある。
 * どちらかに一致していると、兄弟順で並べ替えていない実装でも通ってしまう。
 */
export const shuffledSiblings: Genealogy = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '夏彦', sex: 'm' },
    { id: 3, familyName: '桐生', givenName: '秋乃', sex: 'f' },
    { id: 4, familyName: '桐生', givenName: '春彦', sex: 'm' },
  ],
  families: [{ id: 1, partner1Id: 1, partner2Id: null }],
  familyChildren: [
    { familyId: 1, childId: 3, siblingOrder: 2 },
    { familyId: 1, childId: 4, siblingOrder: 0 },
    { familyId: 1, childId: 2, siblingOrder: 1 },
  ],
})

/** 母が判明していない 1 に、子 2 と 3。片側だけの family でも子が並ぶ */
export const singleParent: Genealogy = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '立花', givenName: '五郎', sex: 'm' },
    { id: 2, familyName: '立花', givenName: '梅', sex: 'f' },
    { id: 3, familyName: '立花', givenName: '楠', sex: null },
  ],
  families: [{ id: 1, partner1Id: 1, partner2Id: null }],
  familyChildren: [
    { familyId: 1, childId: 2, siblingOrder: 0 },
    { familyId: 1, childId: 3, siblingOrder: 1 },
  ],
})

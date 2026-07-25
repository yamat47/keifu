import { genealogySchema, type Genealogy } from '../domain/models'

/**
 * レイアウトエンジンのテストと Storybook で共用するサンプル家系。
 *
 * 桐生家（id 1〜12）と、それとは繋がらない立花家（id 13〜15）の2つのルートを持つ。
 * layout-engine.md のテスト観点 1〜6 と 9 を1つの家系で満たせるよう組んである。
 * 観点 7（祖先ループ）だけは含まない。弾かれるべき不正な入力なので、
 * 正常系の家系に混ぜると他の観点のテストが全て道連れで落ちる。
 *
 * 実在の家系ではない。人名は架空。
 */
export const sampleGenealogy: Genealogy = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', kana: 'きりゅう そういちろう', sex: 'm', birthYear: 1868 },
    { id: 2, familyName: '桐生', givenName: '志乃', kana: 'きりゅう しの', sex: 'f', birthYear: 1872 },
    { id: 3, familyName: '桐生', givenName: '春彦', kana: 'きりゅう はるひこ', sex: 'm', birthYear: 1894 },
    { id: 4, familyName: '桐生', givenName: '夏彦', kana: 'きりゅう なつひこ', sex: 'm', birthYear: 1897 },
    { id: 5, familyName: '桐生', givenName: '秋乃', kana: 'きりゅう あきの', sex: 'f', birthYear: 1900 },
    { id: 6, familyName: '桐生', givenName: '千代', kana: 'きりゅう ちよ', sex: 'f', birthYear: 1898, deathYear: 1925 },
    { id: 7, familyName: '桐生', givenName: '光一', kana: 'きりゅう こういち', sex: 'm', birthYear: 1919 },
    { id: 8, familyName: '桐生', givenName: '真澄', kana: 'きりゅう ますみ', sex: 'f', birthYear: 1922 },
    { id: 9, familyName: '桐生', givenName: '佳代', kana: 'きりゅう かよ', sex: 'f', birthYear: 1903 },
    { id: 10, familyName: '桐生', givenName: '冬樹', kana: 'きりゅう ふゆき', sex: 'm', birthYear: 1928 },
    { id: 11, familyName: '奥平', givenName: '信昌', kana: 'おくだいら のぶまさ', sex: 'm', birthYear: 1896 },
    { id: 12, familyName: '奥平', givenName: '実', kana: 'おくだいら みのる', sex: 'm', birthYear: 1921 },
    { id: 13, familyName: '立花', givenName: '五郎', kana: 'たちばな ごろう', sex: 'm', birthYear: 1880 },
    { id: 14, familyName: '立花', givenName: '梅', kana: 'たちばな うめ', sex: 'f', birthYear: 1908 },
    {
      id: 15,
      familyName: '立花',
      givenName: '楠',
      kana: 'たちばな くす',
      sex: null,
      birthYear: 1911,
      note: '戸籍の記載が擦れており性別を判読できない',
    },
  ],

  families: [
    { id: 1, partner1Id: 1, partner2Id: 2 },
    // 春彦の初婚。千代の死後に佳代と再婚する（family 3）
    { id: 2, partner1Id: 3, partner2Id: 6, partner1Order: 1, partner2Order: 1 },
    // 春彦には2度目、佳代には初婚。婚姻順序を partner ごとに持つ理由の実例
    { id: 3, partner1Id: 3, partner2Id: 9, partner1Order: 2, partner2Order: 1 },
    { id: 4, partner1Id: 11, partner2Id: 5 },
    // 母が判明していない。partner2Id を null にする
    { id: 5, partner1Id: 13, partner2Id: null },
    // 夏彦（宗一郎の二男）と真澄（春彦の長女）の婚姻。叔父と姪にあたるため
    // 血縁の世代が1つずれ、世代割当で負閉路が立つ
    { id: 6, partner1Id: 4, partner2Id: 8 },
  ],

  familyChildren: [
    { familyId: 1, childId: 3, relationType: 'biological', siblingOrder: 0 },
    { familyId: 1, childId: 4, relationType: 'biological', siblingOrder: 1 },
    { familyId: 1, childId: 5, relationType: 'biological', siblingOrder: 2 },
    // 秋乃の子を宗一郎が養子に取っている。養親経由なら世代1、血縁経由なら世代2。
    // 養子リンクは世代制約に含めないので、世代は血縁側の2に決まる
    { familyId: 1, childId: 12, relationType: 'adopted', siblingOrder: 3 },

    { familyId: 2, childId: 7, relationType: 'biological', siblingOrder: 0 },
    { familyId: 2, childId: 8, relationType: 'biological', siblingOrder: 1 },

    { familyId: 3, childId: 10, relationType: 'biological', siblingOrder: 0 },

    { familyId: 4, childId: 12, relationType: 'biological', siblingOrder: 0 },

    { familyId: 5, childId: 14, relationType: 'biological', siblingOrder: 0 },
    { familyId: 5, childId: 15, relationType: 'biological', siblingOrder: 1 },
  ],
})

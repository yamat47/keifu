import { childrenByFamily, type FamilyChild, type Genealogy, type Person } from '../models'

/**
 * familyId → childId → 続柄。
 *
 * 人物ごとに1つではなく family ごとに引く形にする。養子は実親 family と養親 family で
 * 別の続柄を持ち、家系図にはその線が接続している family の続柄が出る
 * → docs/design/data-model.md「続柄の導出」
 */
export type KinshipTerms = Map<number, Map<number, string>>

// 0 は「十」「二十」で桁を省くために空文字にする
const kanjiDigit = (digit: number) => (digit === 0 ? '' : '一二三四五六七八九'.charAt(digit - 1))

/**
 * 1人目は「一男」ではなく「長男」。2人目以降は漢数字を置く。
 *
 * 2桁までしか組み立てない。1つの family に100人の子が居る戸籍は存在しない。
 */
function birthOrderPrefix(order: number): string {
  if (order === 1) return '長'

  const tens = Math.floor(order / 10)
  const ones = order % 10
  if (tens === 0) return kanjiDigit(ones)

  // 十一 であって 一十一 ではない
  return `${tens === 1 ? '' : kanjiDigit(tens)}十${kanjiDigit(ones)}`
}

function termsOfSiblings(
  siblings: FamilyChild[],
  personsById: Map<number, Person>,
): Map<number, string> {
  const terms = new Map<number, string>()
  const counts = { m: 0, f: 0 }

  for (const { childId, relationType } of siblings) {
    const child = personsById.get(childId)
    if (child === undefined) continue

    const { sex } = child
    if (relationType === 'adopted') {
      terms.set(childId, sex === 'f' ? '養女' : '養子')
    } else if (sex === null) {
      terms.set(childId, '子')
    } else {
      counts[sex] += 1
      terms.set(childId, `${birthOrderPrefix(counts[sex])}${sex === 'f' ? '女' : '男'}`)
    }
  }

  return terms
}

/**
 * 続柄をカラムとして持たず、構造から毎回導出する。
 * 二重に持つと、子の追加や兄弟順の入れ替えで必ず入力と食い違う。
 *
 * 収録されていない人物を指す子には続柄を付けない。`validateGenealogyGraph` が
 * 弾く入力であり、性別が引けないまま「長男」を組み立てるより空のほうが誤りに気づける。
 */
export function deriveKinshipTerms(genealogy: Genealogy): KinshipTerms {
  const personsById = new Map(genealogy.persons.map((person) => [person.id, person]))

  return new Map(
    [...childrenByFamily(genealogy)].map(([familyId, siblings]) => [
      familyId,
      termsOfSiblings(siblings, personsById),
    ]),
  )
}

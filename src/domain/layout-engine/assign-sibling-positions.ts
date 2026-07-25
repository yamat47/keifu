import { partnerIdsOf, type Family, type Genealogy } from '../models'

import type { PrimaryFamilies } from './select-primary-families'

/** personId → 兄弟軸上の位置。隣り合う人物の差が 1 になる */
export type SiblingPositions = Map<number, number>

/** 横位置計算の木の節。ホストと配偶者が1行に並び、下に子ブロックがぶら下がる */
type SpouseBlock = {
  members: number[]
  children: SpouseBlock[]
  /** この部分木が占める帯の幅 */
  width: number
}

const partnerOrderOf = (family: Family, personId: number): number =>
  family.partner1Id === personId ? family.partner1Order : family.partner2Order

const appendTo = <T>(groups: Map<number, T[]>, key: number, value: T): void => {
  const group = groups.get(key)
  if (group === undefined) groups.set(key, [value])
  else group.push(value)
}

const totalWidthOf = (blocks: SpouseBlock[]): number =>
  blocks.reduce((total, { width }) => total + width, 0)

/**
 * 主系統を持たない配偶者を、隣に置くホストへ割り当てる。
 * 返すのは 配偶者 → ホスト の対応。ここに載らない人物は自分のブロックを持つ。
 */
function attachSpouses(families: Family[], primaryFamilies: PrimaryFamilies): Map<number, number> {
  const candidates = families.flatMap((family) => {
    const { partner1Id, partner2Id } = family
    if (partner1Id === null || partner2Id === null) return []

    return (
      [
        { spouseId: partner2Id, hostId: partner1Id, hostIsPartner1: true },
        { spouseId: partner1Id, hostId: partner2Id, hostIsPartner1: false },
      ]
        // 主系統を持つ人物は親の下に置く位置が既に決まっており、動かせるのは婚入者だけ
        .filter(({ spouseId }) => !primaryFamilies.has(spouseId))
        .map((candidate) => ({
          ...candidate,
          familyId: family.id,
          order: partnerOrderOf(family, candidate.spouseId),
        }))
    )
  })

  // 婚入者が隣接できるのは自分にとって最初の婚姻。婚姻順が並んだときに partner1 を
  // ホスト側へ倒すのは、どちらも主系統を持たない family をそう決めているため
  // → docs/design/layout-engine.md「3. 横位置計算」
  candidates.sort(
    (a, b) =>
      a.order - b.order ||
      a.familyId - b.familyId ||
      Number(b.hostIsPartner1) - Number(a.hostIsPartner1),
  )

  const hostOf = new Map<number, number>()
  const hosts = new Set<number>()

  for (const { spouseId, hostId } of candidates) {
    // 配偶者として置かれた人物はホストになれない。ブロックが入れ子になり、
    // ホストとその配偶者が1行に並ぶという前提が崩れる
    if (hostOf.has(spouseId) || hosts.has(spouseId) || hostOf.has(hostId)) continue

    hostOf.set(spouseId, hostId)
    hosts.add(hostId)
  }

  return hostOf
}

/** 家系を配偶ブロックの森に組み替える。返すのはルートのブロックを左から並べたもの */
function buildSpouseBlocks(
  { persons, families, familyChildren }: Genealogy,
  primaryFamilies: PrimaryFamilies,
): SpouseBlock[] {
  const hostOf = attachSpouses(families, primaryFamilies)
  const isBlockHost = (id: number) => !hostOf.has(id)

  const hostIdOfFamily = new Map<number, number>()
  const familiesOfHost = new Map<number, Family[]>()
  for (const family of families) {
    const hostId = partnerIdsOf(family).find(isBlockHost)
    if (hostId === undefined) continue

    hostIdOfFamily.set(family.id, hostId)
    appendTo(familiesOfHost, hostId, family)
  }
  for (const [hostId, owned] of familiesOfHost) {
    owned.sort((a, b) => partnerOrderOf(a, hostId) - partnerOrderOf(b, hostId) || a.id - b.id)
  }

  // 先に全体を兄弟順で並べる。グループ化は相対順を保つので family ごとの並べ替えは要らない
  const childIdsOfFamily = new Map<number, number[]>()
  for (const { familyId, childId } of [...familyChildren].sort(
    (a, b) => a.siblingOrder - b.siblingOrder || a.childId - b.childId,
  )) {
    if (primaryFamilies.get(childId) !== familyId) continue
    appendTo(childIdsOfFamily, familyId, childId)
  }

  const buildBlock = (hostId: number): SpouseBlock => {
    const owned = familiesOfHost.get(hostId) ?? []
    const members = [hostId]

    for (const family of owned) {
      const spouseId = partnerIdsOf(family).find((id) => hostOf.get(id) === hostId)
      if (spouseId === undefined) continue

      if (family.partner1Id === hostId) members.push(spouseId)
      else members.unshift(spouseId)
    }

    const children = owned.flatMap(({ id }) => childIdsOfFamily.get(id) ?? []).map(buildBlock)

    return { members, children, width: Math.max(members.length, totalWidthOf(children)) }
  }

  return persons
    .map(({ id }) => id)
    .filter(isBlockHost)
    .filter((id) => {
      // 主系統の family にホストが居なければ、親の下にぶら下がる先が無い
      const primaryFamilyId = primaryFamilies.get(id)
      return primaryFamilyId === undefined || !hostIdOfFamily.has(primaryFamilyId)
    })
    .sort((a, b) => a - b)
    .map(buildBlock)
}

/** 配偶ブロックの森を、部分木ごとに重ならない帯へ敷き詰める */
function placeBlocks(roots: SpouseBlock[]): SiblingPositions {
  const positions: SiblingPositions = new Map()

  const place = (block: SpouseBlock, left: number) => {
    let cursor = left + (block.width - totalWidthOf(block.children)) / 2
    for (const child of block.children) {
      place(child, cursor)
      cursor += child.width
    }

    const selfLeft = left + (block.width - block.members.length) / 2
    block.members.forEach((id, index) => positions.set(id, selfLeft + index))
  }

  let cursor = 0
  for (const root of roots) {
    place(root, cursor)
    cursor += root.width
  }

  return positions
}

/**
 * 各人物の兄弟軸上の位置を求める。仕様の正は docs/design/layout-engine.md
 *
 * 参照整合性は前提とする。`validateGenealogyGraph` を通っていない家系を渡すと、
 * 収録されていない人物を指す配偶者や子は黙って落ちる。
 */
export function assignSiblingPositions(
  genealogy: Genealogy,
  primaryFamilies: PrimaryFamilies,
): SiblingPositions {
  return placeBlocks(buildSpouseBlocks(genealogy, primaryFamilies))
}

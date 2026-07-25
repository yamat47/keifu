import { biologicalLinksOf, type Genealogy } from '../models'

/** 世代割当が満たせなかった制約。描画は続けるので違反ではなく診断として返す */
export type GenerationDiagnostic =
  | { kind: 'marriageConflict'; familyId: number; partner1Id: number; partner2Id: number }
  | { kind: 'biologicalConflict'; familyId: number; parentId: number; childId: number }

export type GenerationAssignment = {
  /** personId → 世代。世代指定のある人物はその値 */
  generations: Map<number, number>
  diagnostics: GenerationDiagnostic[]
}

/**
 * `g(b) - g(a) = diff` の形の制約だけを集める系。
 *
 * 制約が全て等式なので、連結成分の中では1人決まれば全員決まる。
 * 不等式を扱わないぶん、最長路 / Bellman-Ford は要らない
 * → docs/adr/0002-generation-assignment.md
 */
function createDifferenceSystem(personIds: number[]) {
  const generationOf = new Map(personIds.map((id) => [id, 0]))
  const componentOf = new Map(personIds.map((id) => [id, id]))

  const generation = (id: number): number => generationOf.get(id) ?? 0
  const component = (id: number): number => componentOf.get(id) ?? id

  /** 既存の制約と矛盾していたら false を返し、この制約は課さない */
  const constrain = (a: number, b: number, diff: number): boolean => {
    const into = component(a)
    const from = component(b)
    if (into === from) return generation(b) - generation(a) === diff

    const shift = generation(a) + diff - generation(b)
    for (const id of personIds) {
      if (component(id) !== from) continue
      generationOf.set(id, generation(id) + shift)
      componentOf.set(id, into)
    }
    return true
  }

  const normalize = (): Map<number, number> => {
    const lowestOf = new Map<number, number>()
    for (const id of personIds) {
      const owner = component(id)
      lowestOf.set(owner, Math.min(lowestOf.get(owner) ?? Infinity, generation(id)))
    }

    // 1周目で全ての成分が lowestOf に入るので ?? は型の都合。既定値に意味は無い
    return new Map(personIds.map((id) => [id, generation(id) - (lowestOf.get(component(id)) ?? 0)]))
  }

  return { constrain, normalize }
}

/**
 * 各人物の世代を求める。矛盾があっても例外を投げず、満たせなかった制約を
 * diagnostics に積んで残りだけで解く。仕様の正は docs/design/layout-engine.md
 *
 * 参照整合性は前提とする。`validateGenealogyGraph` を通っていない家系を渡すと、
 * 収録されていない人物を指す制約は黙って落ちる。
 */
export function assignGenerations(genealogy: Genealogy): GenerationAssignment {
  const { persons, families } = genealogy
  const system = createDifferenceSystem(persons.map(({ id }) => id))
  const diagnostics: GenerationDiagnostic[] = []

  // 血縁制約を先に課し、婚姻制約を後から課す。矛盾したときに落ちるのは後から
  // 課したほうなので、この順序が「婚姻制約を落とす」という仕様そのものになる
  for (const { familyId, parentId, childId } of biologicalLinksOf(genealogy)) {
    if (system.constrain(parentId, childId, 1)) continue
    diagnostics.push({ kind: 'biologicalConflict', familyId, parentId, childId })
  }

  for (const { id: familyId, partner1Id, partner2Id } of families) {
    if (partner1Id === null || partner2Id === null) continue

    if (system.constrain(partner1Id, partner2Id, 0)) continue
    diagnostics.push({ kind: 'marriageConflict', familyId, partner1Id, partner2Id })
  }

  const generations = system.normalize()

  // 手動指定は正規化のあとに上書きする。制約として先に固定すると、正規化が
  // 連結成分ごと平行移動させて、入力した値と最終的な世代がずれる
  for (const { id, generationOverride } of persons) {
    if (generationOverride !== null) generations.set(id, generationOverride)
  }

  return { generations, diagnostics }
}

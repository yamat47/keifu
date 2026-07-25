import { z } from 'zod'

/**
 * family に属する子。スキーマの正は docs/design/data-model.md
 *
 * 兄弟順を person 側ではなく family 側に持つのは、養子が実親 family と
 * 養親 family の両方に属し、それぞれで異なる順序を取りうるため。
 */
export const familyChildSchema = z.object({
  familyId: z.int().positive(),
  childId: z.int().positive(),
  // 養子は実親 family に biological、養親 family に adopted の2行を持つ。
  // どちらか一方だけを持つこと（実親が不明な養子）も許す
  relationType: z.enum(['biological', 'adopted']).default('biological'),
  /** その family の中での兄弟順 */
  siblingOrder: z.int().min(0).default(0),
})

export type FamilyChild = z.output<typeof familyChildSchema>

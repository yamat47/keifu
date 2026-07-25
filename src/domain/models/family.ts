import { z } from 'zod'

/**
 * 婚姻、または片親のみの親グループ。子はここに属する。
 * スキーマの正は docs/design/data-model.md
 */
export const familySchema = z
  .object({
    id: z.int().positive(),
    /** 家系図上の左右の配置順を兼ねる。ID 昇順に正規化してはいけない */
    partner1Id: z.int().positive().nullable().default(null),
    partner2Id: z.int().positive().nullable().default(null),
    /** その partner にとって何度目の婚姻か。family に1つではなく partner ごとに持つ */
    partner1Order: z.int().positive().default(1),
    partner2Order: z.int().positive().default(1),
    kind: z.enum(['marriage', 'unmarried']).default('marriage'),
    note: z.string().nullable().default(null),
  })
  .refine(({ partner1Id, partner2Id }) => partner1Id !== null || partner2Id !== null, {
    error: 'partner が1人もいない',
    path: ['partner1Id'],
  })
  .refine(
    ({ partner1Id, partner2Id }) =>
      partner1Id === null || partner2Id === null || partner1Id !== partner2Id,
    { error: '同一人物が両方の partner になっている', path: ['partner2Id'] },
  )

export type Family = z.output<typeof familySchema>

/** family の partner。片親のみの family では1人になる。左から右の順を保つ */
export const partnerIdsOf = ({ partner1Id, partner2Id }: Family): number[] =>
  [partner1Id, partner2Id].filter((id) => id !== null)

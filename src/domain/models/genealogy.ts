import { z } from 'zod'

import { familySchema } from './family'
import { familyChildSchema } from './family-child'
import { personSchema } from './person'

/**
 * 家系図データ一式。レイアウトエンジンの入力になる。
 *
 * 参照整合性・自己親子・祖先ループはここでは検証しない。
 * グラフ全体を走査する検証は domain/layout-engine の入力バリデーションが担う。
 */
export const genealogySchema = z.object({
  persons: z.array(personSchema),
  families: z.array(familySchema),
  familyChildren: z.array(familyChildSchema),
})

export type Genealogy = z.output<typeof genealogySchema>

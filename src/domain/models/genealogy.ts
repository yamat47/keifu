import { z } from 'zod'

import { familySchema } from './family'
import { familyChildSchema } from './family-child'
import { personSchema } from './person'

/**
 * 家系図データ一式。レイアウトエンジンの入力になる。
 *
 * 参照整合性・自己親子・祖先ループはここでは検証しない。
 * グラフ全体を突き合わせないと判定できないものは、レイアウト計算とは独立した
 * 純粋関数に置き、書き込み API からも同じ関数を呼ぶ。
 * → docs/design/data-model.md「アプリ側で担保するバリデーション」
 */
export const genealogySchema = z.object({
  persons: z.array(personSchema),
  families: z.array(familySchema),
  familyChildren: z.array(familyChildSchema),
})

export type Genealogy = z.output<typeof genealogySchema>

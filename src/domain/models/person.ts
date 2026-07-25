import { z } from 'zod'

/** 家系図に載る個人。スキーマの正は docs/design/data-model.md */
export const personSchema = z
  .object({
    id: z.int().positive(),
    familyName: z.string().trim().min(1),
    givenName: z.string().trim().min(1),
    /** 検索とソート用。家系図には表示しないので必須にしない */
    kana: z.string().trim().nullish().default(null),
    // 戸籍から性別が読み取れない人物が実在するため必須にできない。
    // null のときは続柄を「子」として導出する
    sex: z.enum(['m', 'f']).nullish().default(null),
    // 家系図には表示しない。編集画面で同姓同名を識別するためだけに持つので、
    // 年より細かい粒度は入力させない
    birthYear: z.int().nullish().default(null),
    deathYear: z.int().nullish().default(null),
    /** 庶子・分家・家督相続など、構造で表せない戸籍の記載 */
    note: z.string().nullish().default(null),
    /** 世代の自動割当が矛盾したときの手動指定。通常は null */
    generationOverride: z.int().min(0).nullish().default(null),
  })
  .refine(
    ({ birthYear, deathYear }) =>
      birthYear === null || deathYear === null || birthYear <= deathYear,
    { error: '没年が生年より前になっている', path: ['deathYear'] },
  )

export type Person = z.output<typeof personSchema>

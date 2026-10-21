import { z } from 'zod'

export type DiaryFieldErrors = Partial<Record<'title' | 'content' | 'tags', string>>

const diaryFieldsSchema = z.object({
  title: z.string().max(160, 'Use no máximo 160 caracteres.'),
  content: z
    .string()
    .refine((value) => value.trim().length > 0, 'Escreva algo antes de salvar.')
    .refine((value) => value.length <= 100_000, 'Use no máximo 100.000 caracteres.'),
  tags: z
    .array(
      z
        .string()
        .min(1, 'As etiquetas não podem ficar vazias.')
        .max(30, 'Cada etiqueta pode ter no máximo 30 caracteres.'),
    )
    .max(10, 'Use no máximo 10 etiquetas.'),
})

interface DiaryFields {
  title: string
  content: string
  tags: string[]
}

export function validateDiaryFields(
  fields: DiaryFields,
):
  | { success: true; data: DiaryFields }
  | { success: false; errors: DiaryFieldErrors } {
  const parsed = diaryFieldsSchema.safeParse({
    ...fields,
    title: fields.title.trim(),
  })
  if (parsed.success) {
    return { success: true, data: parsed.data }
  }

  const errors: DiaryFieldErrors = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0]
    if ((field === 'title' || field === 'content' || field === 'tags') && !errors[field]) {
      errors[field] = issue.message
    }
  }
  return { success: false, errors }
}

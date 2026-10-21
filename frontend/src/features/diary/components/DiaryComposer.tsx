import { useState, type FormEvent, type RefObject } from 'react'

import { Icon } from '@/components/shared/Icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/errors'
import { parseTagsInput } from '@/lib/diary'
import { validateDiaryFields, type DiaryFieldErrors } from '@/lib/diaryValidation'
import { diaryService } from '@/services/diary'
import type { DiaryEntry } from '@/features/diary/types'

interface DiaryComposerProps {
  onSaved: (entry: DiaryEntry) => void
  contentRef?: RefObject<HTMLTextAreaElement | null>
}

export function DiaryComposer({ onSaved, contentRef }: DiaryComposerProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [errors, setErrors] = useState<DiaryFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const tags = parseTagsInput(tagsInput)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setFormError(null)
    const parsed = validateDiaryFields({ title, content, tags })
    if (!parsed.success) {
      setErrors(parsed.errors)
      return
    }

    setErrors({})
    setSaving(true)
    try {
      const entry = await diaryService.create({
        title: parsed.data.title,
        content: parsed.data.content,
        tags: parsed.data.tags,
      })
      setTitle('')
      setContent('')
      setTagsInput('')
      onSaved(entry)
    } catch (caught) {
      setFormError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      id="diary-composer"
      aria-labelledby="diary-composer-title"
      className="rounded-xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-text-secondary uppercase">
            Hoje
          </p>
          <h2
            id="diary-composer-title"
            className="mt-1 text-base font-semibold tracking-tight text-foreground"
          >
            Comece a escrever
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Sem formulários, sem cobrança. Guarde o que quiser lembrar.
          </p>
        </div>
        <Icon name="feather" size={20} className="mt-1 shrink-0 text-primary" />
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="diary-title" className="text-text-secondary">
            Título <span className="font-normal text-text-disabled">(opcional)</span>
          </Label>
          <Input
            id="diary-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Um nome para este registro"
            maxLength={160}
            disabled={saving}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'diary-title-error' : undefined}
          />
          {errors.title ? (
            <p id="diary-title-error" role="alert" className="text-xs text-red">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="diary-content" className="text-text-secondary">
              O que você quer guardar?
            </Label>
            <span className="font-mono text-[10px] text-text-disabled">
              {content.length.toLocaleString('pt-BR')}/100.000
            </span>
          </div>
          <Textarea
            id="diary-content"
            ref={contentRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Escreva livremente sobre o dia, um pensamento, uma descoberta…"
            rows={7}
            disabled={saving}
            className="min-h-40 resize-y text-sm leading-relaxed"
            aria-invalid={Boolean(errors.content)}
            aria-describedby={errors.content ? 'diary-content-error' : undefined}
          />
          {errors.content ? (
            <p id="diary-content-error" role="alert" className="text-xs text-red">
              {errors.content}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="diary-tags" className="text-text-secondary">
            Etiquetas <span className="font-normal text-text-disabled">(opcional)</span>
          </Label>
          <Input
            id="diary-tags"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="pessoal, ideias, gratidão"
            disabled={saving}
            aria-invalid={Boolean(errors.tags)}
            aria-describedby={errors.tags ? 'diary-tags-error' : 'diary-tags-hint'}
          />
          {errors.tags ? (
            <p id="diary-tags-error" role="alert" className="text-xs text-red">
              {errors.tags}
            </p>
          ) : (
            <p id="diary-tags-hint" className="text-[11px] text-text-disabled">
              Separe as etiquetas por vírgulas.
            </p>
          )}
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-xs text-red"
          >
            <Icon name="alert-circle" size={14} className="mt-0.5 shrink-0" />
            <span>{formError} Seu texto continua aqui; tente novamente.</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-relaxed text-text-disabled">
            Salvo como Markdown em <span className="font-mono">data/diary</span>, neste
            computador.
          </p>
          <Button type="submit" disabled={saving} className="sm:min-w-40">
            {saving ? (
              <>
                <Icon name="loader" size={14} className="animate-spin" />
                Salvando…
              </>
            ) : (
              <>
                <Icon name="save" size={14} />
                Salvar registro
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  )
}

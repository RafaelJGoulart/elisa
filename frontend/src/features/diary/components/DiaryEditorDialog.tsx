import { useRef, useState, type FormEvent } from 'react'

import { Icon } from '@/components/shared/Icon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatEntryDateTime, parseTagsInput } from '@/lib/diary'
import { validateDiaryFields, type DiaryFieldErrors } from '@/lib/diaryValidation'
import { getErrorMessage } from '@/lib/errors'
import { focusFirstErroredField } from '@/lib/focus'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { diaryService } from '@/services/diary'
import type { DiaryEntry } from '@/features/diary/types'

interface DiaryEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DiaryEntry
  onSaved: (entry: DiaryEntry) => void
}

function sameTags(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  return left.every(
    (tag, index) =>
      tag.toLocaleLowerCase('pt-BR') === right[index]?.toLocaleLowerCase('pt-BR'),
  )
}

export function DiaryEditorDialog({
  open,
  onOpenChange,
  entry,
  onSaved,
}: DiaryEditorDialogProps) {
  const [title, setTitle] = useState(entry.title)
  const [content, setContent] = useState(entry.content)
  const [tagsInput, setTagsInput] = useState(entry.tags.join(', '))
  const [errors, setErrors] = useState<DiaryFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const tagsRef = useRef<HTMLInputElement>(null)

  const fieldRefs = { title: titleRef, content: contentRef, tags: tagsRef }
  const fieldOrder = ['title', 'content', 'tags'] as const

  const tags = parseTagsInput(tagsInput)
  const dirty =
    title.trim() !== entry.title ||
    content !== entry.content ||
    !sameTags(tags, entry.tags)

  useUnsavedChangesWarning(dirty)

  function requestClose() {
    if (saving) return
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setFormError(null)
    const parsed = validateDiaryFields({ title, content, tags })
    if (!parsed.success) {
      setErrors(parsed.errors)
      focusFirstErroredField(parsed.errors, fieldRefs, fieldOrder)
      return
    }

    setErrors({})
    setSaving(true)
    try {
      const updated = await diaryService.update(entry.id, {
        title: parsed.data.title,
        content: parsed.data.content,
        tags: parsed.data.tags,
      })
      onSaved(updated)
    } catch (caught) {
      setFormError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true)
          else requestClose()
        }}
      >
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar registro</DialogTitle>
            <DialogDescription>
              Criado em {formatEntryDateTime(entry.createdAt)}. A data de criação será
              preservada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="diary-edit-title" className="text-text-secondary">
                Título <span className="font-normal text-text-disabled">(opcional)</span>
              </Label>
              <Input
                id="diary-edit-title"
                ref={titleRef}
                name="diary-edit-title"
                autoComplete="off"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                disabled={saving}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'diary-edit-title-error' : undefined}
              />
              {errors.title ? (
                <p id="diary-edit-title-error" role="alert" className="text-xs text-red">
                  {errors.title}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="diary-edit-content" className="text-text-secondary">
                  Conteúdo
                </Label>
                <span
                  id="diary-edit-content-counter"
                  className="font-mono text-[10px] text-text-secondary"
                >
                  {content.length.toLocaleString('pt-BR')}/100.000
                </span>
              </div>
              <Textarea
                id="diary-edit-content"
                ref={contentRef}
                name="diary-edit-content"
                autoComplete="off"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={12}
                disabled={saving}
                className="min-h-64 resize-y text-sm leading-relaxed"
                aria-invalid={Boolean(errors.content)}
                aria-describedby={
                  errors.content
                    ? 'diary-edit-content-error diary-edit-content-counter'
                    : 'diary-edit-content-counter'
                }
              />
              {errors.content ? (
                <p id="diary-edit-content-error" role="alert" className="text-xs text-red">
                  {errors.content}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="diary-edit-tags" className="text-text-secondary">
                Etiquetas <span className="font-normal text-text-disabled">(opcional)</span>
              </Label>
              <Input
                id="diary-edit-tags"
                ref={tagsRef}
                name="diary-edit-tags"
                autoComplete="off"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                disabled={saving}
                aria-invalid={Boolean(errors.tags)}
                aria-describedby={errors.tags ? 'diary-edit-tags-error' : undefined}
              />
              {errors.tags ? (
                <p id="diary-edit-tags-error" role="alert" className="text-xs text-red">
                  {errors.tags}
                </p>
              ) : null}
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
                <span>{formError} Suas alterações continuam aqui.</span>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={requestClose}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !dirty}>
                {saving ? (
                  <>
                    <Icon name="loader" size={14} className="animate-spin" />
                    Salvando…
                  </>
                ) : (
                  <>
                    <Icon name="save" size={14} />
                    Salvar alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={discardOpen}
        onOpenChange={(next) => {
          if (!next) setDiscardOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Há mudanças que ainda não foram salvas. Se sair agora, elas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar escrevendo</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false)
                onOpenChange(false)
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

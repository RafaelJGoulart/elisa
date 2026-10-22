type FieldRef = { current: HTMLElement | null }

/**
 * Move o foco para o primeiro campo que possui erro, respeitando a ordem
 * visual do formulário. Assim teclado e leitor de tela encontram de imediato
 * o ponto que precisa ser corrigido, sem depender do usuário caçar a mensagem.
 */
export function focusFirstErroredField<K extends string>(
  errors: Partial<Record<K, string>>,
  refs: Partial<Record<K, FieldRef>>,
  order: readonly K[],
): void {
  const first = order.find((key) => errors[key])
  if (!first) return
  refs[first]?.current?.focus()
}

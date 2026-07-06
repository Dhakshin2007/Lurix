export type ToastKind = 'info' | 'success' | 'error'

export interface ToastMessage {
  id: number
  text: string
  kind: ToastKind
}

type Listener = (toast: ToastMessage) => void

let nextId = 1
const listeners = new Set<Listener>()

export function showToast(text: string, kind: ToastKind = 'info') {
  const toast: ToastMessage = { id: nextId++, text, kind }
  listeners.forEach((listener) => listener(toast))
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

import { useEffect, useState } from 'react'
import { subscribeToasts, type ToastMessage } from './toast'

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    return subscribeToasts((toast) => {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 2200)
    })
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="cfp-toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`cfp-toast cfp-toast--${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

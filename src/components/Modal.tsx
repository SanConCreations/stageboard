import { useEffect, type ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal ${wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Confirm({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="confirm-body">{body}</p>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className={`btn ${danger ? 'btn-danger' : 'btn-gold'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export function NamePrompt({
  title,
  label,
  initial = '',
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string
  label: string
  initial?: string
  submitLabel: string
  onSubmit: (name: string) => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="name-form"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const name = String(fd.get('name') ?? '')
          if (name.trim()) {
            onSubmit(name)
            onClose()
          }
        }}
      >
        <label className="field">
          <span>{label}</span>
          <input
            name="name"
            defaultValue={initial}
            autoFocus
            autoComplete="off"
            enterKeyHint="done"
            maxLength={32}
          />
        </label>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-gold">
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}

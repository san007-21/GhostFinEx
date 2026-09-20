import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Primitives.jsx'

/**
 * Accessible modal dialog. Focus is moved into the dialog on open, Escape
 * closes it, and simple Tab trapping keeps keyboard focus inside. Body
 * scroll is locked while open. No portal needed — the shell has no stacking
 * contexts that would clip it.
 */
export default function Modal({ open, onClose, title, children, footer }) {
  const dialogRef = useRef(null)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    previouslyFocused.current = document.activeElement
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const focusables = dialog?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusables?.[0]
    if (first instanceof HTMLElement) first.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'Tab' && focusables && focusables.length > 0) {
        const firstEl = focusables[0]
        const lastEl = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === firstEl) {
          event.preventDefault()
          lastEl.focus()
        } else if (!event.shiftKey && document.activeElement === lastEl) {
          event.preventDefault()
          firstEl.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus()
    }
  }, [open, onClose])

  if (!open) return null

  // Portal to <body>: ancestors with backdrop-filter/transform create a
  // containing block that would otherwise trap this "fixed" overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="gfx-enter w-full max-w-md rounded-2xl border border-[var(--gfx-border-strong)] bg-[var(--gfx-surface)] p-5 shadow-[var(--gfx-shadow-lg)]"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold text-[var(--gfx-text)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-[var(--gfx-muted)] transition-colors hover:bg-[var(--gfx-surface-2)] hover:text-[var(--gfx-text)]"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Ready-made confirm variant for destructive actions. */
export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'primary' : 'primary'}
            className={danger ? '!bg-[var(--gfx-danger)] !text-black hover:!opacity-90' : ''}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}

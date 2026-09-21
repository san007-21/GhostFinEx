import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Primitives.jsx'

function getFocusables(dialog) {
  if (!(dialog instanceof HTMLElement)) return []
  return [...dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
    (el) => !el.hasAttribute('disabled'),
  )
}

/**
 * Accessible modal dialog.
 *
 * Focus behavior (the fix for the one-keystroke focus-loss bug):
 * - The dialog autofocuses its first field ONCE per open. This effect depends
 *   only on `open`, never on `onClose` — callers pass fresh inline closures,
 *   so keying the autofocus on `onClose` would re-run it on every keystroke
 *   and steal focus back from the input.
 * - The Escape/Tab-trap listener captures focusable elements fresh on every
 *   keydown, so it never needs to depend on the caller's `onClose` identity.
 * - Focus is restored to the previously focused element when the dialog
 *   unmounts or `open` flips false.
 *
 * Overlay click: clicking the dimmed backdrop closes the dialog (consistent
 * app-wide); clicks inside the dialog never bubble to it. Pass
 * `closeOnOverlayClick={false}` to opt out.
 */
export default function Modal({ open, onClose, title, children, footer, closeOnOverlayClick = true }) {
  const dialogRef = useRef(null)
  const previouslyFocused = useRef(null)
  const onCloseRef = useRef(onClose)

  // Keep the latest onClose without re-triggering effects on identity changes.
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Runs once per open: snapshot focus target, lock scroll, restore on close.
  useEffect(() => {
    if (!open) return undefined
    previouslyFocused.current = document.activeElement
    document.body.style.overflow = 'hidden'

    // Move focus after the first paint so the field the user should type in
    // is focused exactly once — not re-focused on parent re-renders.
    const raf = requestAnimationFrame(() => {
      const firstField = dialogRef.current?.querySelector('input, select, textarea')
      if (firstField instanceof HTMLElement) {
        firstField.focus()
      } else {
        const firstFocusable = getFocusables(dialogRef.current)[0]
        if (firstFocusable instanceof HTMLElement) firstFocusable.focus()
      }
    })

    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = ''
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus()
    }
  }, [open])

  // Escape closes; Tab is trapped inside the dialog. List is re-resolved on
  // every keydown so dynamic content (validation errors, fields appearing)
  // never traps keyboard focus behind a stale boundary.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusables = getFocusables(dialogRef.current)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!open) return null

  // Portal to <body>: ancestors with backdrop-filter/transform create a
  // containing block that would otherwise trap this "fixed" overlay.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={closeOnOverlayClick ? (e) => { if (e.target === e.currentTarget) onCloseRef.current() } : undefined}
    >
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
            variant="primary"
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

import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from './ui/Modal.jsx'
import { Alert, Button, NumberField, SelectField, TextField } from './ui/Primitives.jsx'
import { IconGhost, IconScan } from './ui/icons.jsx'
import { extractBill } from '../lib/billExtract'

/**
 * ScanBillModal — "Ghost Camera": capture or upload a bill, read it on-device,
 * review the draft, and only then create an expense.
 *
 * Guarantees (the GhostFinEx financial-integrity contract):
 * - OCR runs entirely in the browser (tesseract.js, loaded lazily at extract
 *   time). Images never leave the device; nothing is uploaded or stored.
 * - Extracted values are DRAFT SUGGESTIONS. Every field is editable, weak
 *   fields stay empty, and conflicting totals are never silently resolved.
 * - NO expense is created without an explicit confirm click on reviewed,
 *   valid fields — and it goes through the SAME addExpense path as manual
 *   entry, so all derived numbers update through the existing architecture.
 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB
const EMPTY_REVIEW = { name: '', amount: '', category: '', date: '', invoice: '' }

export default function ScanBillModal({ open, onClose, onConfirm, categories = [] }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [source, setSource] = useState('choose') // choose | camera | upload | processing | entry
  const [imageUrl, setImageUrl] = useState(null)
  const [imageInfo, setImageInfo] = useState(null)
  const [imageError, setImageError] = useState('')
  const [ocr, setOcr] = useState(null) // { progress, status }
  const [draft, setDraft] = useState(null) // result of extractBill()
  const [review, setReview] = useState(EMPTY_REVIEW)
  const [reviewError, setReviewError] = useState('')

  /* ----------------------------- camera ----------------------------- */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = async () => {
    setImageError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setSource('upload')
      setImageError('Camera is not available in this browser — upload a photo of the bill instead.')
      return
    }
    try {
      // Prefer the rear camera for physical documents; any camera beats none.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream
      setSource('camera')
    } catch {
      // Stay on the chooser with a visible explanation — never an empty panel.
      setSource('choose')
      setImageError('Camera access was declined or is unavailable — upload a photo of the bill instead, or add the expense manually.')
    }
  }

  // Bind the stream once the <video> element has mounted.
  useEffect(() => {
    if (source !== 'camera' || !streamRef.current || !videoRef.current) return undefined
    videoRef.current.srcObject = streamRef.current
    videoRef.current.play().catch(() => {})
    return undefined
  }, [source])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    const MAX_DIM = 1600
    const scale = Math.min(1, MAX_DIM / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    stopCamera()
    setImageUrl(dataUrl)
    setImageInfo({ name: 'Camera capture', bytes: Math.round(dataUrl.length * 0.75) })
    runExtraction(dataUrl)
  }

  /* ----------------------------- upload ----------------------------- */
  const onFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError('That file is not an image — choose a JPG or PNG photo of the bill.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(`That image is too large (max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB).`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setImageUrl(dataUrl)
      setImageInfo({ name: file.name, bytes: file.size })
      runExtraction(dataUrl)
    }
    reader.onerror = () => setImageError('The image could not be read — try a different file.')
    reader.readAsDataURL(file)
  }

  /* -------------------------- OCR extraction -------------------------- */
  const runExtraction = async (dataUrl) => {
    setSource('processing')
    setOcr({ progress: 5, status: 'Preparing image…' })
    try {
      // Lazy, on-device OCR — the heavy library only loads when needed and
      // never touches the main bundle.
      const { createWorker } = await import('tesseract.js')
      setOcr({ progress: 20, status: 'Starting the reader…' })
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcr({ progress: 20 + Math.round((m.progress ?? 0) * 70), status: 'Reading your bill…' })
          } else if (m.status === 'loading language traineddata' || m.status === 'loading tesseract core') {
            setOcr({ progress: 10, status: 'Loading the reader…' })
          }
        },
      })
      setOcr({ progress: 90, status: 'Extracting details…' })
      const { data } = await worker.recognize(dataUrl)
      await worker.terminate()
      const text = typeof data?.text === 'string' ? data.text : ''
      const result = extractBill(text)
      setDraft(result)
      setReview({
        name: result.merchant ?? '',
        amount: result.amount !== null && result.amount !== undefined ? String(result.amount) : '',
        category: result.suggestedCategory && categories.includes(result.suggestedCategory) ? result.suggestedCategory : '',
        date: result.date ?? '',
        invoice: result.invoiceNumber ?? '',
      })
      setOcr({ progress: 100, status: 'Done' })
      setSource('entry')
    } catch {
      // Extraction failed outright: never fabricate — open an empty draft.
      setDraft({ confidence: 'failed', merchant: '', amount: null, date: null, invoiceNumber: '', suggestedCategory: '', amountCandidates: [] })
      setReview(EMPTY_REVIEW)
      setOcr({ progress: 100, status: 'Done' })
      setSource('entry')
    }
  }

  /* ------------------------- review & confirm ------------------------- */
  const confirm = () => {
    const name = review.name.trim()
    const amount = Number(review.amount)
    if (!name) return setReviewError('Give the expense a name (check the bill).')
    if (!Number.isFinite(amount) || amount <= 0) return setReviewError('Enter the total amount from the bill.')
    if (!review.category) return setReviewError('Choose a category.')
    if (!review.date) return setReviewError('Pick the bill date.')
    onConfirm({
      name,
      amount: Math.round(amount * 100) / 100,
      category: review.category,
      date: review.date,
      invoice: review.invoice.trim(),
    })
  }

  const reset = () => {
    stopCamera()
    setSource('choose')
    setImageUrl(null)
    setImageInfo(null)
    setImageError('')
    setOcr(null)
    setDraft(null)
    setReview(EMPTY_REVIEW)
    setReviewError('')
  }

  const close = () => {
    stopCamera()
    onClose()
  }

  // Always release the camera when the component unmounts. The parent mounts
  // this modal fresh per open (conditional render), so every session starts
  // with clean state — no stale image or half-typed form carries over.
  useEffect(() => () => stopCamera(), [stopCamera])

  if (!open) return null

  const confidenceBanner = (() => {
    if (!draft) return null
    if (draft.confidence === 'failed') {
      return (
        <Alert tone="warn" title="Couldn't reliably read this bill">
          Please review or enter the details manually — nothing was guessed. The photo is shown
          so you can copy the values across.
        </Alert>
      )
    }
    if (draft.confidence === 'partial') {
      return (
        <Alert tone="info" title="Draft ready — check the details">
          Some fields were read from the bill; empty fields need your input. Everything below is
          editable, and nothing is saved until you confirm.
        </Alert>
      )
    }
    return (
      <Alert tone="accent" title="Draft ready">
        Details were read from the bill — verify them against the photo, edit anything that's
        off, then confirm. Nothing is saved until you do.
      </Alert>
    )
  })()

  return (
    <Modal open={open} onClose={close} title="Ghost Camera">
      {source === 'choose' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gfx-accent-soft)] text-[var(--gfx-accent)]">
              <IconGhost className="h-5 w-5" />
            </span>
            <p className="text-sm text-[var(--gfx-muted)]">
              Capture a bill, receipt, or invoice — Ghost reads it on your device and drafts the
              expense for you to review. The image never leaves this browser.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={startCamera}>
              <IconScan className="h-4 w-4" /> Open camera
            </Button>
            <Button variant="secondary" onClick={() => setSource('upload')}>
              Upload image
            </Button>
          </div>
          {imageError && <Alert tone="warn" title="Camera unavailable">{imageError}</Alert>}
        </div>
      )}

      {source === 'camera' && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-[var(--gfx-border)] bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full bg-black"
            />
            {/* Scanning frame: corner brackets + guide line */}
            <div className="pointer-events-none absolute inset-4" aria-hidden="true">
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-[var(--gfx-accent)]" />
              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-[var(--gfx-accent)]" />
              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-[var(--gfx-accent)]" />
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-[var(--gfx-accent)]" />
              <span className="gfx-scanline absolute inset-x-6 top-1/2 h-px bg-[var(--gfx-accent)]/60" />
            </div>
            <p className="absolute inset-x-0 bottom-2 text-center text-xs font-medium text-white/90 drop-shadow">
              Position the bill inside the frame
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={capture}>Capture</Button>
            <Button variant="ghost" onClick={() => { stopCamera(); setSource('choose') }}>Back</Button>
          </div>
        </div>
      )}

      {source === 'upload' && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">
              Bill photo (JPG or PNG, max 5 MB)
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFile}
              className="block w-full text-sm text-[var(--gfx-muted)] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--gfx-accent-soft)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--gfx-accent)]"
            />
          </label>
          {imageError && <Alert tone="warn" title="Image problem">{imageError}</Alert>}
          <Button variant="ghost" onClick={() => { setImageError(''); setSource('choose') }}>Back</Button>
        </div>
      )}

      {source === 'processing' && (
        <div className="space-y-4 py-2" aria-live="polite" aria-busy="true">
          <div className="relative overflow-hidden rounded-xl border border-[var(--gfx-border)]">
            <img src={imageUrl} alt="Bill being read" className="max-h-48 w-full bg-black object-contain" />
            <div className="absolute inset-0 bg-black/40" />
            <span className="gfx-scanline absolute inset-x-6 top-1/2 h-px bg-[var(--gfx-accent)]" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--gfx-muted)]">
              <span>{ocr?.status ?? 'Reading your bill…'}</span>
              <span className="tabular">{ocr?.progress ?? 0}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={ocr?.progress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--gfx-surface-3)]"
            >
              <div
                className="h-full rounded-full bg-[var(--gfx-accent-strong)] transition-[width] duration-300"
                style={{ width: `${ocr?.progress ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {source === 'entry' && imageUrl && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-[var(--gfx-border)]">
            <img src={imageUrl} alt="Captured bill preview" className="max-h-48 w-full bg-black object-contain" />
          </div>
          <p className="text-xs text-[var(--gfx-faint)]">
            {imageInfo?.name}
            {imageInfo?.bytes ? ` · ${Math.max(1, Math.round(imageInfo.bytes / 1024))} KB` : ''}
            {' · '}stays on your device · reviewed by you before anything is saved
          </p>

          {confidenceBanner}

          <div className="space-y-3">
            <TextField
              label="Merchant / description"
              value={review.name}
              onChange={(v) => setReview((r) => ({ ...r, name: v }))}
              placeholder="e.g. Checkers — weekly groceries"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Total amount (R)"
                value={review.amount === '' ? '' : Number(review.amount)}
                onChange={(v) => setReview((r) => ({ ...r, amount: v }))}
                step={1}
                prefix="R"
              />
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Bill date</span>
                <input
                  type="date"
                  className="date-input"
                  value={review.date}
                  onChange={(e) => setReview((r) => ({ ...r, date: e.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Category"
                value={review.category}
                onChange={(v) => setReview((r) => ({ ...r, category: v }))}
                options={[
                  { value: '', label: 'Choose a category…' },
                  ...categories.map((c) => ({ value: c, label: c })),
                ]}
              />
              <TextField
                label="Invoice / receipt no. (optional)"
                value={review.invoice}
                onChange={(v) => setReview((r) => ({ ...r, invoice: v }))}
                placeholder="e.g. INV-92831"
              />
            </div>
            {draft?.confidence !== 'good' && draft?.amountCandidates?.length > 1 && (
              <p className="text-xs text-[var(--gfx-faint)]">
                Other amounts seen on the bill:{' '}
                {draft.amountCandidates.slice(0, 4).map((c) => `R ${c.amount.toLocaleString('en-ZA')}`).join(', ')} —
                pick the one that matches the bill total.
              </p>
            )}
            {reviewError && <p role="alert" className="text-sm text-[var(--gfx-danger)]">{reviewError}</p>}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={reset}>Retake / replace</Button>
            <Button onClick={confirm}>Add Expense</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

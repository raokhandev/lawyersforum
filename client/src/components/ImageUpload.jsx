import { useRef, useState } from 'react'
import { api } from '../api.js'

// Keep these in sync with IMAGE_RULES in server/src/index.js (the server enforces them too).
export const IMAGE_RULES = {
  author: { maxMB: 2, minW: 400, minH: 500, maxW: 4000, maxH: 4000, ideal: '800 × 1000 px (portrait, 4:5)' },
  article: { maxMB: 5, minW: 1200, minH: 630, maxW: 4000, maxH: 4000, ideal: '1600 × 900 px (landscape, 16:9)' },
  tile: { maxMB: 5, minW: 800, minH: 450, maxW: 4000, maxH: 4000, ideal: '1200 × 675 px (landscape, 16:9)' },
}
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

function readSize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url) }
    img.onerror = () => { reject(new Error('That file could not be read as an image.')); URL.revokeObjectURL(url) }
    img.src = url
  })
}

// File picker for photos. `compact` shows a single "Choose file" row with one line of help text (used for articles);
// the default shows a requirements box.
export default function ImageUpload({ kind, label, value, onChange, onAuthError, required = false, compact = false, helpText }) {
  const rule = IMAGE_RULES[kind]
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  async function pick(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (!TYPES.includes(file.type)) return setError('Only JPG, PNG or WebP images are allowed.')
    if (file.size > rule.maxMB * 1024 * 1024) {
      return setError(`File is too large (${(file.size / 1048576).toFixed(1)} MB). The maximum is ${rule.maxMB} MB.`)
    }
    try {
      const { width, height } = await readSize(file)
      if (width < rule.minW || height < rule.minH) return setError(`Image is too small (${width} × ${height}). The minimum is ${rule.minW} × ${rule.minH} px.`)
      if (width > rule.maxW || height > rule.maxH) return setError(`Image is too large (${width} × ${height}). The maximum is ${rule.maxW} × ${rule.maxH} px.`)
      setBusy(true)
      onChange(await api.uploadImage(file, kind))
      setFileName(file.name)
    } catch (err) {
      if (err.status === 401 && onAuthError) onAuthError()
      else setError(err.message)
    } finally { setBusy(false) }
  }

  const picker = (
    <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={pick} hidden />
  )
  const help = helpText
    || `Choose a picture from your computer — JPEG, PNG or WebP, up to ${rule.maxMB}MB, at least ${rule.minW} × ${rule.minH} px (${rule.ideal} recommended).`

  if (compact) {
    return (
      <div className="image-upload compact">
        <span className="field-label">{label}{required && <span className="req"> *</span>}</span>
        <div className="file-row">
          {picker}
          <button type="button" className="file-button" disabled={busy} onClick={() => input.current.click()}>
            {busy ? 'Uploading…' : 'Choose file'}
          </button>
          <span className="file-status">{value ? (fileName || 'Image selected') : 'No file chosen'}</span>
          {value && !busy && (
            <button type="button" className="btn-link" onClick={() => { onChange(''); setFileName('') }}>Remove</button>
          )}
        </div>
        {value && <img className={`image-upload-preview ${kind}`} src={value} alt="Selected" />}
        <small className="field-help">{help}</small>
        {error && <p className="error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="image-upload">
      <span className="image-upload-label">{label}</span>
      <div className="image-upload-rules">
        <strong>Image requirements</strong>
        <ul>
          <li>File types: JPG, PNG or WebP</li>
          <li>Maximum file size: {rule.maxMB} MB</li>
          <li>Minimum size: {rule.minW} × {rule.minH} px</li>
          <li>Maximum size: {rule.maxW} × {rule.maxH} px</li>
          <li>Recommended: {rule.ideal}. Other shapes are cropped to fit.</li>
        </ul>
      </div>
      <div className="image-upload-row">
        {value && <img className={`image-upload-preview ${kind}`} src={value} alt="Selected" />}
        <div>
          {picker}
          <button type="button" className="btn btn-outline" disabled={busy} onClick={() => input.current.click()}>
            {busy ? 'Uploading…' : value ? 'Replace image' : 'Choose image'}
          </button>
          {value && !busy && <button type="button" className="btn-link" onClick={() => onChange('')}>Remove</button>}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

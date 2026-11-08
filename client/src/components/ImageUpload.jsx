import { useRef, useState } from 'react'
import { api } from '../api.js'

// Keep these in sync with IMAGE_RULES in server/src/index.js (the server enforces them too).
export const IMAGE_RULES = {
  maxMB: 2,
  author: { minW: 400, minH: 500, maxW: 4000, maxH: 4000, ideal: '800 × 1000 px (portrait, 4:5)' },
  article: { minW: 800, minH: 450, maxW: 4000, maxH: 4000, ideal: '1200 × 675 px (landscape, 16:9)' },
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

export default function ImageUpload({ kind, label, value, onChange, onAuthError }) {
  const rule = IMAGE_RULES[kind]
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (!TYPES.includes(file.type)) return setError('Only JPG, PNG or WebP images are allowed.')
    if (file.size > IMAGE_RULES.maxMB * 1024 * 1024) {
      return setError(`File is too large (${(file.size / 1048576).toFixed(1)} MB). The maximum is ${IMAGE_RULES.maxMB} MB.`)
    }
    try {
      const { width, height } = await readSize(file)
      if (width < rule.minW || height < rule.minH) return setError(`Image is too small (${width} × ${height}). The minimum is ${rule.minW} × ${rule.minH} px.`)
      if (width > rule.maxW || height > rule.maxH) return setError(`Image is too large (${width} × ${height}). The maximum is ${rule.maxW} × ${rule.maxH} px.`)
      setBusy(true)
      onChange(await api.uploadImage(file, kind))
    } catch (err) {
      if (err.status === 401 && onAuthError) onAuthError()
      else setError(err.message)
    } finally { setBusy(false) }
  }

  return (
    <div className="image-upload">
      <span className="image-upload-label">{label}</span>
      <div className="image-upload-rules">
        <strong>Image requirements</strong>
        <ul>
          <li>File types: JPG, PNG or WebP</li>
          <li>Maximum file size: {IMAGE_RULES.maxMB} MB</li>
          <li>Minimum size: {rule.minW} × {rule.minH} px</li>
          <li>Maximum size: {rule.maxW} × {rule.maxH} px</li>
          <li>Recommended: {rule.ideal}. Other shapes are cropped to fit.</li>
        </ul>
      </div>
      <div className="image-upload-row">
        {value && <img className={`image-upload-preview ${kind}`} src={value} alt="Selected" />}
        <div>
          <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={pick} hidden />
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

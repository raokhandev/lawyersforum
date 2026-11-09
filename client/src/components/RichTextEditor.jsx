import { useEffect, useRef, useState } from 'react'

// A button-based editor for writers who don't know HTML. The article is stored as HTML, but the writer only sees
// formatted text and buttons. (The server keeps only a safe set of tags: headings, paragraphs, bold, italic,
// lists and links.)
const EMPTY = '<p><br></p>'

const BUTTONS = [
  { label: 'Subheading', run: (ed) => ed.block('h2') },
  { label: 'Smaller heading', run: (ed) => ed.block('h3') },
  { label: 'Normal text', run: (ed) => ed.block('p') },
  { label: 'Bold', className: 'rt-bold', run: (ed) => ed.cmd('bold') },
  { label: 'Italic', className: 'rt-italic', run: (ed) => ed.cmd('italic') },
  { label: 'Bulleted list', run: (ed) => ed.cmd('insertUnorderedList') },
  { label: 'Numbered list', run: (ed) => ed.cmd('insertOrderedList') },
  { label: 'Add link', run: (ed) => ed.openLink() },
  { label: 'Remove link', run: (ed) => ed.cmd('unlink') },
]

export default function RichTextEditor({ value, onChange, helpText }) {
  const ref = useRef(null)
  const saved = useRef(null) // the selected words, remembered while the pop-up is open
  const urlInput = useRef(null)
  // null = closed; otherwise { mode: 'link' | 'notice', url, error }
  const [dialog, setDialog] = useState(null)

  // Keep the editor in step with `value` (e.g. cleared after saving), without disturbing the cursor while typing.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = value || ''
    if (document.activeElement !== el && el.innerHTML !== target) el.innerHTML = target
  }, [value])

  useEffect(() => {
    try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* not supported */ }
  }, [])

  // Focus the web address box when the link pop-up opens.
  useEffect(() => {
    if (dialog && dialog.mode === 'link') urlInput.current?.focus()
  }, [dialog?.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const emit = () => {
    const html = ref.current.innerHTML
    onChange(html === EMPTY || html === '<br>' ? '' : html)
  }

  const editor = {
    cmd(name, arg) {
      ref.current.focus()
      document.execCommand(name, false, arg)
      emit()
    },
    block(tag) { editor.cmd('formatBlock', tag) },
    openLink() {
      const sel = window.getSelection()
      if (!sel.rangeCount || sel.isCollapsed || !ref.current.contains(sel.anchorNode)) {
        setDialog({ mode: 'notice' })
        return
      }
      saved.current = sel.getRangeAt(0).cloneRange()
      setDialog({ mode: 'link', url: 'https://', error: '' })
    },
  }

  function closeDialog() {
    setDialog(null)
    ref.current.focus()
  }

  function submitLink() {
    const url = dialog.url.trim()
    if (!/^(https?:\/\/|mailto:)\S+$/i.test(url) || /^https?:\/\/$/i.test(url)) {
      setDialog({ ...dialog, error: 'Please enter a full web address starting with http:// or https:// (or an email link starting with mailto:).' })
      return
    }
    ref.current.focus()
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(saved.current)
    document.execCommand('createLink', false, url)
    emit()
    setDialog(null)
  }

  function onDialogKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeDialog() }
  }

  function onFocus() {
    if (!ref.current.innerHTML.trim()) ref.current.innerHTML = EMPTY
  }

  // Paste as plain text so text copied from Word or a website doesn't bring its own formatting.
  function onPaste(e) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    emit()
  }

  return (
    <div className="rt">
      <div className="rt-toolbar" role="toolbar" aria-label="Formatting">
        {BUTTONS.map((b) => (
          <button
            key={b.label}
            type="button"
            className={`rt-button ${b.className || ''}`}
            // mousedown would take focus (and the selection) away from the text, so stop it
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => b.run(editor)}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="rt-area article-body"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Article"
        onInput={emit}
        onFocus={onFocus}
        onBlur={emit}
        onPaste={onPaste}
      />
      {helpText && <small className="field-help">{helpText}</small>}

      {dialog && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDialog() }}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-dialog-title"
            onKeyDown={onDialogKeyDown}
          >
            {dialog.mode === 'notice' ? (
              <>
                <h2 id="link-dialog-title">Add a link</h2>
                <p>First select the words you want to turn into a link, then click <strong>Add link</strong> again.</p>
                <div className="modal-actions">
                  <button type="button" className="btn" autoFocus onClick={closeDialog}>OK</button>
                </div>
              </>
            ) : (
              <div>
                <h2 id="link-dialog-title">Add a link</h2>
                <p className="modal-selected">
                  Link for: <strong>&ldquo;{saved.current ? saved.current.toString().slice(0, 80) : ''}&rdquo;</strong>
                </p>
                <label>Web address
                  <input
                    ref={urlInput}
                    type="url"
                    inputMode="url"
                    value={dialog.url}
                    onChange={(e) => setDialog({ ...dialog, url: e.target.value, error: '' })}
                    // Enter adds the link; it must not save the whole article form behind the pop-up
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitLink() } }}
                    placeholder="https://example.com"
                  />
                </label>
                {dialog.error && <p className="error">{dialog.error}</p>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={closeDialog}>Cancel</button>
                  <button type="button" className="btn" onClick={submitLink}>Add link</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

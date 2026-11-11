import { useEffect, useRef, useState } from 'react'

// A button-based editor for writers who don't know HTML. The article is stored as HTML, but the writer only sees
// formatted text and buttons. (The server keeps only a safe set of tags: headings, paragraphs, bold, italic,
// lists, links and tables.)
const EMPTY = '<p><br></p>'
const MAX_ROWS = 30
const MAX_COLS = 8

// HTML view: put block elements on their own lines (indented inside lists and tables) so the code is readable.
// toEditor() undoes exactly that layout (a newline plus indentation between two tags) before the HTML goes back
// into the visual editor, so switching back and forth doesn't add stray blank space.
const BLOCK = 'h2|h3|p|ul|ol|li|table|thead|tbody|tr|th|td'
const NESTS = new Set(['ul', 'ol', 'table', 'thead', 'tbody', 'tr'])
function formatHtml(html) {
  let depth = 0
  return html
    .replace(/>\s*\n\s*</g, '><')
    // A new line before every block's opening tag, and before the closing tag of lists and tables. A paragraph,
    // heading, list item or cell keeps its content and closing tag on the same line.
    .split(new RegExp(`(?=<(?:${BLOCK})\\b|<\\/(?:${[...NESTS].join('|')})\\b)`, 'i'))
    .map((part) => {
      const m = part.match(/^<(\/?)([a-z0-9]+)/i)
      if (!m) return part
      const closing = m[1] === '/'
      const tag = m[2].toLowerCase()
      if (closing) depth = Math.max(depth - 1, 0)
      const line = `\n${'  '.repeat(depth)}${part}`
      if (!closing && NESTS.has(tag)) depth += 1
      return line
    })
    .join('')
    .trim()
}
// Shown at the top of the HTML view every time it opens. It is never saved: toEditor() removes all HTML comments
// (the server would strip them anyway), so deleting or editing it has no effect and it comes back next time.
const HTML_NOTICE = [
  '<!--',
  '  Note: this article does not support images, styles (style="..." or <style>)',
  '  or classes (class="..."). They are removed when the article is saved.',
  '-->',
].join('\n')
const withNotice = (html) => (html ? `${HTML_NOTICE}\n\n${html}` : `${HTML_NOTICE}\n\n`)
const toEditor = (html) => html.replace(/<!--[\s\S]*?(-->|$)/g, '').replace(/>\n\s*</g, '><').trim()

const cellHtml = (tag) => `<${tag}><br></${tag}>`
function tableHtml(rows, cols, header) {
  const row = (tag) => `<tr>${cellHtml(tag).repeat(cols)}</tr>`
  const head = header ? `<thead>${row('th')}</thead>` : ''
  const bodyRows = header ? rows - 1 : rows
  return `<table>${head}<tbody>${row('td').repeat(Math.max(bodyRows, 1))}</tbody></table><p><br></p>`
}

// Put the cursor at the start of an element.
function placeCaret(el) {
  if (!el) return
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
}

// Table editing (the cursor must be in a cell). Each returns the cell to put the cursor in afterwards.
const tableOps = {
  rowAbove(cell) {
    const tr = cell.parentElement
    if (tr.parentElement.tagName === 'THEAD') return cell // nothing goes above the heading row
    const row = newRowLike(tr, 'td')
    tr.before(row)
    return row.cells[cell.cellIndex]
  },
  rowBelow(cell) {
    const tr = cell.parentElement
    const row = newRowLike(tr, 'td')
    // Below the heading row means the top of the table body.
    if (tr.parentElement.tagName === 'THEAD') tr.closest('table').tBodies[0].prepend(row)
    else tr.after(row)
    return row.cells[cell.cellIndex]
  },
  colLeft(cell) { return addColumn(cell, 0) },
  colRight(cell) { return addColumn(cell, 1) },
  deleteRow(cell) {
    const tr = cell.parentElement
    const table = tr.closest('table')
    const index = cell.cellIndex
    const next = tr.nextElementSibling || tr.previousElementSibling
    const section = tr.parentElement
    tr.remove()
    if (!section.rows.length) section.remove()
    if (!table.rows.length) return tableOps.deleteTable(cell, table)
    const row = next || table.rows[0]
    return row.cells[Math.min(index, row.cells.length - 1)]
  },
  deleteColumn(cell) {
    const table = cell.closest('table')
    const index = cell.cellIndex
    const row = cell.parentElement
    for (const tr of [...table.rows]) if (tr.cells[index]) tr.cells[index].remove()
    if (!row.cells.length) return tableOps.deleteTable(cell, table)
    return row.cells[Math.min(index, row.cells.length - 1)]
  },
  deleteTable(cell, table = cell.closest('table')) {
    const p = document.createElement('p')
    p.innerHTML = '<br>'
    table.replaceWith(p)
    return p
  },
}

function newRowLike(tr, tag) {
  const row = document.createElement('tr')
  row.innerHTML = cellHtml(tag).repeat(tr.cells.length)
  return row
}

function addColumn(cell, offset) {
  const table = cell.closest('table')
  const index = cell.cellIndex + offset
  for (const tr of table.rows) {
    const c = document.createElement(tr.parentElement.tagName === 'THEAD' ? 'th' : 'td')
    c.innerHTML = '<br>'
    tr.insertBefore(c, tr.cells[index] || null)
  }
  return cell.parentElement.cells[index]
}

const TABLE_BUTTONS = [
  { label: 'Row above', op: 'rowAbove' },
  { label: 'Row below', op: 'rowBelow' },
  { label: 'Column left', op: 'colLeft' },
  { label: 'Column right', op: 'colRight' },
  { label: 'Delete row', op: 'deleteRow', danger: true },
  { label: 'Delete column', op: 'deleteColumn', danger: true },
  { label: 'Delete table', op: 'deleteTable', danger: true },
]

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
  { label: 'Insert table', run: (ed) => ed.openTable() },
]

export default function RichTextEditor({ value, onChange, helpText }) {
  const ref = useRef(null)
  const saved = useRef(null) // the selected words, remembered while the pop-up is open
  const urlInput = useRef(null)
  // null = closed; otherwise { mode: 'link' | 'notice' | 'table' | 'table-notice', url, error, rows, cols, header }
  const [dialog, setDialog] = useState(null)
  // True while the cursor is in a table cell: shows the table buttons.
  const [inTable, setInTable] = useState(false)
  // HTML view for technical users: the article's HTML in a plain text box instead of the formatted editor.
  const [htmlMode, setHtmlMode] = useState(false)
  const [htmlText, setHtmlText] = useState('')

  function toggleHtml() {
    if (!htmlMode) {
      setHtmlText(withNotice(formatHtml(ref.current.innerHTML === EMPTY ? '' : ref.current.innerHTML)))
      setHtmlMode(true)
      setInTable(false)
      return
    }
    // Back to the visual editor: show the edited HTML there and save it from the editor (so it is tidied the
    // same way as anything typed).
    const el = ref.current
    el.innerHTML = toEditor(htmlText)
    setHtmlMode(false)
    emit()
    requestAnimationFrame(() => el.focus())
  }

  // Keep the HTML box in step if the article changes from outside (e.g. the form is cleared after saving).
  useEffect(() => {
    if (htmlMode && toEditor(htmlText) !== (value || '')) setHtmlText(withNotice(formatHtml(value || '')))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  function onHtmlChange(e) {
    setHtmlText(e.target.value)
    onChange(toEditor(e.target.value))
  }

  // The table cell the cursor is in, if any.
  const currentCell = () => {
    const sel = window.getSelection()
    if (!sel.rangeCount || !ref.current) return null
    const node = sel.anchorNode
    const el = node && (node.nodeType === 1 ? node : node.parentElement)
    const cell = el && el.closest('td, th')
    return cell && ref.current.contains(cell) ? cell : null
  }

  useEffect(() => {
    const onSelection = () => setInTable(!!currentCell())
    document.addEventListener('selectionchange', onSelection)
    return () => document.removeEventListener('selectionchange', onSelection)
  }, [])

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
    openTable() {
      if (currentCell()) { setDialog({ mode: 'table-notice' }); return }
      const sel = window.getSelection()
      // Remember where the cursor is; with no cursor in the article yet, the table goes at the end.
      saved.current = sel.rangeCount && ref.current.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null
      setDialog({ mode: 'table', rows: '3', cols: '3', header: true, error: '' })
    },
    table(op) {
      const cell = currentCell()
      if (!cell) return
      if (op === 'deleteTable' && !window.confirm('Delete this whole table?')) return
      const target = tableOps[op](cell)
      emit()
      ref.current.focus()
      placeCaret(target)
      setInTable(!!currentCell())
    },
  }

  function submitTable() {
    const rows = Number(dialog.rows)
    const cols = Number(dialog.cols)
    if (!Number.isInteger(rows) || rows < 1 || rows > MAX_ROWS || !Number.isInteger(cols) || cols < 1 || cols > MAX_COLS) {
      setDialog({ ...dialog, error: `Please choose 1 to ${MAX_ROWS} rows and 1 to ${MAX_COLS} columns.` })
      return
    }
    if (dialog.header && rows < 2) {
      setDialog({ ...dialog, error: 'A table with a heading row needs at least 2 rows.' })
      return
    }
    const el = ref.current
    el.focus()
    if (!el.innerHTML.trim()) el.innerHTML = EMPTY
    const sel = window.getSelection()
    sel.removeAllRanges()
    if (saved.current) sel.addRange(saved.current)
    else { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel.addRange(r) }
    document.execCommand('insertHTML', false, tableHtml(rows, cols, dialog.header))
    emit()
    setDialog(null)
    // Start typing in the first cell of the new table.
    const tables = el.querySelectorAll('table')
    const inserted = [...tables].find((t) => t.textContent === '' && t.rows.length === rows && t.rows[0].cells.length === cols)
    if (inserted) placeCaret(inserted.rows[0].cells[0])
  }

  // Tab / Shift+Tab move between table cells; Tab in the last cell adds a row.
  function onKeyDown(e) {
    if (e.key !== 'Tab') return
    const cell = currentCell()
    if (!cell) return
    e.preventDefault()
    const cells = [...cell.closest('table').querySelectorAll('th, td')]
    const i = cells.indexOf(cell)
    if (e.shiftKey) { if (i > 0) placeCaret(cells[i - 1]); return }
    if (i < cells.length - 1) { placeCaret(cells[i + 1]); return }
    const row = newRowLike(cell.parentElement, 'td')
    const tr = cell.parentElement
    if (tr.parentElement.tagName === 'THEAD') tr.closest('table').tBodies[0].prepend(row)
    else tr.after(row)
    emit()
    placeCaret(row.cells[0])
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
            disabled={htmlMode}
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          className={`rt-button rt-html-toggle${htmlMode ? ' active' : ''}`}
          aria-pressed={htmlMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleHtml}
          title={htmlMode ? 'Go back to the formatted editor' : 'Edit the article as HTML code'}
        >
          {htmlMode ? 'Back to editor' : 'Edit in HTML'}
        </button>
      </div>
      {htmlMode && (
        <div className="rt-html">
          <textarea
            className="rt-html-area"
            value={htmlText}
            onChange={onHtmlChange}
            spellCheck={false}
            aria-label="Article HTML"
            autoFocus
          />
          <small className="field-help">
            Allowed tags: h2, h3, p, br, strong, em, ul, ol, li, a (href), table, thead, tbody, tr, th, td. Anything
            else (styles, classes, images, scripts) is removed when the article is saved.
          </small>
        </div>
      )}
      {inTable && !htmlMode && (
        <div className="rt-toolbar rt-table-toolbar" role="toolbar" aria-label="Table">
          <span className="rt-toolbar-label">Table:</span>
          {TABLE_BUTTONS.map((b) => (
            <button
              key={b.op}
              type="button"
              className={`rt-button${b.danger ? ' rt-danger' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.table(b.op)}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
      <div
        ref={ref}
        className="rt-area article-body"
        hidden={htmlMode}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Article"
        onInput={emit}
        onFocus={onFocus}
        onBlur={emit}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
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
            {dialog.mode === 'table-notice' ? (
              <>
                <h2 id="link-dialog-title">Insert a table</h2>
                <p>The cursor is inside a table. Click in the text outside the table first, then click <strong>Insert table</strong> again. To change this table, use the Table buttons above the article.</p>
                <div className="modal-actions">
                  <button type="button" className="btn" autoFocus onClick={closeDialog}>OK</button>
                </div>
              </>
            ) : dialog.mode === 'table' ? (
              <div>
                <h2 id="link-dialog-title">Insert a table</h2>
                <div className="field-row">
                  <label>Rows
                    <input
                      type="number" min="1" max={MAX_ROWS} value={dialog.rows} autoFocus
                      onChange={(e) => setDialog({ ...dialog, rows: e.target.value, error: '' })}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitTable() } }}
                    />
                  </label>
                  <label>Columns
                    <input
                      type="number" min="1" max={MAX_COLS} value={dialog.cols}
                      onChange={(e) => setDialog({ ...dialog, cols: e.target.value, error: '' })}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitTable() } }}
                    />
                  </label>
                </div>
                <label className="checkbox-label">
                  <input type="checkbox" checked={dialog.header} onChange={(e) => setDialog({ ...dialog, header: e.target.checked, error: '' })} />
                  First row is a heading row
                </label>
                <p className="hint">You can add or remove rows and columns later: click in the table and use the Table buttons. Press Tab to move to the next cell.</p>
                {dialog.error && <p className="error">{dialog.error}</p>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={closeDialog}>Cancel</button>
                  <button type="button" className="btn" onClick={submitTable}>Insert table</button>
                </div>
              </div>
            ) : dialog.mode === 'notice' ? (
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

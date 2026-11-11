import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { api, getToken, setToken } from '../api.js'
import useFetch from '../useFetch.js'
import ImageUpload from '../components/ImageUpload.jsx'
import RichTextEditor from '../components/RichTextEditor.jsx'
import DatePicker from '../components/DatePicker.jsx'
import { EDITOR_NAME } from '../config.js'
import { GROUPS } from '../groups.js'

function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    try {
      const { token } = await api.login(password)
      setToken(token)
      onLogin()
    } catch (err) { setError(err.message) }
  }
  return (
    <div className="admin-login">
      <form className="form narrow" onSubmit={submit}>
        <h1>Admin login</h1>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn">Log in</button>
      </form>
    </div>
  )
}

const SUMMARY_MAX = 700
const emptyAuthor = { name: '', title: '', practice_area: '', email: '', photo_url: '', summary: '', description: '' }
const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
const emptyArticle = () => ({ title: '', practice_area_ids: [], jurisdiction_ids: [], author_id: '', published_at: today(), image_url: '', tile_image_url: '', summary: '', content: '' })
const hasText = (html) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() !== ''

// Home page positions shown on the Organise Articles page (the Editor in Chief section sits separately below the articles).
const SLOT_LABELS = {
  featured: 'Featured (centre)',
  left1: 'Left, top',
  left2: 'Left, bottom',
  bottom1: 'Bottom row, 1st',
  bottom2: 'Bottom row, 2nd',
  bottom3: 'Bottom row, 3rd',
}

function Form({ initial, onSubmit, children, submitLabel, keepOnSave = false, className = '' }) {
  const [values, setValues] = useState(initial)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value })
  const setValue = (k, val) => setValues((cur) => ({ ...cur, [k]: val }))
  async function submit(e) {
    e.preventDefault()
    try {
      await onSubmit(values)
      if (!keepOnSave) setValues(initial)
      setMsg({ type: 'ok', text: 'Saved.' })
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
  }
  return (
    <form className={`form ${className}`} onSubmit={submit}>
      {children(values, set, setValue)}
      {msg.text && <p className={msg.type === 'ok' ? 'success' : 'error'}>{msg.text}</p>}
      <button className="btn">{submitLabel}</button>
    </form>
  )
}

// Loads authors and articles, and offers `run` to perform an admin call then refresh.
function useAdminData(onAuthError) {
  const [version, setVersion] = useState(0)
  const { data: authors } = useFetch(api.authors, [version])
  const { data: articles } = useFetch(api.articles, [version])
  const [actionError, setActionError] = useState('')

  async function run(fn) {
    setActionError('')
    try { await fn(); setVersion((n) => n + 1) }
    catch (err) {
      if (err.status === 401) onAuthError()
      else setActionError(err.message)
    }
  }
  const guard = (fn) => async (v) => {
    try { await fn(v); setVersion((n) => n + 1) }
    catch (err) { if (err.status === 401) onAuthError(); throw err }
  }
  return { authors, articles, actionError, run, guard }
}

// The author fields, shared by the Add and Edit pages.
function AuthorFields({ v, set, setValue, onAuthError }) {
  return (
    <>
      <label>Name *<input value={v.name} onChange={set('name')} required /></label>
      <label>Title<input value={v.title} onChange={set('title')} placeholder="e.g. Senior Partner" /></label>
      <label>Practice area<input value={v.practice_area} onChange={set('practice_area')} /></label>
      <label>Email<input type="email" value={v.email} onChange={set('email')} /></label>
      <ImageUpload kind="author" label="Photo" value={v.photo_url} onChange={(url) => setValue('photo_url', url)} onAuthError={onAuthError} />
      <label>Summary (shown on the About Us page)
        <textarea rows="4" maxLength={SUMMARY_MAX} value={v.summary} onChange={set('summary')} />
        <small>{v.summary.length}/{SUMMARY_MAX} characters</small>
      </label>
      <label>Description (shown on the author&apos;s own page)
        <textarea rows="10" value={v.description} onChange={set('description')} />
        <small>Separate paragraphs with a blank line.</small>
      </label>
    </>
  )
}

function AddAuthor({ onAuthError }) {
  const { guard } = useAdminData(onAuthError)
  return (
    <>
      <h1>Add author</h1>
      <Form initial={emptyAuthor} onSubmit={guard(api.addAuthor)} submitLabel="Add author">
        {(v, set, setValue) => <AuthorFields v={v} set={set} setValue={setValue} onAuthError={onAuthError} />}
      </Form>
    </>
  )
}

function EditAuthor({ onAuthError }) {
  const { id } = useParams()
  const { data, error, loading } = useFetch(() => api.author(id), [id])
  const save = async (values) => {
    try { await api.updateAuthor(id, values) }
    catch (err) { if (err.status === 401) onAuthError(); throw err }
  }
  const initial = data && Object.fromEntries(Object.keys(emptyAuthor).map((k) => [k, data[k] ?? '']))
  return (
    <>
      <p><Link to="/admin/manage">← Back to Manage Content</Link></p>
      <h1>Edit author</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {initial && (
        <Form key={id} initial={initial} onSubmit={save} submitLabel="Save changes" keepOnSave>
          {(v, set, setValue) => <AuthorFields v={v} set={set} setValue={setValue} onAuthError={onAuthError} />}
        </Form>
      )}
    </>
  )
}

// Reorder the members shown on the About Us page: drag a row, or use the arrow buttons. Saves immediately.
function OrganiseMembers({ onAuthError }) {
  const { data: authors, error, loading } = useFetch(api.authors)
  const [items, setItems] = useState([])
  const [msg, setMsg] = useState({ type: '', text: '' })
  const itemsRef = useRef([])
  const dragFrom = useRef(null)

  useEffect(() => {
    if (!authors) return
    // The Editor in Chief is always first (the About Us page pins them there).
    const sorted = [...authors].sort((x, y) => (y.name === EDITOR_NAME) - (x.name === EDITOR_NAME))
    itemsRef.current = sorted
    setItems(sorted)
  }, [authors])

  const update = (next) => { itemsRef.current = next; setItems(next) }

  async function save(list) {
    setMsg({ type: '', text: '' })
    try {
      await api.reorderAuthors(list.map((a) => a.id))
      setMsg({ type: 'ok', text: 'Order saved.' })
    } catch (err) {
      if (err.status === 401) onAuthError()
      else setMsg({ type: 'error', text: err.message })
    }
  }

  function move(from, to) {
    if (to < 0 || to >= itemsRef.current.length || from === to) return
    const next = [...itemsRef.current]
    next.splice(to, 0, next.splice(from, 1)[0])
    update(next)
    return next
  }

  const editorIndex = items.findIndex((a) => a.name === EDITOR_NAME)

  return (
    <>
      <h1>Organise members</h1>
      <p className="hint">
        Drag a member up or down, or use the arrow buttons, to set their order on the About Us page. Changes save
        automatically. The Editor in Chief is always shown first and can&apos;t be moved.
      </p>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {msg.text && <p className={msg.type === 'ok' ? 'success' : 'error'}>{msg.text}</p>}
      <ol className="member-order">
        {items.map((a, i) => {
          const locked = i === editorIndex
          return (
            <li
              key={a.id}
              className={locked ? 'locked' : ''}
              draggable={!locked}
              onDragStart={(e) => { dragFrom.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(a.id)) }}
              onDragOver={(e) => {
                e.preventDefault()
                if (locked || dragFrom.current === null || dragFrom.current === i) return
                move(dragFrom.current, i)
                dragFrom.current = i
              }}
              onDrop={(e) => e.preventDefault()}
              onDragEnd={() => { if (dragFrom.current !== null) { dragFrom.current = null; save(itemsRef.current) } }}
            >
              <span className="drag-handle" aria-hidden="true">{locked ? '' : '⋮⋮'}</span>
              {a.photo_url
                ? <img className="member-thumb" src={a.photo_url} alt="" />
                : <span className="member-thumb placeholder" aria-hidden="true">{a.name.charAt(0)}</span>}
              <span className="member-name">{a.name}{a.title ? <small> · {a.title}</small> : null}</span>
              {locked
                ? <span className="member-pinned">Pinned first</span>
                : (
                  <span className="member-arrows">
                    <button type="button" aria-label={`Move ${a.name} up`} disabled={i <= (editorIndex === 0 ? 1 : 0)} onClick={() => { const n = move(i, i - 1); if (n) save(n) }}>↑</button>
                    <button type="button" aria-label={`Move ${a.name} down`} disabled={i === items.length - 1} onClick={() => { const n = move(i, i + 1); if (n) save(n) }}>↓</button>
                  </span>
                )}
            </li>
          )
        })}
      </ol>
      <p><Link to="/about" target="_blank" rel="noreferrer">View the About Us page ↗</Link></p>
    </>
  )
}

// Checks the article before it is sent (the server checks again).
function validateArticle(v) {
  for (const g of GROUPS) if (!v[g.field].length) throw new Error(`Please tick at least one ${g.one}.`)
  if (!v.published_at) throw new Error('Please choose a publication date.')
  if (!v.image_url) throw new Error('Please choose the article image (top of the article).')
  if (!v.tile_image_url) throw new Error('Please choose the article tile image (background of the article button).')
  if (!hasText(v.content)) throw new Error('Please write the article.')
}

// Older articles were plain text with blank lines between paragraphs; show them as paragraphs in the editor.
const escapeHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const toEditorHtml = (content) => (/<\/?[a-z][\s\S]*?>/i.test(content)
  ? content
  : content.split(/\n{2,}/).filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join(''))

// Choose the article's areas of law or jurisdictions (one or more). "Add a new …" lets the editor create one, which is
// then ticked here and appears in that drop-down in the site menu.
function GroupPicker({ group, value, onChange, onAuthError }) {
  const [areas, setAreas] = useState(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    group.list().then(setAreas).catch((err) => setMsg({ type: 'error', text: err.message }))
  }, [group])

  function toggle(id) {
    setMsg({ type: '', text: '' })
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  async function add() {
    if (!name.trim()) { setMsg({ type: 'error', text: `Please type the name of the new ${group.one}.` }); return }
    try {
      const area = await group.add(name.trim())
      const id = String(area.id)
      // Reload so the new one sits where the menu shows it (alphabetical, after any pinned to the top).
      setAreas(await group.list())
      if (!value.includes(id)) onChange([...value, id])
      setAdding(false)
      setName('')
      setMsg({ type: 'ok', text: area.existed ? `"${area.name}" already exists, so it has been selected.` : `"${area.name}" added and selected. It now appears in the ${group.menuLabel} menu.` })
    } catch (err) {
      if (err.status === 401) onAuthError()
      else setMsg({ type: 'error', text: err.message })
    }
  }

  return (
    <fieldset className="field area-picker">
      <legend className="field-label">{group.legend} <span className="req">*</span></legend>
      {!areas && !msg.text && <p className="hint">Loading…</p>}
      {areas && (
        <div className="area-options">
          {areas.map((a) => (
            <label key={a.id} className="area-option">
              <input type="checkbox" checked={value.includes(String(a.id))} onChange={() => toggle(String(a.id))} />
              {a.name}
            </label>
          ))}
        </div>
      )}
      {!adding && (
        <button type="button" className="link-button" onClick={() => { setAdding(true); setMsg({ type: '', text: '' }) }}>
          + Add a new {group.one}
        </button>
      )}
      {adding && (
        <div className="add-area">
          <input
            value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus
            placeholder={group.example} aria-label={`Name of the new ${group.one}`}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          />
          <button type="button" className="btn btn-small" onClick={add}>Add</button>
          <button type="button" className="btn btn-outline btn-small" onClick={() => { setAdding(false); setName(''); setMsg({ type: '', text: '' }) }}>Cancel</button>
        </div>
      )}
      {msg.text
        ? <small className={msg.type === 'ok' ? 'success' : 'error'}>{msg.text}</small>
        : <small>{group.help}</small>}
    </fieldset>
  )
}

// The article form fields, shared by the Add and Edit pages.
function ArticleFields({ v, set, setValue, authors, onAuthError }) {
  return (
    <>
      <label>Title <span className="req">*</span>
        <input value={v.title} onChange={set('title')} maxLength={255} required />
      </label>
      {GROUPS.map((g) => (
        <GroupPicker key={g.key} group={g} value={v[g.field]} onChange={(ids) => setValue(g.field, ids)} onAuthError={onAuthError} />
      ))}
      <div className="field-row">
        <label>Author <span className="req">*</span>
          <select value={v.author_id} onChange={set('author_id')} required>
            <option value="">Please select</option>
            {authors && authors.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <div className="field">
          <span className="field-label" id="pubdate-label">Publication date <span className="req">*</span></span>
          <DatePicker labelledBy="pubdate-label" value={v.published_at} onChange={(d) => setValue('published_at', d)} />
        </div>
      </div>
      <ImageUpload
        kind="article" compact required label="Article image (top of the article and link preview)"
        value={v.image_url} onChange={(url) => setValue('image_url', url)} onAuthError={onAuthError}
        helpText="Shown at the top of the article. It is also the picture that appears when the article link is shared on social media or in messages (the SEO image). JPEG, PNG or WebP, up to 5MB, at least 1200 × 630 px (1600 × 900 recommended)."
      />
      <ImageUpload
        kind="tile" compact required label="Article tile image (background of the article button)"
        value={v.tile_image_url} onChange={(url) => setValue('tile_image_url', url)} onAuthError={onAuthError}
        helpText="Used as the background of this article's button on the home page and the Articles page, under a dark overlay. JPEG, PNG or WebP, up to 5MB, at least 800 × 450 px (1200 × 675 recommended)."
      />
      <label>Summary
        <textarea rows="4" maxLength={500} value={v.summary} onChange={set('summary')} />
        <small>One or two sentences, used where the article is listed.</small>
      </label>
      <div className="field">
        <span className="field-label">Article <span className="req">*</span></span>
        <RichTextEditor
          value={v.content} onChange={(html) => setValue('content', html)}
          helpText="Write the article here. Select some words and use the buttons above to make a subheading, bold them, or turn them into a link. Use Insert table to add a table; click inside a table to add or remove rows and columns."
        />
      </div>
    </>
  )
}

function AddArticle({ onAuthError }) {
  const { authors, guard } = useAdminData(onAuthError)
  const save = guard(async (v) => {
    validateArticle(v)
    await api.addArticle(v)
  })
  return (
    <>
      <h1>Add article</h1>
      <Form className="article-form" initial={emptyArticle()} onSubmit={save} submitLabel="Save Article">
        {(v, set, setValue) => <ArticleFields v={v} set={set} setValue={setValue} authors={authors} onAuthError={onAuthError} />}
      </Form>
    </>
  )
}

function EditArticle({ onAuthError }) {
  const { id } = useParams()
  const { authors } = useAdminData(onAuthError)
  const { data, error, loading } = useFetch(() => api.article(id), [id])
  const save = async (v) => {
    try {
      validateArticle(v)
      await api.updateArticle(id, v)
    } catch (err) { if (err.status === 401) onAuthError(); throw err }
  }
  const initial = data && {
    title: data.title || '',
    ...Object.fromEntries(GROUPS.map((g) => [g.field, (data[g.out] || []).map((a) => String(a.id))])),
    author_id: data.author_id ? String(data.author_id) : '',
    published_at: data.published_date || today(),
    image_url: data.image_url || '',
    // Articles from before there were two images only have one; start the tile image from it.
    tile_image_url: data.tile_image_url || data.image_url || '',
    summary: data.summary || '',
    content: toEditorHtml(data.content || ''),
  }
  return (
    <>
      <p><Link to="/admin/manage">← Back to Manage Content</Link></p>
      <h1>Edit article</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {initial && (
        <Form key={id} className="article-form" initial={initial} onSubmit={save} submitLabel="Save changes" keepOnSave>
          {(v, set, setValue) => <ArticleFields v={v} set={set} setValue={setValue} authors={authors} onAuthError={onAuthError} />}
        </Form>
      )}
    </>
  )
}

function ManageContent({ onAuthError }) {
  const { authors, articles, actionError, run } = useAdminData(onAuthError)
  function remove(fn, message) {
    if (window.confirm(message)) run(fn)
  }
  return (
    <>
      <h1>Manage content</h1>
      {actionError && <p className="error">{actionError}</p>}
      <div className="admin-grid">
        <section>
          <h3>Authors ({authors ? authors.length : '…'})</h3>
          <ul className="manage-list">
            {authors && authors.map((a) => (
              <li key={a.id}>
                <span>{a.name}{a.title ? <small> · {a.title}</small> : null}</span>
                <span className="row-actions">
                  <Link className="btn-edit" to={`/admin/edit-author/${a.id}`}>Edit</Link>
                <button className="btn-danger" onClick={() => remove(
                  () => api.deleteAuthor(a.id),
                  `Delete author "${a.name}"? Their articles will stay but show no author.`
                )}>Delete</button>
                </span>
              </li>
            ))}
            {authors && authors.length === 0 && <li>No authors.</li>}
          </ul>
        </section>
        <section>
          <h3>Articles ({articles ? articles.length : '…'})</h3>
          <ul className="manage-list">
            {articles && articles.map((a) => (
              <li key={a.id}>
                <span>{a.title}{a.author_name ? <small> · {a.author_name}</small> : null}</span>
                <span className="row-actions">
                  <Link className="btn-edit" to={`/admin/edit-article/${a.id}`}>Edit</Link>
                  <button className="btn-danger" onClick={() => remove(
                    () => api.deleteArticle(a.id),
                    `Delete article "${a.title}"? This cannot be undone.`
                  )}>Delete</button>
                </span>
              </li>
            ))}
            {articles && articles.length === 0 && <li>No articles.</li>}
          </ul>
        </section>
      </div>
    </>
  )
}

// One list (areas of law or jurisdictions) on the Areas & Jurisdictions page: add new ones, delete mistakes.
function GroupManager({ group, onAuthError }) {
  const [items, setItems] = useState(null)
  const [name, setName] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })

  const fail = (err) => { if (err.status === 401) onAuthError(); else setMsg({ type: 'error', text: err.message }) }
  const load = () => group.adminList().then(setItems).catch(fail)
  useEffect(() => { load() }, [group]) // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e) {
    e.preventDefault()
    if (!name.trim()) { setMsg({ type: 'error', text: `Please type the name of the new ${group.one}.` }); return }
    try {
      const created = await group.add(name.trim())
      setName('')
      setMsg({ type: 'ok', text: created.existed ? `"${created.name}" is already on the list.` : `"${created.name}" added. It now appears in the ${group.menuLabel} menu.` })
      load()
    } catch (err) { fail(err) }
  }

  async function remove(item) {
    const n = Number(item.article_count)
    const only = Number(item.only_count)
    let question = `Delete "${item.name}"? It will be removed from the ${group.menuLabel} menu and its page will no longer exist.`
    if (n > 0) {
      question += `\n\n${n} article${n === 1 ? ' is' : 's are'} listed under it. ${n === 1 ? 'It' : 'They'} will be kept, just no longer listed under "${item.name}".`
      if (only > 0) question += `\n\n${only === 1 ? '1 of these articles has' : `${only} of these articles have`} no other ${group.one}: you will need to tick another before ${only === 1 ? 'it' : 'they'} can be saved again.`
    }
    if (!window.confirm(question)) return
    try {
      await group.remove(item.id)
      setMsg({ type: 'ok', text: `"${item.name}" deleted.` })
      load()
    } catch (err) { fail(err) }
  }

  return (
    <section>
      <h3>{group.menuLabel} ({items ? items.length : '…'})</h3>
      <ul className="manage-list">
        {items && items.map((item) => (
          <li key={item.id}>
            <span>
              {item.name}
              <small> · {Number(item.article_count) === 1 ? '1 article' : `${item.article_count} articles`}</small>
            </span>
            <span className="row-actions">
              <Link className="btn-edit" to={`${group.basePath}/${item.slug}`} target="_blank" rel="noreferrer">View</Link>
              <button className="btn-danger" onClick={() => remove(item)}>Delete</button>
            </span>
          </li>
        ))}
        {items && items.length === 0 && <li>None yet.</li>}
      </ul>
      <form className="add-area group-add" onSubmit={add}>
        <input
          value={name} onChange={(e) => { setName(e.target.value); setMsg({ type: '', text: '' }) }} maxLength={100}
          placeholder={group.example} aria-label={`Name of the new ${group.one}`}
        />
        <button className="btn btn-small">Add</button>
      </form>
      {msg.text && <p className={msg.type === 'ok' ? 'success' : 'error'}>{msg.text}</p>}
    </section>
  )
}

function ManageGroups({ onAuthError }) {
  return (
    <>
      <h1>Areas of law and jurisdictions</h1>
      <p className="hint">
        These are the lists in the site menu and the boxes ticked on each article. Add a new one here or while writing an
        article. Deleting one (for example, if it was added by mistake) keeps its articles; they are just no longer listed
        under it.
      </p>
      <div className="admin-grid">
        {GROUPS.map((g) => <GroupManager key={g.key} group={g} onAuthError={onAuthError} />)}
      </div>
    </>
  )
}

function OrganiseArticles({ onAuthError }) {
  const { articles, actionError, run } = useAdminData(onAuthError)
  const holder = (slot) => (articles || []).find((a) => a.home_slot === slot)

  function choose(slot, value) {
    if (value === '') {
      const current = holder(slot)
      if (current) run(() => api.setArticleSlot(current.id, null))
    } else {
      run(() => api.setArticleSlot(Number(value), slot))
    }
  }

  const cell = (slot, className) => (
    <div className={`organise-cell ${className}`}>
      <label>{SLOT_LABELS[slot]}
        <select value={holder(slot) ? holder(slot).id : ''} onChange={(e) => choose(slot, e.target.value)}>
          <option value="">Automatic (newest article)</option>
          {articles && articles.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      </label>
    </div>
  )

  return (
    <>
      <h1>Organise articles</h1>
      <p className="hint">
        Choose which article appears in each position of the home page&apos;s main section. Choosing an article that is
        already placed elsewhere moves it. Positions set to Automatic are filled with the newest unplaced articles.
      </p>
      {actionError && <p className="error">{actionError}</p>}
      {!articles ? <p>Loading…</p> : (
        <div className="organise-layout">
          {cell('left1', 'o-left1')}
          {cell('left2', 'o-left2')}
          {cell('featured', 'o-featured')}
          {cell('bottom1', 'o-b1')}
          {cell('bottom2', 'o-b2')}
          {cell('bottom3', 'o-b3')}
        </div>
      )}
      <p><Link to="/" target="_blank" rel="noreferrer">View the home page ↗</Link></p>
    </>
  )
}

function AdminShell({ onLogout }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <p className="admin-brand">Admin panel</p>
        <NavLink to="/admin/add-author">Add Author</NavLink>
        <NavLink to="/admin/add-article">Add Article</NavLink>
        <NavLink to="/admin/manage">Manage Content</NavLink>
        <NavLink to="/admin/organise">Organise Articles</NavLink>
        <NavLink to="/admin/organise-members">Organise Members</NavLink>
        <NavLink to="/admin/areas-jurisdictions">Areas &amp; Jurisdictions</NavLink>
        <button className="admin-logout" onClick={onLogout}>Log out</button>
      </aside>
      <section className="admin-content">
        <Routes>
          <Route index element={<Navigate to="add-author" replace />} />
          <Route path="add-author" element={<AddAuthor onAuthError={onLogout} />} />
          <Route path="add-article" element={<AddArticle onAuthError={onLogout} />} />
          <Route path="manage" element={<ManageContent onAuthError={onLogout} />} />
          <Route path="organise" element={<OrganiseArticles onAuthError={onLogout} />} />
          <Route path="organise-members" element={<OrganiseMembers onAuthError={onLogout} />} />
          <Route path="areas-jurisdictions" element={<ManageGroups onAuthError={onLogout} />} />
          <Route path="edit-author/:id" element={<EditAuthor onAuthError={onLogout} />} />
          <Route path="edit-article/:id" element={<EditArticle onAuthError={onLogout} />} />
          <Route path="*" element={<Navigate to="add-author" replace />} />
        </Routes>
      </section>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(!!getToken())
  const logout = () => { setToken(null); setAuthed(false) }
  return authed
    ? <AdminShell onLogout={logout} />
    : <Login onLogin={() => setAuthed(true)} />
}

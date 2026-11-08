import { useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { api, getToken, setToken } from '../api.js'
import useFetch from '../useFetch.js'
import ImageUpload from '../components/ImageUpload.jsx'

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
const emptyArticle = { title: '', summary: '', image_url: '', author_id: '', content: '' }

// Home page positions shown on the Organise Articles page (the Editor in Chief section sits separately below the articles).
const SLOT_LABELS = {
  featured: 'Featured (centre)',
  left1: 'Left, top',
  left2: 'Left, bottom',
  bottom1: 'Bottom row, 1st',
  bottom2: 'Bottom row, 2nd',
  bottom3: 'Bottom row, 3rd',
}

function Form({ initial, onSubmit, children, submitLabel }) {
  const [values, setValues] = useState(initial)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value })
  const setValue = (k, val) => setValues((cur) => ({ ...cur, [k]: val }))
  async function submit(e) {
    e.preventDefault()
    try {
      await onSubmit(values)
      setValues(initial)
      setMsg({ type: 'ok', text: 'Saved.' })
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
  }
  return (
    <form className="form" onSubmit={submit}>
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

function AddAuthor({ onAuthError }) {
  const { guard } = useAdminData(onAuthError)
  return (
    <>
      <h1>Add author</h1>
      <Form initial={emptyAuthor} onSubmit={guard(api.addAuthor)} submitLabel="Add author">
        {(v, set, setValue) => (
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
        )}
      </Form>
    </>
  )
}

function AddArticle({ onAuthError }) {
  const { authors, guard } = useAdminData(onAuthError)
  return (
    <>
      <h1>Add article</h1>
      <Form initial={emptyArticle} onSubmit={guard(api.addArticle)} submitLabel="Publish article">
        {(v, set, setValue) => (
          <>
            <label>Title *<input value={v.title} onChange={set('title')} required /></label>
            <label>Author
              <select value={v.author_id} onChange={set('author_id')}>
                <option value="">— None —</option>
                {authors && authors.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <ImageUpload kind="article" label="Article image" value={v.image_url} onChange={(url) => setValue('image_url', url)} onAuthError={onAuthError} />
            <label>Summary<input value={v.summary} onChange={set('summary')} maxLength={500} /></label>
            <label>Content *<textarea rows="12" value={v.content} onChange={set('content')} required />
              <small>Separate paragraphs with a blank line.</small>
            </label>
          </>
        )}
      </Form>
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
                <button className="btn-danger" onClick={() => remove(
                  () => api.deleteAuthor(a.id),
                  `Delete author "${a.name}"? Their articles will stay but show no author.`
                )}>Delete</button>
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
                <button className="btn-danger" onClick={() => remove(
                  () => api.deleteArticle(a.id),
                  `Delete article "${a.title}"? This cannot be undone.`
                )}>Delete</button>
              </li>
            ))}
            {articles && articles.length === 0 && <li>No articles.</li>}
          </ul>
        </section>
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
        <button className="admin-logout" onClick={onLogout}>Log out</button>
      </aside>
      <section className="admin-content">
        <Routes>
          <Route index element={<Navigate to="add-author" replace />} />
          <Route path="add-author" element={<AddAuthor onAuthError={onLogout} />} />
          <Route path="add-article" element={<AddArticle onAuthError={onLogout} />} />
          <Route path="manage" element={<ManageContent onAuthError={onLogout} />} />
          <Route path="organise" element={<OrganiseArticles onAuthError={onLogout} />} />
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

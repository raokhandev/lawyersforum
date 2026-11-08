import { useState } from 'react'
import { api, getToken, setToken } from '../api.js'
import useFetch from '../useFetch.js'

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
    <form className="form narrow" onSubmit={submit}>
      <h1>Admin login</h1>
      <label>Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn">Log in</button>
    </form>
  )
}

const SUMMARY_MAX = 500
const emptyAuthor = { name: '', title: '', practice_area: '', email: '', photo_url: '', summary: '', description: '' }
const emptyArticle = { title: '', summary: '', author_id: '', content: '' }

function Form({ initial, onSubmit, children, submitLabel }) {
  const [values, setValues] = useState(initial)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value })
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
      {children(values, set)}
      {msg.text && <p className={msg.type === 'ok' ? 'success' : 'error'}>{msg.text}</p>}
      <button className="btn">{submitLabel}</button>
    </form>
  )
}

function Dashboard({ onLogout, onAuthError }) {
  const [version, setVersion] = useState(0)
  const { data: authors } = useFetch(api.authors, [version])
  const { data: articles } = useFetch(api.articles, [version])
  const [actionError, setActionError] = useState('')

  const guard = (fn) => async (v) => {
    try { await fn(v); setVersion((n) => n + 1) }
    catch (err) { if (err.status === 401) onAuthError(); throw err }
  }

  async function remove(fn, message) {
    if (!window.confirm(message)) return
    setActionError('')
    try { await fn(); setVersion((n) => n + 1) }
    catch (err) {
      if (err.status === 401) onAuthError()
      else setActionError(err.message)
    }
  }

  return (
    <>
      <div className="admin-head">
        <h1>Admin</h1>
        <button className="btn btn-outline" onClick={onLogout}>Log out</button>
      </div>
      <div className="admin-grid">
        <section>
          <h2>Add author</h2>
          <Form initial={emptyAuthor} onSubmit={guard(api.addAuthor)} submitLabel="Add author">
            {(v, set) => (
              <>
                <label>Name *<input value={v.name} onChange={set('name')} required /></label>
                <label>Title<input value={v.title} onChange={set('title')} placeholder="e.g. Senior Partner" /></label>
                <label>Practice area<input value={v.practice_area} onChange={set('practice_area')} /></label>
                <label>Email<input type="email" value={v.email} onChange={set('email')} /></label>
                <label>Photo URL<input value={v.photo_url} onChange={set('photo_url')} placeholder="https://…" /></label>
                <label>Summary (shown on the About Us page)
                  <textarea rows="3" maxLength={SUMMARY_MAX} value={v.summary} onChange={set('summary')} />
                  <small>{v.summary.length}/{SUMMARY_MAX} characters</small>
                </label>
                <label>Description (shown on the author's own page)
                  <textarea rows="8" value={v.description} onChange={set('description')} />
                  <small>Separate paragraphs with a blank line.</small>
                </label>
              </>
            )}
          </Form>
        </section>
        <section>
          <h2>Add article</h2>
          <Form initial={emptyArticle} onSubmit={guard(api.addArticle)} submitLabel="Publish article">
            {(v, set) => (
              <>
                <label>Title *<input value={v.title} onChange={set('title')} required /></label>
                <label>Author
                  <select value={v.author_id} onChange={set('author_id')}>
                    <option value="">— None —</option>
                    {authors && authors.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </label>
                <label>Summary<input value={v.summary} onChange={set('summary')} maxLength={500} /></label>
                <label>Content *<textarea rows="10" value={v.content} onChange={set('content')} required />
                  <small>Separate paragraphs with a blank line.</small>
                </label>
              </>
            )}
          </Form>
        </section>
      </div>

      <h2 className="section-title">Manage content</h2>
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

export default function Admin() {
  const [authed, setAuthed] = useState(!!getToken())
  const logout = () => { setToken(null); setAuthed(false) }
  return authed
    ? <Dashboard onLogout={logout} onAuthError={logout} />
    : <Login onLogin={() => setAuthed(true)} />
}

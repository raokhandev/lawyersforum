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

const emptyAuthor = { name: '', title: '', practice_area: '', email: '', photo_url: '', bio: '' }
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

  const guard = (fn) => async (v) => {
    try { await fn(v); setVersion((n) => n + 1) }
    catch (err) { if (err.status === 401) onAuthError(); throw err }
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
                <label>Bio<textarea rows="4" value={v.bio} onChange={set('bio')} /></label>
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

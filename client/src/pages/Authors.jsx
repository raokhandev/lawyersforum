import { Link } from 'react-router-dom'
import { api } from '../api.js'
import useFetch from '../useFetch.js'

export default function Authors() {
  const { data, error, loading } = useFetch(api.authors)
  return (
    <>
      <h1>About Us</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && <p>No authors listed yet.</p>}
      <div className="profile-list">
        {data && data.map((l) => (
          <article className="profile" key={l.id}>
            {l.photo_url
              ? <div className="profile-photo" role="img" aria-label={l.name} style={{ backgroundImage: `url("${l.photo_url}")` }} />
              : <div className="profile-photo placeholder" aria-hidden="true">{l.name.charAt(0)}</div>}
            <div className="profile-body">
              <h2>{l.name}</h2>
              {(l.title || l.practice_area) && (
                <p className="meta">{[l.title, l.practice_area].filter(Boolean).join(' · ')}</p>
              )}
              {l.summary && <p className="profile-summary">{l.summary}</p>}
              <p><Link to={`/authors/${l.id}`}>Read full profile →</Link></p>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

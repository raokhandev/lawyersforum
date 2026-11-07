import { api } from '../api.js'
import useFetch from '../useFetch.js'

export default function Lawyers() {
  const { data, error, loading } = useFetch(api.lawyers)
  return (
    <>
      <h1>Our lawyers</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && <p>No lawyers listed yet.</p>}
      <div className="grid">
        {data && data.map((l) => (
          <article className="card lawyer" key={l.id}>
            {l.photo_url
              ? <img className="avatar" src={l.photo_url} alt={l.name} />
              : <div className="avatar placeholder">{l.name.charAt(0)}</div>}
            <h3>{l.name}</h3>
            {l.title && <p className="meta">{l.title}</p>}
            {l.practice_area && <p><span className="tag">{l.practice_area}</span></p>}
            {l.bio && <p>{l.bio}</p>}
            {l.email && <p><a href={`mailto:${l.email}`}>{l.email}</a></p>}
          </article>
        ))}
      </div>
    </>
  )
}

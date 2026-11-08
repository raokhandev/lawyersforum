import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import useFetch from '../useFetch.js'

export default function AuthorDetail() {
  const { id } = useParams()
  const { data, error, loading } = useFetch(() => api.author(id), [id])
  return (
    <>
      <p><Link to="/about">← About Us</Link></p>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <article className="author-page">
          {data.photo_url
            ? <img src={data.photo_url} alt={data.name} />
            : <div className="avatar placeholder">{data.name.charAt(0)}</div>}
          <div>
            <h1>{data.name}</h1>
            {(data.title || data.practice_area) && (
              <p className="meta">{[data.title, data.practice_area].filter(Boolean).join(' · ')}</p>
            )}
            {(data.description || data.summary || '').split(/\n{2,}/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            {data.email && <p><a href={`mailto:${data.email}`}>{data.email}</a></p>}
          </div>
        </article>
      )}
    </>
  )
}
